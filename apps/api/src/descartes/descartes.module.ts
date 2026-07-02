import { Module } from "@nestjs/common";
import { DescartesController } from "./descartes.controller";
import { DescartesService } from "./descartes.service";

@Module({
  controllers: [DescartesController],
  providers: [DescartesService],
  exports: [DescartesService],
})
export class DescartesModule {}
