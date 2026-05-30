import { Module } from "@nestjs/common";
import { AuditActivitiesController } from "./audit-activities.controller";
import { AuditActivitiesService } from "./audit-activities.service";

@Module({
  controllers: [AuditActivitiesController],
  providers: [AuditActivitiesService],
})
export class AuditActivitiesModule {}
