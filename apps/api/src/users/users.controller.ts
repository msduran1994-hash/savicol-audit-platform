import { Controller, Get, Patch, Param, Body, UseGuards, Req } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest extends Request {
  user: { id: string; role: string };
}

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
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
}
