import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditActivitiesModule } from "./audit-activities/audit-activities.module";
import { UsersModule } from "./users/users.module";
import { GranjasModule } from "./granjas/granjas.module";
import { RutasModule } from "./rutas/rutas.module";
import { CedisModule } from "./cedis/cedis.module";
import { InventarioModule } from "./inventario/inventario.module";
import { DocumentosModule } from "./documentos/documentos.module";
import { EvidenciasModule } from "./evidencias/evidencias.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditActivitiesModule,
    UsersModule,
    GranjasModule,
    RutasModule,
    CedisModule,
    InventarioModule,
    DocumentosModule,
    EvidenciasModule,
    DashboardModule,
  ],
})
export class AppModule {}
