// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS · Bulk import desde CSV/Excel parseado en frontend
// ═══════════════════════════════════════════════════════════════════════════════
// Cada endpoint recibe una lista JSON y devuelve { ok, skipped, errors[] }
// El parsing de CSV/Excel se hace en el cliente (SheetJS) para evitar manejar
// archivos binarios en el backend (alineado con constraint "carga manual").
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ImportResult {
  total:   number;
  created: number;
  updated: number;
  skipped: number;
  errors:  Array<{ row: number; field?: string; message: string }>;
}

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  // ── helpers ──
  private str(v: any): string {
    return v == null ? "" : String(v).trim();
  }
  private num(v: any, fallback = 0): number {
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  private date(v: any): Date | undefined {
    if (!v) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  private enumOk<T extends string>(value: any, allowed: readonly T[], fallback: T): T {
    const v = this.str(value).toUpperCase();
    return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  }

  // ─────────────────────────────────────────────────────────────────
  // GRANJAS · upsert por código
  // ─────────────────────────────────────────────────────────────────
  async importGranjas(rows: any[]): Promise<ImportResult> {
    if (!Array.isArray(rows)) throw new BadRequestException("rows debe ser array");
    const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };

    const tipoGranjas    = ["ARRENDADA", "PROPIA", "INTEGRADA"] as const;
    const tipoOperativos = ["ENGORDE", "REPRODUCTORA"] as const;
    const niveles        = ["BAJO", "MEDIO", "ALTO"] as const;
    const estadoSan      = ["OPTIMO", "ALERTA", "CRITICO"] as const;
    const estados        = ["ACTIVA", "INACTIVA", "CUARENTENA"] as const;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const codigo = this.str(r.codigo);
        if (!codigo) { result.errors.push({ row: i + 1, field: "codigo", message: "código obligatorio" }); result.skipped++; continue; }
        const nombre = this.str(r.nombre);
        if (!nombre) { result.errors.push({ row: i + 1, field: "nombre", message: "nombre obligatorio" }); result.skipped++; continue; }

        const data = {
          codigo,
          nombre,
          estado:          this.enumOk(r.estado,         estados,        "ACTIVA"),
          region:          this.str(r.region) || "—",
          vereda:          this.str(r.vereda) || "—",
          administrador:   this.str(r.administrador) || "—",
          telefono:        this.str(r.telefono) || "—",
          tipoGranja:      this.enumOk(r.tipoGranja,    tipoGranjas,    "PROPIA"),
          tipoOperativo:   this.enumOk(r.tipoOperativo, tipoOperativos, "ENGORDE"),
          nivelRiesgo:     this.enumOk(r.nivelRiesgo,   niveles,        "BAJO"),
          estadoSanitario: this.enumOk(r.estadoSanitario, estadoSan,    "OPTIMO"),
          capacidadAves:   this.num(r.capacidadAves, 0),
          notas:           this.str(r.notas) || undefined,
          responsable:     this.str(r.responsable) || undefined,
          ubicacionGoogleMaps: this.str(r.ubicacionGoogleMaps) || undefined,
        };

        const existing = await this.prisma.granja.findUnique({ where: { codigo } });
        if (existing) {
          await this.prisma.granja.update({ where: { codigo }, data });
          result.updated++;
        } else {
          await this.prisma.granja.create({ data });
          result.created++;
        }
      } catch (e: any) {
        result.errors.push({ row: i + 1, message: e?.message ?? "error desconocido" });
        result.skipped++;
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // HALLAZGOS GRANJA · create (no upsert · cada hallazgo es único)
  // ─────────────────────────────────────────────────────────────────
  async importHallazgosGranja(rows: any[]): Promise<ImportResult> {
    if (!Array.isArray(rows)) throw new BadRequestException("rows debe ser array");
    const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };

    const categorias  = ["AMBIENTAL", "BIOSEGURIDAD", "SANITARIO", "FINANCIERO", "DOCUMENTAL", "MORTALIDAD", "INVENTARIO_INSUMOS", "INFRAESTRUCTURA", "OPERATIVO"] as const;
    const criticidades = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const;
    const estados      = ["ABIERTO", "EN_PLAN", "CERRADO", "VERIFICADO"] as const;
    const tiposRiesgo  = ["OPERATIVO", "REPUTACIONAL", "FINANCIERO", "LEGAL", "CONTAGIO"] as const;
    const tipoGranjas  = ["ARRENDADA", "PROPIA", "INTEGRADA"] as const;
    const tipoOperativos = ["ENGORDE", "REPRODUCTORA"] as const;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const titulo = this.str(r.titulo);
        if (!titulo) { result.errors.push({ row: i + 1, field: "titulo", message: "título obligatorio" }); result.skipped++; continue; }
        const descripcion = this.str(r.descripcion);
        if (!descripcion) { result.errors.push({ row: i + 1, field: "descripcion", message: "descripción obligatoria" }); result.skipped++; continue; }

        // Resolver granjaId desde código si vienne así
        let granjaId = this.str(r.granjaId);
        if (!granjaId && r.granjaCodigo) {
          const g = await this.prisma.granja.findUnique({ where: { codigo: this.str(r.granjaCodigo) } });
          if (g) granjaId = g.id;
        }
        if (!granjaId) {
          result.errors.push({ row: i + 1, field: "granjaId", message: "granjaId o granjaCodigo no encontrado" });
          result.skipped++; continue;
        }

        // tiposRiesgo: puede venir como "OPERATIVO,FINANCIERO" o array
        let tiposArr: string[] = [];
        if (Array.isArray(r.tiposRiesgo)) tiposArr = r.tiposRiesgo.map((x: any) => this.str(x).toUpperCase());
        else if (typeof r.tiposRiesgo === "string") tiposArr = r.tiposRiesgo.split(/[,;|]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        tiposArr = tiposArr.filter(t => (tiposRiesgo as readonly string[]).includes(t));
        if (tiposArr.length === 0) tiposArr = ["OPERATIVO"];

        const data = {
          titulo,
          descripcion,
          granjaId,
          auditorId:     this.str(r.auditorId)     || "import-bulk",
          auditorNombre: this.str(r.auditorNombre) || "Carga masiva",
          tipoGranja:    this.enumOk(r.tipoGranja,    tipoGranjas,    "PROPIA"),
          tipoOperativo: this.enumOk(r.tipoOperativo, tipoOperativos, "ENGORDE"),
          fechaVisita:   this.date(r.fechaVisita) ?? new Date(),
          categoria:     this.enumOk(r.categoria,  categorias,   "OPERATIVO"),
          tiposRiesgo:   JSON.stringify(tiposArr),
          criticidad:    this.enumOk(r.criticidad, criticidades, "MEDIA"),
          estado:        this.enumOk(r.estado,     estados,      "ABIERTO"),
          recomendacionesIA: this.str(r.recomendacionesIA) || undefined,
        };

        await this.prisma.hallazgo.create({ data });
        result.created++;
      } catch (e: any) {
        result.errors.push({ row: i + 1, message: e?.message ?? "error desconocido" });
        result.skipped++;
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // KPIs GRANJA
  // ─────────────────────────────────────────────────────────────────
  async importKPIs(rows: any[]): Promise<ImportResult> {
    if (!Array.isArray(rows)) throw new BadRequestException("rows debe ser array");
    const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };
    const estados = ["NO_INICIADO", "EN_CURSO", "EN_ESPERA", "COMPLETADO"] as const;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        let granjaId = this.str(r.granjaId);
        if (!granjaId && r.granjaCodigo) {
          const g = await this.prisma.granja.findUnique({ where: { codigo: this.str(r.granjaCodigo) } });
          if (g) granjaId = g.id;
        }
        if (!granjaId) {
          result.errors.push({ row: i + 1, field: "granjaId", message: "granja no encontrada" });
          result.skipped++; continue;
        }

        const accion = this.str(r.accion);
        if (!accion) {
          result.errors.push({ row: i + 1, field: "accion", message: "acción obligatoria" });
          result.skipped++; continue;
        }

        const data = {
          granjaId,
          accion,
          seguimiento:           this.str(r.seguimiento) || "—",
          fechaCompromiso:       this.date(r.fechaCompromiso) ?? new Date(),
          fechaProximaVisita:    this.date(r.fechaProximaVisita),
          fechaCumplimiento:     this.date(r.fechaCumplimiento),
          planAccionVeterinario: this.str(r.planAccionVeterinario) || "—",
          responsable:           this.str(r.responsable) || "—",
          estado:                this.enumOk(r.estado, estados, "NO_INICIADO"),
          porcentajeAvance:      Math.min(100, Math.max(0, this.num(r.porcentajeAvance, 0))),
        };

        await this.prisma.kPI.create({ data });
        result.created++;
      } catch (e: any) {
        result.errors.push({ row: i + 1, message: e?.message ?? "error" });
        result.skipped++;
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // CRONOGRAMA · AuditActivity
  // ─────────────────────────────────────────────────────────────────
  async importCronograma(rows: any[]): Promise<ImportResult> {
    if (!Array.isArray(rows)) throw new BadRequestException("rows debe ser array");
    const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };
    const statuses = ["COMPLETED", "IN_PROGRESS", "NOT_STARTED", "OVERDUE"] as const;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const activity = this.str(r.activity);
        if (!activity) {
          result.errors.push({ row: i + 1, field: "activity", message: "activity obligatoria" });
          result.skipped++; continue;
        }
        const startDate = this.date(r.startDate);
        const endDate   = this.date(r.endDate);
        if (!startDate || !endDate) {
          result.errors.push({ row: i + 1, field: "fechas", message: "startDate y endDate obligatorias" });
          result.skipped++; continue;
        }

        const data = {
          item:         this.num(r.item, i + 1),
          area:         this.str(r.area) || "—",
          auditorId:    this.str(r.auditorId)    || "import-bulk",
          auditorName:  this.str(r.auditorName)  || "Carga masiva",
          activity,
          activityType: this.str(r.activityType) || "AUDITORIA",
          startDate,
          endDate,
          status:       this.enumOk(r.status, statuses, "NOT_STARTED"),
          notes:        this.str(r.notes) || undefined,
          year:         this.num(r.year, new Date().getFullYear()),
        };

        await this.prisma.auditActivity.create({ data });
        result.created++;
      } catch (e: any) {
        result.errors.push({ row: i + 1, message: e?.message ?? "error" });
        result.skipped++;
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // CEDIS HALLAZGOS
  // ─────────────────────────────────────────────────────────────────
  async importHallazgosCedi(rows: any[]): Promise<ImportResult> {
    if (!Array.isArray(rows)) throw new BadRequestException("rows debe ser array");
    const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };
    const tipoRiesgos  = ["OPERATIVO", "REPUTACIONAL", "FINANCIERO", "LEGAL", "CONTAGIO"] as const;
    const criticidades = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const;
    const estados      = ["ABIERTO", "EN_PLAN", "CERRADO", "VERIFICADO"] as const;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        let cediId = this.str(r.cediId);
        if (!cediId && r.cediCodigo) {
          const c = await this.prisma.cedi.findUnique({ where: { codigo: this.str(r.cediCodigo) } });
          if (c) cediId = c.id;
        }
        if (!cediId) {
          result.errors.push({ row: i + 1, field: "cediId", message: "CEDI no encontrado" });
          result.skipped++; continue;
        }

        const titulo      = this.str(r.titulo);
        const descripcion = this.str(r.descripcion);
        if (!titulo || !descripcion) {
          result.errors.push({ row: i + 1, message: "titulo y descripcion obligatorios" });
          result.skipped++; continue;
        }

        const data = {
          cediId,
          titulo,
          descripcion,
          categoria:    this.str(r.categoria) || "OPERATIVO",
          subtema:      this.str(r.subtema) || undefined,
          subItem:      this.str(r.subItem) || undefined,
          tipoRiesgo:   this.enumOk(r.tipoRiesgo,  tipoRiesgos,  "OPERATIVO"),
          criticidad:   this.enumOk(r.criticidad, criticidades, "MEDIA"),
          estado:       this.enumOk(r.estado,     estados,      "ABIERTO"),
          recomendacionIA:  this.str(r.recomendacionIA) || undefined,
          responsable:      this.str(r.responsable) || undefined,
          fechaCompromiso:  this.date(r.fechaCompromiso),
          fechaCierre:      this.date(r.fechaCierre),
          porcentajeAvance: Math.min(100, Math.max(0, this.num(r.porcentajeAvance, 0))),
          reincidente:      r.reincidente === true || r.reincidente === "true" || r.reincidente === 1,
        };

        await this.prisma.hallazgoCedi.create({ data });
        result.created++;
      } catch (e: any) {
        result.errors.push({ row: i + 1, message: e?.message ?? "error" });
        result.skipped++;
      }
    }
    return result;
  }
}
