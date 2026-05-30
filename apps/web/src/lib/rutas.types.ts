// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO ACOMPAÑAMIENTO A RUTAS — Tipos TypeScript
// ═══════════════════════════════════════════════════════════════════════════════
import type {
  MotivoDevolucion, EstadoAcompanamiento, CriticidadOperacional,
  TipoRiesgoRuta, EstadoCumplimiento,
} from "./rutas.constants";

// ─── ACOMPAÑAMIENTO ──────────────────────────────────────────────────────────
export interface Acompanamiento {
  id: string;
  fecha: string;
  auditorId: string;
  auditorNombre: string;
  clienteId: string;
  clienteNombre: string;
  rutaId: string;
  rutaNombre: string;
  vehiculoId: string;
  vehiculoPlaca: string;
  conductorId: string;
  conductorNombre: string;
  auxiliarId?: string;
  auxiliarNombre?: string;
  motivo: MotivoDevolucion;
  valorDevueltoCOP: number;
  cantidadKgDevueltos: number;
  observacionAuditor: string;
  riesgosAsociados: TipoRiesgoRuta[];
  criticidad: CriticidadOperacional;
  estado: EstadoAcompanamiento;
  evidencias?: string[];   // ids de EvidenciaRuta
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

// ─── EVIDENCIA ───────────────────────────────────────────────────────────────
export interface EvidenciaRuta {
  id: string;
  acompanamientoId: string;
  tipo: "Foto" | "PDF" | "Excel" | "Video" | "Otro";
  nombre: string;
  url: string;             // filesystem path
  size: number;
  categoria?: string;
  uploadedAt: string;
  uploadedBy: string;
  _demo?: boolean;
}

// ─── CUMPLIMIENTO ────────────────────────────────────────────────────────────
export interface AccionCumplimiento {
  id: string;
  acompanamientoId: string;
  planAccion: string;
  responsable: string;
  estado: EstadoCumplimiento;
  porcentajeAvance: number;
  fechaCompromiso: string;
  fechaCumplimiento?: string;
  evidenciaCorreccion?: string;
  validadoPor?: string;
  reincidencia: boolean;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}
