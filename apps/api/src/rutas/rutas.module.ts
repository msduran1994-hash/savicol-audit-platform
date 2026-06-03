import { Module } from "@nestjs/common";
import { AuditActivitiesModule } from "../audit-activities/audit-activities.module";
import { RutasController } from "./rutas.controller";
import { RutasService } from "./rutas.service";
import { RutasExecutiveService } from "./rutas-executive.service";

@Module({
  imports: [AuditActivitiesModule],   // para usar AuditActivitiesAiService (Claude/heurístico)
  controllers: [RutasController],
  providers: [RutasService, RutasExecutiveService],
  exports: [RutasExecutiveService],
})
export class RutasModule {}
