import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
  HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuditActivitiesService, CreateActivityDto, UpdateActivityDto, AuditStatus } from "./audit-activities.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("audit-activities")
@UseGuards(JwtAuthGuard)
export class AuditActivitiesController {
  constructor(private svc: AuditActivitiesService) {}

  @Get()
  findAll(
    @Query("year")      year?:      string,
    @Query("auditorId") auditorId?: string,
    @Query("status")    status?:    AuditStatus,
    @Query("area")      area?:      string,
    @Query("search")    search?:    string,
  ) {
    return this.svc.findAll({
      year: year ? +year : undefined,
      auditorId, status, area, search,
    });
  }

  @Get("stats")
  getStats(@Query("year") year?: string) {
    return this.svc.getStats(year ? +year : 2026);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActivityDto, @Req() req: AuthRequest) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateActivityDto,
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
