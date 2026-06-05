// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS · service · in-app + email opcional
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

export type NotificationKind =
  | "USER_CREATED" | "ROLE_CHANGED" | "PASSWORD_RESET" | "INVITATION_SENT"
  | "HALLAZGO_ASSIGNED" | "KPI_ASSIGNED" | "ALERT_CRITICAL"
  | "ACCESS_GRANTED" | "SYSTEM";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface CreateNotificationDto {
  userId:   string;
  kind:     NotificationKind;
  severity?: NotificationSeverity;
  title:    string;
  message:  string;
  metadata?: Record<string, any>;
  // Si se provee email, intentará enviar via SMTP (no-op si SMTP no configurado).
  email?: { to: string; subject: string; html: string };
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private email:  EmailService,
  ) {}

  // ── lectura ──
  async findForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
    });
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  // ── creación · respeta notificationPrefs del usuario ──
  async create(dto: CreateNotificationDto) {
    // Leer preferencias del destinatario
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { notificationPrefs: true },
    });
    const prefs = this.parsePrefs(user?.notificationPrefs);
    const kindPrefs = prefs[dto.kind] ?? { inApp: true, email: true };

    // Si el usuario desactivó in-app PARA este kind, no creamos la fila.
    // Excepción: severity CRITICAL siempre se crea (override de seguridad).
    const skipInApp = kindPrefs.inApp === false && dto.severity !== "CRITICAL";
    if (skipInApp && !dto.email) {
      // Ni notif in-app ni email solicitado · no-op
      return null;
    }

    let n: any = null;
    if (!skipInApp) {
      n = await this.prisma.notification.create({
        data: {
          userId:   dto.userId,
          kind:     dto.kind,
          severity: dto.severity ?? "INFO",
          title:    dto.title,
          message:  dto.message,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        },
      });
    }

    // Email solo si: (a) caller lo solicita Y (b) usuario lo permite (o CRITICAL)
    const skipEmail = kindPrefs.email === false && dto.severity !== "CRITICAL";
    if (dto.email && !skipEmail) {
      const result = await this.email.send({
        to: dto.email.to, subject: dto.email.subject, html: dto.email.html,
      });
      if (n) {
        await this.prisma.notification.update({
          where: { id: n.id },
          data: { emailSent: result.ok, emailError: result.ok ? null : result.error ?? null },
        });
      }
    }
    return n;
  }

  private parsePrefs(raw: string | null | undefined): Record<string, { inApp?: boolean; email?: boolean }> {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  /**
   * Helper masivo · notifica a varios usuarios (mismo kind/title) en una sola transacción.
   * No envía email · usar para alertas internas tipo SYSTEM.
   */
  async createBulk(userIds: string[], payload: Omit<CreateNotificationDto, "userId" | "email">) {
    if (userIds.length === 0) return { count: 0 };
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        kind:     payload.kind,
        severity: payload.severity ?? "INFO",
        title:    payload.title,
        message:  payload.message,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      })),
    });
    return { count: userIds.length };
  }

  // ── marcar leídas ──
  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException("Notificación no encontrada");
    if (n.readAt) return n;
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    const r = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data:  { readAt: new Date() },
    });
    return { count: r.count };
  }

  async remove(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException("Notificación no encontrada");
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }
}
