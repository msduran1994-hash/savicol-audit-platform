-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "auditorName" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditActivityLog_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "AuditActivity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Granja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "region" TEXT NOT NULL,
    "vereda" TEXT NOT NULL,
    "ubicacionGoogleMaps" TEXT,
    "administrador" TEXT NOT NULL,
    "tecnicoVeterinarioId" TEXT NOT NULL,
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
    CONSTRAINT "Granja_tecnicoVeterinarioId_fkey" FOREIGN KEY ("tecnicoVeterinarioId") REFERENCES "TecnicoVeterinario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TecnicoVeterinario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditoriaGranja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditorId" TEXT NOT NULL,
    "auditorNombre" TEXT NOT NULL,
    "granjaId" TEXT NOT NULL,
    "tipoAuditoria" TEXT NOT NULL,
    "fechaProgramada" DATETIME NOT NULL,
    "fechaEjecutada" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comentarios" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditoriaGranja_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistRespuesta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditoriaId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistRespuesta_auditoriaId_fkey" FOREIGN KEY ("auditoriaId") REFERENCES "AuditoriaGranja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hallazgo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "granjaId" TEXT NOT NULL,
    "auditoriaId" TEXT,
    "auditorId" TEXT NOT NULL,
    "auditorNombre" TEXT NOT NULL,
    "tipoGranja" TEXT NOT NULL,
    "tipoOperativo" TEXT NOT NULL,
    "fechaVisita" DATETIME NOT NULL,
    "categoria" TEXT NOT NULL,
    "tiposRiesgo" TEXT NOT NULL DEFAULT '[]',
    "criticidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "descripcion" TEXT NOT NULL,
    "recomendacionesIA" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hallazgo_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Hallazgo_auditoriaId_fkey" FOREIGN KEY ("auditoriaId") REFERENCES "AuditoriaGranja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenciaHallazgo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hallazgoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    CONSTRAINT "EvidenciaHallazgo_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "Hallazgo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hallazgoId" TEXT,
    "granjaId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "seguimiento" TEXT NOT NULL,
    "fechaCumplimiento" DATETIME,
    "fechaCompromiso" DATETIME NOT NULL,
    "fechaProximaVisita" DATETIME,
    "planAccionVeterinario" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'NO_INICIADO',
    "responsable" TEXT NOT NULL,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KPI_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "Hallazgo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KPI_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventarioItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "granjaId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "stock" REAL NOT NULL,
    "stockMinimo" REAL NOT NULL,
    "fechaVencimiento" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "ubicacion" TEXT,
    "notas" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventarioItem_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentoGranja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "granjaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "ocrTexto" TEXT,
    "ocrCompletado" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DocumentoGranja_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActividadGranjaLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "granjaId" TEXT,
    "tipo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "detalles" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ActividadGranjaLog_granjaId_fkey" FOREIGN KEY ("granjaId") REFERENCES "Granja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "region" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "capacidadKg" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conductor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "licencia" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Auxiliar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Acompanamiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "auditorId" TEXT NOT NULL,
    "auditorNombre" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "rutaId" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "auxiliarId" TEXT,
    "motivo" TEXT NOT NULL,
    "valorDevueltoCOP" REAL NOT NULL,
    "cantidadKgDevueltos" REAL NOT NULL,
    "observacionAuditor" TEXT NOT NULL,
    "riesgosAsociados" TEXT NOT NULL DEFAULT '[]',
    "criticidad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADO',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Acompanamiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Acompanamiento_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Acompanamiento_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Acompanamiento_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Acompanamiento_auxiliarId_fkey" FOREIGN KEY ("auxiliarId") REFERENCES "Auxiliar" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenciaRuta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acompanamientoId" TEXT NOT NULL,
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
    CONSTRAINT "EvidenciaRuta_acompanamientoId_fkey" FOREIGN KEY ("acompanamientoId") REFERENCES "Acompanamiento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccionCumplimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acompanamientoId" TEXT NOT NULL,
    "planAccion" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "fechaCompromiso" DATETIME NOT NULL,
    "fechaCumplimiento" DATETIME,
    "evidenciaCorreccion" TEXT,
    "validadoPor" TEXT,
    "reincidencia" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccionCumplimiento_acompanamientoId_fkey" FOREIGN KEY ("acompanamientoId") REFERENCES "Acompanamiento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "AuditActivity_auditorId_idx" ON "AuditActivity"("auditorId");

-- CreateIndex
CREATE INDEX "AuditActivity_status_idx" ON "AuditActivity"("status");

