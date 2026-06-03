import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("dashboards")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  /** Vista ejecutiva agregada de los 4 workspaces */
  @Get("ejecutivo")
  ejecutivo() {
    return this.svc.getEjecutivo();
  }

  /** Métricas de seguridad: accesos, fallos, sesiones */
  @Get("seguridad")
  seguridad() {
    return this.svc.getSeguridad();
  }

  /** Top auditores ranking */
  @Get("top-auditores")
  topAuditores(@Query("limit") limit?: string) {
    return this.svc.getTopAuditores(limit ? +limit : 10);
  }
}
