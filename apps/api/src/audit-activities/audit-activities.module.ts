import { Module } from "@nestjs/common";
import { AuditActivitiesController } from "./audit-activities.controller";
import { AuditActivitiesService } from "./audit-activities.service";
import { AuditActivitiesExecutiveService } from "./audit-activities-executive.service";
import { AuditActivitiesAiService } from "./audit-activities-ai.service";

@Module({
  controllers: [AuditActivitiesController],
  providers: [
    AuditActivitiesService,
    AuditActivitiesExecutiveService,
    AuditActivitiesAiService,
  ],
  exports: [
    AuditActivitiesExecutiveService,
    AuditActivitiesAiService,
  ],
})
export class AuditActivitiesModule {}
