import { Module } from "@nestjs/common";
import { ImportsService } from "./imports.service";
import { ImportsController } from "./imports.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
