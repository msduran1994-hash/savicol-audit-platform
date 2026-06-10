import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AuditoresController } from "./auditores.controller";
import { UsersService } from "./users.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],   // EmailModule es global
  controllers: [UsersController, AuditoresController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
