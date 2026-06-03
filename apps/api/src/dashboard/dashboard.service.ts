import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Dashboard ejecutivo agregando los 4 workspaces:
   *  - Plataforma Auditoría (cronograma)
   *  - Granjas
   *  - Rutas
   *  - CEDIS
   */
  async getEjecutivo() {
    const [
      totalUsers,
      activeUsers,
      totalGranjas,
      granjasRiesgo,
      totalRutas,
      rutasActivas,
      totalCedis,
      cedisActivos,
      hallazgosGranjas,
      hallazgosCedis,
      kpisActivos,
      kpisCompletados,
      auditoriasGranjas,
      auditoriasCedis,
      acompanamientos,
      acompanamientosConHallazgos,
      activitiesCronograma,
      activitiesCompletadas,
      ultimaActividadGranjas,
      ultimaActividadCedis,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.granja.count(),
      this.prisma.granja.count({ where: { nivelRiesgo: { in: ["ALTO", "MEDIO"] } } }),
      this.prisma.ruta.count(),
      this.prisma.ruta.count({ where: { activa: true } }),
      this.prisma.cedi.count(),
      this.prisma.cedi.count({ where: { activo: true } }),
      this.prisma.hallazgo.count(),
      this.prisma.hallazgoCedi.count(),
      this.prisma.kPI.count({ where: { estado: { in: ["EN_CURSO", "NO_INICIADO"] } } }),
      this.prisma.kPI.count({ where: { estado: "COMPLETADO" } }),
      this.prisma.auditoriaGranja.count(),
      this.prisma.auditoriaCedi.count(),
      this.prisma.acompanamiento.count(),
      this.prisma.acompanamiento.count({
        where: { estado: { in: ["CON_HALLAZGOS"] } },
      }),
      this.prisma.auditActivity.count(),
      this.prisma.auditActivity.count({ where: { status: "COMPLETED" } }),
      this.prisma.actividadGranjaLog.findMany({
        take: 10, orderBy: { timestamp: "desc" },
      }),
      this.prisma.evidenciaCedi.findMany({
        take: 5, orderBy: { uploadedAt: "desc" },
      }),
    ]);

    // ── HALLAZGOS por criticidad ──
    const [hallazgosCriticos, hallazgosAltos, hallazgosAbiertos] = await Promise.all([
      this.prisma.hallazgo.count({ where: { criticidad: "CRITICA" } })
        .then(g => this.prisma.hallazgoCedi.count({ where: { criticidad: "Crítica" } })
        .then(c => g + c)),
      this.prisma.hallazgo.count({ where: { criticidad: "ALTA" } })
        .then(g => this.prisma.hallazgoCedi.count({ where: { criticidad: "Alta" } })
        .then(c => g + c)),
      this.prisma.hallazgo.count({ where: { estado: "ABIERTO" } })
        .then(g => this.prisma.hallazgoCedi.count({ where: { estado: "Abierto" } })
        .then(c => g + c)),
    ]);

    // ── KPIs Cumplimiento ──
    const cumplimientoKPI = kpisActivos + kpisCompletados > 0
      ? Math.round((kpisCompletados / (kpisActivos + kpisCompletados)) * 100)
      : 0;

    // ── Auditorías por workspace ──
    const totalAuditorias = auditoriasGranjas + auditoriasCedis + acompanamientos;

    return {
      timestamp: new Date().toISOString(),
      usuarios: {
        total: totalUsers,
        activos: activeUsers,
        inactivos: totalUsers - activeUsers,
      },
      workspaces: {
        granjas: { total: totalGranjas, enRiesgo: granjasRiesgo },
        rutas:   { total: totalRutas,   activas: rutasActivas },
        cedis:   { total: totalCedis,   activos: cedisActivos },
      },
      hallazgos: {
        total: hallazgosGranjas + hallazgosCedis,
        criticos: hallazgosCriticos,
        altos: hallazgosAltos,
        abiertos: hallazgosAbiertos,
        porModulo: {
          granjas: hallazgosGranjas,
          cedis: hallazgosCedis,
        },
      },
      auditorias: {
        total: totalAuditorias,
        porModulo: {
          granjas: auditoriasGranjas,
          cedis: auditoriasCedis,
          rutas: acompanamientos,
        },
        conHallazgos: acompanamientosConHallazgos,
      },
      kpi: {
        cumplimiento: cumplimientoKPI,
        completados: kpisCompletados,
        activos: kpisActivos,
      },
      cronograma: {
        total: activitiesCronograma,
        completadas: activitiesCompletadas,
        progreso: activitiesCronograma > 0
          ? Math.round((activitiesCompletadas / activitiesCronograma) * 100)
          : 0,
      },
      actividadReciente: {
        granjas: ultimaActividadGranjas,
        cedisEvidencias: ultimaActividadCedis,
      },
    };
  }

  /**
   * Estadísticas de seguridad: accesos último 7d, fallos de login, etc.
   */
  async getSeguridad() {
    const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [accesosUltima7d, fallosLogin, sesionesActivas] = await Promise.all([
      this.prisma.accessLog.count({
        where: { createdAt: { gte: semanaAtras }, action: "LOGIN" },
      }),
      this.prisma.accessLog.count({
        where: { createdAt: { gte: semanaAtras }, action: "LOGIN_FAILED" },
      }),
      this.prisma.session.count({
        where: { expiresAt: { gt: new Date() } },
      }),
    ]);

    return {
      accesosUltima7d,
      fallosLogin,
      sesionesActivas,
      tasaExito: accesosUltima7d + fallosLogin > 0
        ? Math.round((accesosUltima7d / (accesosUltima7d + fallosLogin)) * 100)
        : 100,
    };
  }

  /**
   * Top auditores: ranking por nº de actividades + hallazgos detectados.
   */
  async getTopAuditores(limit = 10) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ["AUDITOR", "SUPERVISOR"] }, isActive: true },
      select: {
        id: true, name: true, email: true, role: true,
        _count: {
          select: {
            auditActivities: true,
            auditChanges: true,
          },
        },
      },
    });

    const ranked = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      actividades: u._count.auditActivities,
      cambios: u._count.auditChanges,
      score: u._count.auditActivities * 3 + u._count.auditChanges,
    }));

    return ranked.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
