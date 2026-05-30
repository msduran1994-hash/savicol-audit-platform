# ═════════════════════════════════════════════════════════════════════════════
# Dockerfile · API NestJS Savicol
# ═════════════════════════════════════════════════════════════════════════════
# Build determinístico para Railway / cualquier plataforma cloud.
# Usa pnpm via Corepack + Prisma con Postgres.
# ═════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ─── Stage 1: install deps ──────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: build ─────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Adapta schema Prisma a Postgres (cambiar provider sqlite → postgresql)
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' apps/api/prisma/schema.prisma
# Las migraciones SQLite no son compatibles → las borramos, usaremos db push
RUN rm -rf apps/api/prisma/migrations

# Generar Prisma Client + compilar NestJS
RUN cd apps/api && pnpm prisma generate
RUN pnpm --filter @savicol/api build

# ─── Stage 3: runtime ───────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

# Al arrancar: aplica schema a Postgres + seed + lanza API
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && npx prisma db seed && node dist/main"]
