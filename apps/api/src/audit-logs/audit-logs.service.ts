// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS · lectura de AccessLog + AuditActivityLog
// ═══════════════════════════════════════════════════════════════════════════════
// Modelos ya existentes (no se modifica schema):
//   - AccessLog: registros de acceso (login, logout, MFA, password changes)
//   - AuditActivityLog: cambios en AuditActivity (cronograma)
//
// Helper público logAccess() consumido por auth.service / users.service.
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AccessAction =
  | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "MFA_SUCCESS" | "MFA_FAILED"
  | "LOGOUT" | "PASSWORD_CHANGED" | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED" | "INVITATION_SENT" | "INVITATION_ACCEPTED"
  | "USER_CREATED" | "USER_DELETED" | "ROLE_CHANGED" | "ACCOUNT_DEACTIVATED";

export interface AccessFilters {
  userId?: string;
  action?: string;
  search?: string;     // busca en action + resource + metadata
  from?: string;       // ISO date
  to?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  // ── ESCRITURA (consumido por otros módulos) ──
  async logAccess(input: {
    userId:   string;
    action:   AccessAction | string;
    resource?: string;
    ip?:       string;
    ua?:       string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.accessLog.create({
        data: {
          userId:    input.userId,
          action:    input.action,
          resource:  input.resource,
          ipAddress: input.ip,
          userAgent: input.ua,
          metadata:  input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    } catch {
      // No queremos que un fallo de logging tire la operación principal
    }
  }

  // ── LECTURA · ACCESS LOGS ──
  async listAccess(filters: AccessFilters) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.search) {
      where.OR = [
        { action:   { contains: filters.search } },
        { resource: { contains: filters.search } },
        { metadata: { contains: filters.search } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to)   where.createdAt.lte = new Date(filters.to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accessLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 100,
        skip: filters.offset ?? 0,
      }),
      this.prisma.accessLog.count({ where }),
    ]);
    return { items, total, limit: filters.limit ?? 100, offset: filters.offset ?? 0 };
  }

  // ── LECTURA · STATS ──
  async statsAccess() {
    const since = new Date(Date.now() - 30 * 24 * 3600_000); // últimos 30 días
    const [total, last30d, byActionRaw, topUsersRaw] = await Promise.all([
      this.prisma.accessLog.count(),
      this.prisma.accessLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.accessLog.groupBy({
        by: ["action"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      }),
      this.prisma.accessLog.groupBy({
        by: ["userId"],
        where: { action: { in: ["LOGIN_SUCCESS", "MFA_SUCCESS"] }, createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    // Hidratar usuarios — userId puede ser null (usuarios eliminados · SET NULL)
    const userIds = topUsersRaw
      .map(u => u.userId)
      .filter((id): id is string => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));

    return {
      total, last30d,
      byAction: byActionRaw.map(a => ({ action: a.action, count: (a._count as any)?.id ?? 0 })),
      topUsers: topUsersRaw.map(t => ({
        userId: t.userId, count: (t._count as any)?.id ?? 0,
        user: (t.userId && usersMap[t.userId]) || { id: t.userId ?? "", name: "(eliminado)", email: "", role: "" },
      })),
    };
  }

  // ── LECTURA · AUDIT ACTIVITY LOGS (cronograma) ──
  async listActivity(filters: { activityId?: string; userId?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (filters.activityId) where.activityId = filters.activityId;
    if (filters.userId)     where.userId     = filters.userId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditActivityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          activity: { select: { id: true, activity: true, area: true, year: true } },
        },
        orderBy: { changedAt: "desc" },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      this.prisma.auditActivityLog.count({ where }),
    ]);
    return { items, total, limit: filters.limit ?? 50, offset: filters.offset ?? 0 };
  }

  // ── LECTURA · sesiones activas de TODOS los usuarios (admin global) ──
  async listAllSessions() {
    return this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
