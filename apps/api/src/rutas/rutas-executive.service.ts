// ═══════════════════════════════════════════════════════════════════════════════
// Rutas · Executive Dashboard Service
// ═══════════════════════════════════════════════════════════════════════════════
// Calcula:
//   · 14 KPIs operacionales
//   · Heatmap cobertura ruta × mes
//   · Pareto motivos de devolución
//   · Ranking clientes impactados + auditores
//   · Matriz criticidad × impacto operacional
//   · Alertas + tendencia mensual
//   · Resumen heurístico para IA service
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface RutasExecutiveFilters {
  year?: number;
  auditorId?: string;
  rutaId?: string;
  clienteId?: string;
  ciudad?: string;
  estado?: string;
  motivo?: string;
  criticidad?: string;
  mes?: number;
}

@Injectable()
export class RutasExecutiveService {
  constructor(private prisma: PrismaService) {}

  async getExecutive(filters: RutasExecutiveFilters) {
    const year = filters.year ?? new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    // ── 1. Query base con filtros ──
    const where: any = {
      fecha: { gte: yearStart, lte: yearEnd },
    };
    if (filters.auditorId)  where.auditorId  = filters.auditorId;
    if (filters.rutaId)     where.rutaId     = filters.rutaId;
    if (filters.clienteId)  where.clienteId  = filters.clienteId;
    if (filters.estado)     where.estado     = filters.estado;
    if (filters.motivo)     where.motivo     = filters.motivo;
    if (filters.criticidad) where.criticidad = filters.criticidad;

    let acomp = await this.prisma.acompanamiento.findMany({
      where,
      include: {
        cliente:   true,
        ruta:      true,
        vehiculo:  true,
        conductor: true,
        auxiliar:  true,
        evidencias: { select: { id: true } },
        acciones:   { select: { id: true, estado: true, porcentajeAvance: true } },
      },
      orderBy: { fecha: "desc" },
    });

    // Filtros post-query (campos en relations)
    if (filters.ciudad) {
      acomp = acomp.filter(a => a.cliente?.ciudad === filters.ciudad);
    }
    if (filters.mes) {
      acomp = acomp.filter(a => a.fecha.getMonth() + 1 === filters.mes);
    }

    const total = acomp.length;

    // ── 2. 14 KPIs ──
    const programados   = acomp.filter(a => a.estado === "PROGRAMADO").length;
    const enCurso       = acomp.filter(a => a.estado === "EN_CURSO").length;
    const completados   = acomp.filter(a => a.estado === "COMPLETADO").length;
    const conHallazgos  = acomp.filter(a => a.estado === "CON_HALLAZGOS").length;
    const cerrados      = acomp.filter(a => a.estado === "CERRADO").length;

    const criticos      = acomp.filter(a => a.criticidad === "CRITICO").length;
    const altos         = acomp.filter(a => a.criticidad === "ALTO").length;

    const totalValorDevuelto = acomp.reduce((s, a) => s + a.valorDevueltoCOP, 0);
    const totalKgDevueltos   = acomp.reduce((s, a) => s + a.cantidadKgDevueltos, 0);

    // Clientes y rutas únicos
    const clientesUnicos = new Set(acomp.map(a => a.clienteId).filter(Boolean)).size;
    const rutasUnicas    = new Set(acomp.map(a => a.rutaId).filter(Boolean)).size;
    const auditoresActivos = new Set(acomp.map(a => a.auditorId).filter(Boolean)).size;

    // Total acciones de cumplimiento generadas
    const accionesGeneradas = acomp.reduce((s, a) => s + a.acciones.length, 0);
    const accionesCerradas  = acomp.reduce((s, a) =>
      s + a.acciones.filter(ac => ac.estado === "CERRADO" || ac.estado === "CERRADO_CON_REINCIDENCIA").length, 0,
    );
    const tasaCierreAcciones = accionesGeneradas > 0
      ? Math.round((accionesCerradas / accionesGeneradas) * 100)
      : 0;

    const tasaResolucion = total > 0
      ? Math.round(((cerrados + completados) / total) * 100)
      : 0;

    const indiceCriticidad = total > 0
      ? Math.round(((criticos * 4 + altos * 3) / (total * 4)) * 100)
      : 0;

    // ── 3. Heatmap · ruta × mes ──
    const rutasAll = await this.prisma.ruta.findMany({ where: { activa: true } });
    const heatmapData: Array<{ ruta: string; rutaId: string; mes: number; mesLabel: string; count: number; valor: number }> = [];
    for (const r of rutasAll) {
      for (let m = 1; m <= 12; m++) {
        const items = acomp.filter(a => a.rutaId === r.id && a.fecha.getMonth() + 1 === m);
        if (items.length > 0) {
          heatmapData.push({
            ruta: r.nombre,
            rutaId: r.id,
            mes: m,
            mesLabel: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1],
            count: items.length,
            valor: items.reduce((s, a) => s + a.valorDevueltoCOP, 0),
          });
        }
      }
    }

