// ═══════════════════════════════════════════════════════════════════════════════
// ENUM LABELS — Conversión bidireccional API ↔ display
// ═══════════════════════════════════════════════════════════════════════════════
// La DB guarda enums como UPPERCASE_SNAKE (PRODUCTO_VENCIDO).
// La UI muestra labels en Title Case con tildes (Producto Vencido).
// Las constantes existentes (granjas.constants.ts, rutas.constants.ts) usan
// la forma de display. Este módulo permite convertir entre ambas.
// ═══════════════════════════════════════════════════════════════════════════════

type Dict = Record<string, string>;

function reverse(d: Dict): Dict {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [v, k]));
}

// ─── GRANJAS ─────────────────────────────────────────────────────────────────
export const TIPO_GRANJA_DB:      Dict = { ARRENDADA: "Arrendada", PROPIA: "Propia", INTEGRADA: "Integrada" };
export const TIPO_OPERATIVO_DB:   Dict = { ENGORDE: "Engorde", REPRODUCTORA: "Reproductora" };
export const NIVEL_RIESGO_DB:     Dict = { BAJO: "Bajo", MEDIO: "Medio", ALTO: "Alto" };
export const ESTADO_SANITARIO_DB: Dict = { OPTIMO: "Óptimo", ALERTA: "Alerta", CRITICO: "Crítico" };
export const ESTADO_GRANJA_DB:    Dict = { ACTIVA: "Activa", INACTIVA: "Inactiva", CUARENTENA: "Cuarentena" };

export const CATEGORIA_HALLAZGO_DB: Dict = {
  AMBIENTAL: "Ambiental", BIOSEGURIDAD: "Bioseguridad", SANITARIO: "Sanitario",
  FINANCIERO: "Financiero", DOCUMENTAL: "Documental", MORTALIDAD: "Mortalidad",
  INVENTARIO_INSUMOS: "Inventario Insumos", INFRAESTRUCTURA: "Infraestructura", OPERATIVO: "Operativo",
};
export const CRITICIDAD_HALL_DB: Dict = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Crítica" };
export const ESTADO_HALLAZGO_DB: Dict = { ABIERTO: "Abierto", EN_PLAN: "En Plan", CERRADO: "Cerrado", VERIFICADO: "Verificado" };
export const ESTADO_KPI_DB:      Dict = { NO_INICIADO: "No Iniciado", EN_CURSO: "En Curso", EN_ESPERA: "En Espera", COMPLETADO: "Completado" };
export const TIPO_RIESGO_DB:     Dict = { OPERATIVO: "Operativo", REPUTACIONAL: "Reputacional", FINANCIERO: "Financiero", LEGAL: "Legal", CONTAGIO: "Contagio" };

// ─── RUTAS ───────────────────────────────────────────────────────────────────
export const MOTIVO_DB: Dict = {
  PRODUCTO_VENCIDO:       "Producto Vencido",
  EMPAQUE_DANADO:         "Empaque Dañado",
  CADENA_FRIO_ROTA:       "Cadena de Frío Rota",
  PRODUCTO_NO_SOLICITADO: "Producto No Solicitado",
  DIFERENCIA_PESO:        "Diferencia de Peso",
  CALIDAD_NO_CONFORME:    "Calidad No Conforme",
  CANTIDAD_EQUIVOCADA:    "Cantidad Equivocada",
  ENTREGA_TARDIA:         "Entrega Tardía",
  CLIENTE_AUSENTE:        "Cliente Ausente",
  OTRO:                   "Otro",
};
export const CRITICIDAD_RUTA_DB: Dict = { CRITICO: "Crítico", ALTO: "Alto", MEDIO: "Medio", BAJO: "Bajo" };
export const ESTADO_ACOMP_DB:    Dict = {
  PROGRAMADO: "Programado", EN_CURSO: "En Curso", COMPLETADO: "Completado",
  CON_HALLAZGOS: "Con Hallazgos", CERRADO: "Cerrado",
};
export const ESTADO_CUMPLIMIENTO_DB: Dict = {
  PENDIENTE: "Pendiente", EN_PROCESO: "En Proceso", VERIFICACION: "Verificación",
  CERRADO: "Cerrado", CERRADO_CON_REINCIDENCIA: "Cerrado con Reincidencia",
};

// ─── PLATAFORMA (Cronograma) ─────────────────────────────────────────────────
export const AUDIT_STATUS_DB: Dict = {
  COMPLETED: "Completada", IN_PROGRESS: "En Curso",
  NOT_STARTED: "No Iniciada", OVERDUE: "Vencida",
};

// ─── REVERSE MAPS (Display → DB) ─────────────────────────────────────────────
export const TIPO_GRANJA_TO_DB        = reverse(TIPO_GRANJA_DB);
export const TIPO_OPERATIVO_TO_DB     = reverse(TIPO_OPERATIVO_DB);
export const NIVEL_RIESGO_TO_DB       = reverse(NIVEL_RIESGO_DB);
export const ESTADO_SANITARIO_TO_DB   = reverse(ESTADO_SANITARIO_DB);
export const ESTADO_GRANJA_TO_DB      = reverse(ESTADO_GRANJA_DB);
export const CATEGORIA_HALLAZGO_TO_DB = reverse(CATEGORIA_HALLAZGO_DB);
export const CRITICIDAD_HALL_TO_DB    = reverse(CRITICIDAD_HALL_DB);
export const ESTADO_HALLAZGO_TO_DB    = reverse(ESTADO_HALLAZGO_DB);
export const ESTADO_KPI_TO_DB         = reverse(ESTADO_KPI_DB);
export const TIPO_RIESGO_TO_DB        = reverse(TIPO_RIESGO_DB);
export const MOTIVO_TO_DB             = reverse(MOTIVO_DB);
export const CRITICIDAD_RUTA_TO_DB    = reverse(CRITICIDAD_RUTA_DB);
export const ESTADO_ACOMP_TO_DB       = reverse(ESTADO_ACOMP_DB);
export const ESTADO_CUMPLIMIENTO_TO_DB = reverse(ESTADO_CUMPLIMIENTO_DB);
export const AUDIT_STATUS_TO_DB       = reverse(AUDIT_STATUS_DB);

// ─── HELPER GENÉRICO ─────────────────────────────────────────────────────────
export const toDB = (val: any, dict: Dict): any =>
  typeof val === "string" && dict[val] !== undefined ? dict[val] : val;
