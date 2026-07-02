import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { DescartesService, CreateDescarteDto, CreateEvidenciaDescarteDto } from "./descartes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("descartes")
@UseGuards(JwtAuthGuard)
export class DescartesController {
  constructor(private svc: DescartesService) {}

  @Get()
  findAll(
    @Query("granjaId") granjaId?: string,
    @Query("estado") estado?: string,
    @Query("motivo") motivo?: string,
    @Query("nivelRiesgo") nivelRiesgo?: string,
    @Query("plantaDestino") plantaDestino?: string,
  ) {
    return this.svc.findAll({ granjaId, estado, motivo, nivelRiesgo, plantaDestino });
  }

  // ── Evidencias (declaradas antes de :id para no colisionar con esa ruta) ──
  @Get("evidencias")
  findEvidencias(@Query("descarteId") descarteId: string) {
    return this.svc.findEvidencias(descarteId);
  }

  @Post("evidencias")
  createEvidencia(@Body() dto: CreateEvidenciaDescarteDto, @Req() req: AuthRequest) {
    return this.svc.createEvidencia(dto, req.user?.name ?? req.user?.email);
  }

  @Delete("evidencias/:id")
  @HttpCode(HttpStatus.OK)
  removeEvidencia(@Param("id") id: string) {
    return this.svc.removeEvidencia(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDescarteDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user?.name ?? req.user?.email);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateDescarteDto>, @Req() req: AuthRequest) {
    return this.svc.update(id, dto, req.user?.name ?? req.user?.email);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
