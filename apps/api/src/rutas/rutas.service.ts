import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// SQLite: enums como union types
export type MotivoDevolucion = "PRODUCTO_VENCIDO" | "EMPAQUE_DANADO" | "CADENA_FRIO_ROTA"
  | "PRODUCTO_NO_SOLICITADO" | "DIFERENCIA_PESO" | "CALIDAD_NO_CONFORME"
  | "CANTIDAD_EQUIVOCADA" | "ENTREGA_TARDIA" | "CLIENTE_AUSENTE" | "OTRO";
export type EstadoAcompanamiento  = "PROGRAMADO" | "EN_CURSO" | "COMPLETADO" | "CON_HALLAZGOS" | "CERRADO";
export type CriticidadOperacional = "CRITICO" | "ALTO" | "MEDIO" | "BAJO";
export type EstadoCumplimientoRuta = "PENDIENTE" | "EN_PROCESO" | "VERIFICACION" | "CERRADO" | "CERRADO_CON_REINCIDENCIA";
export type TipoRiesgo = "OPERATIVO" | "REPUTACIONAL" | "FINANCIERO" | "LEGAL" | "CONTAGIO";

// ─── DTOs ────────────────────────────────────────────────────────────────────
export interface CreateAcompanamientoDto {
  fecha: string;
  auditorId: string;
  auditorNombre: string;
  clienteId: string;
  rutaId: string;
  vehiculoId: string;
  conductorId: string;
  auxiliarId?: string;
  motivo: MotivoDevolucion;
  valorDevueltoCOP: number;
  cantidadKgDevueltos: number;
  observacionAuditor: string;
  riesgosAsociados: TipoRiesgo[];
  criticidad: CriticidadOperacional;
  estado?: EstadoAcompanamiento;
}

export interface CreateAccionCumplimientoDto {
  acompanamientoId: string;
  planAccion: string;
  responsable: string;
  estado?: EstadoCumplimientoRuta;
  porcentajeAvance?: number;
  fechaCompromiso: string;
  fechaCumplimiento?: string;
  evidenciaCorreccion?: string;
  validadoPor?: string;
  reincidencia?: boolean;
}

// ─── SERVICE ─────────────────────────────────────────────────────────────────
@Injectable()
export class RutasService {
  constructor(private prisma: PrismaService) {}

  // ── ACOMPAÑAMIENTOS ──
  async findAllAcompanamientos(filters: {
    search?: string;
    mes?: number;
    rutaId?: string;
    vehiculoId?: string;
    clienteId?: string;
    auditorId?: string;
    motivo?: MotivoDevolucion;
    criticidad?: CriticidadOperacional;
  }) {
    const { search, mes, ...rest } = filters;
    const where: any = { ...rest };
    if (search) {
      // SQLite: LIKE es case-insensitive ASCII
      where.OR = [
        { observacionAuditor: { contains: search } },
        { cliente:  { nombre: { contains: search } } },
        { ruta:     { nombre: { contains: search } } },
        { vehiculo: { placa:  { contains: search } } },
      ];
    }
    const list = await this.prisma.acompanamiento.findMany({
      where,
      include: {
        cliente: true, ruta: true, vehiculo: true,
        conductor: true, auxiliar: true,
        evidencias: { select: { id: true } },
        acciones:   { select: { id: true, estado: true } },
      },
      orderBy: { fecha: "desc" },
    });
    // Filtro de mes (post-query — Prisma no soporta extract de mes en where simple)
    return mes ? list.filter(a => a.fecha.getMonth() + 1 === mes) : list;
  }

  async findAcompanamiento(id: string) {
    const a = await this.prisma.acompanamiento.findUnique({
      where: { id },
      include: {
        cliente: true, ruta: true, vehiculo: true,
        conductor: true, auxiliar: true,
        evidencias: true, acciones: true,
      },
    });
    if (!a) throw new NotFoundException(`Acompañamiento ${id} no encontrado`);
    return a;
  }

  // ── Auto-resolve: si recibe nombre sin id, busca o crea el registro ──
  // Permite que el frontend envíe campos manuales editables sin necesitar IDs.
  private async resolveCliente(input: any): Promise<string> {
    if (input.clienteId) return input.clienteId;
    const nombre = (input.clienteNombre ?? "").trim();
    if (!nombre) throw new Error("Cliente requerido");
    const existing = await this.prisma.cliente.findFirst({ where: { nombre } });
    if (existing) return existing.id;
    const created = await this.prisma.cliente.create({
      data: { id: `cli_${Date.now()}`, nombre, tipo: "Otro", ciudad: input.ciudad ?? "—", isDemo: false },
    });
    return created.id;
  }
  private async resolveRuta(input: any): Promise<string> {
    if (input.rutaId) return input.rutaId;
    const nombre = (input.rutaNombre ?? "").trim();
    if (!nombre) throw new Error("Ruta requerida");
    const existing = await this.prisma.ruta.findFirst({ where: { nombre } });
    if (existing) return existing.id;
    const created = await this.prisma.ruta.create({
      data: { id: `rt_${Date.now()}`, codigo: nombre.toUpperCase().slice(0,12), nombre, ciudad: "—", region: "—", isDemo: false },
    });
    return created.id;
  }
  private async resolveVehiculo(input: any): Promise<string> {
    if (input.vehiculoId) return input.vehiculoId;
    const placa = (input.vehiculoPlaca ?? "").trim();
    if (!placa) throw new Error("Vehículo requerido");
    const existing = await this.prisma.vehiculo.findFirst({ where: { placa } });
    if (existing) return existing.id;
    const created = await this.prisma.vehiculo.create({
      data: { id: `vh_${Date.now()}`, placa, tipo: "—", capacidadKg: 0, isDemo: false },
    });
    return created.id;
  }
  private async resolveConductor(input: any): Promise<string> {
    if (input.conductorId) return input.conductorId;
    const nombre = (input.conductorNombre ?? "").trim();
    if (!nombre) throw new Error("Conductor requerido");
    const existing = await this.prisma.conductor.findFirst({ where: { nombre } });
    if (existing) return existing.id;
    const created = await this.prisma.conductor.create({
      data: { id: `cn_${Date.now()}`, nombre, documento: `DOC_${Date.now()}`, licencia: "—", isDemo: false },
    });
    return created.id;
  }
  private async resolveAuxiliar(input: any): Promise<string | undefined> {
    if (input.auxiliarId) return input.auxiliarId;
    const nombre = (input.auxiliarNombre ?? "").trim();
    if (!nombre) return undefined;
    const existing = await this.prisma.auxiliar.findFirst({ where: { nombre } });
    if (existing) return existing.id;
    const created = await this.prisma.auxiliar.create({
      data: { id: `ax_${Date.now()}`, nombre, documento: `DOC_${Date.now()}`, isDemo: false },
    });
    return created.id;
  }

