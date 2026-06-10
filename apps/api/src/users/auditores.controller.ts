// ─── AUDITORES CONTROLLER ────────────────────────────────────────────────────
// Alias de /users filtrado por rol AUDITOR — resuelve endpoint que espera el
// frontend en /api/v1/auditores (404 en producción por falta de módulo).
// ─────────────────────────────────────────────────────────────────────────────
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("auditores")
@UseGuards(JwtAuthGuard)
export class AuditoresController {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /auditores
   * Devuelve usuarios con role AUDITOR activos, con stats de actividad.
   */
  @Get()
  async list(
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
  ) {
    const where: any = {
      role: { in: ["AUDITOR", "SUPERVISOR"] },
    };

    if (isActive !== undefined) {
      where.isActive = isActive !== "false";
    }

    if (search?.trim()) {
      where.OR = [
        { name:  { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const auditores = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            auditActivities: true,
            accessLogs: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Contar actividades de cronograma por auditor (AuditActivity.auditorId)
    const activityCounts = await this.prisma.auditActivity.groupBy({
      by: ["auditorId"],
      _count: { id: true },
    });
    const actMap = Object.fromEntries(
      activityCounts.map((a) => [a.auditorId, a._count.id]),
    );

    return auditores.map((a) => ({
      id:          a.id,
      name:        a.name,
      email:       a.email,
      role:        a.role,
      isActive:    a.isActive,
      avatarUrl:   a.avatarUrl,
      createdAt:   a.createdAt,
      stats: {
        actividadesCronograma: actMap[a.id] ?? 0,
        logsAcceso:            a._count.accessLogs,
      },
    }));
  }

  /**
   * GET /auditores/stats
   * Estadísticas globales de auditores para el dashboard.
   */
  @Get("stats")
  async stats() {
    const [total, activos, byRole] = await Promise.all([
      this.prisma.user.count({ where: { role: { in: ["AUDITOR", "SUPERVISOR"] } } }),
      this.prisma.user.count({ where: { role: { in: ["AUDITOR", "SUPERVISOR"] }, isActive: true } }),
      this.prisma.user.groupBy({
        by: ["role"],
        where: { role: { in: ["AUDITOR", "SUPERVISOR"] } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      activos,
      inactivos: total - activos,
      byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count.id])),
    };
  }
}
