import { Module } from "@nestjs/common";
import { AuditActivitiesModule } from "../audit-activities/audit-activities.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { GranjasController } from "./granjas.controller";
import { GranjasService } from "./granjas.service";
import { GranjasExecutiveService } from "./granjas-executive.service";
import { KpiAlertsService } from "./kpi-alerts.service";

@Module({
  imports: [AuditActivitiesModule, NotificationsModule],   // EmailModule + AuditLogsModule son @Global
  controllers: [GranjasController],
  providers: [GranjasService, GranjasExecutiveService, KpiAlertsService],
  exports: [GranjasExecutiveService, KpiAlertsService],
})
export class GranjasModule {}