-- CreateIndex
CREATE INDEX "AuditActivity_year_idx" ON "AuditActivity"("year");

-- CreateIndex
CREATE INDEX "AuditActivityLog_activityId_idx" ON "AuditActivityLog"("activityId");

-- CreateIndex
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");

-- CreateIndex
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Granja_codigo_key" ON "Granja"("codigo");

-- CreateIndex
CREATE INDEX "Granja_region_idx" ON "Granja"("region");

-- CreateIndex
CREATE INDEX "Granja_tipoGranja_idx" ON "Granja"("tipoGranja");

-- CreateIndex
CREATE INDEX "Granja_nivelRiesgo_idx" ON "Granja"("nivelRiesgo");

-- CreateIndex
CREATE UNIQUE INDEX "TecnicoVeterinario_email_key" ON "TecnicoVeterinario"("email");

-- CreateIndex
CREATE INDEX "AuditoriaGranja_granjaId_idx" ON "AuditoriaGranja"("granjaId");

-- CreateIndex
CREATE INDEX "AuditoriaGranja_estado_idx" ON "AuditoriaGranja"("estado");

-- CreateIndex
CREATE INDEX "ChecklistRespuesta_auditoriaId_idx" ON "ChecklistRespuesta"("auditoriaId");

-- CreateIndex
CREATE INDEX "Hallazgo_granjaId_idx" ON "Hallazgo"("granjaId");

-- CreateIndex
CREATE INDEX "Hallazgo_criticidad_idx" ON "Hallazgo"("criticidad");

-- CreateIndex
CREATE INDEX "Hallazgo_estado_idx" ON "Hallazgo"("estado");

-- CreateIndex
CREATE INDEX "EvidenciaHallazgo_hallazgoId_idx" ON "EvidenciaHallazgo"("hallazgoId");

-- CreateIndex
CREATE INDEX "KPI_granjaId_idx" ON "KPI"("granjaId");

-- CreateIndex
CREATE INDEX "KPI_estado_idx" ON "KPI"("estado");

-- CreateIndex
CREATE INDEX "InventarioItem_granjaId_idx" ON "InventarioItem"("granjaId");

-- CreateIndex
CREATE INDEX "InventarioItem_categoria_idx" ON "InventarioItem"("categoria");

-- CreateIndex
CREATE INDEX "InventarioItem_estado_idx" ON "InventarioItem"("estado");

-- CreateIndex
CREATE INDEX "DocumentoGranja_granjaId_idx" ON "DocumentoGranja"("granjaId");

-- CreateIndex
CREATE INDEX "DocumentoGranja_categoria_idx" ON "DocumentoGranja"("categoria");

-- CreateIndex
CREATE INDEX "ActividadGranjaLog_granjaId_idx" ON "ActividadGranjaLog"("granjaId");

-- CreateIndex
CREATE INDEX "ActividadGranjaLog_tipo_idx" ON "ActividadGranjaLog"("tipo");

-- CreateIndex
CREATE INDEX "ActividadGranjaLog_timestamp_idx" ON "ActividadGranjaLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Conductor_documento_key" ON "Conductor"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Auxiliar_documento_key" ON "Auxiliar"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_codigo_key" ON "Ruta"("codigo");

-- CreateIndex
CREATE INDEX "Acompanamiento_clienteId_idx" ON "Acompanamiento"("clienteId");

-- CreateIndex
CREATE INDEX "Acompanamiento_rutaId_idx" ON "Acompanamiento"("rutaId");

-- CreateIndex
CREATE INDEX "Acompanamiento_vehiculoId_idx" ON "Acompanamiento"("vehiculoId");

-- CreateIndex
CREATE INDEX "Acompanamiento_criticidad_idx" ON "Acompanamiento"("criticidad");

-- CreateIndex
CREATE INDEX "Acompanamiento_estado_idx" ON "Acompanamiento"("estado");

-- CreateIndex
CREATE INDEX "Acompanamiento_fecha_idx" ON "Acompanamiento"("fecha");

-- CreateIndex
CREATE INDEX "EvidenciaRuta_acompanamientoId_idx" ON "EvidenciaRuta"("acompanamientoId");

-- CreateIndex
CREATE INDEX "AccionCumplimiento_acompanamientoId_idx" ON "AccionCumplimiento"("acompanamientoId");

-- CreateIndex
CREATE INDEX "AccionCumplimiento_estado_idx" ON "AccionCumplimiento"("estado");
