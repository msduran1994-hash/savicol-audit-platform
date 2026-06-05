// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET · token temporal para que el usuario cambie su propia contraseña
// ═══════════════════════════════════════════════════════════════════════════════
// Flujo:
//  1. /forgot-password → POST con email · responde 200 siempre (no leak)
//  2. Si email existe → crea token + envía correo con link
//  3. /reset?token=... → GET valida + form de nueva password
//  4. POST /reset → cambia password + marca token USED
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

const RESET_TTL_HOURS = Number(process.env.PASSWORD_RESET_TTL_HOURS ?? 1);

export interface RequestResetDto {
  email: string;
}

export interface ResetDto {
  token:       string;
  newPassword: string;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
  ) {}

  /**
   * Solicitar reset · responde 200 SIEMPRE (evita user enumeration).
   * Si el email no existe, no se envía nada.
   */
  async request(dto: RequestResetDto, meta: { ip?: string; ua?: string }) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      this.logger.warn(`[PasswordReset] solicitud para email inexistente/inactivo: ${email}`);
      return { ok: true, message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña." };
    }

    // Invalidar tokens PENDING previos para este usuario
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, status: "PENDING" },
      data:  { status: "EXPIRED" },
    });

    const tokenRaw  = crypto.randomBytes(36).toString("base64url");
    const tokenHash = await bcrypt.hash(tokenRaw, 10);
    const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 3600_000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id, token: tokenRaw, tokenHash, expiresAt,
        ipAddress: meta.ip, userAgent: meta.ua,
      },
    });

    const base = process.env.APP_BASE_URL ?? "https://savicol-audit-platform.vercel.app";
    const resetUrl = `${base}/restablecer?token=${tokenRaw}`;
    const html = this.email.templatePasswordReset({ name: user.name, resetUrl, expiresAt });
    await this.email.send({
      to: email,
      subject: "Restablece tu contraseña Savicol Audit",
      html,
    });

    return { ok: true, message: "Si el correo existe, recibirás instrucciones para restablecer tu contraseña." };
  }

  /** Validar token desde frontend antes de mostrar form */
  async validate(tokenRaw: string) {
    if (!tokenRaw) throw new BadRequestException("token requerido");
    const t = await this.prisma.passwordResetToken.findUnique({ where: { token: tokenRaw }, include: { user: true } });
    if (!t)                       throw new NotFoundException("Token inválido");
    if (t.status === "USED")      throw new BadRequestException("Token ya fue utilizado");
    if (t.status === "EXPIRED")   throw new BadRequestException("Token expirado");
    if (t.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.update({ where: { id: t.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Token expirado");
    }
    return { email: t.user.email, name: t.user.name, expiresAt: t.expiresAt };
  }

  /** Aplicar el reset · cambia password + marca USED + invalida sesiones */
  async reset(dto: ResetDto) {
    if (!dto.token)          throw new BadRequestException("token requerido");
    if (!dto.newPassword)    throw new BadRequestException("newPassword requerida");
    if (dto.newPassword.length < 8) throw new BadRequestException("La contraseña debe tener al menos 8 caracteres");

    const t = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token } });
    if (!t)                       throw new NotFoundException("Token inválido");
    if (t.status !== "PENDING")   throw new BadRequestException("Token ya no es válido");
    if (t.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.update({ where: { id: t.id }, data: { status: "EXPIRED" } });
      throw new BadRequestException("Token expirado");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: t.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: t.id }, data: { status: "USED", usedAt: new Date() } }),
      // Invalidar todas las sesiones del usuario · obligará a re-login
      this.prisma.session.deleteMany({ where: { userId: t.userId } }),
    ]);

    return { ok: true, message: "Contraseña actualizada exitosamente. Inicia sesión con tus nuevas credenciales." };
  }
}
