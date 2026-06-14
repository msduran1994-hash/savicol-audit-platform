# ═════════════════════════════════════════════════════════════════════════════
# Dockerfile · API NestJS Savicol — single-stage simplificado
# ═════════════════════════════════════════════════════════════════════════════
# Imagen única para evitar problemas de symlinks pnpm entre stages.
# Trade-off: imagen más grande pero deploy más confiable.
# ═════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine

# Dependencias del sistema
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Habilitar pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar todo el monorepo
COPY . .

# Instalar deps (no-frozen-lockfile para soportar nuevas dependencias del frontend)
RUN pnpm install --no-frozen-lockfile

# Adaptar schema Prisma de SQLite → Postgres
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' apps/api/prisma/schema.prisma

# Borrar migraciones de SQLite (incompatibles con Postgres · usaremos db push)
RUN rm -rf apps/api/prisma/migrations

# Generar Prisma Client para Postgres
RUN cd apps/api && pnpm prisma generate

# Compilar el API NestJS
RUN pnpm --filter @savicol/api build

# Trabajar desde el directorio del API
WORKDIR /app/apps/api

# Puerto que escucha Nest
EXPOSE 4000

# Al arrancar: sync schema → seed (ADMIN + datos demo) → arrancar API
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && node dist/main"]
