// ═══════════════════════════════════════════════════════════════════════════════
// Audit Activities · Executive Dashboard Service
// ═══════════════════════════════════════════════════════════════════════════════
// Calcula:
//   · 13 KPIs ejecutivos
//   · Datasets pre-agregados para 8 gráficos
//   · Alertas inteligentes
//   · Matriz de trazabilidad
//   · Diagnóstico de calidad de datos
//   · Resumen heurístico (sin IA) + tabla para IA opcional
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ExecutiveFilters {
  year?: number;
  auditorId?: string;
  status?: string;
  mes?: number;
  area?: string;
  activityType?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  cumplimientoMin?: number;
  cumplimientoMax?: number;
}

@Injectable()
export class AuditActivitiesExecutiveService {
  constructor(private prisma: PrismaService) {}

  async getExecutive(filters: ExecutiveFilters) {
    const year = filters.year ?? 2026;

    // ── 1. Query base con filtros ──
    const where: any = { year };
    if (filters.auditorId)    where.auditorId    = filters.auditorId;
    if (filters.status)       where.status       = filters.status;
    if (filters.area)         where.area         = filters.area;
    if (filters.activityType) where.activityType = filters.activityType;
    if (filters.fechaDesde)   where.startDate    = { gte: new Date(filters.fechaDesde) };
    if (filters.fechaHasta) {
      where.startDate = {
        ...(where.startDate ?? {}),
        lte: new Date(filters.fechaHasta),
      };
    }

    let activities = await this.prisma.auditActivity.findMany({
      where,
      orderBy: [{ startDate: "asc" }, { item: "asc" }],
    });

    // Filtro de mes en memoria (Prisma sqlite no soporta EXTRACT MONTH simple)
    if (filters.mes) {
      activities = activities.filter(a => a.startDate.getMonth() + 1 === filters.mes);
    }

    // ── 2. 13 KPIs ──
    const total       = activities.length;
    const completed   = activities.filter(a => a.status === "COMPLETED").length;
    const inProgress  = activities.filter(a => a.status === "IN_PROGRESS").length;
    const notStarted  = activities.filter(a => a.status === "NOT_STARTED").length;
    const overdue     = activities.filter(a => a.status === "OVERDUE").length;
    const reprogramed = activities.filter(a => a.notes?.toLowerCase().includes("reprogram")).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Avance ponderado: completadas vs días transcurridos en el año
    const now = new Date();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31);
    const daysTotal = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysElapsed = Math.min(daysTotal, Math.max(0, (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)));
    const expectedProgress = total > 0 ? (daysElapsed / daysTotal) * total : 0;
    const avanceAcumuladoPonderado = expectedProgress > 0
      ? Math.min(100, Math.round((completed / expectedProgress) * 100))
      : 0;

    const totalAreasAuditadas = new Set(activities.map(a => a.area)).size;

    // Hallazgos linkados (por área + fechaVisita en rango del cronograma)
    const totalHallazgos = await this.prisma.hallazgo.count({
      where: filters.fechaDesde || filters.fechaHasta
        ? {
            fechaVisita: {
              ...(filters.fechaDesde && { gte: new Date(filters.fechaDesde) }),
              ...(filters.fechaHasta && { lte: new Date(filters.fechaHasta) }),
            },
          }
        : {},
    });

    const totalIncidencias = overdue + reprogramed;

    // Calidad del cronograma: completed on-time / (completed + overdue)
    const completedOnTime = activities.filter(a =>
      a.status === "COMPLETED" && a.endDate >= now
    ).length;
    const indiceCalidad = (completed + overdue) > 0
      ? Math.round((completedOnTime / (completed + overdue)) * 100)
      : 100;

    // Ejecución operativa: (completed + inProgress) / total
    const indiceEjecucion = total > 0
      ? Math.round(((completed + inProgress) / total) * 100)
      : 0;

