import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
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
    if (!dto.granjaId)    throw new BadRequestException("granjaId es obligatorio");
    if (!dto.titulo?.trim())       throw new BadRequestException("titulo es obligatorio");
    if (!dto.descripcion?.trim())  throw new BadRequestException("descripcion es obligatoria");

    const data = this.sanitizeHallazgoPayload(dto);
    if (!data.fechaVisita) data.fechaVisita = new Date(); // si no hay fecha, usa hoy

    const h = await this.prisma.hallazgo.create({ data });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "Hallazgo", accion: "Creado",
      recursoId: h.id, recursoNombre: h.titulo, usuarioId: createdBy, usuarioNombre: "" });
    return h;
  }

  async updateHallazgo(id: string, dto: Partial<CreateHallazgoDto>, updatedBy: string) {
    const existing = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Hallazgo no encontrado");

    const data = this.sanitizeHallazgoPayload(dto);
    const h = await this.prisma.hallazgo.update({ where: { id }, data });
    await this.logActivity({ granjaId: existing.granjaId, tipo: "Hallazgo", accion: "Actualizado",
      recursoId: id, recursoNombre: h.titulo, usuarioId: updatedBy, usuarioNombre: "" });
    return h;
  }

  /**
   * Sanitiza Hallazgo payload:
   *  - tiposRiesgo array → JSON string (SQLite no soporta arrays)
   *  - fechaVisita string → Date solo si presente
   *  - Strings vacíos opcionales eliminados
   *  - Trim de strings con contenido
   */
  private sanitizeHallazgoPayload(dto: Partial<CreateHallazgoDto>): any {
    const { tiposRiesgo, ...rest } = dto;
    const data: any = { ...rest };

    // Trim strings + eliminar vacíos opcionales
    for (const k of ["titulo", "descripcion", "recomendacionesIA", "auditorNombre"]) {
      if (typeof data[k] === "string") {
        data[k] = data[k].trim();
        if (data[k] === "" && k !== "titulo" && k !== "descripcion") delete data[k];
      }
    }

    // Fecha visita: solo si tiene contenido válido
    if (typeof data.fechaVisita === "string" && data.fechaVisita.trim() !== "") {
      const d = new Date(data.fechaVisita);
      if (!isNaN(d.getTime())) data.fechaVisita = d;
      else delete data.fechaVisita;
    } else if (data.fechaVisita === "" || data.fechaVisita === null) {
      delete data.fechaVisita;
    }

    // tiposRiesgo: array → JSON string (SQLite legacy · Postgres también lo acepta como string)
    if (tiposRiesgo !== undefined) {
      data.tiposRiesgo = JSON.stringify(Array.isArray(tiposRiesgo) ? tiposRiesgo : []);
    }

    return data;
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
    if (!dto.granjaId)         throw new BadRequestException("granjaId es obligatorio");
    if (!dto.accion?.trim())   throw new BadRequestException("accion es obligatoria");

    const data = this.sanitizeKPIPayload(dto);
    if (!data.fechaCompromiso) data.fechaCompromiso = new Date(); // fallback hoy

    const k = await this.prisma.kPI.create({ data });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "KPI", accion: "Creado",
      recursoId: k.id, recursoNombre: k.accion, usuarioId: createdBy, usuarioNombre: "" });
    return k;
  }

  async updateKPI(id: string, dto: Partial<CreateKPIDto>, updatedBy: string) {
    const existing = await this.prisma.kPI.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("KPI no encontrado");

    const data = this.sanitizeKPIPayload(dto);
    const k = await this.prisma.kPI.update({ where: { id }, data });
    await this.logActivity({ granjaId: k.granjaId, tipo: "KPI", accion: "Actualizado",
      recursoId: id, recursoNombre: k.accion, usuarioId: updatedBy, usuarioNombre: "" });
    return k;
  }

  async removeKPI(id: string, deletedBy: string) {
    const existing = await this.prisma.kPI.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("KPI no encontrado");

    await this.prisma.kPI.delete({ where: { id } });
    await this.logActivity({ granjaId: existing.granjaId, tipo: "KPI", accion: "Eliminado",
      recursoId: id, recursoNombre: existing.accion, usuarioId: deletedBy, usuarioNombre: "" });
    return { message: "KPI eliminado", id };
  }

  /**
   * Sanitiza KPI payload: convierte fechas, clampea porcentaje, limpia strings vacíos.
   */
  private sanitizeKPIPayload(dto: Partial<CreateKPIDto>): any {
    const data: any = { ...dto };
    for (const k of ["seguimiento", "planAccionVeterinario", "responsable", "accion"]) {
      if (typeof data[k] === "string" && data[k].trim() === "") delete data[k];
    }
    for (const f of ["fechaCompromiso", "fechaProximaVisita", "fechaCumplimiento"]) {
      if (typeof data[f] === "string" && data[f].trim() !== "") data[f] = new Date(data[f]);
      else if (data[f] === "" || data[f] === null) delete data[f];
    }
    if (data.porcentajeAvance != null) {
      const n = typeof data.porcentajeAvance === "number" ? data.porcentajeAvance : parseInt(String(data.porcentajeAvance), 10);
      data.porcentajeAvance = isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
    }
    return data;
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
    if (!dto.granjaId)               throw new BadRequestException("granjaId es obligatorio");
    if (!dto.auditorId)              throw new BadRequestException("auditorId es obligatorio");
    if (!dto.tipoAuditoria)          throw new BadRequestException("tipoAuditoria es obligatorio");

    const data = this.sanitizeAuditoriaPayload(dto);
    if (!data.fechaProgramada) data.fechaProgramada = new Date(); // fallback hoy

    const a = await this.prisma.auditoriaGranja.create({ data });
    await this.logActivity({ granjaId: dto.granjaId, tipo: "Auditoría", accion: "Creado",
      recursoId: a.id, recursoNombre: `${a.tipoAuditoria} · ${a.fechaProgramada.toISOString().slice(0,10)}`,
      usuarioId: createdBy, usuarioNombre: "" });
    return a;
  }

  async updateAuditoria(id: string, dto: Partial<CreateAuditoriaDto>, updatedBy: string) {
    const existing = await this.prisma.auditoriaGranja.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Auditoría no encontrada");

    const data = this.sanitizeAuditoriaPayload(dto);
    const a = await this.prisma.auditoriaGranja.update({ where: { id }, data });
    await this.logActivity({ granjaId: a.granjaId, tipo: "Auditoría", accion: "Actualizado",
      recursoId: id, recursoNombre: `${a.tipoAuditoria}`, usuarioId: updatedBy, usuarioNombre: "" });
    return a;
  }

  async removeAuditoria(id: string, deletedBy: string) {
    const existing = await this.prisma.auditoriaGranja.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Auditoría no encontrada");

    await this.prisma.auditoriaGranja.delete({ where: { id } });
    await this.logActivity({ granjaId: existing.granjaId, tipo: "Auditoría", accion: "Eliminado",
      recursoId: id, recursoNombre: existing.tipoAuditoria, usuarioId: deletedBy, usuarioNombre: "" });
    return { message: "Auditoría eliminada", id };
  }

  /**
   * Sanitiza Auditoria payload: convierte fechas y elimina strings vacíos.
   */
  private sanitizeAuditoriaPayload(dto: Partial<CreateAuditoriaDto>): any {
    const data: any = { ...dto };
    for (const k of ["comentarios"]) {
      if (typeof data[k] === "string" && data[k].trim() === "") delete data[k];
    }
    if (typeof data.fechaProgramada === "string" && data.fechaProgramada.trim() !== "") {
      data.fechaProgramada = new Date(data.fechaProgramada);
    } else if (data.fechaProgramada === "" || data.fechaProgramada === null) {
      delete data.fechaProgramada;
    }
    if ((data as any).fechaEjecutada) {
      if (typeof (data as any).fechaEjecutada === "string" && (data as any).fechaEjecutada.trim() !== "") {
        (data as any).fechaEjecutada = new Date((data as any).fechaEjecutada);
      } else {
        delete (data as any).fechaEjecutada;
      }
    }
    return data;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BIBLIOTECA CHECKLIST IA · respuestas + generación de hallazgos
  // ════════════════════════════════════════════════════════════════════════

  async getChecklistRespuestas(auditoriaId: string) {
    return this.prisma.checklistRespuesta.findMany({
      where: { auditoriaId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Guarda/actualiza respuestas del checklist (180 preguntas).
   * Payload: array de { preguntaId, respuesta, observacion? }
   * Upsert por (auditoriaId, preguntaId).
   */
  async saveChecklistRespuestas(
    auditoriaId: string,
    respuestas: Array<{ preguntaId: string; respuesta: string; observacion?: string }>,
  ) {
    const aud = await this.prisma.auditoriaGranja.findUnique({ where: { id: auditoriaId } });
    if (!aud) throw new NotFoundException("Auditoría no encontrada");

    // Eliminar las respuestas previas de esta auditoría y reescribir
    await this.prisma.checklistRespuesta.deleteMany({ where: { auditoriaId } });

    if (respuestas.length === 0) return { count: 0, score: 100 };

    const data = respuestas.map(r => ({
      auditoriaId,
      preguntaId:  r.preguntaId,
      respuesta:   r.respuesta,
      observacion: r.observacion?.trim() || null,
    }));
    await this.prisma.checklistRespuesta.createMany({ data });

    // Calcular score
    const cumple    = data.filter(r => r.respuesta === "Cumple").length;
    const noCumple  = data.filter(r => r.respuesta === "No Cumple").length;
    const naCount   = data.filter(r => r.respuesta === "No Aplica").length;
    const evaluadas = cumple + noCumple;
    const score     = evaluadas > 0 ? Math.round((cumple / evaluadas) * 100) : 100;

    return {
      count: data.length,
      cumple, noCumple, naCount, evaluadas,
      score,
    };
  }

  /**
   * Genera hallazgos automáticos a partir de las respuestas "No Cumple".
   * Útil después de aplicar el checklist.
   */
  async generateHallazgosFromChecklist(
    auditoriaId: string,
    items: Array<{
      preguntaId: string;
      categoria: string;
      pregunta: string;
      peso: number;
      observacion?: string;
    }>,
    createdBy: string,
  ) {
    const aud = await this.prisma.auditoriaGranja.findUnique({
      where: { id: auditoriaId },
      include: { granja: { select: { tipoGranja: true, tipoOperativo: true } } },
    });
    if (!aud) throw new NotFoundException("Auditoría no encontrada");

    const created: any[] = [];
    for (const it of items) {
      // Mapear peso → criticidad: 3=CRITICA, 2=ALTA, 1=MEDIA
      const criticidad = it.peso >= 3 ? "CRITICA" : it.peso === 2 ? "ALTA" : "MEDIA";
      const h = await this.prisma.hallazgo.create({
        data: {
          titulo:        `[Auto] ${it.pregunta.slice(0, 80)}`,
          granjaId:      aud.granjaId,
          auditoriaId,
          auditorId:     aud.auditorId,
          auditorNombre: aud.auditorNombre,
          tipoGranja:    aud.granja?.tipoGranja    ?? "PROPIA",
          tipoOperativo: aud.granja?.tipoOperativo ?? "ENGORDE",
          fechaVisita:   aud.fechaProgramada,
          categoria:     it.categoria,
          tiposRiesgo:   JSON.stringify(["OPERATIVO"]),
          criticidad,
          estado:        "ABIERTO",
          descripcion:   `Hallazgo generado automáticamente desde checklist IA · sub-ítem: ${it.preguntaId}${it.observacion ? "\n\nObservación: " + it.observacion : ""}`,
        },
      });
      created.push(h);
      await this.logActivity({
        granjaId: aud.granjaId, tipo: "Hallazgo", accion: "Auto-creado desde Checklist",
        recursoId: h.id, recursoNombre: h.titulo, usuarioId: createdBy, usuarioNombre: "",
      });
    }
    return { generados: created.length, hallazgos: created };
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
