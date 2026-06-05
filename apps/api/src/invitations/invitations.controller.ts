import {
  Controller, Get, Post, Delete, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { InvitationsService, CreateInvitationDto, AcceptInvitationDto } from "./invitations.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

interface AuthRequest {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("invitations")
export class InvitationsController {
  constructor(private svc: InvitationsService) {}

  // ── Endpoints PÚBLICOS (sin auth) para flujo de activación ──
  @Get("validate")
  validate(@Query("token") token: string) {
    return this.svc.validate(token);
  }

  @Post("accept")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })  // 10 attempts / min / IP · anti-bruteforce token
  accept(@Body() dto: AcceptInvitationDto) {
    return this.svc.accept(dto);
  }

  // ── Endpoints ADMIN (JWT + RolesGuard) ──
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  create(@Body() dto: CreateInvitationDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, { id: req.user.id, name: req.user.name });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  list(@Query("status") status?: string, @Query("email") email?: string) {
    return this.svc.list({ status, email });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  revoke(@Param("id") id: string) {
    return this.svc.revoke(id);
  }

  @Post(":id/resend")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  resend(@Param("id") id: string) {
    return this.svc.resend(id);
  }
}
