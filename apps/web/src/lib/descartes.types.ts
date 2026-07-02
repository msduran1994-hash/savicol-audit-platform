// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS · Trazabilidad de Descartes — tipos
// ═══════════════════════════════════════════════════════════════════════════════

export interface DescarteAve {
  id: string;
  // Información general
  fechaHoraDescarte: string;
  granjaId?: string | null;
  granjaNombre: string;
  empresa?: string | null;
  integracion?: string | null;
  galpon: string;
  lote: string;
  lineaGenetica?: string | null;
  loteEdadDias?: number | null;
  tipoDescarte: string;
  motivo: string;
  clasificacionSanitaria?: string | null;
  nivelRiesgo: string;
  estado: string;
  // Información productiva
  cantidadAves: number;
  pesoPromedioKg?: number | null;
  pesoTotalKg?: number | null;
  mortalidadTraslado?: number | null;
  // Información logística
  destino?: string | null;
  plantaDestino?: string | null;
  transportadora?: string | null;
  vehiculoPlaca?: string | null;
  conductor?: string | null;
  responsableDespacho?: string | null;
  responsableRecepcion?: string | null;
  medicoVeterinario?: string | null;
  // Control de tiempos (ISO)
  horaInicioCargue?: string | null;
  horaFinCargue?: string | null;
  horaSalidaGranja?: string | null;
  horaLlegadaPlanta?: string | null;
  horaInicioDescarga?: string | null;
  horaFinDescarga?: string | null;
  // Georreferenciación
  gpsSalidaLat?: number | null;
  gpsSalidaLng?: number | null;
  gpsLlegadaLat?: number | null;
  gpsLlegadaLng?: number | null;
  distanciaKm?: number | null;
  ruta?: string | null;
  // Otros
  observaciones?: string | null;
  // Auditoría
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type DescartePayload = Partial<DescarteAve>;

export interface DescartesFilters {
  granjaId?: string;
  estado?: string;
  motivo?: string;
  nivelRiesgo?: string;
  plantaDestino?: string;
}
