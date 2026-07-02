import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// DTO de creación/edición de un descarte (un registro = un viaje/vehículo).
export interface CreateDescarteDto {
  fechaHoraDescarte: string;
  granjaId?: string;
  granjaNombre: string;
  empresa?: string;
  integracion?: string;
  galpon: string;
  lote: string;
  lineaGenetica?: string;
  loteEdadDias?: number;
  tipoDescarte?: string;
  motivo: string;
  clasificacionSanitaria?: string;
  nivelRiesgo?: string;
  estado?: string;
  cantidadAves?: number;
  pesoPromedioKg?: number;
  pesoTotalKg?: number;
  mortalidadTraslado?: number;
  destino?: string;
  plantaDestino?: string;
  transportadora?: string;
  vehiculoPlaca?: string;
  conductor?: string;
  responsableDespacho?: string;
  responsableRecepcion?: string;
  medicoVeterinario?: string;
  horaInicioCargue?: string;
  horaFinCargue?: string;
  horaSalidaGranja?: string;
  horaLlegadaPlanta?: string;
  horaInicioDescarga?: string;
  horaFinDescarga?: string;
  gpsSalidaLat?: number;
  gpsSalidaLng?: number;
  gpsLlegadaLat?: number;
  gpsLlegadaLng?: number;
  distanciaKm?: number;
  ruta?: string;
  observaciones?: string;
}

export interface CreateEvidenciaDescarteDto {
  descarteId: string;
  tipo: string;
  nombre: string;
  url: string;
  size?: number;
  categoria?: string;
}

// Campos DateTime que llegan como texto ISO y se convierten a Date.
const DATE_FIELDS = [
  "fechaHoraDescarte", "horaInicioCargue", "horaFinCargue", "horaSalidaGranja",
  "horaLlegadaPlanta", "horaInicioDescarga", "horaFinDescarga",
];

// Whitelist de columnas escribibles (evita inyectar id/timestamps/audit desde el body).
const ALLOWED = [
  "fechaHoraDescarte", "granjaId", "granjaNombre", "empresa", "integracion", "galpon", "lote",
  "lineaGenetica", "loteEdadDias", "tipoDescarte", "motivo", "clasificacionSanitaria", "nivelRiesgo", "estado",
  "cantidadAves", "pesoPromedioKg", "pesoTotalKg", "mortalidadTraslado",
  "destino", "plantaDestino", "transportadora", "vehiculoPlaca", "conductor",
  "responsableDespacho", "responsableRecepcion", "medicoVeterinario",
  "horaInicioCargue", "horaFinCargue", "horaSalidaGranja", "horaLlegadaPlanta", "horaInicioDescarga", "horaFinDescarga",
  "gpsSalidaLat", "gpsSalidaLng", "gpsLlegadaLat", "gpsLlegadaLng", "distanciaKm", "ruta", "observaciones",
  "checklistJSON",
];

function sanitize(dto: any): any {
  const out: any = {};
  for (const k of ALLOWED) if (dto[k] !== undefined) out[k] = dto[k];
  for (const f of DATE_FIELDS) {
    if (out[f] === "" || out[f] == null) delete out[f];
    else out[f] = new Date(out[f]);
  }
  // Peso total consistente (cantidad × promedio) si no viene o viene en 0.
  if ((out.pesoTotalKg == null || out.pesoTotalKg === 0) && out.cantidadAves && out.pesoPromedioKg) {
    out.pesoTotalKg = Math.round(out.cantidadAves * out.pesoPromedioKg * 100) / 100;
  }
  return out;
}

