// ═══════════════════════════════════════════════════════════════════════════════
// GRANJAS · Executive Dashboard Service
// ═══════════════════════════════════════════════════════════════════════════════
// 14 KPIs · 7 charts · trazabilidad auditorias · alertas + IA
// Filtros: auditor, granja, tipoGranja, tipoOperativo, estado, criticidad,
//          fechaVisita (rango), tipoRiesgo, mes/año
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface GranjasExecutiveFilters {
  year?: number;
  granjaId?: string;
  auditorId?: string;
  tipoGranja?: string;
  tipoOperativo?: string;
  estado?: string;
  criticidad?: string;
  tipoRiesgo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  mes?: number;
}

const TIPOS_RIESGO = ["OPERATIVO", "REPUTACIONAL", "FINANCIERO", "LEGAL", "CONTAGIO"];
const CATEGORIAS = [
  "AMBIENTAL", "BIOSEGURIDAD", "SANITARIO", "FINANCIERO", "DOCUMENTAL",
  "MORTALIDAD", "INVENTARIO_INSUMOS", "INFRAESTRUCTURA", "OPERATIVO",
];
const CRITICIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"];

@Injectable()
export class GranjasExecutiveService {
  constructor(private prisma: PrismaService) {}

  async getExecutive(filters: GranjasExecutiveFilters) {
    const year = filters.year ?? new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    // ── Granjas con filtros estructurales ──
    const granjaWhere: any = {};
    if (filters.granjaId)      granjaWhere.id            = filters.granjaId;
    if (filters.tipoGranja)    granjaWhere.tipoGranja    = filters.tipoGranja;
    if (filters.tipoOperativo) granjaWhere.tipoOperativo = filters.tipoOperativo;
    const granjas = await this.prisma.granja.findMany({
      where: granjaWhere,
      include: { veterinario: { select: { nombre: true } } },
    });
    const granjasIds = granjas.map(g => g.id);

    // ── Auditorías filtradas ──
    const audWhere: any = {
      fechaProgramada: { gte: yearStart, lte: yearEnd },
      ...(granjasIds.length > 0 ? { granjaId: { in: granjasIds } } : {}),
    };
    if (filters.auditorId) audWhere.auditorId = filters.auditorId;
    if (filters.estado)    audWhere.estado    = filters.estado;
    if (filters.fechaDesde) audWhere.fechaProgramada = { ...audWhere.fechaProgramada, gte: new Date(filters.fechaDesde) };
    if (filters.fechaHasta) audWhere.fechaProgramada = { ...audWhere.fechaProgramada, lte: new Date(filters.fechaHasta) };

    let auditorias = await this.prisma.auditoriaGranja.findMany({
      where: audWhere,
      include: { granja: { select: { id: true, codigo: true, nombre: true, region: true, tipoGranja: true, tipoOperativo: true } } },
      orderBy: { fechaProgramada: "desc" },
    });

    if (filters.mes) {
      auditorias = auditorias.filter(a => a.fechaProgramada.getMonth() + 1 === filters.mes);
    }

    // ── Hallazgos filtrados ──
    const hallWhere: any = {
      ...(granjasIds.length > 0 ? { granjaId: { in: granjasIds } } : {}),
    };
    if (filters.criticidad) hallWhere.criticidad = filters.criticidad;
    if (filters.auditorId)  hallWhere.auditorId  = filters.auditorId;
    if (filters.fechaDesde) hallWhere.fechaVisita = { gte: new Date(filters.fechaDesde) };
    if (filters.fechaHasta) hallWhere.fechaVisita = { ...(hallWhere.fechaVisita ?? {}), lte: new Date(filters.fechaHasta) };

    let hallazgos = await this.prisma.hallazgo.findMany({
      where: hallWhere,
      include: { granja: { select: { id: true, codigo: true, nombre: true, region: true, tipoGranja: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Filtro por tipoRiesgo (almacenado como JSON stringified array)
    if (filters.tipoRiesgo) {
      hallazgos = hallazgos.filter(h => {
        try {
          const arr = JSON.parse(h.tiposRiesgo || "[]");
          return Array.isArray(arr) && arr.includes(filters.tipoRiesgo);
        } catch { return false; }
      });
    }

    // ── KPIs (planes de acción) ──
    const kpis = await this.prisma.kPI.findMany({
      where: granjasIds.length > 0 ? { granjaId: { in: granjasIds } } : {},
      include: { granja: { select: { nombre: true } }, hallazgo: { select: { titulo: true, categoria: true } } },
      orderBy: { fechaCompromiso: "asc" },
    });

    // ── 14 KPIs ──
    const totalGranjas = granjas.length;
    const granjasPropia    = granjas.filter(g => g.tipoGranja === "PROPIA").length;
    const granjasArrendada = granjas.filter(g => g.tipoGranja === "ARRENDADA").length;
    const granjasIntegrada = granjas.filter(g => g.tipoGranja === "INTEGRADA").length;
    const granjasEngorde      = granjas.filter(g => g.tipoOperativo === "ENGORDE").length;
    const granjasReproductora = granjas.filter(g => g.tipoOperativo === "REPRODUCTORA").length;
    const capacidadTotal      = granjas.reduce((s, g) => s + (g.capacidadAves ?? 0), 0);

    const granjasActivas      = granjas.filter(g => g.estado === "ACTIVA").length;
    const granjasCuarentena   = granjas.filter(g => g.estado === "CUARENTENA").length;
    const granjasRiesgoAlto   = granjas.filter(g => g.nivelRiesgo === "ALTO").length;
    const granjasSanidadCrit  = granjas.filter(g => g.estadoSanitario === "CRITICO").length;

    const totalAuditorias = auditorias.length;
    const auditoresActivos = new Set(auditorias.map(a => a.auditorId).filter(Boolean)).size;

    const totalHallazgos  = hallazgos.length;
    const hallazgosCriticos = hallazgos.filter(h => h.criticidad === "CRITICA").length;
    const hallazgosAltos    = hallazgos.filter(h => h.criticidad === "ALTA").length;
    const hallazgosAbiertos = hallazgos.filter(h => h.estado === "ABIERTO").length;
    const hallazgosCerrados = hallazgos.filter(h => h.estado === "CERRADO").length;

    const totalKPIs       = kpis.length;
    const kpisCompletados = kpis.filter(k => k.estado === "COMPLETADO").length;
    const kpisEnCurso     = kpis.filter(k => k.estado === "EN_CURSO").length;
    const cumplimientoKPI = totalKPIs > 0 ? Math.round((kpisCompletados / totalKPIs) * 100) : 0;
    const avancePromedio  = kpis.length > 0
      ? Math.round(kpis.reduce((s, k) => s + (k.porcentajeAvance ?? 0), 0) / kpis.length)
      : 0;

    const tasaResolucion = totalHallazgos > 0
      ? Math.round((hallazgosCerrados / totalHallazgos) * 100)
      : 0;

    // ── Chart 1: Hallazgos por categoría ──
    const hallazgosPorCategoria = CATEGORIAS.map(c => ({
      categoria: c, count: hallazgos.filter(h => h.categoria === c).length,
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // ── Chart 2: Diagnóstico gráfico por fecha (createdAt) · serie diaria ──
    const diagnosticoFecha: Array<{ fecha: string; count: number }> = [];
    const fechaMap: Record<string, number> = {};
    for (const h of hallazgos) {
      const d = h.createdAt.toISOString().slice(0, 10);
      fechaMap[d] = (fechaMap[d] ?? 0) + 1;
    }
    Object.entries(fechaMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([fecha, count]) => diagnosticoFecha.push({ fecha, count }));

    // ── Chart 3: Distribución por tipo de granja ──
    const distribucionTipo = [
      { tipo: "Propia",    count: granjasPropia,    color: "#10B981" },
      { tipo: "Arrendada", count: granjasArrendada, color: "#3B82F6" },
      { tipo: "Integrada", count: granjasIntegrada, color: "#F59E0B" },
    ].filter(d => d.count > 0);

    // ── Chart 4: Línea productiva ──
    const lineaProductiva = [
      { linea: "Engorde",      count: granjasEngorde,      color: "#3B82F6" },
      { linea: "Reproductora", count: granjasReproductora, color: "#EC4899" },
    ].filter(d => d.count > 0);

    // ── Chart 5: Visitas por auditor ──
    const auditoresMap: Record<string, { auditorId: string; auditorNombre: string; visitas: number; hallazgos: number; criticos: number }> = {};
    for (const a of auditorias) {
      if (!auditoresMap[a.auditorId]) {
        auditoresMap[a.auditorId] = { auditorId: a.auditorId, auditorNombre: a.auditorNombre, visitas: 0, hallazgos: 0, criticos: 0 };
      }
      auditoresMap[a.auditorId].visitas += 1;
    }
    for (const h of hallazgos) {
      if (auditoresMap[h.auditorId]) {
        auditoresMap[h.auditorId].hallazgos += 1;
        if (h.criticidad === "CRITICA" || h.criticidad === "ALTA") {
          auditoresMap[h.auditorId].criticos += 1;
        }
      }
    }
    const auditoresChart = Object.values(auditoresMap)
      .map(a => ({
        ...a,
        score: a.visitas * 2 + a.hallazgos - a.criticos, // visitas pesan más; críticos restan
      }))
      .sort((a, b) => b.score - a.score);

    // ── Chart 6: Tendencia mensual de visitas ──
    const tendenciaMes = Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
      const audsM = auditorias.filter(a => a.fechaProgramada.getMonth() + 1 === m);
      const hallsM = hallazgos.filter(h => h.createdAt.getMonth() + 1 === m);
      return {
        mes: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m - 1],
        Visitas: audsM.length,
        Hallazgos: hallsM.length,
        Criticos: hallsM.filter(h => h.criticidad === "CRITICA" || h.criticidad === "ALTA").length,
      };
    });

    // ── Chart 7: Matriz criticidad × impacto ──
    const matrizCriticidad = CRITICIDADES.map(c => ({
      criticidad: c, count: hallazgos.filter(h => h.criticidad === c).length,
    })).filter(d => d.count > 0);

    // ── Chart 8: Ranking granjas por producción (capacidadAves) ──
    const granjasProduccion = granjas
      .map(g => ({
        granjaId: g.id,
        codigo: g.codigo,
        nombre: g.nombre,
        region: g.region,
        capacidad: g.capacidadAves ?? 0,
        tipoGranja: g.tipoGranja,
        tipoOperativo: g.tipoOperativo,
      }))
      .filter(g => g.capacidad > 0)
      .sort((a, b) => b.capacidad - a.capacidad)
      .slice(0, 10);

    // ── Trazabilidad de auditorías (top 50) ──
    const trazabilidad = auditorias.slice(0, 50).map(a => {
      const halls = hallazgos.filter(h => h.granjaId === a.granjaId);
      return {
        id: a.id,
        auditorNombre: a.auditorNombre,
        granjaNombre: a.granja?.nombre ?? "—",
        fechaProgramada: a.fechaProgramada.toISOString().slice(0, 10),
        fechaEjecutada: a.fechaEjecutada ? a.fechaEjecutada.toISOString().slice(0, 10) : null,
        tipoGranja: a.granja?.tipoGranja ?? "—",
        tipoAuditoria: a.tipoAuditoria,
        estado: a.estado,
        hallazgos: halls.length,
        criticos: halls.filter(h => h.criticidad === "CRITICA" || h.criticidad === "ALTA").length,
      };
    });

    // ── Alertas inteligentes ──
    const alertas: Array<{ severity: string; type: string; title: string; description: string; count?: number }> = [];
    if (hallazgosCriticos > 0) {
      alertas.push({
        severity: "CRITICAL", type: "CRITICOS",
        title: `${hallazgosCriticos} hallazgos críticos detectados`,
        description: "Requieren intervención inmediata · revisar planes de acción correctivos",
        count: hallazgosCriticos,
      });
    }
    if (granjasSanidadCrit > 0) {
      alertas.push({
        severity: "HIGH", type: "SANIDAD",
        title: `${granjasSanidadCrit} granjas con estado sanitario crítico`,
        description: "Activar protocolos veterinarios + cuarentena preventiva",
      });
    }
    if (granjasCuarentena > 0) {
      alertas.push({
        severity: "HIGH", type: "CUARENTENA",
        title: `${granjasCuarentena} granjas en cuarentena`,
        description: "Monitorear evolución diaria · suspender despachos hasta levantamiento",
      });
    }
    if (cumplimientoKPI < 50 && totalKPIs > 0) {
      alertas.push({
        severity: "MEDIUM", type: "KPI_BAJO",
        title: `Cumplimiento KPI: ${cumplimientoKPI}%`,
        description: `Solo ${kpisCompletados}/${totalKPIs} planes completados · escalar con responsables`,
      });
    }
    if (granjasRiesgoAlto > 0) {
      alertas.push({
        severity: "MEDIUM", type: "RIESGO_ALTO",
        title: `${granjasRiesgoAlto} granjas con nivel de riesgo ALTO`,
        description: "Programar auditorías de seguimiento más frecuentes",
      });
    }
    if (alertas.length === 0) {
      alertas.push({
        severity: "INFO", type: "OK",
        title: "Operación de granjas saludable",
        description: "Sin alertas críticas en el período filtrado",
      });
    }

    // ── Calidad de datos ──
    const calidadDatos = {
      totalRegistros: granjas.length + auditorias.length + hallazgos.length + kpis.length,
      granjasSinVeterinario: granjas.filter(g => !g.tecnicoVeterinarioId).length,
      auditoriasSinFechaEjecutada: auditorias.filter(a => !a.fechaEjecutada).length,
      hallazgosSinResponsable: hallazgos.filter(h => !h.auditorId).length,
      kpisSinResponsable: kpis.filter(k => !k.responsable).length,
      score: granjas.length + auditorias.length + hallazgos.length > 0
        ? Math.max(0, 100 - Math.round(
            (
              (granjas.filter(g => !g.tecnicoVeterinarioId).length / Math.max(1, granjas.length)) * 25 +
              (auditorias.filter(a => !a.fechaEjecutada).length / Math.max(1, auditorias.length)) * 25 +
              (kpis.filter(k => !k.responsable).length / Math.max(1, kpis.length)) * 25
            )
          ))
        : 100,
    };

    // ── Resumen heurístico ──
    const resumenHeuristico = this.buildHeuristic({
      totalGranjas, granjasPropia, granjasArrendada, granjasIntegrada,
      granjasEngorde, granjasReproductora, capacidadTotal,
      granjasActivas, granjasCuarentena, granjasRiesgoAlto, granjasSanidadCrit,
      totalAuditorias, totalHallazgos, hallazgosCriticos, hallazgosAltos,
      totalKPIs, kpisCompletados, kpisEnCurso, cumplimientoKPI, avancePromedio,
      tasaResolucion, auditoresActivos,
      topCategoria: hallazgosPorCategoria[0],
      topAuditor: auditoresChart[0],
    });

    return {
      timestamp: new Date().toISOString(),
      filters,
      kpis: {
        totalGranjas, granjasActivas, granjasCuarentena, granjasRiesgoAlto, granjasSanidadCrit,
        granjasPropia, granjasArrendada, granjasIntegrada,
        granjasEngorde, granjasReproductora, capacidadTotal,
        totalAuditorias, auditoresActivos,
        totalHallazgos, hallazgosCriticos, hallazgosAltos, hallazgosAbiertos, hallazgosCerrados,
        totalKPIs, kpisCompletados, kpisEnCurso, cumplimientoKPI, avancePromedio,
        tasaResolucion,
      },
      charts: {
        hallazgosPorCategoria,
        diagnosticoFecha,
        distribucionTipo,
        lineaProductiva,
        auditores: auditoresChart,
        tendenciaMes,
        matrizCriticidad,
        granjasProduccion,
      },
      alertas,
      trazabilidad,
      calidadDatos,
      resumenHeuristico,
      meta: {
        granjasFiltradas: granjas.length,
        auditoriasFiltradas: auditorias.length,
        hallazgosFiltrados: hallazgos.length,
      },
    };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private buildHeuristic(p: any) {
    const sentences: string[] = [];

    if (p.totalGranjas === 0) {
      sentences.push("📋 No hay granjas registradas en el período filtrado.");
    } else {
      sentences.push(`🐔 **${p.totalGranjas}** granjas activas (${p.granjasActivas} activas, ${p.granjasCuarentena} en cuarentena) · capacidad total ${p.capacidadTotal.toLocaleString("es-CO")} aves.`);
      sentences.push(`🏗️ Distribución: ${p.granjasPropia} propias · ${p.granjasArrendada} arrendadas · ${p.granjasIntegrada} integradas.`);
      sentences.push(`📊 Línea productiva: ${p.granjasEngorde} engorde · ${p.granjasReproductora} reproductoras.`);
    }

    if (p.totalAuditorias > 0) {
      sentences.push(`🔍 **${p.totalAuditorias}** auditorías ejecutadas por ${p.auditoresActivos} auditores · ${p.totalHallazgos} hallazgos detectados.`);
    }

    if (p.hallazgosCriticos > 0) {
      sentences.push(`🚨 **${p.hallazgosCriticos}** hallazgos críticos (${p.hallazgosAltos} altos) requieren atención urgente.`);
    }

    if (p.totalKPIs > 0) {
      sentences.push(`✅ Cumplimiento KPI: **${p.cumplimientoKPI}%** · avance promedio ${p.avancePromedio}% · tasa resolución ${p.tasaResolucion}%.`);
    }

    if (p.granjasRiesgoAlto > 0) {
      sentences.push(`⚠️ ${p.granjasRiesgoAlto} granjas clasificadas con nivel de riesgo ALTO.`);
    }
    if (p.granjasSanidadCrit > 0) {
      sentences.push(`🩺 ${p.granjasSanidadCrit} granjas con estado sanitario crítico.`);
    }
    if (p.topCategoria) {
      sentences.push(`📌 Categoría más recurrente de hallazgos: **${p.topCategoria.categoria}** (${p.topCategoria.count}).`);
    }
    if (p.topAuditor) {
      sentences.push(`🏆 Auditor más activo: **${p.topAuditor.auditorNombre}** con ${p.topAuditor.visitas} visitas y ${p.topAuditor.hallazgos} hallazgos detectados.`);
    }

    const recomendaciones: string[] = [];
    if (p.hallazgosCriticos > 0) {
      recomendaciones.push(`🛠️ Convocar comité de emergencia para los ${p.hallazgosCriticos} hallazgos críticos. Cada uno con responsable + fecha.`);
    }
    if (p.granjasCuarentena > 0) {
      recomendaciones.push(`🩺 Monitoreo diario de las ${p.granjasCuarentena} granjas en cuarentena. Reportes veterinarios obligatorios.`);
    }
    if (p.cumplimientoKPI < 60 && p.totalKPIs > 0) {
      recomendaciones.push("📅 Activar checkpoints semanales para mejorar el cumplimiento de KPIs (actual < 60%).");
    }
    if (p.granjasRiesgoAlto > 0) {
      recomendaciones.push(`📍 Programar auditorías mensuales en las ${p.granjasRiesgoAlto} granjas de riesgo alto.`);
    }
    if (recomendaciones.length === 0) {
      recomendaciones.push("✅ Operación saludable. Mantener cadencia de auditorías + KPIs.");
    }

    return {
      resumen: sentences,
      recomendaciones,
      estado: p.hallazgosCriticos > 5 ? "CRITICO"
            : p.hallazgosCriticos > 0 ? "REGULAR"
            : p.cumplimientoKPI >= 80 ? "EXCELENTE"
            : "ACEPTABLE",
    };
  }
}
