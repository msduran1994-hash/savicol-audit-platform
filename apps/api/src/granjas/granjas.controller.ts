import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  GranjasService, CreateGranjaDto, CreateHallazgoDto, CreateKPIDto, CreateAuditoriaDto,
} from "./granjas.service";
import { GranjasExecutiveService, GranjasExecutiveFilters } from "./granjas-executive.service";
import { AuditActivitiesAiService } from "../audit-activities/audit-activities-ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("granjas")
@UseGuards(JwtAuthGuard)
export class GranjasController {
  constructor(
    private svc: GranjasService,
    private exec: GranjasExecutiveService,
    private ai: AuditActivitiesAiService,
  ) {}

  // ── DASHBOARD STATS (legacy) ──
  @Get("dashboard")
  dashboard() { return this.svc.getDashboardStats(); }

  // ── DASHBOARD EJECUTIVO ──
  @Get("executive")
  executive(
    @Query("year")          year?: string,
    @Query("granjaId")      granjaId?: string,
    @Query("auditorId")     auditorId?: string,
    @Query("tipoGranja")    tipoGranja?: string,
    @Query("tipoOperativo") tipoOperativo?: string,
    @Query("estado")        estado?: string,
    @Query("criticidad")    criticidad?: string,
    @Query("tipoRiesgo")    tipoRiesgo?: string,
    @Query("fechaDesde")    fechaDesde?: string,
    @Query("fechaHasta")    fechaHasta?: string,
    @Query("mes")           mes?: string,
  ) {
    const filters: GranjasExecutiveFilters = {
      year: year ? +year : undefined,
      granjaId, auditorId, tipoGranja, tipoOperativo, estado, criticidad, tipoRiesgo,
      fechaDesde, fechaHasta,
      mes: mes ? +mes : undefined,
    };
    return this.exec.getExecutive(filters);
  }

  @Get("ai-summary")
  async aiSummary(
    @Query("year")          year?: string,
    @Query("granjaId")      granjaId?: string,
    @Query("auditorId")     auditorId?: string,
    @Query("criticidad")    criticidad?: string,
  ) {
    const filters: GranjasExecutiveFilters = { year: year ? +year : undefined, granjaId, auditorId, criticidad };
    const exec = await this.exec.getExecutive(filters);
    return this.ai.generateSummary({
      kpis:         exec.kpis as any,
      alertas:      exec.alertas as any,
      topAreas:     exec.charts.hallazgosPorCategoria.slice(0, 5).map((c: any) => ({
        area: c.categoria, Cumplimiento: 0, Actividades: c.count,
      })),
      ranking:      exec.charts.auditores.slice(0, 10).map((a: any) => ({
        auditorName: a.auditorNombre, completionRate: 0, totalAssigned: a.visitas,
      })),
      calidadDatos: { score: exec.calidadDatos.score, issuesTotal: 0, duplicados: 0 },
      heuristico:   exec.resumenHeuristico,
    });
  }

  // ── GRANJAS ──
  @Get()
  findAll(
    @Query("search")               search?: string,
    @Query("region")               region?: string,
    @Query("tipoGranja")           tipoGranja?: any,
    @Query("tipoOperativo")        tipoOperativo?: any,
    @Query("nivelRiesgo")          nivelRiesgo?: any,
    @Query("estadoSanitario")      estadoSanitario?: any,
    @Query("tecnicoVeterinarioId") tecnicoVeterinarioId?: string,
  ) {
    return this.svc.findAllGranjas({ search, region, tipoGranja, tipoOperativo, nivelRiesgo, estadoSanitario, tecnicoVeterinarioId });
  }

  @Get(":id")
  findOne(@Param("id") id: string) { return this.svc.findGranja(id); }

