import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import {
  UsersService, CreateUserDto, UpdateUserDto,
} from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

  // ── LISTAR ──
  @Get()
  findAll(
    @Query("search")   search?: string,
    @Query("role")     role?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.svc.findAll({ search, role, isActive });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  // ── CREAR ──
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.role);
  }

  // ── ACTUALIZAR ──
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    return this.svc.update(id, dto, req.user.id, req.user.role);
  }

  @Patch(":id/role")
  updateRole(
    @Param("id") id: string,
    @Body("role") role: string,
    @Req() req: AuthRequest,
  ) {
    return this.svc.updateRole(id, role, req.user.id, req.user.role);
  }

  @Patch(":id/toggle-active")
  toggleActive(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.toggleActive(id, req.user.role);
  }

  // ── PASSWORD ──
  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.resetPassword(id, req.user.role);
  }

  @Post(":id/change-password")
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param("id") id: string,
    @Body() dto: { currentPassword: string; newPassword: string },
    @Req() req: AuthRequest,
  ) {
    return this.svc.changePassword(id, dto, req.user.id);
  }

  // ── ELIMINAR ──
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.remove(id, req.user.id, req.user.role);
  }

  // ── SESIONES ──
  @Get(":id/sessions")
  listSessions(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.listSessions(id, req.user.id, req.user.role);
  }

  @Delete(":id/sessions")
  @HttpCode(HttpStatus.OK)
  revokeAllSessions(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.revokeAllSessions(id, req.user.id, req.user.role);
  }
}
