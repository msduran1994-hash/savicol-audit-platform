import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  RutasService, CreateAcompanamientoDto, CreateAccionCumplimientoDto,
} from "./rutas.service";
import { RutasExecutiveService, RutasExecutiveFilters } from "./rutas-executive.service";
import { AuditActivitiesAiService } from "../audit-activities/audit-activities-ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("rutas")
@UseGuards(JwtAuthGuard)
export class RutasController {
  constructor(
    private svc: RutasService,
    private exec: RutasExecutiveService,
    private ai: AuditActivitiesAiService,
  ) {}

  // ── DASHBOARD EJECUTIVO ──
  @Get("executive")
  executive(
    @Query("year")       year?: string,
    @Query("auditorId")  auditorId?: string,
    @Query("rutaId")     rutaId?: string,
    @Query("clienteId")  clienteId?: string,
    @Query("ciudad")     ciudad?: string,
    @Query("estado")     estado?: string,
    @Query("motivo")     motivo?: string,
    @Query("criticidad") criticidad?: string,
    @Query("mes")        mes?: string,
  ) {
    const filters: RutasExecutiveFilters = {
      year: year ? +year : undefined,
      auditorId, rutaId, clienteId, ciudad, estado, motivo, criticidad,
      mes: mes ? +mes : undefined,
    };
    return this.exec.getExecutive(filters);
  }

  @Get("ai-summary")
  async aiSummary(
    @Query("year")       year?: string,
    @Query("auditorId")  auditorId?: string,
    @Query("rutaId")     rutaId?: string,
    @Query("clienteId")  clienteId?: string,
    @Query("estado")     estado?: string,
    @Query("motivo")     motivo?: string,
    @Query("criticidad") criticidad?: string,
  ) {
    const filters: RutasExecutiveFilters = {
      year: year ? +year : undefined,
      auditorId, rutaId, clienteId, estado, motivo, criticidad,
    };
    const exec = await this.exec.getExecutive(filters);
    return this.ai.generateSummary({
      kpis:         exec.kpis as any,
      alertas:      exec.alertas as any,
      topAreas:     exec.charts.clientesRanking.slice(0, 5).map((c: any) => ({
        area: c.nombre, Cumplimiento: c.participacion, Actividades: c.total,
      })),
      ranking:      exec.charts.auditores.slice(0, 10).map((a: any) => ({
        auditorName: a.auditorNombre, completionRate: a.participacion, totalAssigned: a.total,
      })),
      calidadDatos: { score: exec.calidadDatos.score, issuesTotal: 0, duplicados: 0 },
      heuristico:   exec.resumenHeuristico,
    });
  }

  // ── DASHBOARD ──
  @Get("dashboard")
  dashboard() { return this.svc.getDashboardStats(); }

  // ── ACOMPAÑAMIENTOS ──
  @Get("acompanamientos")
  findAll(
    @Query("search")     search?:     string,
    @Query("mes")        mes?:        string,
    @Query("rutaId")     rutaId?:     string,
    @Query("vehiculoId") vehiculoId?: string,
    @Query("clienteId")  clienteId?:  string,
    @Query("auditorId")  auditorId?:  string,
    @Query("motivo")     motivo?:     any,
    @Query("criticidad") criticidad?: any,
  ) {
    return this.svc.findAllAcompanamientos({
      search, mes: mes ? +mes : undefined,
      rutaId, vehiculoId, clienteId, auditorId, motivo, criticidad,
    });
  }

  @Get("acompanamientos/:id")
  findOne(@Param("id") id: string) { return this.svc.findAcompanamiento(id); }

  @Post("acompanamientos")
  create(@Body() dto: CreateAcompanamientoDto, @Req() req: AuthRequest) {
    return this.svc.createAcompanamiento(dto, req.user.id);
  }

  @Patch("acompanamientos/:id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateAcompanamientoDto>, @Req() req: AuthRequest) {
    return this.svc.updateAcompanamiento(id, dto, req.user.id);
  }

