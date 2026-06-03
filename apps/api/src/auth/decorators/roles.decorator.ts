import { SetMetadata } from "@nestjs/common";

/**
 * Lista de roles permitidos en la plataforma:
 *   ADMIN       — control total
 *   AUDITOR     — crea/edita auditorías, hallazgos, KPIs
 *   SUPERVISOR  — supervisa auditores, aprueba hallazgos
 *   AUDITEE     — usuario auditado (granja/cedi/ruta) · lectura limitada
 *   VIEWER      — solo lectura
 *   AI_AGENT    — agentes de IA con permisos restringidos
 */
export type AppRole = "ADMIN" | "AUDITOR" | "SUPERVISOR" | "AUDITEE" | "VIEWER" | "AI_AGENT";

export const ROLES_KEY = "roles";

/**
 * Decorador para proteger endpoints por rol.
 *
 * @example
 * @Roles("ADMIN")
 * @Delete(":id")
 * remove() {...}
 *
 * @example
 * @Roles("ADMIN", "SUPERVISOR")
 * @Patch(":id/approve")
 * approve() {...}
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
