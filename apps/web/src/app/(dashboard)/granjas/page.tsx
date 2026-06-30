// ═══════════════════════════════════════════════════════════════════════════════
// Granjas (raíz). El módulo "Dashboard" (resumen) se eliminó; el único dashboard
// es "Dashboard Dinámico" (/granjas/dinamico). Esta raíz redirige allí.
// ═══════════════════════════════════════════════════════════════════════════════
import { redirect } from "next/navigation";

export default function GranjasIndex() {
  redirect("/granjas/dinamico");
}
