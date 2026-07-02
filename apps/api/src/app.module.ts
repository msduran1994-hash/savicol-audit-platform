import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditActivitiesModule } from "./audit-activities/audit-activities.module";
import { UsersModule } from "./users/users.module";
import { GranjasModule } from "./granjas/granjas.module";
import { DescartesModule } from "./descartes/descartes.module";
import { RutasModule } from "./rutas/rutas.module";
import { CedisModule } from "./cedis/cedis.module";
import { InventarioModule } from "./inventario/inventario.module";
import { InventariosModule } from "./inventarios/inventarios.module";
import { EvaluacionesModule } from "./evaluaciones/evaluaciones.module";
import { DocumentosModule } from "./documentos/documentos.module";
import { EvidenciasModule } from "./evidencias/evidencias.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SettingsModule } from "./settings/settings.module";
import { ReportsModule } from "./reports/reports.module";
import { ApiTokensModule } from "./api-tokens/api-tokens.module";
import { PowerbiModule } from "./powerbi/powerbi.module";
import { ImportsModule } from "./imports/imports.module";
import { EmailModule } from "./email/email.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { PasswordResetModule } from "./password-reset/password-reset.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
// RolesGuard se aplica a nivel de controller junto a JwtAuthGuard
// (NestJS ejecuta global guards ANTES que controller guards · user no estaría
// disponible si RolesGuard se aplica globalmente)

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
    DescartesModule,
    RutasModule,
    CedisModule,
    InventarioModule,
    InventariosModule,
    EvaluacionesModule,
    DocumentosModule,
    EvidenciasModule,
    DashboardModule,
    SettingsModule,
    ReportsModule,
    ApiTokensModule,   // global · provee ApiTokensService al guard híbrido
    PowerbiModule,
    ImportsModule,     // bulk imports CSV/Excel → DB
    EmailModule,       // global · SMTP abstraction
    NotificationsModule,
    InvitationsModule,
    PasswordResetModule,
    AuditLogsModule,   // global · provee logAccess() y endpoints /audit-logs
  ],
  providers: [
    // Rate limiting global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
