"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// <Can> · Gate de permisos para la UI
// ═══════════════════════════════════════════════════════════════════════════════
// Muestra su contenido solo si el rol del usuario actual tiene el permiso dado.
// Uso:
//   <Can permiso="eliminar"><button>Eliminar</button></Can>
//   <Can permiso="crear" fallback={<span>Solo lectura</span>}>...</Can>
//
// Recuerda: esto controla la CARA VISIBLE. La seguridad real se valida en backend.
// ═══════════════════════════════════════════════════════════════════════════════
import { useAuthStore } from "@/store/auth.store";
import { can, type Permiso } from "@/lib/permissions";

interface CanProps {
  permiso: Permiso;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permiso, children, fallback = null }: CanProps) {
  const role = useAuthStore((s) => s.user?.role);
  return <>{can(role, permiso) ? children : fallback}</>;
}

// Hook auxiliar para lógica condicional (cuando no basta con ocultar)
export function usePermiso() {
  const role = useAuthStore((s) => s.user?.role);
  return {
    role,
    puede: (permiso: Permiso) => can(role, permiso),
  };
}
