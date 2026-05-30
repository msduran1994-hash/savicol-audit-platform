#!/bin/sh
# ═════════════════════════════════════════════════════════════════════════════
# Postgres prepare script — usado por Railway antes del build
# ═════════════════════════════════════════════════════════════════════════════
# Reemplaza el provider sqlite → postgresql en schema.prisma SIN cambiar
# ninguna otra cosa. Las migraciones SQLite NO son compatibles con Postgres,
# así que se borran y se crean nuevas con `prisma migrate deploy` en runtime.
# ═════════════════════════════════════════════════════════════════════════════

set -e
echo "🔄 Adaptando schema Prisma para Postgres..."

# 1. Reemplazar provider
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# 2. Borrar migraciones SQLite (Railway/Postgres genera las suyas)
rm -rf prisma/migrations
echo "✓ Migraciones SQLite eliminadas (Postgres usa db push)"

# 3. Generar cliente Prisma para Postgres
npx prisma generate

echo "✓ Schema adaptado para Postgres"