    // Cobertura: áreas únicas auditadas vs áreas totales posibles (todas las áreas del cronograma)
    const todasLasAreas = await this.prisma.auditActivity.findMany({
      where: { year }, select: { area: true }, distinct: ["area"],
    });
    const coberturaAuditoria = todasLasAreas.length > 0
      ? Math.round((totalAreasAuditadas / todasLasAreas.length) * 100)
      : 0;

    // Cumplimiento por auditor (promedio)
    const auditorStats = this.calcByAuditor(activities);
    const cumplimientoPromedioAuditor = auditorStats.length > 0
      ? Math.round(auditorStats.reduce((acc, a) => acc + a.completionRate, 0) / auditorStats.length)
      : 0;

    // ── 3. Aplicar filtro por % cumplimiento (solo afecta a las visualizaciones por auditor) ──
    const auditoresFiltrados = auditorStats.filter(a => {
      const inMin = filters.cumplimientoMin == null || a.completionRate >= filters.cumplimientoMin;
      const inMax = filters.cumplimientoMax == null || a.completionRate <= filters.cumplimientoMax;
      return inMin && inMax;
    });

    // ── 4. Datasets para los 8 gráficos ──

    // (1) Distribución por Estado
    const distribucionEstado = [
      { name: "Completadas",  value: completed,    color: "#10B981" },
      { name: "En Curso",     value: inProgress,   color: "#F59E0B" },
      { name: "No Iniciadas", value: notStarted,   color: "#64748B" },
      { name: "Vencidas",     value: overdue,      color: "#EF4444" },
    ];

