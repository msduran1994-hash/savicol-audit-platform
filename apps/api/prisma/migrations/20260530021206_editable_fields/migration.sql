-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Granja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "region" TEXT NOT NULL,
    "vereda" TEXT NOT NULL,
    "ubicacionGoogleMaps" TEXT,
    "administrador" TEXT NOT NULL,
    "responsable" TEXT,
    "tecnicoVeterinarioId" TEXT,
    "tecnicoVeterinarioNombre" TEXT,
    "tecnicoVeterinarioEmail" TEXT,
    "tecnicoVeterinarioTelefono" TEXT,
    "telefono" TEXT NOT NULL,
    "tipoGranja" TEXT NOT NULL,
    "tipoOperativo" TEXT NOT NULL,
    "nivelRiesgo" TEXT NOT NULL DEFAULT 'BAJO',
    "capacidadAves" INTEGER NOT NULL,
    "estadoSanitario" TEXT NOT NULL DEFAULT 'OPTIMO',
    "notas" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Granja_tecnicoVeterinarioId_fkey" FOREIGN KEY ("tecnicoVeterinarioId") REFERENCES "TecnicoVeterinario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Granja" ("administrador", "capacidadAves", "codigo", "createdAt", "estado", "estadoSanitario", "id", "isDemo", "nivelRiesgo", "nombre", "notas", "region", "tecnicoVeterinarioId", "telefono", "tipoGranja", "tipoOperativo", "ubicacionGoogleMaps", "updatedAt", "vereda") SELECT "administrador", "capacidadAves", "codigo", "createdAt", "estado", "estadoSanitario", "id", "isDemo", "nivelRiesgo", "nombre", "notas", "region", "tecnicoVeterinarioId", "telefono", "tipoGranja", "tipoOperativo", "ubicacionGoogleMaps", "updatedAt", "vereda" FROM "Granja";
DROP TABLE "Granja";
ALTER TABLE "new_Granja" RENAME TO "Granja";
CREATE UNIQUE INDEX "Granja_codigo_key" ON "Granja"("codigo");
CREATE INDEX "Granja_region_idx" ON "Granja"("region");
CREATE INDEX "Granja_tipoGranja_idx" ON "Granja"("tipoGranja");
CREATE INDEX "Granja_nivelRiesgo_idx" ON "Granja"("nivelRiesgo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
