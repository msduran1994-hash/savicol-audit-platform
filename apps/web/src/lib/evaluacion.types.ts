// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIOS · Formulario Evaluativo — tipos
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvaluacionInventario {
  id: string;
  modulo: string;
  bodega?: string | null;
  auditores?: string | null;
  coordinador?: string | null;
  director?: string | null;
  colaboradores?: string | null;
  fecha: string;
  hora?: string | null;
  estadoEvaluacion: string;
  respuestasJSON?: string | null;
  bitacoraJSON?: string | null;
  observacionGeneral?: string | null;
  conclusion?: string | null;
  planAccion?: string | null;
  puntajeObtenido?: number | null;
  contestadas?: number | null;
  puntajeMaximo?: number | null;
  promedio?: number | null;
  porcentaje?: number | null;
  calificacion?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type EvaluacionPayload = Partial<EvaluacionInventario>;

export interface EvidenciaEvaluacion {
  id: string;
  evaluacionId: string;
  preguntaId?: string | null;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string | null;
  uploadedAt?: string;
  uploadedBy?: string | null;
}

export interface EvidenciaEvaluacionPayload {
  evaluacionId: string;
  preguntaId?: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
}
