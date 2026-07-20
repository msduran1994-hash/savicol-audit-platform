import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from "@nestjs/common";
import { SettingsService, UpsertSettingDto } from "./settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("settings")
export class SettingsController {
  constructor(private svc: SettingsService) {}

  /**
   * Public endpoint · solo settings con isPublic=true (logo, branding, GA id, theme).
   * Útil para layout que necesita el logo antes del login.
   */
  @Get("public")
  publicSettings() {
    return this.svc.findAll("public");
  }

  /** Conteos públicos (granjas, hallazgos, KPIs) para la portada. Sin autenticación. */
  @Get("public-stats")
  publicStats() {
    return this.svc.publicStats();
  }

  // ── Endpoints autenticados ──
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query("category") category?: string) {
    if (category) return this.svc.findByCategory(category);
    return this.svc.findAll("all");
  }

  @Get(":key")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("key") key: string) {
    return this.svc.findOne(key);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: UpsertSettingDto, @Req() req: AuthRequest) {
    return this.svc.upsert(dto, req.user.id, req.user.role);
  }

  @Post("batch")
  @UseGuards(JwtAuthGuard)
  upsertMany(@Body() body: { settings: UpsertSettingDto[] }, @Req() req: AuthRequest) {
    return this.svc.upsertMany(body.settings, req.user.id, req.user.role);
  }

  @Delete(":key")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  remove(@Param("key") key: string, @Req() req: AuthRequest) {
    return this.svc.remove(key, req.user.role);
  }
}
