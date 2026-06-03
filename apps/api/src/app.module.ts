import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
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
import { RolesGuard } from "./auth/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting global: 100 req / minuto por IP
    // Endpoints sensibles (login) tienen su propio throttle (10/min)
    ThrottlerModule.forRoot([
      { name: "short",  ttl: 60_000,    limit: 100 },     // burst
      { name: "medium", ttl: 600_000,   limit: 1_000 },   // sostenido
      { name: "long",   ttl: 3_600_000, limit: 10_000 },  // hora
    ]),

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
  providers: [
    // Rate limiting global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // RBAC global — solo aplica si endpoint tiene @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
