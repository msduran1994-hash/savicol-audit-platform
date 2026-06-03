import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
  HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuditActivitiesService, CreateActivityDto, UpdateActivityDto, AuditStatus } from "./audit-activities.service";
import { AuditActivitiesExecutiveService, ExecutiveFilters } from "./audit-activities-executive.service";
import { AuditActivitiesAiService } from "./audit-activities-ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("audit-activities")
@UseGuards(JwtAuthGuard)
export class AuditActivitiesController {
  constructor(
    private svc: AuditActivitiesService,
    private exec: AuditActivitiesExecutiveService,
    private ai: AuditActivitiesAiService,
  ) {}

  @Get()
  findAll(
    @Query("year")      year?:      string,
    @Query("auditorId") auditorId?: string,
    @Query("status")    status?:    AuditStatus,
    @Query("area")      area?:      string,
    @Query("search")    search?:    string,
  ) {
    return this.svc.findAll({
      year: year ? +year : undefined,
      auditorId, status, area, search,
    });
  }

  @Get("stats")
  getStats(@Query("year") year?: string) {
    return this.svc.getStats(year ? +year : 2026);
  }

  // ── DASHBOARD EJECUTIVO ──
  @Get("executive")
  executive(
    @Query("year")           year?: string,
    @Query("auditorId")      auditorId?: string,
    @Query("status")         status?: string,
    @Query("mes")            mes?: string,
    @Query("area")           area?: string,
    @Query("activityType")   activityType?: string,
    @Query("fechaDesde")     fechaDesde?: string,
    @Query("fechaHasta")     fechaHasta?: string,
    @Query("cumplimientoMin") cumplimientoMin?: string,
    @Query("cumplimientoMax") cumplimientoMax?: string,
  ) {
    const filters: ExecutiveFilters = {
      year:         year ? +year : undefined,
      auditorId, status, area, activityType, fechaDesde, fechaHasta,
      mes:              mes ? +mes : undefined,
      cumplimientoMin:  cumplimientoMin != null ? +cumplimientoMin : undefined,
      cumplimientoMax:  cumplimientoMax != null ? +cumplimientoMax : undefined,
    };
    return this.exec.getExecutive(filters);
  }

  // ── AI SUMMARY ── (usa Claude si ANTHROPIC_API_KEY · sino heurístico)
  @Get("ai-summary")
  async aiSummary(
    @Query("year")        year?: string,
    @Query("auditorId")   auditorId?: string,
    @Query("status")      status?: string,
    @Query("mes")         mes?: string,
    @Query("area")        area?: string,
  ) {
    const filters: ExecutiveFilters = {
      year: year ? +year : undefined,
      auditorId, status, area,
      mes: mes ? +mes : undefined,
    };
    const exec = await this.exec.getExecutive(filters);

    return this.ai.generateSummary({
      kpis:         exec.kpis as any,
      alertas:      exec.alertas,
      topAreas:     exec.charts.distribucionAreas.slice(0, 5),
      ranking:      exec.charts.ranking.slice(0, 10),
      calidadDatos: exec.calidadDatos,
      heuristico:   exec.resumenHeuristico,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActivityDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateActivityDto,
    @Req() req: AuthRequest,
  ) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.remove(id, req.user.id);
  }
}