    // ── 4. Acompañamientos por auditor ──
    const auditoresMap: Record<string, { auditorId: string; auditorNombre: string; total: number; criticos: number; valor: number }> = {};
    for (const a of acomp) {
      if (!auditoresMap[a.auditorId]) {
        auditoresMap[a.auditorId] = {
          auditorId: a.auditorId, auditorNombre: a.auditorNombre,
          total: 0, criticos: 0, valor: 0,
        };
      }
      auditoresMap[a.auditorId].total += 1;
      if (a.criticidad === "CRITICO" || a.criticidad === "ALTO") {
        auditoresMap[a.auditorId].criticos += 1;
      }
      auditoresMap[a.auditorId].valor += a.valorDevueltoCOP;
    }
    const auditoresChart = Object.values(auditoresMap)
      .map(a => ({
        ...a,
        participacion: total > 0 ? Math.round((a.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── 5. Ranking clientes impactados ──
    const clientesMap: Record<string, { clienteId: string; nombre: string; ciudad: string; tipo: string; total: number; valor: number; kg: number }> = {};
    for (const a of acomp) {
      const key = a.clienteId || "—";
      if (!clientesMap[key]) {
        clientesMap[key] = {
          clienteId: key,
          nombre: a.cliente?.nombre ?? "—",
          ciudad: a.cliente?.ciudad ?? "—",
          tipo:   a.cliente?.tipo   ?? "—",
          total: 0, valor: 0, kg: 0,
        };
      }
      clientesMap[key].total += 1;
      clientesMap[key].valor += a.valorDevueltoCOP;
      clientesMap[key].kg    += a.cantidadKgDevueltos;
    }
    const clientesRanking = Object.values(clientesMap)
      .map(c => ({
        ...c,
        participacion: total > 0 ? Math.round((c.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    // ── 6. Pareto motivos de devolución ──
    const motivosMap: Record<string, { motivo: string; count: number; valor: number }> = {};
    for (const a of acomp) {
      if (!motivosMap[a.motivo]) motivosMap[a.motivo] = { motivo: a.motivo, count: 0, valor: 0 };
      motivosMap[a.motivo].count += 1;
      motivosMap[a.motivo].valor += a.valorDevueltoCOP;
    }
    const motivosSorted = Object.values(motivosMap).sort((a, b) => b.count - a.count);
    let acumPct = 0;
    const paretoMotivos = motivosSorted.map(m => {
      const pct = total > 0 ? (m.count / total) * 100 : 0;
      acumPct += pct;
      return {
        motivo: m.motivo,
        count: m.count,
        valor: m.valor,
        participacion: Math.round(pct * 10) / 10,
        acumulado: Math.round(acumPct * 10) / 10,
      };
    });

    // ── 7. Distribución motivos por ruta (segmentación) ──
    const motivosPorRuta = motivosSorted.slice(0, 5).map(m => {
      const data: any = { motivo: m.motivo };
      for (const r of rutasAll) {
        data[r.nombre] = acomp.filter(a => a.motivo === m.motivo && a.rutaId === r.id).length;
      }
      return data;
    });

    // ── 8. Matriz criticidad × impacto ──
    const matrizCriticidad = [
      { criticidad: "CRITICO", impactoLabel: "Crítico", count: criticos,                                  valor: this.sumValor(acomp, "CRITICO") },
      { criticidad: "ALTO",    impactoLabel: "Alto",    count: altos,                                     valor: this.sumValor(acomp, "ALTO") },
      { criticidad: "MEDIO",   impactoLabel: "Medio",   count: acomp.filter(a => a.criticidad === "MEDIO").length, valor: this.sumValor(acomp, "MEDIO") },
      { criticidad: "BAJO",    impactoLabel: "Bajo",    count: acomp.filter(a => a.criticidad === "BAJO").length,  valor: this.sumValor(acomp, "BAJO") },
    ];

    // ── 9. Tendencia mensual ──
    const tendenciaMes = Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
      const items = acomp.filter(a => a.fecha.getMonth() + 1 === m);
      return {
        mes: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1],
        mesNum: m,
        Acompañamientos: items.length,
        Criticos: items.filter(a => a.criticidad === "CRITICO").length,
        ValorCOP: items.reduce((s, a) => s + a.valorDevueltoCOP, 0),
      };
    });

    // ── 10. Distribución por ciudad ──
    const ciudadesMap: Record<string, number> = {};
    for (const a of acomp) {
      const c = a.cliente?.ciudad ?? "—";
      ciudadesMap[c] = (ciudadesMap[c] ?? 0) + 1;
    }
    const distribucionCiudades = Object.entries(ciudadesMap)
      .map(([ciudad, count]) => ({ ciudad, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── 11. Alertas ejecutivas ──
    const alertas: Array<{ severity: string; type: string; title: string; description: string; count?: number }> = [];
    if (criticos > 0) {
      alertas.push({
        severity: "CRITICAL",
        type: "CRITICOS",
        title: `${criticos} acompañamientos con criticidad CRÍTICA`,
        description: `Valor devuelto asociado: $${this.sumValor(acomp, "CRITICO").toLocaleString("es-CO")} COP · requieren escalamiento inmediato`,
        count: criticos,
      });
    }
    if (conHallazgos > 0 && tasaCierreAcciones < 50) {
      alertas.push({
        severity: "HIGH",
        type: "ACCIONES",
        title: `Tasa de cierre de acciones baja (${tasaCierreAcciones}%)`,
        description: `${conHallazgos} acompañamientos con hallazgos · ${accionesCerradas}/${accionesGeneradas} acciones cerradas`,
      });
    }
    if (motivosSorted.length > 0 && motivosSorted[0].count >= 5) {
      const top = motivosSorted[0];
      alertas.push({
        severity: "MEDIUM",
        type: "PATRON",
        title: `Motivo recurrente: ${top.motivo}`,
        description: `${top.count} eventos del mismo motivo · oportunidad de acción correctiva estructural`,
      });
    }
    if (clientesRanking.length > 0 && clientesRanking[0].total >= 5) {
      const top = clientesRanking[0];
      alertas.push({
        severity: "MEDIUM",
        type: "CLIENTE",
        title: `Cliente con alto número de intervenciones: ${top.nombre}`,
        description: `${top.total} acompañamientos · valor devuelto $${top.valor.toLocaleString("es-CO")} COP`,
      });
    }
    if (alertas.length === 0) {
      alertas.push({
        severity: "INFO",
        type: "OK",
        title: "Operación de rutas saludable",
        description: "Sin patrones críticos detectados en este período",
      });
    }

    // ── 12. Matriz de trazabilidad (top 50 acompañamientos) ──
    const trazabilidad = acomp.slice(0, 50).map(a => ({
      id: a.id,
      fecha: a.fecha.toISOString().slice(0, 10),
      auditorNombre: a.auditorNombre,
      cliente:   a.cliente?.nombre ?? "—",
      ruta:      a.ruta?.nombre    ?? "—",
      vehiculo:  a.vehiculo?.placa ?? "—",
      motivo:    a.motivo,
      criticidad: a.criticidad,
      estado:    a.estado,
      valorCOP:  a.valorDevueltoCOP,
      kg:        a.cantidadKgDevueltos,
      acciones:  a.acciones.length,
      evidencias: a.evidencias.length,
    }));

    // ── 13. Calidad de datos ──
    const calidadDatos = {
      total,
      sinCliente:      acomp.filter(a => !a.clienteId).length,
      sinRuta:         acomp.filter(a => !a.rutaId).length,
      sinObservacion:  acomp.filter(a => !a.observacionAuditor || a.observacionAuditor.trim() === "").length,
      sinValor:        acomp.filter(a => a.valorDevueltoCOP === 0).length,
      sinKg:           acomp.filter(a => a.cantidadKgDevueltos === 0).length,
      score: total > 0
        ? Math.max(0, 100 - Math.round((
            acomp.filter(a => !a.observacionAuditor || a.observacionAuditor.trim() === "").length / total
          ) * 50))
        : 100,
    };

    // ── 14. Resumen heurístico (para IA service) ──
    const resumenHeuristico = this.buildHeuristic({
      total, criticos, altos, totalValorDevuelto, totalKgDevueltos,
      clientesUnicos, rutasUnicas, auditoresActivos,
      tasaResolucion, tasaCierreAcciones, indiceCriticidad,
      topMotivo: motivosSorted[0],
      topCliente: clientesRanking[0],
      topAuditor: auditoresChart[0],
    });

    return {
      timestamp: new Date().toISOString(),
      filters,
      kpis: {
        // Volumen
        totalAcompanamientos:    total,
        programados, enCurso, completados, conHallazgos, cerrados,
        // Criticidad
        criticos, altos,
        indiceCriticidad,
        // Volumen económico
        totalValorDevueltoCOP:   totalValorDevuelto,
        totalKgDevueltos:        Math.round(totalKgDevueltos * 100) / 100,
        // Diversidad
        clientesUnicos,
        rutasUnicas,
        auditoresActivos,
        // Acciones
        accionesGeneradas,
        accionesCerradas,
        tasaCierreAcciones,
        tasaResolucion,
      },
      charts: {
        heatmap:           heatmapData,
        auditores:         auditoresChart,
        clientesRanking,
        paretoMotivos,
        motivosPorRuta,
        matrizCriticidad,
        tendenciaMes,
        distribucionCiudades,
      },
      alertas,
      trazabilidad,
      calidadDatos,
      resumenHeuristico,
      meta: {
        actividadesFiltradas: total,
        rutasConActividad:    rutasUnicas,
      },
    };
  }

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  private sumValor(items: any[], criticidad: string): number {
    return items
      .filter(a => a.criticidad === criticidad)
      .reduce((s, a) => s + a.valorDevueltoCOP, 0);
  }

  private buildHeuristic(p: {
    total: number; criticos: number; altos: number;
    totalValorDevuelto: number; totalKgDevueltos: number;
    clientesUnicos: number; rutasUnicas: number; auditoresActivos: number;
    tasaResolucion: number; tasaCierreAcciones: number; indiceCriticidad: number;
    topMotivo?: any; topCliente?: any; topAuditor?: any;
  }) {
    const sentences: string[] = [];

    if (p.total === 0) {
      sentences.push("📋 No hay acompañamientos registrados en el período filtrado.");
    } else {
      sentences.push(`🚚 **${p.total}** acompañamientos ejecutados · cobertura de ${p.rutasUnicas} rutas · ${p.clientesUnicos} clientes únicos · ${p.auditoresActivos} auditores activos.`);
      sentences.push(`💰 Volumen económico devuelto: **$${p.totalValorDevuelto.toLocaleString("es-CO")} COP** (${p.totalKgDevueltos.toFixed(1)} kg).`);
      sentences.push(`📊 Tasa de resolución: **${p.tasaResolucion}%** · Cierre de acciones: **${p.tasaCierreAcciones}%** · Índice de criticidad: **${p.indiceCriticidad}/100**.`);
    }

    if (p.criticos > 0) {
      sentences.push(`🚨 **${p.criticos}** eventos críticos identificados (${p.altos} de criticidad alta adicional).`);
    }
    if (p.topMotivo) {
      sentences.push(`🔝 Motivo más recurrente: **${p.topMotivo.motivo}** con ${p.topMotivo.count} eventos.`);
    }
    if (p.topCliente) {
      sentences.push(`🏢 Cliente más impactado: **${p.topCliente.nombre}** con ${p.topCliente.total} acompañamientos.`);
    }
    if (p.topAuditor) {
      sentences.push(`🏆 Auditor más activo: **${p.topAuditor.auditorNombre}** con ${p.topAuditor.total} ejecuciones.`);
    }

    const recomendaciones: string[] = [];
    if (p.criticos > 0) {
      recomendaciones.push(`🛠️ Convocar comité semanal para revisar los ${p.criticos} casos críticos · cada uno con plan de acción documentado.`);
    }
    if (p.tasaCierreAcciones < 60) {
      recomendaciones.push("📅 La tasa de cierre de acciones requiere atención · designar responsable de seguimiento permanente.");
    }
    if (p.topMotivo && p.topMotivo.count >= 5) {
      recomendaciones.push(`🎯 Implementar acción correctiva estructural para "${p.topMotivo.motivo}" antes que escale.`);
    }
    if (p.topCliente && p.topCliente.total >= 5) {
      recomendaciones.push(`🤝 Establecer reunión ejecutiva con ${p.topCliente.nombre} para alinear protocolos.`);
    }
    if (recomendaciones.length === 0) {
      recomendaciones.push("✅ Operación saludable · mantener cadencia de acompañamientos y monitoreo de KPIs.");
    }

    return {
      resumen: sentences,
      recomendaciones,
      estado: p.indiceCriticidad >= 50 ? "CRITICO"
            : p.indiceCriticidad >= 30 ? "REGULAR"
            : p.tasaResolucion >= 80 ? "EXCELENTE"
            : "ACEPTABLE",
    };
  }
}
