import { Global, Module } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogsController } from "./audit-logs.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Global() // logAccess() consumido por auth/users/invitations sin re-importar
@Module({
  imports:     [PrismaModule],
  controllers: [AuditLogsController],
  providers:   [AuditLogsService],
  exports:     [AuditLogsService],
})
export class AuditLogsModule {}
