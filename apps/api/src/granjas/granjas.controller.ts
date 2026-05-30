import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  GranjasService, CreateGranjaDto, CreateHallazgoDto, CreateKPIDto, CreateAuditoriaDto,
} from "./granjas.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("granjas")
@UseGuards(JwtAuthGuard)
export class GranjasController {
  constructor(private svc: GranjasService) {}

  // ── DASHBOARD ──
  @Get("dashboard")
  dashboard() { return this.svc.getDashboardStats(); }

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

  // ── AUDITORÍAS ──
  @Get("auditorias/list")
  findAllAuditorias(@Query("granjaId") granjaId?: string, @Query("estado") estado?: any) {
    return this.svc.findAllAuditorias({ granjaId, estado });
  }

  @Post("auditorias")
  createAuditoria(@Body() dto: CreateAuditoriaDto, @Req() req: AuthRequest) {
    return this.svc.createAuditoria(dto, req.user.id);
  }

  // ── ACTIVIDAD ──
  @Get("actividad/list")
  findActividad(@Query("limit") limit?: string) {
    return this.svc.findActividad(limit ? +limit : 50);
  }
}