  @Post()
  create(@Body() dto: CreateGranjaDto, @Req() req: AuthRequest) {
    return this.svc.createGranja(dto, req.user.id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateGranjaDto>, @Req() req: AuthRequest) {
    return this.svc.updateGranja(id, dto, req.user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.removeGranja(id, req.user.id);
  }

  // ── HALLAZGOS ──
  @Get("hallazgos/list")
  findAllHallazgos(
    @Query("granjaId")   granjaId?: string,
    @Query("categoria")  categoria?: any,
    @Query("criticidad") criticidad?: any,
    @Query("estado")     estado?: any,
  ) {
    return this.svc.findAllHallazgos({ granjaId, categoria, criticidad, estado });
  }

  @Post("hallazgos")
  createHallazgo(@Body() dto: CreateHallazgoDto, @Req() req: AuthRequest) {
    return this.svc.createHallazgo(dto, req.user.id);
  }

  @Patch("hallazgos/:id")
  updateHallazgo(
    @Param("id") id: string,
    @Body() dto: Partial<CreateHallazgoDto>,
    @Req() req: AuthRequest,
  ) {
    return this.svc.updateHallazgo(id, dto, req.user.id);
  }

  @Delete("hallazgos/:id")
  @HttpCode(HttpStatus.OK)
  removeHallazgo(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.removeHallazgo(id, req.user.id);
  }

  // ── KPIs ──
  @Get("kpis/list")
  findAllKPIs(@Query("granjaId") granjaId?: string, @Query("estado") estado?: any) {
    return this.svc.findAllKPIs({ granjaId, estado });
  }

  @Post("kpis")
  createKPI(@Body() dto: CreateKPIDto, @Req() req: AuthRequest) {
    return this.svc.createKPI(dto, req.user.id);
  }

  @Patch("kpis/:id")
  updateKPI(@Param("id") id: string, @Body() dto: Partial<CreateKPIDto>, @Req() req: AuthRequest) {
    return this.svc.updateKPI(id, dto, req.user.id);
  }

  @Delete("kpis/:id")
  @HttpCode(HttpStatus.OK)
  removeKPI(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.removeKPI(id, req.user.id);
  }

  // ── AUDITORÍAS ──
  @Get("auditorias/list")
  findAllAuditorias(@Query("granjaId") granjaId?: string, @Query("estado") estado?: any) {
    return this.svc.findAllAuditorias({ granjaId, estado });
  }

  @Post("auditorias")
  createAuditoria(@Body() dto: CreateAuditoriaDto, @Req() req: AuthRequest) {
    return this.svc.createAuditoria(dto, req.user.id);
  }

  @Patch("auditorias/:id")
  updateAuditoria(@Param("id") id: string, @Body() dto: Partial<CreateAuditoriaDto>, @Req() req: AuthRequest) {
    return this.svc.updateAuditoria(id, dto, req.user.id);
  }

  @Delete("auditorias/:id")
  @HttpCode(HttpStatus.OK)
  removeAuditoria(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.removeAuditoria(id, req.user.id);
  }

  // ── BIBLIOTECA CHECKLIST IA ──
  @Get("auditorias/:id/checklist")
  getChecklist(@Param("id") id: string) {
    return this.svc.getChecklistRespuestas(id);
  }

  @Post("auditorias/:id/checklist")
  saveChecklist(
    @Param("id") id: string,
    @Body() body: { respuestas: Array<{ preguntaId: string; respuesta: string; observacion?: string }> },
  ) {
    return this.svc.saveChecklistRespuestas(id, body.respuestas ?? []);
  }

  @Post("auditorias/:id/checklist/generate-hallazgos")
  generateHallazgos(
    @Param("id") id: string,
    @Body() body: {
      items: Array<{
        preguntaId: string;
        categoria: string;
        pregunta: string;
        peso: number;
        observacion?: string;
      }>;
    },
    @Req() req: AuthRequest,
  ) {
    return this.svc.generateHallazgosFromChecklist(id, body.items ?? [], req.user.id);
  }

  // ── ACTIVIDAD ──
  @Get("actividad/list")
  findActividad(@Query("limit") limit?: string) {
    return this.svc.findActividad(limit ? +limit : 50);
  }
}
