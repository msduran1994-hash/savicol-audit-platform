import { Module } from "@nestjs/common";
import { AuditActivitiesModule } from "../audit-activities/audit-activities.module";
import { GranjasController } from "./granjas.controller";
import { GranjasService } from "./granjas.service";
import { GranjasExecutiveService } from "./granjas-executive.service";

@Module({
  imports: [AuditActivitiesModule],
  controllers: [GranjasController],
  providers: [GranjasService, GranjasExecutiveService],
  exports: [GranjasExecutiveService],
})
export class GranjasModule {}
