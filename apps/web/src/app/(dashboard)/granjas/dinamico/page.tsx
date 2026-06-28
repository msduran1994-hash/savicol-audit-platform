// ═══════════════════════════════════════════════════════════════════════════════
// Granjas → Dashboard Dinámico
// Módulo nuevo que REUTILIZA el mismo dashboard consolidado (dashboard-granjas.tsx):
// KPIs, gráficos, filtros globales, alertas, análisis ejecutivo y Exportar PDF.
// Ruta nueva (no la toca el Service Worker viejo) y cero duplicación de lógica.
// ═══════════════════════════════════════════════════════════════════════════════
import DashboardGranjas from "../dashboard-granjas";

export default function DashboardDinamicoPage() {
  return <DashboardGranjas mode="completo" />;
}
