// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · tipos
// ═══════════════════════════════════════════════════════════════════════════════
// El tipo espeja el modelo Prisma InventarioAuditado (motor genérico por módulo).

export interface InventarioAuditado {
  id: string;
  consecutivo: string;
  modulo: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  // Ubicación libre (independiente) + tags opcionales para filtros/reportes
  ubicacion?: string | null;
  cediId?: string | null;
  cediNombre?: string | null;
  granjaId?: string | null;
  granjaNombre?: string | null;
  // Cantidades / valoración
  unidadMedida?: string | null;
  cantidad?: number | null;
  saldo?: number | null;
  cantidadContada?: number | null;
  diferencia?: number | null;
  costoUnitario?: number | null;
  valorTotal?: number | null;
  // Auditoría del ítem
  estado: string;
  responsable?: string | null;
  auditor?: string | null;
  fecha: string;
  observaciones?: string | null;
  datosJSON?: string | null;
  // Metadatos
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type InventarioPayload = Partial<InventarioAuditado>;

export interface InventarioFilters {
  modulo?: string;
  estado?: string;
  categoria?: string;
  cediId?: string;
  granjaId?: string;
}

// Kardex de movimientos
export interface MovimientoInventario {
  id: string;
  itemId: string;
  tipo: string;                 // Entrada | Salida | Ajuste | Conteo
  cantidad: number;
  saldoAnterior?: number | null;
  saldoResultante?: number | null;
  fecha: string;
  motivo?: string | null;
  referencia?: string | null;
  responsable?: string | null;
  observaciones?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}
export interface MovimientoPayload {
  itemId: string;
  tipo: string;
  cantidad: number;
  motivo?: string;
  referencia?: string;
  responsable?: string;
  observaciones?: string;
  fecha?: string;
}

// Evidencias
export interface EvidenciaInventario {
  id: string;
  itemId: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string | null;
  uploadedAt?: string;
  uploadedBy?: string | null;
}
export interface EvidenciaInventarioPayload {
  itemId: string;
  tipo: string;
  nombre: string;
  url: string;
  size: number;
  categoria?: string;
}

// Auditoría / historial de cambios
export interface CambioCampoInv { campo: string; antes: string; despues: string; }
export interface AuditoriaInventario {
  id: string;
  itemId: string;
  accion: string;
  detalle?: string | null;
  cambiosJSON?: string | null;
  usuario?: string | null;
  createdAt: string;
}
