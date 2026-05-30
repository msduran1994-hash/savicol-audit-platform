// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS — Tipos TypeScript
// ═══════════════════════════════════════════════════════════════════════════════
import type {
  TipoGranja, TipoOperativo, NivelRiesgo, EstadoSanitario,
  TipoAuditoria, EstadoAuditoria, EstadoKPI,
  CategoriaHallazgo, Criticidad, TipoRiesgo,
  CategoriaInventario, EstadoInventario, Region,
} from "./granjas.constants";

// ─── GRANJA ──────────────────────────────────────────────────────────────────
export interface Granja {
  id: string;
  codigo: string;             // Ej. SAVICOL-ANT-001
  nombre: string;
  estado: "Activa" | "Inactiva" | "Cuarentena";
  region: Region;
  vereda: string;
  ubicacionGoogleMaps?: string;
  administrador: string;
  // ── Técnico Veterinario editable (no más lista cerrada) ──
  tecnicoVeterinarioId?: string;          // legacy
  tecnicoVeterinarioNombre?: string;      // NUEVO · campo libre
  tecnicoVeterinarioEmail?: string;       // NUEVO
  tecnicoVeterinarioTelefono?: string;    // NUEVO
  responsable?: string;                   // NUEVO
  // ─────────────────────────────────────────────────────────
  telefono: string;
  tipoGranja: TipoGranja;
  tipoOperativo: TipoOperativo;
  nivelRiesgo: NivelRiesgo;
  capacidadAves: number;
  estadoSanitario: EstadoSanitario;
  notas?: string;
  fotos?: string[];           // paths/urls
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

// ─── AUDITORÍA ────────────────────────────────────────────────────────────────
export interface Auditoria {
  id: string;
  auditorId: string;
  auditorNombre: string;
  granjaId: string;
  granjaNombre: string;
  tipoAuditoria: TipoAuditoria;
  fechaProgramada: string;
  fechaEjecutada?: string;
  estado: EstadoAuditoria;
  comentarios?: string;
  checklistRespuestas?: ChecklistRespuesta[];
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface ChecklistRespuesta {
  preguntaId: string;
  respuesta: "Cumple" | "No Cumple" | "No Aplica";
  observacion?: string;
}

// ─── HALLAZGO ────────────────────────────────────────────────────────────────
export interface Hallazgo {
  id: string;
  titulo: string;
  granjaId: string;
  granjaNombre: string;
  auditorId: string;
  auditorNombre: string;
  tipoGranja: TipoGranja;
  tipoOperativo: TipoOperativo;
  fechaVisita: string;
  categoria: CategoriaHallazgo;
  tiposRiesgo: TipoRiesgo[];
  criticidad: Criticidad;
  estado: "Abierto" | "En Plan" | "Cerrado" | "Verificado";
  descripcion: string;
  recomendacionesIA?: string;
  evidencias?: string[];      // paths a archivos
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

// ─── KPI ─────────────────────────────────────────────────────────────────────
export interface KPI {
  id: string;
  hallazgoId?: string;
  granjaId: string;
  accion: string;
  seguimiento: string;
  fechaCumplimiento?: string;
  fechaCompromiso: string;
  fechaProximaVisita?: string;
  planAccionVeterinario: string;
  estado: EstadoKPI;
  responsable: string;
  porcentajeAvance: number;
  evidencias?: string[];
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

// ─── INVENTARIO ──────────────────────────────────────────────────────────────
export interface InventarioItem {
  id: string;
  granjaId: string;
  categoria: CategoriaInventario;
  producto: string;
  unidad: string;             // kg, dosis, unidades, litros
  stock: number;
  stockMinimo: number;
  fechaVencimiento?: string;
  estado: EstadoInventario;
  ubicacion?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

// ─── DOCUMENTO ───────────────────────────────────────────────────────────────
export interface DocumentoGranja {
  id: string;
  granjaId: string;
  nombre: string;
  tipo: "PDF" | "Excel" | "CSV" | "Word" | "Imagen" | "Otro";
  categoria: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  ocrTexto?: string;          // texto extraído por OCR
  ocrCompletado: boolean;
  url: string;                // path del archivo (filesystem por ahora)
  _demo?: boolean;
}

// ─── ACTIVIDAD / BITÁCORA ────────────────────────────────────────────────────
export interface ActividadLog {
  id: string;
  tipo: "Auditoría" | "Hallazgo" | "KPI" | "Granja" | "Documento" | "Sistema";
  accion: "Creado" | "Actualizado" | "Eliminado" | "Aprobado" | "Cargado" | "Exportado";
  recursoId: string;
  recursoNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  detalles?: string;
  timestamp: string;
  _demo?: boolean;
}
