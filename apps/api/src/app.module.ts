import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditActivitiesModule } from "./audit-activities/audit-activities.module";
import { UsersModule } from "./users/users.module";
import { GranjasModule } from "./granjas/granjas.module";
import { RutasModule } from "./rutas/rutas.module";
import { CedisModule } from "./cedis/cedis.module";

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
  ],
})
export class AppModule {}
