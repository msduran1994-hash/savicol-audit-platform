// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO CEDIS — Tipos TypeScript
// ═══════════════════════════════════════════════════════════════════════════════
import type {
  TipoRiesgoCedi, CriticidadCedi, EstadoHallazgoCedi, CategoriaCedi,
} from "./cedis.constants";

export interface Cedi {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  region: string;
  administrador: string;
  telefono: string;
  direccion?: string;
  capacidad?: number;
  activo?: boolean;
  _demo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditoriaCedi {
  id: string;
  cediId: string;
  cediNombre?: string;
  fechaVisita: string;
  auditorId: string;
  auditorNombre: string;
  administrador: string;
  tipoRiesgo: TipoRiesgoCedi;
  observacionRiesgo: string;
  // Sub-observaciones por categoría
  observacionInventario?: string;
  observacionCaja?: string;
  observacionCartera?: string;
  observacionLogistica?: string;
  observacionBioseguridad?: string;
  observacionInfraestructura?: string;
  observacionProcedimientos?: string;
  planMejoraMercadeo?: string;
  seguimientoCorrectivo?: string;
  // Sub-items revisados (JSON con map subItem → "Cumple" | "No Cumple" | "No Aplica")
  checksJSON?: string;
  criticidad: CriticidadCedi;
  estado: EstadoHallazgoCedi;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface HallazgoCedi {
  id: string;
  auditoriaId?: string;
  cediId: string;
  titulo: string;
  categoria: CategoriaCedi;
  subItem?: string;
  descripcion: string;
  tipoRiesgo: TipoRiesgoCedi;
  criticidad: CriticidadCedi;
  estado: EstadoHallazgoCedi;
  recomendacionIA?: string;
  responsable?: string;
  fechaCompromiso?: string;
  fechaCierre?: string;
  porcentajeAvance: number;
  reincidente: boolean;
  createdAt: string;
  updatedAt: string;
  _demo?: boolean;
}

export interface EvidenciaCedi {
  id: string;
  auditoriaId?: string;
  hallazgoId?: string;
  cediId: string;
  tipo: "Foto" | "PDF" | "Excel" | "Video" | "Otro";
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
  uploadedAt: string;
  uploadedBy: string;
  _demo?: boolean;
}