  @Delete("acompanamientos/:id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) { return this.svc.removeAcompanamiento(id); }

  // ── ACCIONES CUMPLIMIENTO ──
  @Get("acciones")
  findAllAcciones(@Query("acompanamientoId") acompanamientoId?: string, @Query("estado") estado?: any) {
    return this.svc.findAllAcciones({ acompanamientoId, estado });
  }

  @Post("acciones")
  createAccion(@Body() dto: CreateAccionCumplimientoDto) {
    return this.svc.createAccion(dto);
  }

  @Patch("acciones/:id")
  updateAccion(@Param("id") id: string, @Body() dto: Partial<CreateAccionCumplimientoDto>) {
    return this.svc.updateAccion(id, dto);
  }

  // ── MAESTROS (catálogos para selects/dropdowns) — READ ──
  @Get("catalogos/clientes")    listClientes()    { return this.svc.findClientes(); }
  @Get("catalogos/rutas")       listRutas()       { return this.svc.findRutas(); }
  @Get("catalogos/vehiculos")   listVehiculos()   { return this.svc.findVehiculos(); }
  @Get("catalogos/conductores") listConductores() { return this.svc.findConductores(); }
  @Get("catalogos/auxiliares")  listAuxiliares()  { return this.svc.findAuxiliares(); }

  // ── MAESTROS — CREATE ──
  @Post("catalogos/clientes")    createCliente(@Body() dto: any)    { return this.svc.createCliente(dto); }
  @Post("catalogos/rutas")       createRuta(@Body() dto: any)       { return this.svc.createRuta(dto); }
  @Post("catalogos/vehiculos")   createVehiculo(@Body() dto: any)   { return this.svc.createVehiculo(dto); }
  @Post("catalogos/conductores") createConductor(@Body() dto: any)  { return this.svc.createConductor(dto); }
  @Post("catalogos/auxiliares")  createAuxiliar(@Body() dto: any)   { return this.svc.createAuxiliar(dto); }

  // ── MAESTROS — UPDATE ──
  @Patch("catalogos/clientes/:id")    updateCliente(@Param("id") id: string, @Body() dto: any)    { return this.svc.updateCliente(id, dto); }
  @Patch("catalogos/rutas/:id")       updateRuta(@Param("id") id: string, @Body() dto: any)       { return this.svc.updateRuta(id, dto); }
  @Patch("catalogos/vehiculos/:id")   updateVehiculo(@Param("id") id: string, @Body() dto: any)   { return this.svc.updateVehiculo(id, dto); }
  @Patch("catalogos/conductores/:id") updateConductor(@Param("id") id: string, @Body() dto: any)  { return this.svc.updateConductor(id, dto); }
  @Patch("catalogos/auxiliares/:id")  updateAuxiliar(@Param("id") id: string, @Body() dto: any)   { return this.svc.updateAuxiliar(id, dto); }

  // ── MAESTROS — SOFT DELETE ──
  @Delete("catalogos/clientes/:id")    @HttpCode(HttpStatus.OK) removeCliente(@Param("id") id: string)    { return this.svc.removeCliente(id); }
  @Delete("catalogos/rutas/:id")       @HttpCode(HttpStatus.OK) removeRuta(@Param("id") id: string)       { return this.svc.removeRuta(id); }
  @Delete("catalogos/vehiculos/:id")   @HttpCode(HttpStatus.OK) removeVehiculo(@Param("id") id: string)   { return this.svc.removeVehiculo(id); }
  @Delete("catalogos/conductores/:id") @HttpCode(HttpStatus.OK) removeConductor(@Param("id") id: string)  { return this.svc.removeConductor(id); }
  @Delete("catalogos/auxiliares/:id")  @HttpCode(HttpStatus.OK) removeAuxiliar(@Param("id") id: string)   { return this.svc.removeAuxiliar(id); }
}
