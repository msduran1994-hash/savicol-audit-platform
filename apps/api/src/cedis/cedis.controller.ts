import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  CedisService, CreateCediDto, CreateAuditoriaCediDto, CreateHallazgoCediDto,
} from "./cedis.service";
import { CedisExecutiveService, CedisExecutiveFilters } from "./cedis-executive.service";
import { AuditActivitiesAiService } from "../audit-activities/audit-activities-ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("cedis")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CedisController {
  constructor(
    private svc: CedisService,
    private exec: CedisExecutiveService,
    private ai: AuditActivitiesAiService,
  ) {}

  // ── DASHBOARD EJECUTIVO ──
  @Get("executive")
  executive(
    @Query("year")       year?: string,
    @Query("cediId")     cediId?: string,
    @Query("subtema")    subtema?: string,
    @Query("auditorId")  auditorId?: string,
    @Query("categoria")  categoria?: string,
    @Query("criticidad") criticidad?: string,
    @Query("estado")     estado?: string,
    @Query("tipoRiesgo") tipoRiesgo?: string,
    @Query("mes")        mes?: string,
  ) {
    const filters: CedisExecutiveFilters = {
      year: year ? +year : undefined,
      cediId, subtema, auditorId, categoria, criticidad, estado, tipoRiesgo,
      mes: mes ? +mes : undefined,
    };
    return this.exec.getExecutive(filters);
  }

  @Get("ai-summary")
  async aiSummary(
    @Query("year")       year?: string,
    @Query("cediId")     cediId?: string,
    @Query("subtema")    subtema?: string,
    @Query("criticidad") criticidad?: string,
  ) {
    const filters: CedisExecutiveFilters = { year: year ? +year : undefined, cediId, subtema, criticidad };
    const exec = await this.exec.getExecutive(filters);
    return this.ai.generateSummary({
      kpis:         exec.kpis as any,
      alertas:      exec.alertas as any,
      topAreas:     exec.charts.cumplimientoSubtema.slice(0, 5).map((s: any) => ({
        area: s.subtema, Cumplimiento: s.cumplimiento, Actividades: s.hallazgos,
      })),
      ranking:      exec.charts.cumplimientoCedi.slice(0, 10).map((c: any) => ({
        auditorName: c.cediNombre, completionRate: c.cumplimiento, totalAssigned: c.hallazgos,
      })),
      calidadDatos: { score: exec.calidadDatos.score, issuesTotal: 0, duplicados: 0 },
      heuristico:   exec.resumenHeuristico,
    });
  }

  @Get("dashboard")
  dashboard() { return this.svc.getDashboard(); }

  // ── CEDIS ──
  @Get()
  list(@Query("search") search?: string, @Query("region") region?: string) {
    return this.svc.findAllCedis({ search, region });
  }

  @Get(":id") findOne(@Param("id") id: string) { return this.svc.findCedi(id); }

  @Post()    @Roles("ADMIN", "AUDITOR", "SUPERVISOR")                create(@Body() dto: CreateCediDto)                        { return this.svc.createCedi(dto); }
  @Patch(":id") @Roles("ADMIN", "AUDITOR", "SUPERVISOR")         update(@Param("id") id: string, @Body() dto: Partial<CreateCediDto>) { return this.svc.updateCedi(id, dto); }
  @Delete(":id") @HttpCode(HttpStatus.OK) @Roles("ADMIN", "SUPERVISOR") remove(@Param("id") id: string) { return this.svc.removeCedi(id); }

  // ── AUDITORÍAS ──
  @Get("auditorias/list")
  listAuditorias(
    @Query("cediId") cediId?: string,
    @Query("estado") estado?: string,
    @Query("mes")    mes?:    string,
  ) {
    return this.svc.findAllAuditorias({ cediId, estado, mes: mes ? +mes : undefined });
  }

  @Post("auditorias")    @Roles("ADMIN", "AUDITOR", "SUPERVISOR") createAuditoria(@Body() dto: CreateAuditoriaCediDto) { return this.svc.createAuditoria(dto); }
  @Patch("auditorias/:id") @Roles("ADMIN", "AUDITOR", "SUPERVISOR") updateAuditoria(@Param("id") id: string, @Body() dto: Partial<CreateAuditoriaCediDto>) { return this.svc.updateAuditoria(id, dto); }
  @Delete("auditorias/:id") @HttpCode(HttpStatus.OK) @Roles("ADMIN", "SUPERVISOR") removeAuditoria(@Param("id") id: string) { return this.svc.removeAuditoria(id); }

  // ── HALLAZGOS ──
  @Get("hallazgos/list")
  listHallazgos(
    @Query("cediId") cediId?: string,
    @Query("categoria") categoria?: string,
    @Query("estado") estado?: string,
    @Query("criticidad") criticidad?: string,
  ) {
    return this.svc.findAllHallazgos({ cediId, categoria, estado, criticidad });
  }

  @Post("hallazgos") @Roles("ADMIN", "AUDITOR", "SUPERVISOR") createHallazgo(@Body() dto: CreateHallazgoCediDto) { return this.svc.createHallazgo(dto); }

  @Patch("hallazgos/:id")
  @Roles("ADMIN", "AUDITOR", "SUPERVISOR")
  updateHallazgo(@Param("id") id: string, @Body() dto: Partial<CreateHallazgoCediDto>) {
    return this.svc.updateHallazgo(id, dto);
  }

  @Delete("hallazgos/:id")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "SUPERVISOR")
  removeHallazgo(@Param("id") id: string) {
    return this.svc.removeHallazgo(id);
  }
}
