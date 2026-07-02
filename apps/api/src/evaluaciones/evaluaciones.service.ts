import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateEvaluacionDto {
  modulo?: string;
  bodega?: string;
  auditores?: string;
  coordinador?: string;
  director?: string;
  colaboradores?: string;
  fecha?: string;
  hora?: string;
  estadoEvaluacion?: string;
  respuestasJSON?: string;
  bitacoraJSON?: string;
  observacionGeneral?: string;
  conclusion?: string;
  planAccion?: string;
  puntajeObtenido?: number;
  contestadas?: number;
  puntajeMaximo?: number;
  promedio?: number;
  porcentaje?: number;
  calificacion?: string;
}

export interface CreateEvidenciaEvaluacionDto {
  evaluacionId: string;
  preguntaId?: string;
  tipo: string;
  nombre: string;
  url: string;
  size?: number;
  categoria?: string;
}

const ALLOWED = [
  "modulo", "bodega", "auditores", "coordinador", "director", "colaboradores",
  "fecha", "hora", "estadoEvaluacion", "respuestasJSON", "bitacoraJSON",
  "observacionGeneral", "conclusion", "planAccion",
  "puntajeObtenido", "contestadas", "puntajeMaximo", "promedio", "porcentaje", "calificacion",
];

function sanitize(dto: any): any {
  const out: any = {};
  for (const k of ALLOWED) if (dto[k] !== undefined) out[k] = dto[k];
  if (out.fecha === "" || out.fecha == null) delete out.fecha;
  else out.fecha = new Date(out.fecha);
  return out;
}

@Injectable()
export class EvaluacionesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { modulo?: string } = {}) {
    const where: any = {};
    if (filters.modulo) where.modulo = filters.modulo;
    return this.prisma.evaluacionInventario.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  findOne(id: string) {
    return this.prisma.evaluacionInventario.findUnique({ where: { id } });
  }

  create(dto: CreateEvaluacionDto, userName?: string) {
    const data = sanitize(dto);
    return this.prisma.evaluacionInventario.create({
      data: { ...data, createdBy: userName ?? null, updatedBy: userName ?? null },
    });
  }

  update(id: string, dto: Partial<CreateEvaluacionDto>, userName?: string) {
    const data = sanitize(dto);
    return this.prisma.evaluacionInventario.update({
      where: { id },
      data: { ...data, updatedBy: userName ?? null },
    });
  }

  remove(id: string) {
    return this.prisma.evaluacionInventario.delete({ where: { id } });
  }

  // ── Evidencias ──
  findEvidencias(evaluacionId: string) {
    return this.prisma.evidenciaEvaluacion.findMany({ where: { evaluacionId }, orderBy: { uploadedAt: "desc" } });
  }

  createEvidencia(dto: CreateEvidenciaEvaluacionDto, userName?: string) {
    return this.prisma.evidenciaEvaluacion.create({
      data: {
        evaluacionId: dto.evaluacionId, preguntaId: dto.preguntaId ?? null,
        tipo: dto.tipo, nombre: dto.nombre, url: dto.url,
        size: dto.size ?? 0, categoria: dto.categoria ?? null, uploadedBy: userName ?? null,
      },
    });
  }

  removeEvidencia(id: string) {
    return this.prisma.evidenciaEvaluacion.delete({ where: { id } });
  }
}
