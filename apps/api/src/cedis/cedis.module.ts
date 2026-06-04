import { Module } from "@nestjs/common";
import { AuditActivitiesModule } from "../audit-activities/audit-activities.module";
import { CedisController } from "./cedis.controller";
import { CedisService } from "./cedis.service";
import { CedisExecutiveService } from "./cedis-executive.service";

@Module({
  imports: [AuditActivitiesModule],
  controllers: [CedisController],
  providers: [CedisService, CedisExecutiveService],
  exports: [CedisExecutiveService],
})
export class CedisModule {}
