-- CreateTable
CREATE TABLE "Cedi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "administrador" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "capacidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditoriaCedi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cediId" TEXT NOT NULL,
    "fechaVisita" DATETIME NOT NULL,
    "auditorId" TEXT NOT NULL,
    "auditorNombre" TEXT NOT NULL,
    "administrador" TEXT NOT NULL,
    "tipoRiesgo" TEXT NOT NULL,
    "observacionRiesgo" TEXT NOT NULL,
    "observacionInventario" TEXT,
    "observacionCaja" TEXT,
    "observacionCartera" TEXT,
    "observacionLogistica" TEXT,
    "observacionBioseguridad" TEXT,
    "observacionInfraestructura" TEXT,
    "observacionProcedimientos" TEXT,
    "planMejoraMercadeo" TEXT,
    "seguimientoCorrectivo" TEXT,
    "checksJSON" TEXT,
    "criticidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditoriaCedi_cediId_fkey" FOREIGN KEY ("cediId") REFERENCES "Cedi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HallazgoCedi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditoriaId" TEXT,
    "cediId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subItem" TEXT,
    "descripcion" TEXT NOT NULL,
    "tipoRiesgo" TEXT NOT NULL,
    "criticidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "recomendacionIA" TEXT,
    "responsable" TEXT,
    "fechaCompromiso" DATETIME,
    "fechaCierre" DATETIME,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "reincidente" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HallazgoCedi_cediId_fkey" FOREIGN KEY ("cediId") REFERENCES "Cedi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HallazgoCedi_auditoriaId_fkey" FOREIGN KEY ("auditoriaId") REFERENCES "AuditoriaCedi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenciaCedi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditoriaId" TEXT,
    "hallazgoId" TEXT,
    "cediId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "categoria" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "ocrTexto" TEXT,
    "ocrCompletado" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EvidenciaCedi_cediId_fkey" FOREIGN KEY ("cediId") REFERENCES "Cedi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvidenciaCedi_auditoriaId_fkey" FOREIGN KEY ("auditoriaId") REFERENCES "AuditoriaCedi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Cedi_codigo_key" ON "Cedi"("codigo");

-- CreateIndex
CREATE INDEX "AuditoriaCedi_cediId_idx" ON "AuditoriaCedi"("cediId");

-- CreateIndex
CREATE INDEX "AuditoriaCedi_estado_idx" ON "AuditoriaCedi"("estado");

-- CreateIndex
CREATE INDEX "AuditoriaCedi_criticidad_idx" ON "AuditoriaCedi"("criticidad");

-- CreateIndex
CREATE INDEX "AuditoriaCedi_fechaVisita_idx" ON "AuditoriaCedi"("fechaVisita");

-- CreateIndex
CREATE INDEX "HallazgoCedi_cediId_idx" ON "HallazgoCedi"("cediId");

-- CreateIndex
CREATE INDEX "HallazgoCedi_categoria_idx" ON "HallazgoCedi"("categoria");

-- CreateIndex
CREATE INDEX "HallazgoCedi_criticidad_idx" ON "HallazgoCedi"("criticidad");

-- CreateIndex
CREATE INDEX "HallazgoCedi_estado_idx" ON "HallazgoCedi"("estado");

-- CreateIndex
CREATE INDEX "EvidenciaCedi_cediId_idx" ON "EvidenciaCedi"("cediId");

-- CreateIndex
CREATE INDEX "EvidenciaCedi_auditoriaId_idx" ON "EvidenciaCedi"("auditoriaId");
