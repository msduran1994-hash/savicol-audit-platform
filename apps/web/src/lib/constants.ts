// ─── AUDITORS ─────────────────────────────────────────────────────────────────
export const AUDITORS = [
  { id: "MD", name: "Michael Duran",       initials: "MD", color: "#3B82F6" },
  { id: "KH", name: "Kerling Hernandez",   initials: "KH", color: "#8B5CF6" },
  { id: "JG", name: "Jaider Gonzalez",     initials: "JG", color: "#06B6D4" },
  { id: "HB", name: "Hilary Basto",        initials: "HB", color: "#F59E0B" },
  { id: "AT", name: "Alexander Tellez",    initials: "AT", color: "#10B981" },
  { id: "IB", name: "Ivan Bonilla",        initials: "IB", color: "#EF4444" },
] as const;

export type AuditorId = typeof AUDITORS[number]["id"];

// ─── AUDIT STATUS ─────────────────────────────────────────────────────────────
export const AUDIT_STATUS = {
  COMPLETED:   { label: "Completada",   value: "COMPLETED",   color: "#10B981", bg: "#064E3B" },
  IN_PROGRESS: { label: "En Curso",     value: "IN_PROGRESS", color: "#FCD34D", bg: "#451A03" },
  NOT_STARTED: { label: "No Iniciada",  value: "NOT_STARTED", color: "#94A3B8", bg: "#1E293B" },
  OVERDUE:     { label: "Vencida",      value: "OVERDUE",     color: "#FCA5A5", bg: "#450A0A" },
} as const;

export type AuditStatus = keyof typeof AUDIT_STATUS;

// ─── AUDIT AREAS / PROCESSES ──────────────────────────────────────────────────
export const AUDIT_AREAS = [
  "Financiero y Contable",
  "Recursos Humanos",
  "Tecnología e Información",
  "Operaciones y Logística",
  "Compras y Proveedores",
  "Cumplimiento Regulatorio",
  "Gestión de Riesgos",
  "Comercial y Ventas",
  "Producción",
  "Seguridad y Salud en el Trabajo",
  "Gestión Ambiental",
  "Auditoría Interna",
  "Gobierno Corporativo",
] as const;

export type AuditArea = typeof AUDIT_AREAS[number];

// ─── ACTIVITY TYPES ───────────────────────────────────────────────────────────
export const ACTIVITY_TYPES = [
  "Auditoría de Campo",
  "Revisión Documental",
  "Entrevistas y Encuestas",
  "Pruebas Sustantivas",
  "Pruebas de Cumplimiento",
  "Seguimiento de Hallazgos",
  "Informe de Auditoría",
  "Comité de Auditoría",
  "Planificación Anual",
  "Capacitación y Desarrollo",
] as const;

// ─── MONTHS ───────────────────────────────────────────────────────────────────
export const MONTHS_2026 = [
  { value: 1,  label: "Enero",      short: "Ene" },
  { value: 2,  label: "Febrero",    short: "Feb" },
  { value: 3,  label: "Marzo",      short: "Mar" },
  { value: 4,  label: "Abril",      short: "Abr" },
  { value: 5,  label: "Mayo",       short: "May" },
  { value: 6,  label: "Junio",      short: "Jun" },
  { value: 7,  label: "Julio",      short: "Jul" },
  { value: 8,  label: "Agosto",     short: "Ago" },
  { value: 9,  label: "Septiembre", short: "Sep" },
  { value: 10, label: "Octubre",    short: "Oct" },
  { value: 11, label: "Noviembre",  short: "Nov" },
  { value: 12, label: "Diciembre",  short: "Dic" },
] as const;

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard",         icon: "LayoutDashboard" },
  { href: "/cronograma",        label: "Cronograma 2026",   icon: "CalendarDays" },
  { href: "/indicadores",       label: "Indicadores",       icon: "BarChart3" },
  { href: "/auditores",         label: "Auditores",         icon: "Users" },
  { href: "/configuracion",     label: "Configuración",     icon: "Settings" },
] as const;

// ─── APP META ─────────────────────────────────────────────────────────────────
export const APP_NAME    = "Audit Platform";
export const APP_COMPANY = "Savicol";
export const AUDIT_YEAR  = 2026;
