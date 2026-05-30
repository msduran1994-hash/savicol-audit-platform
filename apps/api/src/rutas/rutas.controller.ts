import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  RutasService, CreateAcompanamientoDto, CreateAccionCumplimientoDto,
} from "./rutas.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("rutas")
@UseGuards(JwtAuthGuard)
export class RutasController {
  constructor(private svc: RutasService) {}

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

  // ── MAESTROS (catálogos para selects/dropdowns) ──
  @Get("catalogos/clientes")    listClientes()    { return this.svc.findClientes(); }
  @Get("catalogos/rutas")       listRutas()       { return this.svc.findRutas(); }
  @Get("catalogos/vehiculos")   listVehiculos()   { return this.svc.findVehiculos(); }
  @Get("catalogos/conductores") listConductores() { return this.svc.findConductores(); }
  @Get("catalogos/auxiliares")  listAuxiliares()  { return this.svc.findAuxiliares(); }
}
