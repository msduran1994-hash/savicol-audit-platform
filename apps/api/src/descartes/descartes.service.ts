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

  create(dto: CreateDescarteDto, userName?: string) {
    const data = sanitize(dto);
    return this.prisma.descarteAve.create({
      data: { ...data, createdBy: userName ?? null, updatedBy: userName ?? null },
    });
  }

  update(id: string, dto: Partial<CreateDescarteDto>, userName?: string) {
    const data = sanitize(dto);
    return this.prisma.descarteAve.update({
      where: { id },
      data: { ...data, updatedBy: userName ?? null },
    });
  }

  remove(id: string) {
    return this.prisma.descarteAve.delete({ where: { id } });
  }
}
