// ═══════════════════════════════════════════════════════════════════════════════
// Granjas → Dashboard
// Renderiza el dashboard consolidado reutilizable (dashboard-granjas.tsx), que
// también usa "Dashboard Dinámico" (/granjas/dinamico). Sin duplicar lógica.
// ═══════════════════════════════════════════════════════════════════════════════
import DashboardGranjas from "./dashboard-granjas";

export default function GranjasDashboardPage() {
  return <DashboardGranjas mode="resumen" />;
}
