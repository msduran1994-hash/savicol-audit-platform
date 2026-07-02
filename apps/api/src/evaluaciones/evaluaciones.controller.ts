import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { EvaluacionesService, CreateEvaluacionDto, CreateEvidenciaEvaluacionDto } from "./evaluaciones.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("evaluaciones")
@UseGuards(JwtAuthGuard)
export class EvaluacionesController {
  constructor(private svc: EvaluacionesService) {}

  @Get()
  findAll(@Query("modulo") modulo?: string) {
    return this.svc.findAll({ modulo });
  }

  // ── Evidencias (antes de :id para no colisionar) ──
  @Get("evidencias")
  findEvidencias(@Query("evaluacionId") evaluacionId: string) {
    return this.svc.findEvidencias(evaluacionId);
  }

  @Post("evidencias")
  createEvidencia(@Body() dto: CreateEvidenciaEvaluacionDto, @Req() req: AuthRequest) {
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
  create(@Body() dto: CreateEvaluacionDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user?.name ?? req.user?.email);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateEvaluacionDto>, @Req() req: AuthRequest) {
    return this.svc.update(id, dto, req.user?.name ?? req.user?.email);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
