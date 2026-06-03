import { Controller, Get, UseGuards } from "@nestjs/common";
import { PowerbiService } from "./powerbi.service";
import { ApiTokenOrJwtGuard } from "../auth/guards/api-token-or-jwt.guard";

/**
 * Endpoints PowerBI · aceptan JWT (UI) o X-API-Token (Power BI Desktop)
 * Cada dataset devuelve un array plano JSON listo para ingest.
 */
@Controller("powerbi")
@UseGuards(ApiTokenOrJwtGuard)
export class PowerbiController {
  constructor(private svc: PowerbiService) {}

  @Get("metadata")
  metadata() { return this.svc.metadata(); }

  @Get("granjas")
  granjas() { return this.svc.granjas(); }

  @Get("rutas")
  rutas() { return this.svc.rutas(); }

  @Get("cedis")
  cedis() { return this.svc.cedis(); }

  @Get("hallazgos-granjas")
  hallazgosGranjas() { return this.svc.hallazgosGranjas(); }

  @Get("hallazgos-cedis")
  hallazgosCedis() { return this.svc.hallazgosCedis(); }

  @Get("kpis")
  kpis() { return this.svc.kpis(); }

  @Get("cronograma")
  cronograma() { return this.svc.cronograma(); }

  @Get("summary")
  summary() { return this.svc.summary(); }
}
