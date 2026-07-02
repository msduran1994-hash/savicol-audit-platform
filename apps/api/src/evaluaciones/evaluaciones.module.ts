import { Module } from "@nestjs/common";
import { EvaluacionesController } from "./evaluaciones.controller";
import { EvaluacionesService } from "./evaluaciones.service";

// Formulario Evaluativo (Inventario de Producto). PrismaModule es global.
@Module({
  controllers: [EvaluacionesController],
  providers: [EvaluacionesService],
})
export class EvaluacionesModule {}
