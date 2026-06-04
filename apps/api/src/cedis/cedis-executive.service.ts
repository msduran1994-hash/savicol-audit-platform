// ═══════════════════════════════════════════════════════════════════════════════
// CEDIS · Executive Dashboard Service
// ═══════════════════════════════════════════════════════════════════════════════
// Calcula:
//   · 15 KPIs operacionales por CEDI + subtema
//   · Heatmap categoría × CEDI
//   · Ranking de CEDIS por hallazgos / criticidad
//   · Distribución subtemas (Inventario, Caja, Cartera, etc)
//   · Matriz riesgo × impacto
//   · Tendencia mensual auditorías + hallazgos
//   · Alertas + resumen heurístico para AI
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CedisExecutiveFilters {
  year?: number;
  cediId?: string;
  subtema?: string;
  auditorId?: string;
  categoria?: string;
  criticidad?: string;
  estado?: string;
  tipoRiesgo?: string;
  mes?: number;
}

const SUBTEMAS = [
  "Inventario", "Caja", "Cartera", "Logística",
  "Bioseguridad", "Infraestructura", "Procedimientos",
] as const;

@Injectable()
export class CedisExecutiveService {
  constructor(private prisma: PrismaService) {}

  async getExecutive(filters: CedisExecutiveFilters) {
    const year = filters.year ?? new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    // ── Auditorías filtradas ──
    const audWhere: any = { fechaVisita: { gte: yearStart, lte: yearEnd } };
    if (filters.cediId)     audWhere.cediId     = filters.cediId;
    if (filters.auditorId)  audWhere.auditorId  = filters.auditorId;
    if (filters.criticidad) audWhere.criticidad = filters.criticidad;
    if (filters.estado)     audWhere.estado     = filters.estado;
    if (filters.tipoRiesgo) audWhere.tipoRiesgo = filters.tipoRiesgo;
    if (filters.subtema)    audWhere.subtema    = filters.subtema;

    let auditorias = await this.prisma.auditoriaCedi.findMany({
      where: audWhere,
      include: { cedi: { select: { id: true, codigo: true, nombre: true, ciudad: true, region: true } } },
      orderBy: { fechaVisita: "desc" },
    });

    if (filters.mes) {
      auditorias = auditorias.filter(a => a.fechaVisita.getMonth() + 1 === filters.mes);
    }

    // ── Hallazgos filtrados (mismo año) ──
    const hallWhere: any = {};
    if (filters.cediId)     hallWhere.cediId     = filters.cediId;
    if (filters.subtema)    hallWhere.subtema    = filters.subtema;
    if (filters.categoria)  hallWhere.categoria  = filters.categoria;
    if (filters.criticidad) hallWhere.criticidad = filters.criticidad;
    if (filters.estado)     hallWhere.estado     = filters.estado;
    if (filters.tipoRiesgo) hallWhere.tipoRiesgo = filters.tipoRiesgo;

    const hallazgos = await this.prisma.hallazgoCedi.findMany({
      where: hallWhere,
      include: { cedi: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { createdAt: "desc" },
    });

    // ── CEDIS oficiales (catálogo completo) ──
    const cedisAll = await this.prisma.cedi.findMany({
      where: { activo: true }, orderBy: { nombre: "asc" },
    });

    // ── 1. KPIs ──
    const totalAuditorias = auditorias.length;
    const totalHallazgos  = hallazgos.length;

    const cedisAuditados   = new Set(auditorias.map(a => a.cediId)).size;
    const coberturaPercent = cedisAll.length > 0
      ? Math.round((cedisAuditados / cedisAll.length) * 100)
      : 0;

    const criticos = hallazgos.filter(h => h.criticidad === "CRITICA" || h.criticidad === "Crítica").length;
    const altos    = hallazgos.filter(h => h.criticidad === "ALTA"    || h.criticidad === "Alta").length;

    const hallazgosAbiertos      = hallazgos.filter(h => h.estado === "ABIERTO" || h.estado === "Abierto").length;
    const hallazgosEnPlan        = hallazgos.filter(h => h.estado === "EN_PLAN" || h.estado === "En Plan").length;
    const hallazgosEnVerificacion= hallazgos.filter(h => h.estado === "EN_VERIFICACION" || h.estado === "En Verificación").length;
    const hallazgosCerrados      = hallazgos.filter(h => h.estado === "CERRADO" || h.estado === "Cerrado").length;
    const hallazgosReincidentes  = hallazgos.filter(h => h.reincidente === true).length;

    const indiceCriticidad = totalHallazgos > 0
      ? Math.round(((criticos * 4 + altos * 3) / (totalHallazgos * 4)) * 100)
      : 0;

    const avancePromedio = hallazgos.length > 0
      ? Math.round(hallazgos.reduce((s, h) => s + (h.porcentajeAvance ?? 0), 0) / hallazgos.length)
      : 0;

    const tasaResolucion = totalHallazgos > 0
      ? Math.round((hallazgosCerrados / totalHallazgos) * 100)
      : 0;

    const auditoresActivos = new Set(auditorias.map(a => a.auditorId)).size;

    // ── 2. Cumplimiento por CEDI ──
    const cumplimientoCedi = cedisAll.map(c => {
      const auds = auditorias.filter(a => a.cediId === c.id);
      const halls = hallazgos.filter(h => h.cediId === c.id);
      const closed = halls.filter(h => h.estado === "CERRADO" || h.estado === "Cerrado").length;
      const crit   = halls.filter(h => h.criticidad === "CRITICA" || h.criticidad === "Crítica").length;
      return {
        cediId: c.id,
        cediNombre: c.nombre,
        ciudad: c.ciudad,
        auditorias: auds.length,
        hallazgos:  halls.length,
        cerrados:   closed,
        criticos:   crit,
        cumplimiento: halls.length > 0 ? Math.round((closed / halls.length) * 100) : 100,
      };
    }).sort((a, b) => b.hallazgos - a.hallazgos);

    // ── 3. Cumplimiento por Subtema ──
    const cumplimientoSubtema = SUBTEMAS.map(s => {
      const halls = hallazgos.filter(h => h.subtema === s);
      const closed = halls.filter(h => h.estado === "CERRADO" || h.estado === "Cerrado").length;
      const crit   = halls.filter(h => h.criticidad === "CRITICA" || h.criticidad === "Crítica").length;
      return {
        subtema: s,
        hallazgos: halls.length,
        cerrados:  closed,
        criticos:  crit,
        cumplimiento: halls.length > 0 ? Math.round((closed / halls.length) * 100) : 100,
        avance:    halls.length > 0 ? Math.round(halls.reduce((acc, h) => acc + (h.porcentajeAvance ?? 0), 0) / halls.length) : 0,
      };
    });

    // ── 4. Hallazgos por categoría ──
    const categoriaCount: Record<string, number> = {};
    hallazgos.forEach(h => { categoriaCount[h.categoria] = (categoriaCount[h.categoria] ?? 0) + 1; });
    const hallazgosPorCategoria = Object.entries(categoriaCount)
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count);

    // ── 5. Heatmap · Subtema × CEDI ──
    const heatmap: Array<{ subtema: string; cediId: string; cediNombre: string; count: number; criticos: number }> = [];
    for (const s of SUBTEMAS) {
      for (const c of cedisAll) {
        const items = hallazgos.filter(h => h.subtema === s && h.cediId === c.id);
        if (items.length > 0) {
          heatmap.push({
            subtema: s,
            cediId: c.id,
            cediNombre: c.nombre,
            count: items.length,
            criticos: items.filter(h => h.criticidad === "CRITICA" || h.criticidad === "Crítica").length,
          });
        }
      }
    }

    // ── 6. Tendencia mensual ──
    const tendenciaMes = Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
      const audsM  = auditorias.filter(a => a.fechaVisita.getMonth() + 1 === m);
      const hallsM = hallazgos.filter(h => h.createdAt.getMonth() + 1 === m);
      return {
        mes: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1],
        Auditorias: audsM.length,
        Hallazgos:  hallsM.length,
        Criticos:   hallsM.filter(h => h.criticidad === "CRITICA" || h.criticidad === "Crítica").length,
      };
    });

    // ── 7. Ranking de hallazgos recurrentes ──
    const tituloCount: Record<string, number> = {};
    hallazgos.forEach(h => { tituloCount[h.titulo] = (tituloCount[h.titulo] ?? 0) + 1; });
    const hallazgosRecurrentes = Object.entries(tituloCount)
      .map(([titulo, count]) => ({ titulo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── 8. Matriz riesgo × impacto (riesgo × criticidad) ──
    const tipoRiesgos = ["REPUTACIONAL", "FINANCIERO", "CONTAGIO", "OPERATIVO", "LEGAL"];
    const criticidades = ["CRITICA", "ALTA", "MEDIA", "BAJA"];
    const matrizRiesgo: Array<{ tipoRiesgo: string; criticidad: string; count: number }> = [];
    for (const r of tipoRiesgos) {
      for (const c of criticidades) {
        const count = hallazgos.filter(h =>
          (h.tipoRiesgo === r || h.tipoRiesgo === this.titleCase(r)) &&
          (h.criticidad === c || h.criticidad === this.titleCase(c))
        ).length;
        if (count > 0) matrizRiesgo.push({ tipoRiesgo: r, criticidad: c, count });
      }
    }

    // ── 9. Semaforización ejecutiva (top KPIs con color) ──
    const semaforizacion = [
      { label: "Cobertura CEDIS",       value: coberturaPercent, target: 80,  status: this.semaforo(coberturaPercent, 60, 80) },
      { label: "Tasa de resolución",    value: tasaResolucion,   target: 70,  status: this.semaforo(tasaResolucion, 50, 70) },
      { label: "Índice criticidad",     value: indiceCriticidad, target: 25,  status: this.semaforoInv(indiceCriticidad, 50, 25) },
      { label: "Avance planes acción",  value: avancePromedio,   target: 70,  status: this.semaforo(avancePromedio, 40, 70) },
    ];

    // ── 10. Alertas ejecutivas ──
    const alertas: Array<{ severity: string; type: string; title: string; description: string }> = [];
    if (criticos > 0) {
      alertas.push({
        severity: "CRITICAL", type: "CRITICOS",
        title: `${criticos} hallazgos críticos identificados`,
        description: `Requieren intervención inmediata · ${hallazgosReincidentes} son reincidentes`,
      });
    }
    if (coberturaPercent < 60) {
      alertas.push({
        severity: "HIGH", type: "COBERTURA",
        title: `Cobertura baja (${coberturaPercent}%)`,
        description: `Solo ${cedisAuditados}/${cedisAll.length} CEDIS auditados · auditar los restantes`,
      });
    }
    if (hallazgosReincidentes > 0) {
      alertas.push({
        severity: "HIGH", type: "REINCIDENCIA",
        title: `${hallazgosReincidentes} hallazgos reincidentes`,
        description: "Las acciones correctivas previas no surtieron efecto · revisar causa raíz",
      });
    }
    const topRecurrente = hallazgosRecurrentes[0];
    if (topRecurrente && topRecurrente.count >= 2) {
      alertas.push({
        severity: "MEDIUM", type: "PATRON",
        title: `Patrón recurrente: ${topRecurrente.titulo}`,
        description: `${topRecurrente.count} ocurrencias · oportunidad de acción estructural`,
      });
    }
    if (alertas.length === 0) {
      alertas.push({
        severity: "INFO", type: "OK",
        title: "Operación CEDIS saludable",
        description: "Sin patrones críticos detectados en este período",
      });
    }

    // ── 11. Matriz de trazabilidad (top 50) ──
    const trazabilidad = hallazgos.slice(0, 50).map(h => ({
      id: h.id,
      titulo: h.titulo,
      cediNombre: h.cedi?.nombre ?? "—",
      categoria: h.categoria,
      subtema:   h.subtema ?? "—",
      criticidad: h.criticidad,
      tipoRiesgo: h.tipoRiesgo,
      estado: h.estado,
      responsable: h.responsable ?? "—",
      fechaCompromiso: h.fechaCompromiso ? h.fechaCompromiso.toISOString().slice(0, 10) : "—",
      porcentajeAvance: h.porcentajeAvance ?? 0,
      reincidente: h.reincidente,
    }));

    // ── 12. Calidad de datos ──
    const calidadDatos = {
      totalAuditorias: auditorias.length,
      totalHallazgos:  hallazgos.length,
      sinSubtema:      auditorias.filter(a => !a.subtema).length + hallazgos.filter(h => !h.subtema).length,
      sinResponsable:  hallazgos.filter(h => !h.responsable || h.responsable === "—").length,
      sinPlanAccion:   hallazgos.filter(h => (h.porcentajeAvance ?? 0) === 0).length,
      score: auditorias.length + hallazgos.length > 0
        ? Math.max(0, 100 - Math.round(
            ((auditorias.filter(a => !a.subtema).length + hallazgos.filter(h => !h.subtema).length) /
             (auditorias.length + hallazgos.length)) * 100
          ))
        : 100,
    };

    // ── 13. Resumen heurístico ──
    const resumenHeuristico = this.buildHeuristic({
      totalAuditorias, totalHallazgos, criticos, altos,
      coberturaPercent, cedisAll: cedisAll.length, cedisAuditados,
      tasaResolucion, indiceCriticidad, avancePromedio,
      hallazgosReincidentes,
      topCedi: cumplimientoCedi[0],
      topSubtema: cumplimientoSubtema.slice().sort((a, b) => b.hallazgos - a.hallazgos)[0],
      topRecurrente,
    });

    return {
      timestamp: new Date().toISOString(),
      filters,
      kpis: {
        totalAuditorias,
        totalHallazgos,
        cedisAuditados,
        coberturaPercent,
        criticos,
        altos,
        hallazgosAbiertos,
        hallazgosEnPlan,
        hallazgosEnVerificacion,
        hallazgosCerrados,
        hallazgosReincidentes,
        indiceCriticidad,
        avancePromedio,
        tasaResolucion,
        auditoresActivos,
      },
      charts: {
        cumplimientoCedi,
        cumplimientoSubtema,
        hallazgosPorCategoria,
        heatmap,
        tendenciaMes,
        hallazgosRecurrentes,
        matrizRiesgo,
        semaforizacion,
      },
      alertas,
      trazabilidad,
      calidadDatos,
      resumenHeuristico,
      meta: {
        auditoriasFiltradas: auditorias.length,
        hallazgosFiltrados:  hallazgos.length,
      },
    };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private titleCase(s: string): string {
    return s.charAt(0) + s.slice(1).toLowerCase();
  }

  private semaforo(value: number, low: number, ok: number): "RED" | "YELLOW" | "GREEN" {
    if (value >= ok)  return "GREEN";
    if (value >= low) return "YELLOW";
    return "RED";
  }

  // semáforo invertido: valores bajos son buenos (ej: índice criticidad)
  private semaforoInv(value: number, high: number, ok: number): "RED" | "YELLOW" | "GREEN" {
    if (value <= ok)   return "GREEN";
    if (value <= high) return "YELLOW";
    return "RED";
  }

  private buildHeuristic(p: any) {
    const sentences: string[] = [];

    if (p.totalAuditorias === 0 && p.totalHallazgos === 0) {
      sentences.push("📋 No hay auditorías ni hallazgos registrados en el período filtrado.");
    } else {
      sentences.push(`🏢 **${p.totalAuditorias}** auditorías ejecutadas sobre **${p.cedisAuditados} de ${p.cedisAll} CEDIS** (cobertura ${p.coberturaPercent}%).`);
      sentences.push(`🔍 **${p.totalHallazgos}** hallazgos identificados · ${p.criticos} críticos · ${p.altos} altos · tasa resolución ${p.tasaResolucion}%.`);
    }

    if (p.criticos > 0) {
      sentences.push(`🚨 Se requiere intervención inmediata sobre los **${p.criticos}** hallazgos críticos.`);
    }
    if (p.topCedi) {
      sentences.push(`🏆 CEDI con más hallazgos: **${p.topCedi.cediNombre}** (${p.topCedi.hallazgos} hallazgos · cumplimiento ${p.topCedi.cumplimiento}%).`);
    }
    if (p.topSubtema) {
      sentences.push(`📊 Subtema más crítico: **${p.topSubtema.subtema}** con ${p.topSubtema.hallazgos} hallazgos.`);
    }
    if (p.topRecurrente && p.topRecurrente.count >= 2) {
      sentences.push(`🔁 Hallazgo más recurrente: "${p.topRecurrente.titulo}" (${p.topRecurrente.count} ocurrencias).`);
    }

    const recomendaciones: string[] = [];
    if (p.criticos > 0) {
      recomendaciones.push(`🛠️ Designar comité ejecutivo para los ${p.criticos} hallazgos críticos · cada uno con responsable + fecha de cierre.`);
    }
    if (p.coberturaPercent < 80) {
      recomendaciones.push(`📍 Programar auditorías en los ${p.cedisAll - p.cedisAuditados} CEDIS aún no visitados este período.`);
    }
    if (p.hallazgosReincidentes > 0) {
      recomendaciones.push(`🔄 Auditar las acciones correctivas previas en los ${p.hallazgosReincidentes} casos reincidentes.`);
    }
    if (p.avancePromedio < 50) {
      recomendaciones.push("📅 Avance promedio bajo · activar checkpoints semanales con responsables.");
    }
    if (recomendaciones.length === 0) {
      recomendaciones.push("✅ Operación CEDIS saludable · mantener cadencia.");
    }

    return {
      resumen: sentences,
      recomendaciones,
      estado: p.indiceCriticidad >= 50 ? "CRITICO"
            : p.indiceCriticidad >= 30 ? "REGULAR"
            : p.tasaResolucion >= 70 ? "EXCELENTE"
            : "ACEPTABLE",
    };
  }
}
