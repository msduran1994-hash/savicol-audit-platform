import { Module } from "@nestjs/common";
import { PasswordResetService } from "./password-reset.service";
import { PasswordResetController } from "./password-reset.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports:     [PrismaModule],
  controllers: [PasswordResetController],
  providers:   [PasswordResetService],
  exports:     [PasswordResetService],
})
export class PasswordResetModule {}
