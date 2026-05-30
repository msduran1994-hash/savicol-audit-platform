import { Module } from "@nestjs/common";
import { GranjasController } from "./granjas.controller";
import { GranjasService } from "./granjas.service";

@Module({
  controllers: [GranjasController],
  providers: [GranjasService],
})
export class GranjasModule {}
