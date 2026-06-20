// ═══════════════════════════════════════════════════════════════════════════════
// MATRIZ DE PERMISOS · RBAC centralizado (frontend)
// ═══════════════════════════════════════════════════════════════════════════════
// Fuente única de verdad para mostrar/ocultar acciones en la UI según el rol.
// IMPORTANTE: esto controla la CARA VISIBLE de los permisos (botones, menús).
// La validación de seguridad definitiva debe hacerse también en el backend;
// este módulo evita que un usuario vea acciones que no le corresponden.
//
// Roles vigentes: ADMIN · SUPERVISOR · AUDITOR · VIEWER
// (Eliminados: AUDITEE / Agente IA)
//
// Política de permisos (decisiones del negocio):
//   - Crear / Editar:        Admin, Supervisor, Auditor
//   - Eliminar:              solo Admin  (Supervisor NO elimina)
//   - Aprobar:               Admin, Supervisor
//   - Cargar evidencias:     Admin, Supervisor, Auditor
//   - Generar reportes:      todos
//   - Ver dashboards:        todos
//   - Descargar reportes:    todos
//   - Gestionar usuarios:    solo Admin
//   - Asignar roles:         solo Admin
//   - Enviar invitaciones:   solo Admin
//   - Cambiar estados (cronograma): Admin, Supervisor (Auditor NO)
// ═══════════════════════════════════════════════════════════════════════════════

export type Rol = "ADMIN" | "SUPERVISOR" | "AUDITOR" | "VIEWER";

export type Permiso =
  | "crear"
  | "editar"
  | "eliminar"
  | "aprobar"
  | "cargarEvidencias"
  | "generarReportes"
  | "descargarReportes"
  | "verDashboards"
  | "gestionarUsuarios"
  | "asignarRoles"
  | "enviarInvitaciones"
  | "cambiarEstados";

// Matriz: para cada permiso, qué roles lo tienen.
const MATRIZ: Record<Permiso, Rol[]> = {
  crear:              ["ADMIN", "SUPERVISOR", "AUDITOR"],
  editar:             ["ADMIN", "SUPERVISOR", "AUDITOR"],
  eliminar:           ["ADMIN"],
  aprobar:            ["ADMIN", "SUPERVISOR"],
  cargarEvidencias:   ["ADMIN", "SUPERVISOR", "AUDITOR"],
  generarReportes:    ["ADMIN", "SUPERVISOR", "AUDITOR", "VIEWER"],
  descargarReportes:  ["ADMIN", "SUPERVISOR", "AUDITOR", "VIEWER"],
  verDashboards:      ["ADMIN", "SUPERVISOR", "AUDITOR", "VIEWER"],
  gestionarUsuarios:  ["ADMIN"],
  asignarRoles:       ["ADMIN"],
  enviarInvitaciones: ["ADMIN"],
  cambiarEstados:     ["ADMIN", "SUPERVISOR"],
};

function normalizarRol(role?: string | null): Rol {
  const r = (role ?? "").toUpperCase();
  if (r === "ADMIN" || r === "SUPERVISOR" || r === "AUDITOR" || r === "VIEWER") return r;
  return "VIEWER"; // fallback seguro: el rol desconocido solo puede ver
}

/**
 * ¿El rol dado tiene el permiso indicado?
 * Uso: can(user?.role, "eliminar")
 */
export function can(role: string | undefined | null, permiso: Permiso): boolean {
  return MATRIZ[permiso].includes(normalizarRol(role));
}

/**
 * Caso especial · Cronograma 2026 (Auditoría):
 * El Auditor puede consultar y CREAR actividades, pero NO cambiar ni eliminar
 * estados. Los cambios de estado son exclusivos de Administrador y Supervisor.
 */
export function puedeCambiarEstadoCronograma(role?: string | null): boolean {
  return can(role, "cambiarEstados");
}
export function puedeCrearActividadCronograma(role?: string | null): boolean {
  return can(role, "crear");
}

/**
 * Etiqueta legible del rol para la UI.
 */
export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  AUDITOR: "Auditor",
  VIEWER: "Visualizador",
};

/**
 * Filas de la matriz para mostrarla en la UI de configuración (Fase 7).
 */
export const MATRIZ_UI: { funcion: string; permiso: Permiso }[] = [
  { funcion: "Crear registros", permiso: "crear" },
  { funcion: "Editar registros", permiso: "editar" },
  { funcion: "Eliminar registros", permiso: "eliminar" },
  { funcion: "Aprobar registros", permiso: "aprobar" },
  { funcion: "Cargar evidencias", permiso: "cargarEvidencias" },
  { funcion: "Cambiar estados (cronograma)", permiso: "cambiarEstados" },
  { funcion: "Generar reportes", permiso: "generarReportes" },
  { funcion: "Descargar reportes", permiso: "descargarReportes" },
  { funcion: "Ver dashboards", permiso: "verDashboards" },
  { funcion: "Gestionar usuarios", permiso: "gestionarUsuarios" },
  { funcion: "Asignar roles", permiso: "asignarRoles" },
  { funcion: "Enviar invitaciones", permiso: "enviarInvitaciones" },
];

export const ROLES_MATRIZ: Rol[] = ["ADMIN", "SUPERVISOR", "AUDITOR", "VIEWER"];
