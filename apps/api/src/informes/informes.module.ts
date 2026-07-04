import { Module } from "@nestjs/common";
import { InformesController } from "./informes.controller";
import { InformesService } from "./informes.service";

// Envío de informes por correo (Granjas → Trazabilidad). PrismaModule y
// EmailModule son globales; no requieren importarse aquí.
@Module({
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}