  async createAcompanamiento(dto: any, createdBy: string) {
    // Resuelve los IDs a partir de los nombres si se enviaron como texto libre
    const clienteId   = await this.resolveCliente(dto);
    const rutaId      = await this.resolveRuta(dto);
    const vehiculoId  = await this.resolveVehiculo(dto);
    const conductorId = await this.resolveConductor(dto);
    const auxiliarId  = await this.resolveAuxiliar(dto);

    const { riesgosAsociados, clienteNombre, rutaNombre, vehiculoPlaca, conductorNombre, auxiliarNombre, ...rest } = dto;

    return this.prisma.acompanamiento.create({
      data: {
        ...rest,
        clienteId, rutaId, vehiculoId, conductorId, auxiliarId,
        fecha:            new Date(dto.fecha),
        riesgosAsociados: JSON.stringify(riesgosAsociados ?? []),
      },
    });
  }

  async updateAcompanamiento(id: string, dto: any, updatedBy: string) {
    await this.findAcompanamiento(id);
    const { riesgosAsociados, clienteNombre, rutaNombre, vehiculoPlaca, conductorNombre, auxiliarNombre, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.fecha)            data.fecha = new Date(dto.fecha);
    if (riesgosAsociados)     data.riesgosAsociados = JSON.stringify(riesgosAsociados);
    if (dto.clienteNombre   && !dto.clienteId)   data.clienteId   = await this.resolveCliente(dto);
    if (dto.rutaNombre      && !dto.rutaId)      data.rutaId      = await this.resolveRuta(dto);
    if (dto.vehiculoPlaca   && !dto.vehiculoId)  data.vehiculoId  = await this.resolveVehiculo(dto);
    if (dto.conductorNombre && !dto.conductorId) data.conductorId = await this.resolveConductor(dto);
    if (dto.auxiliarNombre  && !dto.auxiliarId)  data.auxiliarId  = await this.resolveAuxiliar(dto);
    return this.prisma.acompanamiento.update({ where: { id }, data });
  }

  async removeAcompanamiento(id: string) {
    await this.findAcompanamiento(id);
    await this.prisma.acompanamiento.delete({ where: { id } });
    return { ok: true };
  }

  // ── ACCIONES CUMPLIMIENTO ──
  findAllAcciones(filters: { acompanamientoId?: string; estado?: EstadoCumplimientoRuta }) {
    return this.prisma.accionCumplimiento.findMany({
      where: filters,
      include: { acompanamiento: { include: { cliente: true, ruta: true } } },
      orderBy: { fechaCompromiso: "asc" },
    });
  }

  async createAccion(dto: CreateAccionCumplimientoDto) {
    return this.prisma.accionCumplimiento.create({
      data: {
        ...dto,
        fechaCompromiso:   new Date(dto.fechaCompromiso),
        fechaCumplimiento: dto.fechaCumplimiento ? new Date(dto.fechaCumplimiento) : null,
      },
    });
  }

  async updateAccion(id: string, dto: Partial<CreateAccionCumplimientoDto>) {
    return this.prisma.accionCumplimiento.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.fechaCompromiso   && { fechaCompromiso:   new Date(dto.fechaCompromiso) }),
        ...(dto.fechaCumplimiento && { fechaCumplimiento: new Date(dto.fechaCumplimiento) }),
      },
    });
  }

  // ── MAESTROS (catálogos de la DB) ──
  findClientes()    { return this.prisma.cliente.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }); }
  findRutas()       { return this.prisma.ruta.findMany({ where: { activa: true }, orderBy: { nombre: "asc" } }); }
  findVehiculos()   { return this.prisma.vehiculo.findMany({ where: { activo: true }, orderBy: { placa: "asc" } }); }
  findConductores() { return this.prisma.conductor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }); }
  findAuxiliares()  { return this.prisma.auxiliar.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }); }

  // ── DASHBOARD STATS ──
  async getDashboardStats() {
    const acompanamientos = await this.prisma.acompanamiento.findMany({
      include: { cliente: true, ruta: true, vehiculo: true, conductor: true, auxiliar: true },
    });
    return { acompanamientos };
  }
}
