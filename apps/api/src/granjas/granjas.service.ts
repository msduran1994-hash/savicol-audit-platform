import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// SQLite: enums son strings con union types
export type TipoGranja        = "ARRENDADA" | "PROPIA" | "INTEGRADA";
export type TipoOperativo     = "ENGORDE" | "REPRODUCTORA";
export type NivelRiesgo       = "BAJO" | "MEDIO" | "ALTO";
export type EstadoSanitario   = "OPTIMO" | "ALERTA" | "CRITICO";
export type EstadoGranja      = "ACTIVA" | "INACTIVA" | "CUARENTENA";
export type CategoriaHallazgo = "AMBIENTAL" | "BIOSEGURIDAD" | "SANITARIO" | "FINANCIERO" | "DOCUMENTAL" | "MORTALIDAD" | "INVENTARIO_INSUMOS" | "INFRAESTRUCTURA" | "OPERATIVO";
export type Criticidad        = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
export type EstadoHallazgo    = "ABIERTO" | "EN_PLAN" | "CERRADO" | "VERIFICADO";
export type EstadoKPI         = "NO_INICIADO" | "EN_CURSO" | "EN_ESPERA" | "COMPLETADO";
export type TipoAuditoria     = "ACOMPANAMIENTO_INSUMOS" | "ALIMENTACION" | "INVENTARIO" | "SANIDAD" | "MORTALIDAD" | "GENERAL";
export type EstadoAuditoria   = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "APROBADA" | "NO_APROBADA";
export type TipoRiesgo        = "OPERATIVO" | "REPUTACIONAL" | "FINANCIERO" | "LEGAL" | "CONTAGIO";

// ─── DTOs ────────────────────────────────────────────────────────────────────
export interface CreateGranjaDto {
  codigo: string;
  nombre: string;
  estado?: EstadoGranja;
  region: string;
  vereda: string;
  ubicacionGoogleMaps?: string;
  administrador: string;
  tecnicoVeterinarioId: string;
  telefono: string;
  tipoGranja: TipoGranja;
  tipoOperativo: TipoOperativo;
  nivelRiesgo?: NivelRiesgo;
  capacidadAves: number;
  estadoSanitario?: EstadoSanitario;
  notas?: string;
}

export interface CreateHallazgoDto {
  titulo: string;
  granjaId: string;
  auditoriaId?: string;
  auditorId: string;
  auditorNombre: string;
  tipoGranja: TipoGranja;
  tipoOperativo: TipoOperativo;
  fechaVisita: string;
  categoria: CategoriaHallazgo;
  tiposRiesgo: TipoRiesgo[];
  criticidad: Criticidad;
  estado?: EstadoHallazgo;
  descripcion: string;
  recomendacionesIA?: string;
}

export interface CreateKPIDto {
  granjaId: string;
  hallazgoId?: string;
  accion: string;
  seguimiento: string;
  fechaCompromiso: string;
  fechaProximaVisita?: string;
  fechaCumplimiento?: string;
  planAccionVeterinario: string;
  estado?: EstadoKPI;
  responsable: string;
  porcentajeAvance?: number;
}

export interface CreateAuditoriaDto {
  auditorId: string;
  auditorNombre: string;
  granjaId: string;
  tipoAuditoria: TipoAuditoria;
  fechaProgramada: string;
  estado?: EstadoAuditoria;
  comentarios?: string;
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────
@Injectable()
export class GranjasService {
  constructor(private prisma: PrismaService) {}

