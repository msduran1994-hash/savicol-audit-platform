# Audit Platform · Savicol

Sistema integrado de auditoría, control interno, seguimiento operativo y análisis ejecutivo.

## Arquitectura

Monorepo con pnpm + Turborepo:

```
audit-platform/
├── apps/
│   ├── web/        Next.js 14 (App Router · React Query · Zustand)
│   └── api/        NestJS 10 (Prisma · JWT · MFA)
├── packages/
│   └── shared-types/  Schemas Zod compartidos
└── docker-compose.yml  Postgres opcional para dev
```

## 4 Workspaces operativos

| Espacio | Páginas | Propósito |
|---|---|---|
| Auditoría Empresarial | 7 | Cronograma 2026, Indicadores, Auditores |
| Granjas Avícolas | 10 | CRUD granjas, Hallazgos, KPI, Ranking IA |
| Acompañamiento Rutas | 6 | Devoluciones, Cumplimiento, Informe IA |
| Auditoría CEDIS | 6 | Centros distribución, 50+ checklist items |

## Stack técnico

- **Frontend**: Next.js 14, React 18, Tailwind, Recharts, Zustand persist, React Query, TypeScript
- **Backend**: NestJS 10, Prisma 5, JWT, bcryptjs, otplib (MFA)
- **DB**: SQLite (dev) → PostgreSQL (prod)
- **Build**: pnpm 11 + Turbo 2

## Setup local

```bash
# 1. Instalar deps
pnpm install

# 2. Configurar env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 3. DB + migraciones + seed
pnpm --filter @savicol/api prisma:migrate
pnpm --filter @savicol/api prisma:seed

# 4. Arrancar (en 2 terminales)
pnpm --filter @savicol/api dev      # API en :4000
pnpm --filter @savicol/web dev      # Web en :3000
```

Credenciales iniciales:
- Email: `admin@savicol.com`
- Password: `SavicolAdmin2026!`

## Despliegue

- Frontend → Vercel (`apps/web/vercel.json`)
- Backend → Railway (`apps/api/railway.json`)
- DB → Railway Postgres o Supabase

Ver `apps/api/prisma/schema.postgres.prisma` para versión productiva del schema.

## Estado del proyecto

| Métrica | Valor |
|---|---|
| Páginas Next.js | 29 |
| Modelos Prisma | 27 |
| Endpoints REST | 50+ |
| Workspaces | 4 |
| Go-Live readiness | 80% |

Ver `Diagnostico-Final-Despliegue-Savicol.html` para reporte completo.

## Licencia

Privado · Uso interno Savicol © 2026
