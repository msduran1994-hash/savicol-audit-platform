import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { InventariosService, CreateInventarioItemDto, CreateMovimientoDto } from "./inventarios.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("inventarios")
@UseGuards(JwtAuthGuard)
export class InventariosController {
  constructor(private svc: InventariosService) {}

  @Get()
  findAll(
    @Query("modulo") modulo?: string,
    @Query("estado") estado?: string,
    @Query("categoria") categoria?: string,
    @Query("cediId") cediId?: string,
    @Query("granjaId") granjaId?: string,
  ) {
    return this.svc.findAll({ modulo, estado, categoria, cediId, granjaId });
  }

  // ── Kardex de movimientos (antes de :id para no colisionar) ──
  @Get("movimientos")
  findMovimientos(@Query("itemId") itemId: string) {
    return this.svc.findMovimientos(itemId);
  }

  @Post("movimientos")
  createMovimiento(@Body() dto: CreateMovimientoDto, @Req() req: AuthRequest) {
    return this.svc.createMovimiento(dto, req.user?.name ?? req.user?.email);
  }

  @Delete("movimientos/:id")
  @HttpCode(HttpStatus.OK)
  removeMovimiento(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.removeMovimiento(id, req.user?.name ?? req.user?.email);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInventarioItemDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user?.name ?? req.user?.email);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateInventarioItemDto>, @Req() req: AuthRequest) {
    return this.svc.update(id, dto, req.user?.name ?? req.user?.email);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
