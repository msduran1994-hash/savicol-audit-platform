import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  EvidenciasService,
  CreateEvidenciaHallazgoDto,
  CreateEvidenciaRutaDto,
  CreateEvidenciaCediDto,
} from "./evidencias.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("evidencias")
@UseGuards(JwtAuthGuard)
export class EvidenciasController {
  constructor(private svc: EvidenciasService) {}

  @Get("stats")
  stats() { return this.svc.getStats(); }

  // ── HALLAZGOS (Granjas) ──
  @Get("hallazgo")
  listHallazgo(@Query("hallazgoId") hallazgoId?: string) {
    return this.svc.findAllHallazgo(hallazgoId);
  }

  @Post("hallazgo")
  createHallazgo(@Body() dto: CreateEvidenciaHallazgoDto, @Req() req: AuthRequest) {
    return this.svc.createHallazgo(dto, req.user.name ?? req.user.id);
  }

  @Delete("hallazgo/:id")
  @HttpCode(HttpStatus.OK)
  removeHallazgo(@Param("id") id: string) {
    return this.svc.removeHallazgo(id);
  }

  // ── RUTAS (Acompañamientos) ──
  @Get("ruta")
  listRuta(@Query("acompanamientoId") acompanamientoId?: string) {
    return this.svc.findAllRuta(acompanamientoId);
  }

  @Post("ruta")
  createRuta(@Body() dto: CreateEvidenciaRutaDto, @Req() req: AuthRequest) {
    return this.svc.createRuta(dto, req.user.name ?? req.user.id);
  }

  @Delete("ruta/:id")
  @HttpCode(HttpStatus.OK)
  removeRuta(@Param("id") id: string) {
    return this.svc.removeRuta(id);
  }

  // ── CEDIS ──
  @Get("cedi")
  listCedi(
    @Query("cediId")      cediId?: string,
    @Query("auditoriaId") auditoriaId?: string,
    @Query("hallazgoId")  hallazgoId?: string,
  ) {
    return this.svc.findAllCedi({ cediId, auditoriaId, hallazgoId });
  }

  @Post("cedi")
  createCedi(@Body() dto: CreateEvidenciaCediDto, @Req() req: AuthRequest) {
    return this.svc.createCedi(dto, req.user.name ?? req.user.id);
  }

  @Delete("cedi/:id")
  @HttpCode(HttpStatus.OK)
  removeCedi(@Param("id") id: string) {
    return this.svc.removeCedi(id);
  }
}
