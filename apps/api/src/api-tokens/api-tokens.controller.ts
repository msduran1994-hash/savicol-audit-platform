import {
  Controller, Get, Post, Delete, Patch,
  Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTokensService, CreateApiTokenDto } from "./api-tokens.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("api-tokens")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiTokensController {
  constructor(private svc: ApiTokensService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateApiTokenDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.id, req.user.role);
  }

  @Patch(":id/revoke")
  @Roles("ADMIN")
  revoke(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.revoke(id, req.user.role);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.svc.remove(id, req.user.role);
  }
}
