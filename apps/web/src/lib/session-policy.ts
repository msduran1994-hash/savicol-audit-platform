// ═══════════════════════════════════════════════════════════════════════════════
// SESSION POLICY · Política de inactividad y cierre automático de sesión por rol
// ═══════════════════════════════════════════════════════════════════════════════
// Fuente única de verdad consumida por useIdleTimeout + SeguridadSection UI.
// Valores en MINUTOS. Si el warning >= timeout no se muestra modal.
//
// Política corporativa (acordada con el área de seguridad):
//   ADMIN              · advertencia 25', cierre 30'
//   AUDITOR/SUPERVISOR · advertencia 35', cierre 45'
//   VIEWER/AUDITEE     · advertencia 15', cierre 20'
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoleSessionPolicy {
  warningMinutes: number;
  timeoutMinutes: number;
  label: string;
  description: string;
}

export const SESSION_POLICIES: Record<string, RoleSessionPolicy> = {
  ADMIN: {
    warningMinutes: 25,
    timeoutMinutes: 30,
    label: "Administrador",
    description: "Acceso privilegiado · ventana corta por sensibilidad de operaciones",
  },
  AUDITOR: {
    warningMinutes: 35,
    timeoutMinutes: 45,
    label: "Auditor",
    description: "Trabajo intensivo en campo · ventana extendida",
  },
  SUPERVISOR: {
    warningMinutes: 35,
    timeoutMinutes: 45,
    label: "Supervisor",
    description: "Coordinación de equipos · ventana extendida",
  },
  AUDITEE: {
    warningMinutes: 15,
    timeoutMinutes: 20,
    label: "Auditeo",
    description: "Consulta limitada a sus registros · ventana corta",
  },
  VIEWER: {
    warningMinutes: 15,
    timeoutMinutes: 20,
    label: "Visualizador",
    description: "Solo lectura · ventana corta",
  },
  AI_AGENT: {
    warningMinutes: 0,
    timeoutMinutes: 0,
    label: "Agente IA",
    description: "Sin idle timeout · sesiones de servicio (no humanas)",
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
 * ¿Esta política tiene auto-logout? (AI_AGENT = 0 = nunca expira)
 */
export function hasIdleTimeout(policy: RoleSessionPolicy): boolean {
  return policy.timeoutMinutes > 0;
}
