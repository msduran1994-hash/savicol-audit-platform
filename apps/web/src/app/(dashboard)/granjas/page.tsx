"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Granjas → Dashboard  (ÚNICO / consolidado)
// El antiguo "Dashboard Avanzado" se fusionó aquí: este Dashboard renderiza el
// componente ejecutivo (filtros globales, KPIs, gráficos, alertas, análisis,
// export y la sección de Trazabilidad por granja). No se duplica analítica.
// Se renderiza (no se re-exporta) para no romper el límite de Client Component.
// ═══════════════════════════════════════════════════════════════════════════════
import GranjasEjecutivoPage from "./ejecutivo/page";

export default function GranjasDashboardPage() {
  return <GranjasEjecutivoPage />;
}
