import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as ExcelJS from "exceljs";

const BRAND_PRIMARY = "F59E0B";
const BRAND_DARK    = "0A111F";
const HEADER_BG     = "1A2540";
const HEADER_FG     = "FFFFFF";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · GRANJAS
  // ════════════════════════════════════════════════════════════════════════
  async exportGranjasExcel(filters: { region?: string; tipoGranja?: string } = {}) {
    const where: any = {};
    if (filters.region)     where.region     = filters.region;
    if (filters.tipoGranja) where.tipoGranja = filters.tipoGranja;

    const granjas = await this.prisma.granja.findMany({
      where, orderBy: { codigo: "asc" },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Savicol Audit Platform";
    wb.created = new Date();

    const ws = wb.addWorksheet("Granjas");

    this.applyBrandHeader(ws, "Listado de Granjas Savicol", granjas.length);

    ws.columns = [
      { header: "Código",         key: "codigo",        width: 18 },
      { header: "Nombre",         key: "nombre",        width: 30 },
      { header: "Región",         key: "region",        width: 18 },
      { header: "Vereda",         key: "vereda",        width: 22 },
      { header: "Administrador",  key: "administrador", width: 24 },
      { header: "Tipo",           key: "tipoGranja",    width: 14 },
      { header: "Operativo",      key: "tipoOperativo", width: 14 },
      { header: "Riesgo",         key: "nivelRiesgo",   width: 10 },
      { header: "Capacidad aves", key: "capacidadAves", width: 14 },
      { header: "Sanidad",        key: "estadoSanitario", width: 12 },
      { header: "Estado",         key: "estado",        width: 12 },
      { header: "Teléfono",       key: "telefono",      width: 18 },
      { header: "Creado",         key: "createdAt",     width: 22 },
    ];
    this.styleHeader(ws.getRow(3));
    ws.spliceRows(4, 0, [], []);   // placeholder
    granjas.forEach(g => ws.addRow({
      ...g,
      createdAt: this.fmtDate(g.createdAt),
    }));
    this.styleZebra(ws, 3);

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · ACOMPAÑAMIENTOS RUTAS
  // ════════════════════════════════════════════════════════════════════════
  async exportRutasExcel(filters: { mes?: number; criticidad?: string } = {}) {
    const where: any = {};
    if (filters.criticidad) where.criticidad = filters.criticidad;

    const acomp = await this.prisma.acompanamiento.findMany({
      where,
      include: { cliente: true, ruta: true, vehiculo: true, conductor: true, auxiliar: true },
      orderBy: { fecha: "desc" },
    });

    // Filtro mes en memoria (Prisma no soporta MONTH() en SQLite)
    const filtered = filters.mes
      ? acomp.filter(a => new Date(a.fecha).getMonth() + 1 === filters.mes)
      : acomp;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Savicol Audit Platform";
    wb.created = new Date();
    const ws = wb.addWorksheet("Acompañamientos");

    this.applyBrandHeader(ws, "Acompañamientos a Rutas Savicol", filtered.length);

    ws.columns = [
      { header: "Fecha",          key: "fecha",          width: 12 },
      { header: "Auditor",        key: "auditorNombre",  width: 22 },
      { header: "Cliente",        key: "cliente",        width: 28 },
      { header: "Ruta",           key: "ruta",           width: 22 },
      { header: "Vehículo",       key: "vehiculo",       width: 14 },
      { header: "Conductor",      key: "conductor",      width: 24 },
      { header: "Auxiliar",       key: "auxiliar",       width: 22 },
      { header: "Motivo",         key: "motivo",         width: 22 },
      { header: "Valor COP",      key: "valor",          width: 16 },
      { header: "Kg devueltos",   key: "kg",             width: 12 },
      { header: "Criticidad",     key: "criticidad",     width: 12 },
      { header: "Estado",         key: "estado",         width: 16 },
      { header: "Observación",    key: "obs",            width: 50 },
    ];
    this.styleHeader(ws.getRow(3));
    filtered.forEach(a => ws.addRow({
      fecha:          this.fmtDate(a.fecha),
      auditorNombre:  a.auditorNombre,
      cliente:        a.cliente?.nombre ?? "—",
      ruta:           a.ruta?.nombre ?? "—",
      vehiculo:       a.vehiculo?.placa ?? "—",
      conductor:      a.conductor?.nombre ?? "—",
      auxiliar:       a.auxiliar?.nombre ?? "—",
      motivo:         a.motivo,
      valor:          a.valorDevueltoCOP,
      kg:             a.cantidadKgDevueltos,
      criticidad:     a.criticidad,
      estado:         a.estado,
      obs:            a.observacionAuditor,
    }));
    ws.getColumn("valor").numFmt = '"$"#,##0';
    ws.getColumn("kg").numFmt    = '#,##0.00';
    this.styleZebra(ws, 3);

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · HALLAZGOS GRANJAS
  // ════════════════════════════════════════════════════════════════════════
  async exportHallazgosGranjasExcel(filters: { criticidad?: string; estado?: string } = {}) {
    const where: any = {};
    if (filters.criticidad) where.criticidad = filters.criticidad;
    if (filters.estado)     where.estado     = filters.estado;

    const items = await this.prisma.hallazgo.findMany({
      where,
      include: { granja: { select: { nombre: true, codigo: true, region: true } } },
      orderBy: { createdAt: "desc" },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Hallazgos");

    this.applyBrandHeader(ws, "Hallazgos · Módulo Granjas", items.length);

    ws.columns = [
      { header: "Fecha visita",  key: "fechaVisita",  width: 14 },
      { header: "Granja",        key: "granja",       width: 28 },
      { header: "Región",        key: "region",       width: 16 },
      { header: "Título",        key: "titulo",       width: 40 },
      { header: "Categoría",     key: "categoria",    width: 18 },
      { header: "Criticidad",    key: "criticidad",   width: 12 },
      { header: "Estado",        key: "estado",       width: 14 },
      { header: "Auditor",       key: "auditorNombre", width: 22 },
      { header: "Descripción",   key: "descripcion",  width: 50 },
      { header: "Recomendación", key: "recomendacionesIA", width: 50 },
    ];
    this.styleHeader(ws.getRow(3));
    items.forEach(h => ws.addRow({
      fechaVisita:        this.fmtDate(h.fechaVisita),
      granja:             h.granja?.nombre ?? "—",
      region:             h.granja?.region ?? "—",
      titulo:             h.titulo,
      categoria:          h.categoria,
      criticidad:         h.criticidad,
      estado:             h.estado,
      auditorNombre:      h.auditorNombre,
      descripcion:        h.descripcion,
      recomendacionesIA:  h.recomendacionesIA ?? "",
    }));
    this.styleZebra(ws, 3);

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · CEDIS · auditorías
  // ════════════════════════════════════════════════════════════════════════
  async exportCedisAuditoriasExcel(filters: { criticidad?: string; estado?: string } = {}) {
    const where: any = {};
    if (filters.criticidad) where.criticidad = filters.criticidad;
    if (filters.estado)     where.estado     = filters.estado;

    const items = await this.prisma.auditoriaCedi.findMany({
      where,
      include: { cedi: { select: { codigo: true, nombre: true, ciudad: true, region: true } } },
      orderBy: { fechaVisita: "desc" },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Auditorías CEDI");
    this.applyBrandHeader(ws, "Auditorías · CEDIS", items.length);

    ws.columns = [
      { header: "Fecha",         key: "fechaVisita",   width: 14 },
      { header: "CEDI",          key: "cedi",          width: 28 },
      { header: "Ciudad",        key: "ciudad",        width: 18 },
      { header: "Auditor",       key: "auditorNombre", width: 22 },
      { header: "Admin",         key: "administrador", width: 22 },
      { header: "Tipo riesgo",   key: "tipoRiesgo",    width: 16 },
      { header: "Criticidad",    key: "criticidad",    width: 12 },
      { header: "Estado",        key: "estado",        width: 14 },
      { header: "Observ. riesgo",       key: "observacionRiesgo",       width: 40 },
      { header: "Observ. inventario",   key: "observacionInventario",   width: 30 },
      { header: "Observ. caja",         key: "observacionCaja",         width: 30 },
      { header: "Observ. cartera",      key: "observacionCartera",      width: 30 },
      { header: "Observ. logística",    key: "observacionLogistica",    width: 30 },
      { header: "Observ. bioseguridad", key: "observacionBioseguridad", width: 30 },
    ];
    this.styleHeader(ws.getRow(3));
    items.forEach(a => ws.addRow({
      ...a,
      fechaVisita: this.fmtDate(a.fechaVisita),
      cedi:    a.cedi?.nombre ?? "—",
      ciudad:  a.cedi?.ciudad ?? "—",
    }));
    this.styleZebra(ws, 3);

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · CRONOGRAMA EJECUTIVO (con filtros)
  // ════════════════════════════════════════════════════════════════════════
  async exportCronogramaExcel(filters: {
    year?: number;
    auditorId?: string;
    status?: string;
    area?: string;
  } = {}) {
    const year = filters.year ?? 2026;
    const where: any = { year };
    if (filters.auditorId) where.auditorId = filters.auditorId;
    if (filters.status)    where.status    = filters.status;
    if (filters.area)      where.area      = filters.area;

    const activities = await this.prisma.auditActivity.findMany({
      where,
      orderBy: [{ startDate: "asc" }, { item: "asc" }],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Savicol Audit Platform";
    wb.created = new Date();

    // ── Sheet 1: Resumen ejecutivo ──
    const wsResumen = wb.addWorksheet("Resumen Ejecutivo");
    this.applyBrandHeader(wsResumen, `Cronograma Anual ${year} · Resumen Ejecutivo`, activities.length);

    const total      = activities.length;
    const completed  = activities.filter(a => a.status === "COMPLETED").length;
    const inProgress = activities.filter(a => a.status === "IN_PROGRESS").length;
    const overdue    = activities.filter(a => a.status === "OVERDUE").length;
    const cumplim    = total > 0 ? Math.round((completed / total) * 100) : 0;

    wsResumen.columns = [
      { header: "Indicador", key: "kpi",   width: 35 },
      { header: "Valor",     key: "value", width: 18 },
    ];
    this.styleHeader(wsResumen.getRow(3));
    const kpiRows = [
      { kpi: "Actividades planificadas",           value: total },
      { kpi: "Actividades completadas",            value: completed },
      { kpi: "Actividades en curso",               value: inProgress },
      { kpi: "Actividades vencidas",               value: overdue },
      { kpi: "% Cumplimiento general",             value: `${cumplim}%` },
      { kpi: "Áreas auditadas (únicas)",           value: new Set(activities.map(a => a.area)).size },
      { kpi: "Auditores activos",                  value: new Set(activities.map(a => a.auditorId)).size },
    ];
    kpiRows.forEach(r => wsResumen.addRow(r));

    // ── Sheet 2: Detalle de actividades ──
    const wsDet = wb.addWorksheet("Detalle Actividades");
    this.applyBrandHeader(wsDet, `Cronograma ${year} · Detalle Operativo`, activities.length);
    wsDet.columns = [
      { header: "Ítem",         key: "item",         width: 8 },
      { header: "Área",         key: "area",         width: 28 },
      { header: "Actividad",    key: "activity",     width: 50 },
      { header: "Tipo",         key: "activityType", width: 18 },
      { header: "Auditor",      key: "auditorName",  width: 24 },
      { header: "Inicio",       key: "startDate",    width: 12 },
      { header: "Fin",          key: "endDate",      width: 12 },
      { header: "Estado",       key: "status",       width: 14 },
      { header: "Notas",        key: "notes",        width: 40 },
    ];
    this.styleHeader(wsDet.getRow(3));
    activities.forEach(a => wsDet.addRow({
      item:         a.item,
      area:         a.area,
      activity:     a.activity,
      activityType: a.activityType,
      auditorName:  a.auditorName,
      startDate:    this.fmtDate(a.startDate),
      endDate:      this.fmtDate(a.endDate),
      status:       a.status,
      notes:        a.notes ?? "",
    }));
    this.styleZebra(wsDet, 3);

    // ── Sheet 3: Cumplimiento por auditor ──
    const wsAud = wb.addWorksheet("Auditores");
    this.applyBrandHeader(wsAud, "Cumplimiento por Auditor", 0);
    wsAud.columns = [
      { header: "Auditor",       key: "name",  width: 28 },
      { header: "Asignadas",     key: "total", width: 12 },
      { header: "Completadas",   key: "done",  width: 12 },
      { header: "En Curso",      key: "wip",   width: 12 },
      { header: "Vencidas",      key: "over",  width: 12 },
      { header: "% Cumplimiento",key: "rate",  width: 14 },
    ];
    this.styleHeader(wsAud.getRow(3));
    const auditorMap: Record<string, { name: string; total: number; done: number; wip: number; over: number }> = {};
    for (const a of activities) {
      if (!auditorMap[a.auditorId]) {
        auditorMap[a.auditorId] = { name: a.auditorName, total: 0, done: 0, wip: 0, over: 0 };
      }
      auditorMap[a.auditorId].total += 1;
      if (a.status === "COMPLETED")   auditorMap[a.auditorId].done += 1;
      if (a.status === "IN_PROGRESS") auditorMap[a.auditorId].wip  += 1;
      if (a.status === "OVERDUE")     auditorMap[a.auditorId].over += 1;
    }
    Object.values(auditorMap).forEach(a => wsAud.addRow({
      name:  a.name,
      total: a.total,
      done:  a.done,
      wip:   a.wip,
      over:  a.over,
      rate:  a.total > 0 ? `${Math.round((a.done / a.total) * 100)}%` : "0%",
    }));

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  EXCEL · CEDIS · Hallazgos detallados con Subtema
  // ════════════════════════════════════════════════════════════════════════
  async exportCedisHallazgosExcel(filters: {
    cediId?: string;
    subtema?: string;
    criticidad?: string;
    estado?: string;
  } = {}) {
    const where: any = {};
    if (filters.cediId)     where.cediId     = filters.cediId;
    if (filters.subtema)    where.subtema    = filters.subtema;
    if (filters.criticidad) where.criticidad = filters.criticidad;
    if (filters.estado)     where.estado     = filters.estado;

    const items = await this.prisma.hallazgoCedi.findMany({
      where,
      include: { cedi: { select: { codigo: true, nombre: true, ciudad: true } } },
      orderBy: { createdAt: "desc" },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Hallazgos CEDI");
    this.applyBrandHeader(ws, "Hallazgos · CEDIS", items.length);

    ws.columns = [
      { header: "CEDI",            key: "cedi",       width: 26 },
      { header: "Ciudad",          key: "ciudad",     width: 16 },
      { header: "Título",          key: "titulo",     width: 40 },
      { header: "Subtema",         key: "subtema",    width: 16 },
      { header: "Categoría",       key: "categoria",  width: 18 },
      { header: "Sub-ítem",        key: "subItem",    width: 24 },
      { header: "Tipo riesgo",     key: "tipoRiesgo", width: 14 },
      { header: "Criticidad",      key: "criticidad", width: 12 },
      { header: "Estado",          key: "estado",     width: 16 },
      { header: "Responsable",     key: "responsable",width: 22 },
      { header: "Fecha compromiso",key: "fechaComp",  width: 14 },
      { header: "% Avance",        key: "avance",     width: 10 },
      { header: "Reincidente",     key: "reincidente",width: 12 },
      { header: "Descripción",     key: "descripcion",width: 50 },
    ];
    this.styleHeader(ws.getRow(3));
    items.forEach(h => ws.addRow({
      cedi:        h.cedi?.nombre ?? "—",
      ciudad:      h.cedi?.ciudad ?? "—",
      titulo:      h.titulo,
      subtema:     h.subtema ?? "—",
      categoria:   h.categoria,
      subItem:     h.subItem ?? "—",
      tipoRiesgo:  h.tipoRiesgo,
      criticidad:  h.criticidad,
      estado:      h.estado,
      responsable: h.responsable ?? "—",
      fechaComp:   h.fechaCompromiso ? this.fmtDate(h.fechaCompromiso) : "—",
      avance:      `${h.porcentajeAvance ?? 0}%`,
      reincidente: h.reincidente ? "Sí" : "No",
      descripcion: h.descripcion,
    }));
    this.styleZebra(ws, 3);
    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CSV · genérico para cualquier endpoint
  // ════════════════════════════════════════════════════════════════════════
  async exportGenericCSV(entity: "granjas" | "rutas" | "cedis" | "hallazgos" | "users") {
    let rows: any[] = [];
    switch (entity) {
      case "granjas":
        rows = await this.prisma.granja.findMany({ orderBy: { codigo: "asc" } });
        break;
      case "rutas":
        rows = await this.prisma.acompanamiento.findMany({
          include: { cliente: true, ruta: true, vehiculo: true },
          orderBy: { fecha: "desc" },
        });
        break;
      case "cedis":
        rows = await this.prisma.cedi.findMany({ orderBy: { codigo: "asc" } });
        break;
      case "hallazgos":
        rows = await this.prisma.hallazgo.findMany({
          include: { granja: { select: { nombre: true } } },
          orderBy: { createdAt: "desc" },
        });
        break;
      case "users":
        rows = await this.prisma.user.findMany({
          select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
          orderBy: { name: "asc" },
        });
        break;
    }

    if (rows.length === 0) return "Sin datos\n";

    // Headers desde el primer row (excluyendo objects anidados)
    const flat = rows.map(r => this.flatten(r));
    const headers = Object.keys(flat[0]);
    const escape  = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };
    const lines = [
      headers.join(","),
      ...flat.map(r => headers.map(h => escape(r[h])).join(",")),
    ];
    return lines.join("\n");
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════════
  private applyBrandHeader(ws: ExcelJS.Worksheet, title: string, count: number) {
    const row1 = ws.addRow([title]);
    row1.font   = { bold: true, size: 16, color: { argb: `FF${BRAND_PRIMARY}` } };
    row1.height = 28;
    ws.mergeCells(`A1:N1`);

    const row2 = ws.addRow([`Generado: ${new Date().toLocaleString("es-CO")} · ${count} registros`]);
    row2.font = { italic: true, size: 10, color: { argb: "FF94A3B8" } };
    ws.mergeCells(`A2:N2`);
  }

  private styleHeader(row: ExcelJS.Row) {
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: `FF${HEADER_FG}` }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top:    { style: "thin", color: { argb: `FF${BRAND_PRIMARY}` } },
        bottom: { style: "thin", color: { argb: `FF${BRAND_PRIMARY}` } },
      };
    });
  }

  private styleZebra(ws: ExcelJS.Worksheet, startRow: number) {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > startRow && rowNumber % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = {
            type: "pattern", pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        });
      }
    });
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return "";
    try { return new Date(d).toISOString().slice(0, 10); }
    catch { return ""; }
  }

  private flatten(obj: any, prefix = ""): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}_${k}` : k;
      if (v !== null && typeof v === "object" && !(v instanceof Date)) {
        Object.assign(out, this.flatten(v, key));
      } else if (v instanceof Date) {
        out[key] = this.fmtDate(v);
      } else {
        out[key] = v;
      }
    }
    return out;
  }
}
