import {
  Controller, Get, Post, Delete, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest {
  user: { id: string; email: string; role: string; name: string };
}

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query("unread") unread?: string, @Query("limit") limit?: string) {
    return this.svc.findForUser(req.user.id, {
      unreadOnly: unread === "true",
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("count")
  count(@Req() req: AuthRequest) {
    return this.svc.countUnread(req.user.id);
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  read(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.svc.markRead(req.user.id, id);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  readAll(@Req() req: AuthRequest) {
    return this.svc.markAllRead(req.user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.svc.remove(req.user.id, id);
  }
}
