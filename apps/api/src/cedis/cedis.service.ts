import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// SQLite: enums como union types
export type TipoRiesgoCedi    = "REPUTACIONAL" | "FINANCIERO" | "CONTAGIO" | "OPERATIVO" | "LEGAL";
export type CriticidadCedi    = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
export type EstadoHallazgoCedi = "ABIERTO" | "EN_PLAN" | "EN_VERIFICACION" | "CERRADO" | "REINCIDENTE";
export type CategoriaCedi     = "INVENTARIO" | "CAJA" | "CARTERA" | "LOGISTICA" | "BIOSEGURIDAD" | "INFRAESTRUCTURA" | "PROCEDIMIENTOS";

// ─── DTOs ────────────────────────────────────────────────────────────────────
export interface CreateCediDto {
  codigo: string; nombre: string; ciudad: string; region: string;
  administrador: string; telefono: string;
  direccion?: string; capacidad?: number;
}

export interface CreateAuditoriaCediDto {
  cediId: string;
  fechaVisita: string;
  auditorId: string;
  auditorNombre: string;
  administrador: string;
  tipoRiesgo: TipoRiesgoCedi;
  subtema?: string;                            // Inventario · Caja · Cartera · Logística · Bioseguridad · Infraestructura · Procedimientos
  observacionRiesgo: string;
  observacionInventario?: string;
  observacionCaja?: string;
  observacionCartera?: string;
  observacionLogistica?: string;
  observacionBioseguridad?: string;
  observacionInfraestructura?: string;
  observacionProcedimientos?: string;
  planMejoraMercadeo?: string;
  seguimientoCorrectivo?: string;
  checksJSON?: string;
  criticidad: CriticidadCedi;
  estado?: EstadoHallazgoCedi;
}

export interface CreateHallazgoCediDto {
  auditoriaId?: string;
  cediId: string;
  titulo: string;
  categoria: CategoriaCedi;
  subtema?: string;                            // Subtema oficial
  subItem?: string;
  descripcion: string;
  tipoRiesgo: TipoRiesgoCedi;
  criticidad: CriticidadCedi;
  estado?: EstadoHallazgoCedi;
  recomendacionIA?: string;
  responsable?: string;
  fechaCompromiso?: string;
  fechaCierre?: string;
  porcentajeAvance?: number;
  reincidente?: boolean;
}

@Injectable()
export class CedisService {
  constructor(private prisma: PrismaService) {}

  // ── CEDIS CRUD ──
  findAllCedis(filters: { search?: string; region?: string }) {
    const where: any = {};
    if (filters.region) where.region = filters.region;
    if (filters.search) {
      where.OR = [
        { nombre:        { contains: filters.search } },
        { codigo:        { contains: filters.search } },
        { administrador: { contains: filters.search } },
        { ciudad:        { contains: filters.search } },
      ];
    }
    return this.prisma.cedi.findMany({
      where,
      include: { _count: { select: { auditorias: true, hallazgos: true } } },
      orderBy: { nombre: "asc" },
    });
  }

  async findCedi(id: string) {
    const c = await this.prisma.cedi.findUnique({
      where: { id },
      include: {
        auditorias: { orderBy: { fechaVisita: "desc" }, take: 10 },
        hallazgos:  { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!c) throw new NotFoundException(`CEDI ${id} no encontrado`);
    return c;
  }

  createCedi(dto: CreateCediDto)         { return this.prisma.cedi.create({ data: dto }); }
  async updateCedi(id: string, dto: Partial<CreateCediDto>) {
    await this.findCedi(id);
    return this.prisma.cedi.update({ where: { id }, data: dto });
  }
  async removeCedi(id: string) {
    await this.findCedi(id);
    await this.prisma.cedi.delete({ where: { id } });
    return { ok: true };
  }

  // ── AUDITORÍAS ──
  async findAllAuditorias(filters: { cediId?: string; estado?: string; mes?: number }) {
    const where: any = {};
    if (filters.cediId) where.cediId = filters.cediId;
    if (filters.estado) where.estado = filters.estado;
    const items = await this.prisma.auditoriaCedi.findMany({
      where,
      include: { cedi: { select: { nombre: true, codigo: true } } },
      orderBy: { fechaVisita: "desc" },
    });
    return filters.mes ? items.filter(a => a.fechaVisita.getMonth() + 1 === filters.mes) : items;
  }

  createAuditoria(dto: CreateAuditoriaCediDto) {
    return this.prisma.auditoriaCedi.create({
      data: { ...dto, fechaVisita: new Date(dto.fechaVisita) },
    });
  }

  updateAuditoria(id: string, dto: Partial<CreateAuditoriaCediDto>) {
    return this.prisma.auditoriaCedi.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.fechaVisita && { fechaVisita: new Date(dto.fechaVisita) }),
      },
    });
  }

  async removeAuditoria(id: string) {
    await this.prisma.auditoriaCedi.delete({ where: { id } });
    return { ok: true };
  }

  // ── HALLAZGOS ──
  findAllHallazgos(filters: { cediId?: string; categoria?: string; estado?: string; criticidad?: string }) {
    const where: any = {};
    if (filters.cediId)     where.cediId     = filters.cediId;
    if (filters.categoria)  where.categoria  = filters.categoria;
    if (filters.estado)     where.estado     = filters.estado;
    if (filters.criticidad) where.criticidad = filters.criticidad;
    return this.prisma.hallazgoCedi.findMany({
      where,
      include: { cedi: { select: { nombre: true, codigo: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  createHallazgo(dto: CreateHallazgoCediDto) {
    return this.prisma.hallazgoCedi.create({
      data: {
        ...dto,
        ...(dto.fechaCompromiso && { fechaCompromiso: new Date(dto.fechaCompromiso) }),
      },
    });
  }

  async updateHallazgo(id: string, dto: Partial<CreateHallazgoCediDto>) {
    const existing = await this.prisma.hallazgoCedi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Hallazgo no encontrado");

    return this.prisma.hallazgoCedi.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.fechaCompromiso && { fechaCompromiso: new Date(dto.fechaCompromiso) }),
        ...((dto as any).fechaCierre && { fechaCierre: new Date((dto as any).fechaCierre) }),
      },
    });
  }

  async removeHallazgo(id: string) {
    const existing = await this.prisma.hallazgoCedi.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Hallazgo no encontrado");

    await this.prisma.hallazgoCedi.delete({ where: { id } });
    return { message: "Hallazgo eliminado", id };
  }

  // ── DASHBOARD ──
  async getDashboard() {
    const [cedis, auditorias, hallazgos] = await Promise.all([
      this.prisma.cedi.findMany(),
      this.prisma.auditoriaCedi.findMany({ include: { cedi: { select: { nombre: true } } } }),
      this.prisma.hallazgoCedi.findMany({ include: { cedi: { select: { nombre: true } } } }),
    ]);
    return { cedis, auditorias, hallazgos };
  }
}
