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

  // ── creación ──
  async create(dto: CreateNotificationDto) {
    const n = await this.prisma.notification.create({
      data: {
        userId:   dto.userId,
        kind:     dto.kind,
        severity: dto.severity ?? "INFO",
        title:    dto.title,
        message:  dto.message,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });

    // Email opcional
    if (dto.email) {
      const result = await this.email.send({
        to: dto.email.to, subject: dto.email.subject, html: dto.email.html,
      });
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { emailSent: result.ok, emailError: result.ok ? null : result.error ?? null },
      });
    }
    return n;
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
