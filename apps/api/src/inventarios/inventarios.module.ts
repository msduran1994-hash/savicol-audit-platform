import { Module } from "@nestjs/common";
import { InventariosController } from "./inventarios.controller";
import { InventariosService } from "./inventarios.service";

// Hoja "Inventarios" (plural) — distinta del módulo `inventario` (singular) de Granjas.
// PrismaModule es global; no requiere importarse aquí.
@Module({
  controllers: [InventariosController],
  providers: [InventariosService],
})
export class InventariosModule {}
