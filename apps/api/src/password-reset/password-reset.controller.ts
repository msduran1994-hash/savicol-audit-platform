import { Body, Controller, Get, Post, Query, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { PasswordResetService, RequestResetDto, ResetDto } from "./password-reset.service";

@Controller("password-reset")
export class PasswordResetController {
  constructor(private svc: PasswordResetService) {}

  // PÚBLICO — solicitar reset · anti-spam: 5 req / 15 min por IP
  @Post("request")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  request(@Body() dto: RequestResetDto, @Req() req: Request) {
    return this.svc.request(dto, {
      ip: req.ip,
      ua: req.headers["user-agent"]?.toString(),
    });
  }

  // PÚBLICO — validar token
  @Get("validate")
  validate(@Query("token") token: string) {
    return this.svc.validate(token);
  }

  // PÚBLICO — aplicar reset
  @Post("reset")
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: ResetDto) {
    return this.svc.reset(dto);
  }
}
