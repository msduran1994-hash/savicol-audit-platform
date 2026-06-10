// ═══════════════════════════════════════════════════════════════════════════════
// INVITATIONS · token temporal para activación de cuenta
// ═══════════════════════════════════════════════════════════════════════════════
// Flujo:
//  1. Admin crea invitación → genera token raw (48 chars) + bcrypt hash
//  2. Backend envía correo con link ?token=<raw>
//  3. Usuario click en link → /activar?token=... → frontend muestra form de password
//  4. Submit → POST /invitations/accept con token + password + name
//  5. Backend valida bcrypt(raw) contra hash, crea usuario, marca invitación ACCEPTED
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

const INVITATION_TTL_HOURS = Number(process.env.INVITATION_TTL_HOURS ?? 24);
const VALID_ROLES = ["ADMIN", "AUDITOR", "SUPERVISOR", "AUDITEE", "VIEWER"];

export interface CreateInvitationDto {
  email: string;
  name:  string;
  role?: string;
}

export interface AcceptInvitationDto {
  token:    string;
  password: string;
  name?:    string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
    private notif:  NotificationsService,
    private audit:  AuditLogsService,
  ) {}

  // ── CREATE (admin) ──
  async create(dto: CreateInvitationDto, invitedBy: { id: string; name: string }) {
    const email = dto.email.trim().toLowerCase();
    const name  = dto.name.trim();
    const role  = (dto.role ?? "AUDITOR").toUpperCase();

    if (!email.includes("@"))    throw new BadRequestException("email inválido");
    if (!name)                   throw new BadRequestException("name obligatorio");
    if (!VALID_ROLES.includes(role)) throw new BadRequestException(`role inválido · permitidos: ${VALID_ROLES.join(", ")}`);

    // Ya existe un user activo con ese email?
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Ya existe un usuario con ese correo");

    // Hay una invitación PENDING activa con ese email? → revocar la anterior
    await this.prisma.userInvitation.updateMany({
      where: { email, status: "PENDING" },
      data:  { status: "REVOKED" },
    });

    // Generar token raw + hash
    const tokenRaw = crypto.randomBytes(36).toString("base64url"); // 48 chars URL-safe
    const tokenHash = await bcrypt.hash(tokenRaw, 10);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 3600_000);

    const inv = await this.prisma.userInvitation.create({
      data: {
        email, name, role, token: tokenRaw, tokenHash, expiresAt,
        invitedById: invitedBy.id, invitedByName: invitedBy.name,
      },
    });

    // Link de activación · APP_BASE_URL apunta al frontend
    const base = process.env.APP_BASE_URL ?? "https://savicol-audit-platform-web.vercel.app";
    const activationUrl = `${base}/activar?token=${tokenRaw}`;

    // Enviar correo (no-op si SMTP no configurado · queda registrado emailSent=false)
    const html = this.email.templateInvitation({
      name, activationUrl, expiresAt, invitedBy: invitedBy.name, role,
    });
    const dispatch = await this.email.send({
      to: email,
      subject: `Invitación a Savicol Audit Platform · rol ${role}`,
      html,
    });

    // Audit log
    await this.audit.logAccess({
      userId: invitedBy.id,
      action: "INVITATION_SENT",
      resource: `invitation:${inv.id}`,
      metadata: { email, role, emailMode: dispatch.mode, emailSent: dispatch.ok },
    });

    return {
      id: inv.id, email, name, role, expiresAt,
      emailSent: dispatch.ok,
      emailMode: dispatch.mode,
      emailError: dispatch.ok ? null : dispatch.error,
      // En modo no-op devolvemos el link para que el admin lo copie manualmente
      activationUrl: dispatch.mode === "noop" ? activationUrl : undefined,
    };
  }

  // ── LIST (admin) ──
  list(filters: { status?: string; email?: string } = {}) {
    return this.prisma.userInvitation.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.email  ? { email:  { contains: filters.email.toLowerCase() } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        expiresAt: true, acceptedAt: true, createdAt: true,
        invitedByName: true,
      },
    });
  }

  // ── REVOKE (admin) ──
  async revoke(id: string) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException("Invitación no encontrada");
    if (inv.status !== "PENDING") throw new BadRequestException(`Invitación en estado ${inv.status}`);
    return this.prisma.userInvitation.update({
      where: { id }, data: { status: "REVOKED" },
    });
  }

  // ── RESEND (admin) ──
  async resend(id: string) {
    const inv = await this.prisma.userInvitation.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException("Invitación no encontrada");
    if (inv.status !== "PENDING") throw new BadRequestException(`Solo se pueden reenviar invitaciones PENDING (estado actual: ${inv.status})`);

    const base = process.env.APP_BASE_URL ?? "https://savicol-audit-platform-web.vercel.app";
    const activationUrl = `${base}/activar?token=${inv.token}`;
    const html = this.email.templateInvitation({
      name: inv.name, activationUrl, expiresAt: inv.expiresAt,
      invitedBy: inv.invitedByName, role: inv.role,
    });
    const r = await this.email.send({
      to: inv.email,
      subject: `(Reenvío) Invitación Savicol Audit · rol ${inv.role}`,
      html,
    });
    return { ok: r.ok, mode: r.mode, error: r.error, activationUrl: r.mode === "noop" ? activationUrl : undefined };
  }

  // ── VALIDATE (público · /activar lo usa antes de mostrar el form) ──
  async validate(tokenRaw: string) {
    if (!tokenRaw) throw new BadRequestException("token requerido");
    const inv = await this.prisma.userInvitation.findUnique({ where: { token: tokenRaw } });
    if (!inv) throw new NotFoundException("Invitación no encontrada o token inválido");
    if (inv.status === "ACCEPTED") throw new BadRequestException("Esta invitación ya fue utilizada");
    if (inv.status === "REVOKED")  throw new BadRequestException("Esta invitación fue revocada");
    if (inv.expiresAt.getTime() < Date.now()) {
      await this.prisma.userInvitation.update({ where: { id: inv.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Esta invitación ha expirado");
    }
    return { email: inv.email, name: inv.name, role: inv.role, expiresAt: inv.expiresAt };
  }

  // ── ACCEPT (público · crea el usuario) ──
  async accept(dto: AcceptInvitationDto) {
    if (!dto.token || !dto.password) throw new BadRequestException("token y password son obligatorios");
    if (dto.password.length < 8)     throw new BadRequestException("La contraseña debe tener al menos 8 caracteres");

    const inv = await this.prisma.userInvitation.findUnique({ where: { token: dto.token } });
    if (!inv) throw new NotFoundException("Invitación no encontrada");
    if (inv.status !== "PENDING")    throw new BadRequestException(`Invitación en estado ${inv.status}`);
    if (inv.expiresAt.getTime() < Date.now()) {
      await this.prisma.userInvitation.update({ where: { id: inv.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Invitación expirada");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: inv.email } });
    if (existing) throw new ConflictException("Ya existe un usuario con ese correo");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: inv.email,
        name:  (dto.name?.trim() || inv.name),
        passwordHash,
        role:  inv.role,
        isActive: true,
      },
    });

    await this.prisma.userInvitation.update({
      where: { id: inv.id }, data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    // Notificación in-app para el admin invitador
    if (inv.invitedById) {
      await this.notif.create({
        userId: inv.invitedById,
        kind:   "USER_CREATED",
        severity: "SUCCESS",
        title:  "Invitación aceptada",
        message: `${user.name} (${user.email}) activó su cuenta con rol ${user.role}.`,
        metadata: { userId: user.id, invitationId: inv.id },
      });
    }

    // Audit log
    await this.audit.logAccess({
      userId: user.id,
      action: "INVITATION_ACCEPTED",
      resource: `invitation:${inv.id}`,
      metadata: { email: user.email, role: user.role, invitedBy: inv.invitedById },
    });

    return {
      id: user.id, email: user.email, name: user.name, role: user.role,
      message: "Cuenta activada exitosamente",
    };
  }

  // ── EXPIRE cron job (idempotente) ──
  async expireOld() {
    const r = await this.prisma.userInvitation.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data:  { status: "EXPIRED" },
    });
    return { expired: r.count };
  }
}
