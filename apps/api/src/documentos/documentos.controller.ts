import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { DocumentosService, CreateDocumentoDto } from "./documentos.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("documentos")
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private svc: DocumentosService) {}

  @Get()
  findAll(
    @Query("granjaId")  granjaId?: string,
    @Query("categoria") categoria?: string,
    @Query("tipo")      tipo?: string,
    @Query("search")    search?: string,
  ) {
    return this.svc.findAll({ granjaId, categoria, tipo, search });
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
  create(@Body() dto: CreateDocumentoDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.id, req.user.name);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateDocumentoDto>,
    @Req() req: AuthRequest,
  ) {
    return this.svc.update(id, dto, req.user.id, req.user.name);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.remove(id, req.user.id, req.user.name);
  }
}