// ── Auditoría (Fase 7): formateo y diff de campos antes→después ───────────────
function fmtVal(v: any): string {
  if (v == null || v === "") return "—";
  if (v instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}`;
  }
  return String(v);
}
function diffCampos(prev: any, data: any, exclude: string[]): { campo: string; antes: string; despues: string }[] {
  const norm = (v: any) => v instanceof Date ? v.getTime() : (v == null ? null : v);
  const out: { campo: string; antes: string; despues: string }[] = [];
  for (const k of Object.keys(data)) {
    if (exclude.includes(k)) continue;
    if (norm(prev?.[k]) !== norm(data[k])) out.push({ campo: k, antes: fmtVal(prev?.[k]), despues: fmtVal(data[k]) });
  }
  return out;
}

@Injectable()
export class DescartesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { granjaId?: string; estado?: string; motivo?: string; nivelRiesgo?: string; plantaDestino?: string } = {}) {
    const where: any = {};
    if (filters.granjaId)      where.granjaId = filters.granjaId;
    if (filters.estado)        where.estado = filters.estado;
    if (filters.motivo)        where.motivo = filters.motivo;
    if (filters.nivelRiesgo)   where.nivelRiesgo = filters.nivelRiesgo;
    if (filters.plantaDestino) where.plantaDestino = filters.plantaDestino;
    return this.prisma.descarteAve.findMany({ where, orderBy: { fechaHoraDescarte: "desc" } });
  }

  findOne(id: string) {
    return this.prisma.descarteAve.findUnique({ where: { id } });
  }

  async create(dto: CreateDescarteDto, userName?: string) {
    const data = sanitize(dto);
    const rec = await this.prisma.descarteAve.create({
      data: { ...data, createdBy: userName ?? null, updatedBy: userName ?? null },
    });
    await this.auditar(rec.id, "Creación", userName, `Descarte registrado — ${rec.granjaNombre} · galpón ${rec.galpon} · lote ${rec.lote}`);
    return rec;
  }

  async update(id: string, dto: Partial<CreateDescarteDto>, userName?: string) {
    const data = sanitize(dto);
    const prev = await this.prisma.descarteAve.findUnique({ where: { id } });
    const rec = await this.prisma.descarteAve.update({
      where: { id },
      data: { ...data, updatedBy: userName ?? null },
    });
    if (prev) {
      // Cambio de estado — evento propio
      if (data.estado !== undefined && data.estado !== prev.estado) {
        await this.auditar(id, "Cambio de estado", userName, `Estado: ${prev.estado ?? "—"} → ${data.estado}`,
          [{ campo: "estado", antes: fmtVal(prev.estado), despues: fmtVal(data.estado) }]);
      }
      // Checklist de trazabilidad — evento propio
      if (data.checklistJSON !== undefined && data.checklistJSON !== prev.checklistJSON) {
        await this.auditar(id, "Checklist", userName, "Checklist de trazabilidad actualizado");
      }
      // Edición del resto de campos (con diff antes→después)
      const cambios = diffCampos(prev, data, ["estado", "checklistJSON"]);
      if (cambios.length) await this.auditar(id, "Edición", userName, `${cambios.length} campo(s) modificado(s)`, cambios);
    }
    return rec;
  }

  remove(id: string) {
    // La auditoría se borra en cascada con el registro (no se audita la eliminación).
    return this.prisma.descarteAve.delete({ where: { id } });
  }

  // ── Auditoría / historial de cambios (Fase 7) ──
  private async auditar(descarteId: string, accion: string, usuario?: string, detalle?: string, cambios?: any) {
    try {
      await this.prisma.auditoriaDescarte.create({
        data: { descarteId, accion, usuario: usuario ?? null, detalle: detalle ?? null, cambiosJSON: cambios ? JSON.stringify(cambios) : null },
      });
    } catch { /* la auditoría nunca debe romper la operación principal */ }
  }

  findAuditoria(descarteId: string) {
    return this.prisma.auditoriaDescarte.findMany({ where: { descarteId }, orderBy: { createdAt: "desc" } });
  }

  // ── Evidencias ──
  findEvidencias(descarteId: string) {
    return this.prisma.evidenciaDescarte.findMany({ where: { descarteId }, orderBy: { uploadedAt: "desc" } });
  }

  async createEvidencia(dto: CreateEvidenciaDescarteDto, userName?: string) {
    const ev = await this.prisma.evidenciaDescarte.create({
      data: {
        descarteId: dto.descarteId,
        tipo: dto.tipo,
        nombre: dto.nombre,
        url: dto.url,
        size: dto.size ?? 0,
        categoria: dto.categoria ?? null,
        uploadedBy: userName ?? null,
      },
    });
    await this.auditar(dto.descarteId, "Evidencia agregada", userName, `${dto.categoria ?? dto.tipo}: ${dto.nombre}`);
    return ev;
  }

  async removeEvidencia(id: string, userName?: string) {
    const ev = await this.prisma.evidenciaDescarte.findUnique({ where: { id } });
    const res = await this.prisma.evidenciaDescarte.delete({ where: { id } });
    if (ev) await this.auditar(ev.descarteId, "Evidencia eliminada", userName, `${ev.categoria ?? ev.tipo}: ${ev.nombre}`);
    return res;
  }
}
