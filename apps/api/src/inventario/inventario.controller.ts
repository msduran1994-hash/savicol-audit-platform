import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { InventarioService, CreateInventarioDto } from "./inventario.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("inventario")
@UseGuards(JwtAuthGuard)
export class InventarioController {
  constructor(private svc: InventarioService) {}

  @Get()
  findAll(
    @Query("granjaId")  granjaId?: string,
    @Query("categoria") categoria?: string,
    @Query("estado")    estado?: string,
    @Query("search")    search?: string,
  ) {
    return this.svc.findAll({ granjaId, categoria, estado, search });
  }

  @Get("alerts")
  alerts(@Query("granjaId") granjaId?: string) {
    return this.svc.getAlerts(granjaId);
  }

  @Get("stats")
  stats(@Query("granjaId") granjaId?: string) {
    return this.svc.getStatsByCategoria(granjaId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInventarioDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateInventarioDto>,
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
