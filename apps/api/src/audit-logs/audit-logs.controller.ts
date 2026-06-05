import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPERVISOR")
export class AuditLogsController {
  constructor(private svc: AuditLogsService) {}

  // GET /audit-logs/access?userId=&action=&search=&from=&to=&limit=&offset=
  @Get("access")
  listAccess(
    @Query("userId") userId?: string,
    @Query("action") action?: string,
    @Query("search") search?: string,
    @Query("from")   from?: string,
    @Query("to")     to?: string,
    @Query("limit")  limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.svc.listAccess({
      userId, action, search, from, to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get("access/stats")
  statsAccess() {
    return this.svc.statsAccess();
  }

  @Get("activity")
  listActivity(
    @Query("activityId") activityId?: string,
    @Query("userId")     userId?: string,
    @Query("limit")      limit?: string,
    @Query("offset")     offset?: string,
  ) {
    return this.svc.listActivity({
      activityId, userId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get("sessions")
  listAllSessions() {
    return this.svc.listAllSessions();
  }
}
