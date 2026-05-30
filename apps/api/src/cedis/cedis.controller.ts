import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  CedisService, CreateCediDto, CreateAuditoriaCediDto, CreateHallazgoCediDto,
} from "./cedis.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("cedis")
@UseGuards(JwtAuthGuard)
export class CedisController {
  constructor(private svc: CedisService) {}

  @Get("dashboard")
  dashboard() { return this.svc.getDashboard(); }

  // ── CEDIS ──
  @Get()
  list(@Query("search") search?: string, @Query("region") region?: string) {
    return this.svc.findAllCedis({ search, region });
  }

  @Get(":id") findOne(@Param("id") id: string) { return this.svc.findCedi(id); }

  @Post()                  create(@Body() dto: CreateCediDto)                        { return this.svc.createCedi(dto); }
  @Patch(":id")            update(@Param("id") id: string, @Body() dto: Partial<CreateCediDto>) { return this.svc.updateCedi(id, dto); }
  @Delete(":id") @HttpCode(HttpStatus.OK) remove(@Param("id") id: string)            { return this.svc.removeCedi(id); }

  // ── AUDITORÍAS ──
  @Get("auditorias/list")
  listAuditorias(
    @Query("cediId") cediId?: string,
    @Query("estado") estado?: string,
    @Query("mes")    mes?:    string,
  ) {
    return this.svc.findAllAuditorias({ cediId, estado, mes: mes ? +mes : undefined });
  }

  @Post("auditorias")  createAuditoria(@Body() dto: CreateAuditoriaCediDto) { return this.svc.createAuditoria(dto); }
  @Patch("auditorias/:id") updateAuditoria(@Param("id") id: string, @Body() dto: Partial<CreateAuditoriaCediDto>) { return this.svc.updateAuditoria(id, dto); }
  @Delete("auditorias/:id") @HttpCode(HttpStatus.OK) removeAuditoria(@Param("id") id: string) { return this.svc.removeAuditoria(id); }

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

  @Post("hallazgos") createHallazgo(@Body() dto: CreateHallazgoCediDto) { return this.svc.createHallazgo(dto); }
}
