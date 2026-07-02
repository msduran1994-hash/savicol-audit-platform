// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS · Trazabilidad de Descartes — catálogos parametrizables
// ═══════════════════════════════════════════════════════════════════════════════
// Valores de dominio (no datos reales de la operación). Los datos reales (granja,
// lote, veterinario, planta, etc.) se capturan/seleccionan en el formulario.

export const TIPO_DESCARTE = [
  "Sanitario", "Productivo", "Bienestar animal", "Fin de ciclo", "Mortalidad", "Otro",
] as const;

export const MOTIVO_DESCARTE = [
  "Baja productividad", "Enfermedad", "Lesión / trauma", "Bajo peso",
  "Problema locomotor", "Prolapso", "Deshidratación", "Fin de ciclo productivo",
  "Orden sanitaria", "Decomiso", "Otro",
] as const;

export const CLASIFICACION_SANITARIA = [
  "Apto", "No apto", "Sospechoso", "En observación", "Decomiso",
] as const;

export const NIVEL_RIESGO_DESCARTE = ["Bajo", "Medio", "Alto", "Crítico"] as const;

export const ESTADO_DESCARTE = [
  "Registrado", "En tránsito", "Recibido en planta", "Cerrado", "Rechazado",
] as const;

export const DESTINO_DESCARTE = [
  "Planta de beneficio", "Incineración", "Compostaje",
  "Fosa / enterramiento", "Rendering (harina)", "Otro",
] as const;

// Colores por nivel de riesgo (consistentes con el resto de la plataforma)
export const RIESGO_COLOR: Record<string, string> = {
  Bajo: "#10B981", Medio: "#F59E0B", Alto: "#F97316", Crítico: "#EF4444",
};

// Colores por estado del proceso
export const ESTADO_DESCARTE_COLOR: Record<string, string> = {
  Registrado: "#94A3B8", "En tránsito": "#3B82F6", "Recibido en planta": "#06B6D4",
  Cerrado: "#10B981", Rechazado: "#EF4444",
};

// Objetivo logístico (minutos) para semáforo de cumplimiento del tiempo total.
export const TIEMPO_OBJETIVO_MIN = 180;