  // ── GRANJAS CRUD ──
  async findAllGranjas(filters: {
    region?: string;
    tipoGranja?: TipoGranja;
    tipoOperativo?: TipoOperativo;
    nivelRiesgo?: NivelRiesgo;
    estadoSanitario?: EstadoSanitario;
    tecnicoVeterinarioId?: string;
    search?: string;
  }) {
    const { search, ...rest } = filters;
    const where: any = { ...rest };
    if (search) {
      // SQLite: LIKE es case-insensitive ASCII por defecto
      where.OR = [
        { nombre:        { contains: search } },
        { codigo:        { contains: search } },
        { administrador: { contains: search } },
        { vereda:        { contains: search } },
      ];
    }
    return this.prisma.granja.findMany({
      where,
      include: { veterinario: true, _count: { select: { hallazgos: true, kpis: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findGranja(id: string) {
    const g = await this.prisma.granja.findUnique({
      where: { id },
      include: {
        veterinario: true,
        hallazgos:   { orderBy: { createdAt: "desc" }, take: 20 },
        kpis:        { orderBy: { fechaCompromiso: "asc" } },
        auditorias:  { orderBy: { fechaProgramada: "desc" }, take: 10 },
      },
    });
    if (!g) throw new NotFoundException(`Granja ${id} no encontrada`);
    return g;
  }

  async createGranja(dto: CreateGranjaDto, createdBy: string) {
    const granja = await this.prisma.granja.create({ data: dto });
    await this.logActivity({ granjaId: granja.id, tipo: "Granja", accion: "Creado",
      recursoId: granja.id, recursoNombre: granja.nombre, usuarioId: createdBy, usuarioNombre: "" });
    return granja;
  }

  async updateGranja(id: string, dto: Partial<CreateGranjaDto>, updatedBy: string) {
    await this.findGranja(id);
    const granja = await this.prisma.granja.update({ where: { id }, data: dto });
    await this.logActivity({ granjaId: id, tipo: "Granja", accion: "Actualizado",
      recursoId: id, recursoNombre: granja.nombre, usuarioId: updatedBy, usuarioNombre: "" });
    return granja;
  }

  async removeGranja(id: string, removedBy: string) {
    const g = await this.findGranja(id);
    await this.prisma.granja.delete({ where: { id } });
    await this.logActivity({ tipo: "Granja", accion: "Eliminado",
      recursoId: id, recursoNombre: g.nombre, usuarioId: removedBy, usuarioNombre: "" });
    return { ok: true };
  }

  // ── HALLAZGOS ──
  findAllHallazgos(filters: { granjaId?: string; categoria?: CategoriaHallazgo; criticidad?: Criticidad; estado?: EstadoHallazgo }) {
    const where: any = {};
    if (filters.granjaId)   where.granjaId   = filters.granjaId;
    if (filters.categoria)  where.categoria  = filters.categoria;
    if (filters.criticidad) where.criticidad = filters.criticidad;
    if (filters.estado)     where.estado     = filters.estado;
    return this.prisma.hallazgo.findMany({
      where,
      include: { granja: { select: { nombre: true, codigo: true } }, evidencias: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createHallazgo(dto: CreateHallazgoDto, createdBy: string) {
    const { tiposRiesgo, ...rest } = dto;
    const h = await this.prisma.hallazgo.create({
      data: {
        ...rest,
        fechaVisita:  new Date(dto.fechaVisita),
        tiposRiesgo:  JSON.stringify(tiposRiesgo ?? []),   // SQLite: array → JSON
      },
    });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "Hallazgo", accion: "Creado",
      recursoId: h.id, recursoNombre: h.titulo, usuarioId: createdBy, usuarioNombre: "" });
    return h;
  }

  async updateHallazgo(id: string, dto: Partial<CreateHallazgoDto>, updatedBy: string) {
    const existing = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Hallazgo no encontrado");

    const { tiposRiesgo, ...rest } = dto;
    const h = await this.prisma.hallazgo.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.fechaVisita && { fechaVisita: new Date(dto.fechaVisita) }),
        ...(tiposRiesgo     && { tiposRiesgo: JSON.stringify(tiposRiesgo) }),
      },
    });
    await this.logActivity({ granjaId: existing.granjaId, tipo: "Hallazgo", accion: "Actualizado",
      recursoId: id, recursoNombre: h.titulo, usuarioId: updatedBy, usuarioNombre: "" });
    return h;
  }

  async removeHallazgo(id: string, deletedBy: string) {
    const existing = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Hallazgo no encontrado");

    await this.prisma.hallazgo.delete({ where: { id } });
    await this.logActivity({ granjaId: existing.granjaId, tipo: "Hallazgo", accion: "Eliminado",
      recursoId: id, recursoNombre: existing.titulo, usuarioId: deletedBy, usuarioNombre: "" });
    return { message: "Hallazgo eliminado", id };
  }

  // ── KPIs ──
  findAllKPIs(filters: { granjaId?: string; estado?: EstadoKPI }) {
    return this.prisma.kPI.findMany({
      where: filters,
      include: { hallazgo: true, granja: { select: { nombre: true } } },
      orderBy: { fechaCompromiso: "asc" },
    });
  }

  async createKPI(dto: CreateKPIDto, createdBy: string) {
    const k = await this.prisma.kPI.create({
      data: {
        ...dto,
        fechaCompromiso:    new Date(dto.fechaCompromiso),
        fechaProximaVisita: dto.fechaProximaVisita ? new Date(dto.fechaProximaVisita) : null,
        fechaCumplimiento:  dto.fechaCumplimiento  ? new Date(dto.fechaCumplimiento)  : null,
      },
    });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "KPI", accion: "Creado",
      recursoId: k.id, recursoNombre: k.accion, usuarioId: createdBy, usuarioNombre: "" });
    return k;
  }

  async updateKPI(id: string, dto: Partial<CreateKPIDto>, updatedBy: string) {
    const k = await this.prisma.kPI.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.fechaCompromiso    && { fechaCompromiso:    new Date(dto.fechaCompromiso) }),
        ...(dto.fechaProximaVisita && { fechaProximaVisita: new Date(dto.fechaProximaVisita) }),
        ...(dto.fechaCumplimiento  && { fechaCumplimiento:  new Date(dto.fechaCumplimiento) }),
      },
    });
    await this.logActivity({ granjaId: k.granjaId, tipo: "KPI", accion: "Actualizado",
      recursoId: id, recursoNombre: k.accion, usuarioId: updatedBy, usuarioNombre: "" });
    return k;
  }

  // ── AUDITORÍAS ──
  findAllAuditorias(filters: { granjaId?: string; estado?: EstadoAuditoria }) {
    return this.prisma.auditoriaGranja.findMany({
      where: filters,
      include: { granja: { select: { nombre: true, codigo: true } } },
      orderBy: { fechaProgramada: "desc" },
    });
  }

  async createAuditoria(dto: CreateAuditoriaDto, createdBy: string) {
    const a = await this.prisma.auditoriaGranja.create({
      data: { ...dto, fechaProgramada: new Date(dto.fechaProgramada) },
    });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "Auditoría", accion: "Creado",
      recursoId: a.id, recursoNombre: `${a.tipoAuditoria} · ${a.fechaProgramada.toISOString().slice(0,10)}`,
      usuarioId: createdBy, usuarioNombre: "" });
    return a;
  }

  // ── ACTIVIDAD LOG ──
  findActividad(limit = 50) {
    return this.prisma.actividadGranjaLog.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  private async logActivity(data: {
    granjaId?: string; tipo: string; accion: string;
    recursoId: string; recursoNombre: string;
    usuarioId: string; usuarioNombre: string; detalles?: string;
  }) {
    return this.prisma.actividadGranjaLog.create({ data });
  }

  // ── DASHBOARD STATS ──
  async getDashboardStats() {
    const [granjas, hallazgos, kpis] = await Promise.all([
      this.prisma.granja.findMany({ select: { id: true, nombre: true, tipoGranja: true, tipoOperativo: true, estadoSanitario: true } }),
      this.prisma.hallazgo.findMany({
        include: { granja: { select: { nombre: true } } },
      }),
      this.prisma.kPI.findMany({ select: { id: true, granjaId: true, estado: true, planAccionVeterinario: true } }),
    ]);
    return { granjas, hallazgos, kpis };
  }
}
