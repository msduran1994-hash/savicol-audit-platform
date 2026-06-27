// El "Dashboard Avanzado" se consolidó en el Dashboard único de Granjas (/granjas).
// Esta ruta se conserva solo para no romper enlaces antiguos: redirige al único.
import { redirect } from "next/navigation";

export default function GranjasEjecutivoRedirect() {
  redirect("/granjas");
}
