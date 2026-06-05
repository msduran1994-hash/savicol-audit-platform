import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export interface CreateUserDto {
  email: string;
  name: string;
  password?: string;       // opcional · si no viene se genera temporal
  role?: string;           // VIEWER | AUDITOR | SUPERVISOR | AUDITEE | ADMIN | AI_AGENT
  mfaEnabled?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

const VALID_ROLES = ["ADMIN", "AUDITOR", "SUPERVISOR", "AUDITEE", "VIEWER", "AI_AGENT"];

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
    private notif:  NotificationsService,
    private audit:  AuditLogsService,
  ) {}

  // ────────────────────────────────────────────────────────
  //  LECTURA
  // ────────────────────────────────────────────────────────
  async findAll(params: { search?: string; role?: string; isActive?: string } = {}) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name:  { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }
    if (params.role)     where.role     = params.role;
    if (params.isActive) where.isActive = params.isActive === "true";

    return this.prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, mfaEnabled: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, mfaEnabled: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");
    return user;
  }

  // ────────────────────────────────────────────────────────
  //  CREACIÓN
  // ────────────────────────────────────────────────────────
  async create(dto: CreateUserDto, requesterRole: string, requesterId?: string) {
    if (requesterRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede crear usuarios");

    if (!dto.email || !dto.name)
      throw new BadRequestException("Email y nombre son obligatorios");

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException("El correo ya está registrado");

    const role = (dto.role ?? "VIEWER").toUpperCase();
    if (!VALID_ROLES.includes(role))
      throw new BadRequestException(`Rol inválido. Permitidos: ${VALID_ROLES.join(", ")}`);

    // Password: si no se provee, generamos una temporal segura (16 caracteres)
    const plainPassword = dto.password ?? this.generateTempPassword();
    const hash = await bcrypt.hash(plainPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        passwordHash: hash,
        role,
        mfaEnabled: dto.mfaEnabled ?? false,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    // Devolvemos la contraseña en claro SOLO si fue auto-generada
    // (para que el ADMIN la entregue al nuevo usuario)
    const result: any = user;
    if (!dto.password) result.tempPassword = plainPassword;

    // Audit log
    await this.audit.logAccess({
      userId: requesterId ?? user.id,
      action: "USER_CREATED",
      resource: `user:${user.id}`,
      metadata: { newUser: { id: user.id, email: user.email, role: user.role } },
    });

    // Notificación in-app al nuevo usuario (visible cuando inicie sesión)
    await this.notif.create({
      userId: user.id,
      kind: "USER_CREATED",
      severity: "SUCCESS",
      title: "Bienvenido a Savicol Audit",
      message: `Tu cuenta fue creada con rol ${user.role}. Cambia tu contraseña en Configuración → Seguridad.`,
      metadata: { role: user.role },
    });

    // Correo de bienvenida con la contraseña temporal (no-op si SMTP no config)
    if (!dto.password) {
      const baseUrl = process.env.APP_BASE_URL ?? "https://savicol-audit-platform.vercel.app";
      await this.email.send({
        to: user.email,
        subject: "Tu cuenta Savicol Audit · contraseña temporal",
        html: this.email.templateTempPassword({
          name: user.name, tempPassword: plainPassword, loginUrl: `${baseUrl}/login`,
        }),
      });
    }
    return result;
  }

  // ────────────────────────────────────────────────────────
  //  ACTUALIZACIÓN
  // ────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string) {
    // Solo el propio usuario o ADMIN puede actualizar datos básicos
    if (requesterId !== id && requesterRole !== "ADMIN")
      throw new ForbiddenException("No puedes actualizar otros usuarios");

    const existing = await this.findOne(id);

    // Si cambia el email, validar que no esté tomado
    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) throw new ConflictException("El correo ya está registrado");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name      && { name: dto.name.trim() }),
        ...(dto.email     && { email: dto.email.toLowerCase().trim() }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
  }

  async updateRole(id: string, role: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede cambiar roles");

    const upper = role.toUpperCase();
    if (!VALID_ROLES.includes(upper))
      throw new BadRequestException(`Rol inválido. Permitidos: ${VALID_ROLES.join(", ")}`);

    const oldUser = await this.findOne(id);
    if (oldUser.role === upper) return oldUser; // no-op

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: upper },
      select: { id: true, email: true, name: true, role: true },
    });

    // Audit log
    await this.audit.logAccess({
      userId: requesterId,
      action: "ROLE_CHANGED",
      resource: `user:${id}`,
      metadata: { targetUserId: id, oldRole: oldUser.role, newRole: upper },
    });

    // Notif + email al target
    const changedBy = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } });
    const changedByName = changedBy?.name ?? "Administrador";

    await this.notif.create({
      userId: id,
      kind: "ROLE_CHANGED",
      severity: "INFO",
      title: "Cambio de rol",
      message: `Tu rol fue actualizado de ${oldUser.role} a ${upper} por ${changedByName}.`,
      metadata: { oldRole: oldUser.role, newRole: upper },
      email: {
        to: updated.email,
        subject: "Tu rol en Savicol Audit fue actualizado",
        html: this.email.templateRoleChanged({
          name: updated.name, oldRole: oldUser.role, newRole: upper, changedBy: changedByName,
        }),
      },
    });

    return updated;
  }

  async toggleActive(id: string, requesterRole: string, requesterId?: string) {
    if (requesterRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede activar/desactivar usuarios");

    const user = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    await this.audit.logAccess({
      userId: requesterId ?? id,
      action: updated.isActive ? "USER_CREATED" : "ACCOUNT_DEACTIVATED",
      resource: `user:${id}`,
      metadata: { targetUserId: id, newState: updated.isActive ? "active" : "inactive" },
    });

    return updated;
  }

  // ────────────────────────────────────────────────────────
  //  PASSWORD MANAGEMENT
  // ────────────────────────────────────────────────────────
  async resetPassword(id: string, requesterRole: string, requesterId?: string) {
    if (requesterRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede resetear contraseñas");

    const user = await this.findOne(id); // valida existencia

    // Audit log
    await this.audit.logAccess({
      userId: requesterId ?? id,
      action: "PASSWORD_RESET_COMPLETED",
      resource: `user:${id}`,
      metadata: { targetUserId: id, by: "admin" },
    });

    const tempPassword = this.generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    // Invalidar sesiones activas + actualizar password
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: hash },
      }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    // Notificación in-app + email con la contraseña temporal
    const baseUrl = process.env.APP_BASE_URL ?? "https://savicol-audit-platform.vercel.app";
    await this.notif.create({
      userId: id,
      kind: "PASSWORD_RESET",
      severity: "WARNING",
      title: "Tu contraseña fue restablecida",
      message: "Un administrador restableció tu contraseña. Revisa tu correo para la contraseña temporal.",
      email: {
        to: user.email,
        subject: "Tu contraseña Savicol Audit fue restablecida",
        html: this.email.templateTempPassword({
          name: user.name, tempPassword, loginUrl: `${baseUrl}/login`,
        }),
      },
    });

    return {
      message: "Contraseña reseteada. Entregue la contraseña temporal al usuario.",
      tempPassword,
    };
  }

  async changePassword(
    id: string,
    dto: { currentPassword: string; newPassword: string },
    requesterId: string,
  ) {
    if (requesterId !== id)
      throw new ForbiddenException("Solo puedes cambiar tu propia contraseña");

    if (!dto.newPassword || dto.newPassword.length < 8)
      throw new BadRequestException("La nueva contraseña debe tener al menos 8 caracteres");

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no encontrado");

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException("Contraseña actual incorrecta");

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash: hash } }),
      this.prisma.session.deleteMany({ where: { userId: id } }), // cierra todas las sesiones
    ]);

    await this.audit.logAccess({
      userId: id, action: "PASSWORD_CHANGED",
      resource: `user:${id}`, metadata: { by: "self" },
    });

    return { message: "Contraseña actualizada. Inicie sesión nuevamente." };
  }

  // ────────────────────────────────────────────────────────
  //  ELIMINACIÓN
  // ────────────────────────────────────────────────────────
  async remove(id: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== "ADMIN")
      throw new ForbiddenException("Solo ADMIN puede eliminar usuarios");

    if (id === requesterId)
      throw new BadRequestException("No puedes eliminar tu propio usuario");

    const targetUser = await this.findOne(id); // valida existencia

    // Audit log ANTES de borrar (sino cascade elimina el log también)
    await this.audit.logAccess({
      userId: requesterId,
      action: "USER_DELETED",
      resource: `user:${id}`,
      metadata: { targetEmail: targetUser.email, targetRole: targetUser.role },
    });

    // Cascade implícito: User → sessions, auditChanges, accessLogs (definido en schema)
    await this.prisma.user.delete({ where: { id } });
    return { message: "Usuario eliminado correctamente" };
  }

  // ────────────────────────────────────────────────────────
  //  SESIONES ACTIVAS
  // ────────────────────────────────────────────────────────
  async listSessions(userId: string, requesterId: string, requesterRole: string) {
    if (userId !== requesterId && requesterRole !== "ADMIN")
      throw new ForbiddenException("No autorizado");

    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true, userAgent: true, ipAddress: true,
        expiresAt: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeAllSessions(userId: string, requesterId: string, requesterRole: string) {
    if (userId !== requesterId && requesterRole !== "ADMIN")
      throw new ForbiddenException("No autorizado");

    const result = await this.prisma.session.deleteMany({ where: { userId } });
    return { message: `${result.count} sesiones cerradas` };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private generateTempPassword(): string {
    // 16 caracteres alfanuméricos seguros · sin chars confusos (0/O, 1/l)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = randomBytes(16);
    let result = "";
    for (let i = 0; i < 16; i++) result += chars[bytes[i] % chars.length];
    return result;
  }
}
