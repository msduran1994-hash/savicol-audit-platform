import {
  Controller, Get, Query, Res, UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // ── EXCEL ──
  @Get("granjas/excel")
  async granjasExcel(
    @Res() res: Response,
    @Query("region")     region?: string,
    @Query("tipoGranja") tipoGranja?: string,
  ) {
    const buf = await this.svc.exportGranjasExcel({ region, tipoGranja });
    this.sendXlsx(res, "savicol-granjas", buf);
  }

  @Get("rutas/excel")
  async rutasExcel(
    @Res() res: Response,
    @Query("mes")        mes?: string,
    @Query("criticidad") criticidad?: string,
  ) {
    const buf = await this.svc.exportRutasExcel({
      mes: mes ? +mes : undefined,
      criticidad,
    });
    this.sendXlsx(res, "savicol-acompanamientos", buf);
  }

  @Get("hallazgos/granjas/excel")
  async hallazgosGranjasExcel(
    @Res() res: Response,
    @Query("criticidad") criticidad?: string,
    @Query("estado")     estado?: string,
  ) {
    const buf = await this.svc.exportHallazgosGranjasExcel({ criticidad, estado });
    this.sendXlsx(res, "savicol-hallazgos-granjas", buf);
  }

  @Get("cedis/auditorias/excel")
  async cedisAuditoriasExcel(
    @Res() res: Response,
    @Query("criticidad") criticidad?: string,
    @Query("estado")     estado?: string,
  ) {
    const buf = await this.svc.exportCedisAuditoriasExcel({ criticidad, estado });
    this.sendXlsx(res, "savicol-auditorias-cedis", buf);
  }

  @Get("cronograma/excel")
  async cronogramaExcel(
    @Res() res: Response,
    @Query("year")      year?: string,
    @Query("auditorId") auditorId?: string,
    @Query("status")    status?: string,
    @Query("area")      area?: string,
  ) {
    const buf = await this.svc.exportCronogramaExcel({
      year: year ? +year : undefined,
      auditorId, status, area,
    });
    this.sendXlsx(res, "savicol-cronograma-ejecutivo", buf);
  }

  // ── CSV ──
  @Get(":entity/csv")
  async csv(
    @Res() res: Response,
    @Query("entity") entityQ: string,
  ) {
    const entity = (entityQ as any) || "granjas";
    const csv = await this.svc.exportGenericCSV(entity);
    const filename = `savicol-${entity}-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── HELPER ──
  private sendXlsx(res: Response, prefix: string, buf: Buffer) {
    const filename = `${prefix}-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buf);
  }
}