    // (2) Cumplimiento por Mes
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const cumplimientoMes = meses.map(m => {
      const mActs = activities.filter(a => a.startDate.getMonth() + 1 === m);
      const mDone = mActs.filter(a => a.status === "COMPLETED").length;
      return {
        mes: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m - 1],
        mesNum: m,
        Planificadas: mActs.length,
        Completadas: mDone,
        Cumplimiento: mActs.length > 0 ? Math.round((mDone / mActs.length) * 100) : 0,
      };
    });

    // (3) Tendencia Mensual (acumulada)
    let acumPlan = 0;
    let acumEjec = 0;
    const tendenciaMes = cumplimientoMes.map(m => {
      acumPlan += m.Planificadas;
      acumEjec += m.Completadas;
      return {
        mes: m.mes,
        AcumPlanificadas: acumPlan,
        AcumEjecutadas:   acumEjec,
        Variacion: acumPlan > 0 ? Math.round(((acumEjec - acumPlan) / acumPlan) * 100) : 0,
      };
    });

    // (4) Ranking de Auditores
    const ranking = auditoresFiltrados
      .map(a => ({ ...a, score: a.completionRate * 0.7 + (a.totalAssigned * 0.3) }))
      .sort((a, b) => b.score - a.score);

    // (5) Distribución por Áreas
    const areasMap: Record<string, { total: number; done: number }> = {};
    for (const a of activities) {
      if (!areasMap[a.area]) areasMap[a.area] = { total: 0, done: 0 };
      areasMap[a.area].total += 1;
      if (a.status === "COMPLETED") areasMap[a.area].done += 1;
    }
    const distribucionAreas = Object.entries(areasMap)
      .map(([area, s]) => ({
        area: area.length > 30 ? area.slice(0,28) + "…" : area,
        areaFull: area,
        Actividades: s.total,
        Completadas: s.done,
        Cumplimiento: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.Actividades - a.Actividades);

    // (6) Matriz de Riesgo (impacto × probabilidad)
    const matrizRiesgo = activities
      .filter(a => a.status === "OVERDUE" || a.status === "NOT_STARTED")
      .map(a => {
        const diasVencimiento = Math.floor((now.getTime() - a.endDate.getTime()) / (1000 * 60 * 60 * 24));
        let impacto: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
        if (diasVencimiento > 60)      impacto = "CRITICO";
        else if (diasVencimiento > 30) impacto = "ALTO";
        else if (diasVencimiento > 0)  impacto = "MEDIO";
        else                            impacto = "BAJO";

        let probabilidad = 50;
        if (a.status === "OVERDUE")    probabilidad = 90;
        if (a.status === "NOT_STARTED" && diasVencimiento > 0) probabilidad = 70;

        return {
          id: a.id,
          actividad: a.activity,
          area: a.area,
          auditor: a.auditorName,
          fechaCompromiso: a.endDate.toISOString().slice(0, 10),
          diasVencimiento,
          impacto,
          probabilidad,
          status: a.status,
        };
      });

    // (7) Alertas ejecutivas
    const alertas = this.buildAlertas(activities, completionRate, indiceCalidad, matrizRiesgo);

    // (8) Matriz de Trazabilidad (top 25)
    const trazabilidad = activities.slice(0, 50).map(a => ({
      id: a.id,
      item: a.item,
      actividad: a.activity,
      area: a.area,
      responsable: a.auditorName,
      tipo: a.activityType,
      fechaInicio: a.startDate.toISOString().slice(0, 10),
      fechaCompromiso: a.endDate.toISOString().slice(0, 10),
      status: a.status,
      cumplimiento: a.status === "COMPLETED" ? 100
                  : a.status === "IN_PROGRESS" ? 50
                  : a.status === "OVERDUE" ? 0
                  : 25,
      notas: a.notes,
    }));

    // ── 5. Calidad de datos ──
    const calidadDatos = await this.diagnoseDataQuality(activities, year);

    // ── 6. Resumen heurístico (sin IA · útil siempre) ──
    const resumenHeuristico = this.buildHeuristicSummary({
      total, completed, inProgress, overdue, completionRate,
      indiceCalidad, coberturaAuditoria, avanceAcumuladoPonderado,
      topAreas: distribucionAreas.slice(0, 3),
      topAuditores: ranking.slice(0, 3),
      bottomAuditores: ranking.slice(-3).reverse(),
      alertasCriticas: alertas.filter(a => a.severity === "CRITICAL").length,
    });

    return {
      timestamp: new Date().toISOString(),
      filters,
      kpis: {
        actividadesPlanificadas:        total,
        actividadesCompletadas:         completed,
        actividadesEnCurso:             inProgress,
        actividadesNoIniciadas:         notStarted,
        actividadesVencidas:            overdue,
        actividadesReprogramadas:       reprogramed,
        porcentajeCumplimientoGeneral:  completionRate,
        avanceAcumuladoPonderado,
        totalAreasAuditadas,
        totalHallazgos,
        totalIncidencias,
        indiceCalidadCronograma:        indiceCalidad,
        indiceEjecucionOperativa:       indiceEjecucion,
        coberturaAuditoria,
        cumplimientoPromedioAuditor,
      },
      charts: {
        distribucionEstado,
        cumplimientoMes,
        tendenciaMes,
        ranking,
        distribucionAreas,
        matrizRiesgo,
      },
      alertas,
      trazabilidad,
      calidadDatos,
      resumenHeuristico,
      meta: {
        actividadesFiltradas: activities.length,
        auditoresFiltrados:   auditoresFiltrados.length,
      },
    };
  }

  // ────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────

  private calcByAuditor(activities: any[]) {
    const map: Record<string, { auditorId: string; auditorName: string; total: number; done: number; inProgress: number; overdue: number }> = {};
    for (const a of activities) {
      if (!map[a.auditorId]) {
        map[a.auditorId] = {
          auditorId:   a.auditorId,
          auditorName: a.auditorName,
          total: 0, done: 0, inProgress: 0, overdue: 0,
        };
      }
      map[a.auditorId].total += 1;
      if (a.status === "COMPLETED")   map[a.auditorId].done       += 1;
      if (a.status === "IN_PROGRESS") map[a.auditorId].inProgress += 1;
      if (a.status === "OVERDUE")     map[a.auditorId].overdue    += 1;
    }
    return Object.values(map).map(a => ({
      auditorId: a.auditorId,
      auditorName: a.auditorName,
      totalAssigned: a.total,
      completed: a.done,
      inProgress: a.inProgress,
      overdue: a.overdue,
      completionRate: a.total > 0 ? Math.round((a.done / a.total) * 100) : 0,
    }));
  }

  private buildAlertas(
    activities: any[],
    completionRate: number,
    indiceCalidad: number,
    matrizRiesgo: any[],
  ) {
    const alertas: Array<{
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
      type: string;
      title: string;
      description: string;
      count?: number;
    }> = [];

    if (completionRate < 50) {
      alertas.push({
        severity: "CRITICAL",
        type: "COMPLIANCE",
        title: "Cumplimiento general bajo",
        description: `El cronograma tiene ${completionRate}% de cumplimiento · requiere intervención inmediata`,
      });
    }

    const vencidas = matrizRiesgo.filter(m => m.impacto === "CRITICO" || m.impacto === "ALTO");
    if (vencidas.length > 0) {
      alertas.push({
        severity: "HIGH",
        type: "OVERDUE",
        title: `${vencidas.length} actividades vencidas con impacto alto/crítico`,
        description: `Suma de días de retraso acumulado: ${vencidas.reduce((acc, v) => acc + v.diasVencimiento, 0)} días`,
        count: vencidas.length,
      });
    }

    if (indiceCalidad < 70) {
      alertas.push({
        severity: "MEDIUM",
        type: "QUALITY",
        title: "Índice de calidad bajo",
        description: `Solo ${indiceCalidad}% de actividades completadas dentro del plazo establecido`,
      });
    }

    // Actividades por iniciar en próximos 7 días
    const sieteDiasAdelante = new Date();
    sieteDiasAdelante.setDate(sieteDiasAdelante.getDate() + 7);
    const proximas = activities.filter(a =>
      a.status === "NOT_STARTED" &&
      a.startDate > new Date() &&
      a.startDate <= sieteDiasAdelante
    );
    if (proximas.length > 0) {
      alertas.push({
        severity: "INFO",
        type: "UPCOMING",
        title: `${proximas.length} actividades por iniciar en los próximos 7 días`,
        description: "Asegurar asignación y preparación de recursos",
        count: proximas.length,
      });
    }

    return alertas;
  }

  private async diagnoseDataQuality(activities: any[], year: number) {
    const camposVacios = {
      sinNotas:           activities.filter(a => !a.notes || a.notes.trim() === "").length,
      sinAuditorAsignado: activities.filter(a => !a.auditorId).length,
      sinFechas:          activities.filter(a => !a.startDate || !a.endDate).length,
    };

    // Detectar duplicados por (area + activity + auditorId)
    const seen = new Set<string>();
    let duplicados = 0;
    for (const a of activities) {
      const key = `${a.area}::${a.activity}::${a.auditorId}`;
      if (seen.has(key)) duplicados += 1;
      else seen.add(key);
    }

    // Detectar inconsistencias temporales (endDate < startDate)
    const inconsistenciasFechas = activities.filter(a => a.endDate < a.startDate).length;

    // Anomalías: actividades con startDate > fin del año o < inicio del año
    const anioStart = new Date(year, 0, 1);
    const anioEnd   = new Date(year, 11, 31, 23, 59, 59);
    const fechasFueraDeAnio = activities.filter(a =>
      a.startDate < anioStart || a.startDate > anioEnd
    ).length;

    const total = activities.length;
    const issuesTotal = camposVacios.sinNotas + camposVacios.sinAuditorAsignado + camposVacios.sinFechas
                     + duplicados + inconsistenciasFechas + fechasFueraDeAnio;

    return {
      total,
      issuesTotal,
      score: total > 0 ? Math.max(0, 100 - Math.round((issuesTotal / (total * 6)) * 100)) : 100,
      camposVacios,
      duplicados,
      inconsistenciasFechas,
      fechasFueraDeAnio,
    };
  }

  private buildHeuristicSummary(p: {
    total: number; completed: number; inProgress: number; overdue: number;
    completionRate: number; indiceCalidad: number; coberturaAuditoria: number;
    avanceAcumuladoPonderado: number;
    topAreas: any[]; topAuditores: any[]; bottomAuditores: any[];
    alertasCriticas: number;
  }) {
    const sentences: string[] = [];

    // Estado general
    if (p.total === 0) {
      sentences.push("📋 El cronograma no tiene actividades registradas para el período filtrado.");
    } else {
      const estado = p.completionRate >= 80 ? "EXCELENTE"
                   : p.completionRate >= 60 ? "ACEPTABLE"
                   : p.completionRate >= 40 ? "REGULAR"
                   : "CRÍTICO";
      sentences.push(`📊 Estado general del cronograma: **${estado}** con ${p.completionRate}% de cumplimiento.`);
      sentences.push(`✓ ${p.completed} actividades completadas · ${p.inProgress} en curso · ${p.overdue} vencidas (de ${p.total} totales).`);
    }

    // Avance vs expectativa
    if (p.avanceAcumuladoPonderado > 0) {
      if (p.avanceAcumuladoPonderado >= 90) {
        sentences.push(`📈 El avance ponderado (${p.avanceAcumuladoPonderado}%) está en línea con lo esperado según el calendario.`);
      } else if (p.avanceAcumuladoPonderado >= 70) {
        sentences.push(`⚠️ El avance ponderado (${p.avanceAcumuladoPonderado}%) muestra cierto retraso respecto al esperado.`);
      } else {
        sentences.push(`🚨 El avance ponderado (${p.avanceAcumuladoPonderado}%) indica desviación importante. Requiere plan de recuperación.`);
      }
    }

    // Calidad
    if (p.indiceCalidad < 70) {
      sentences.push(`⚠️ El índice de calidad (${p.indiceCalidad}%) refleja actividades completadas fuera de plazo. Revisar planificación.`);
    }

    // Cobertura
    if (p.coberturaAuditoria < 100) {
      sentences.push(`📍 Cobertura de auditoría: ${p.coberturaAuditoria}% de las áreas del plan han sido tocadas.`);
    }

    // Top performers
    if (p.topAuditores.length > 0 && p.topAuditores[0].completionRate >= 70) {
      const top = p.topAuditores[0];
      sentences.push(`🏆 Auditor con mejor desempeño: **${top.auditorName}** con ${top.completionRate}% de cumplimiento en ${top.totalAssigned} actividades.`);
    }

    // Bottom performers
    if (p.bottomAuditores.length > 0 && p.bottomAuditores[0].completionRate < 50) {
      const bottom = p.bottomAuditores[0];
      sentences.push(`📉 Auditor que requiere apoyo: **${bottom.auditorName}** con ${bottom.completionRate}% de cumplimiento. Considere reasignación o coaching.`);
    }

    // Áreas críticas
    const areasCriticas = p.topAreas.filter(a => a.Cumplimiento < 50);
    if (areasCriticas.length > 0) {
      sentences.push(`🔴 Áreas críticas (cumplimiento <50%): ${areasCriticas.map(a => a.areaFull ?? a.area).join(" · ")}`);
    }

    // Recomendaciones
    const recomendaciones: string[] = [];
    if (p.overdue > 0) {
      recomendaciones.push(`🛠️ Reprogramar urgentemente las ${p.overdue} actividades vencidas o documentar su cancelación.`);
    }
    if (p.completionRate < 50 && p.completed > 0) {
      recomendaciones.push("📅 Convocar comité ejecutivo para revisar capacidad operativa y reasignar cargas.");
    }
    if (p.alertasCriticas > 0) {
      recomendaciones.push(`🚨 Atender las ${p.alertasCriticas} alertas críticas identificadas en el panel de alertas.`);
    }
    if (p.indiceCalidad < 70) {
      recomendaciones.push("🎯 Implementar checkpoints semanales para detectar desviaciones tempranas.");
    }
    if (recomendaciones.length === 0) {
      recomendaciones.push("✅ El cronograma muestra buena salud operativa. Mantener cadencia actual.");
    }

    return {
      resumen: sentences,
      recomendaciones,
      estado: p.completionRate >= 80 ? "EXCELENTE"
            : p.completionRate >= 60 ? "ACEPTABLE"
            : p.completionRate >= 40 ? "REGULAR"
            : "CRITICO",
    };
  }
}
