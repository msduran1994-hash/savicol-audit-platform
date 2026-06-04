import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ImportsService } from "./imports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("imports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "AUDITOR", "SUPERVISOR")
export class ImportsController {
  constructor(private svc: ImportsService) {}

  @Post("granjas")
  granjas(@Body() body: { rows: any[] }) {
    return this.svc.importGranjas(body?.rows ?? []);
  }

  @Post("hallazgos-granja")
  hallazgosGranja(@Body() body: { rows: any[] }) {
    return this.svc.importHallazgosGranja(body?.rows ?? []);
  }

  @Post("kpis")
  kpis(@Body() body: { rows: any[] }) {
    return this.svc.importKPIs(body?.rows ?? []);
  }

  @Post("cronograma")
  cronograma(@Body() body: { rows: any[] }) {
    return this.svc.importCronograma(body?.rows ?? []);
  }

  @Post("hallazgos-cedi")
  hallazgosCedi(@Body() body: { rows: any[] }) {
    return this.svc.importHallazgosCedi(body?.rows ?? []);
  }
}
