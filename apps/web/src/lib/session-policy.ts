// ═══════════════════════════════════════════════════════════════════════════════
// SESSION POLICY · Política de inactividad y cierre automático de sesión
// ═══════════════════════════════════════════════════════════════════════════════
// Fuente única de verdad consumida por useIdleTimeout + SeguridadSection UI.
// Valores en MINUTOS. Si el warning >= timeout no se muestra modal.
//
// Política corporativa unificada:
//   La sesión se cierra ÚNICAMENTE tras 30 minutos de inactividad real
//   (mouse, teclado, scroll, guardados, navegación). Igual para todos los roles.
//   Se muestra una advertencia 2 minutos antes del cierre para permitir continuar.
//
// Roles vigentes: ADMIN · SUPERVISOR · AUDITOR · VIEWER
// (Los roles "AUDITEE/Auditeo" y "AI_AGENT/Agente IA" fueron eliminados.)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoleSessionPolicy {
  warningMinutes: number;
  timeoutMinutes: number;
  label: string;
  description: string;
}

// Inactividad uniforme: 30 minutos de cierre, advertencia a los 28 (2 min antes).
const TIMEOUT_MINUTES = 30;
const WARNING_MINUTES = 28;

export const SESSION_POLICIES: Record<string, RoleSessionPolicy> = {
  ADMIN: {
    warningMinutes: WARNING_MINUTES,
    timeoutMinutes: TIMEOUT_MINUTES,
    label: "Administrador",
    description: "Acceso total · cierre tras 30 min de inactividad real",
  },
  SUPERVISOR: {
    warningMinutes: WARNING_MINUTES,
    timeoutMinutes: TIMEOUT_MINUTES,
    label: "Supervisor",
    description: "Acceso operativo y aprobaciones · cierre tras 30 min de inactividad real",
  },
  AUDITOR: {
    warningMinutes: WARNING_MINUTES,
    timeoutMinutes: TIMEOUT_MINUTES,
    label: "Auditor",
    description: "Registro y evidencias · cierre tras 30 min de inactividad real",
  },
  VIEWER: {
    warningMinutes: WARNING_MINUTES,
    timeoutMinutes: TIMEOUT_MINUTES,
    label: "Visualizador",
    description: "Solo lectura · cierre tras 30 min de inactividad real",
  },
};

/**
 * Devuelve política para el rol dado · fallback a VIEWER si rol desconocido.
 */
export function getPolicy(role?: string): RoleSessionPolicy {
  if (!role) return SESSION_POLICIES.VIEWER;
  return SESSION_POLICIES[role.toUpperCase()] ?? SESSION_POLICIES.VIEWER;
}

/**
 * ¿Esta política tiene auto-logout? (siempre true: todos cierran a los 30 min)
 */
export function hasIdleTimeout(policy: RoleSessionPolicy): boolean {
  return policy.timeoutMinutes > 0;
}
