// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO AUDITORÍA CEDIS — Catálogos y enumeraciones
// ═══════════════════════════════════════════════════════════════════════════════
import { DEMO_MODE } from "./granjas.constants";

// ─── TIPO RIESGO (compartido con Granjas/Rutas) ──────────────────────────────
export const TIPO_RIESGO_CEDI = ["Reputacional", "Financiero", "Contagio", "Operativo", "Legal"] as const;
export type TipoRiesgoCedi = typeof TIPO_RIESGO_CEDI[number];

// ─── CRITICIDAD ──────────────────────────────────────────────────────────────
export const CRITICIDAD_CEDI = ["Crítica", "Alta", "Media", "Baja"] as const;
export type CriticidadCedi = typeof CRITICIDAD_CEDI[number];

// ─── ESTADO AUDITORÍA / HALLAZGO ─────────────────────────────────────────────
export const ESTADO_HALLAZGO_CEDI = ["Abierto", "En Plan", "En Verificación", "Cerrado", "Reincidente"] as const;
export type EstadoHallazgoCedi = typeof ESTADO_HALLAZGO_CEDI[number];

// ─── CATEGORÍAS PRINCIPALES (secciones del consolidado) ──────────────────────
export const CATEGORIA_CEDI = [
  "Inventario", "Caja", "Cartera", "Logística",
  "Bioseguridad", "Infraestructura", "Procedimientos",
] as const;
export type CategoriaCedi = typeof CATEGORIA_CEDI[number];

// ─── SUB-ITEMS POR CATEGORÍA ─────────────────────────────────────────────────
export const SUBITEMS_INVENTARIO = [
  "Inventario físico producto",
  "Inventario físico tinas",
  "Rotación stock producto",
  "Inventario descarte tinas",
  "Inventario descarte producto",
  "Documentación",
  "Muestreo presas",
  "Devolución producto",
] as const;

export const SUBITEMS_CAJA = [
  "Caja General",
  "Caja Menor",
  "Caja Central Domicilios",
  "Reembolsos",
  "Caja Vehículos",
] as const;

export const SUBITEMS_CARTERA = [
  "Arqueo Facturas",
  "Circularización Clientes",
  "Revisión Carpeta Clientes",
  "Vencimiento por edades",
] as const;

export const SUBITEMS_LOGISTICA = [
  "Documentación",
  "Control Calidad",
  "Encuestas Cliente Ruta",
  "Tiempos Entrega",
  "Devoluciones",
  "Estado Vehículo físico/documental",
  "Cargue y descargue vehículos",
  "Descargue vehículos",
  "Temperatura Logger",
] as const;

export const SUBITEMS_BIOSEGURIDAD = [
  "Extintores",
  "Botiquín",
  "Carné Manipulación",
  "EPP",
  "Capacitaciones",
  "Pausas Activas",
  "Pediluvio",
] as const;

export const SUBITEMS_INFRAESTRUCTURA = [
  "Avisos ética empresarial Ley 1581",
  "Avisos bioseguridad",
  "Inspección fachada",
  "Racks energía y conexión",
  "Baños",
  "Planta energía",
  "Pisos y paredes",
  "Escaleras y cableado",
  "Equipos calibración y refrigeración",
  "Inspección cuartos fríos",
] as const;

export const SUBITEMS_PROCEDIMIENTOS = [
  "Observación procedimientos",
  "Plan mejora mercadeo",
  "Seguimiento correctivo",
  "Trazabilidad auditoría",
] as const;

// Mapa categoría → sub-items
export const SUBITEMS_POR_CATEGORIA: Record<CategoriaCedi, readonly string[]> = {
  Inventario:       SUBITEMS_INVENTARIO,
  Caja:             SUBITEMS_CAJA,
  Cartera:          SUBITEMS_CARTERA,
  Logística:        SUBITEMS_LOGISTICA,
  Bioseguridad:     SUBITEMS_BIOSEGURIDAD,
  Infraestructura:  SUBITEMS_INFRAESTRUCTURA,
  Procedimientos:   SUBITEMS_PROCEDIMIENTOS,
};

// ─── CEDIS DEMO (Centros de Distribución Savicol) ────────────────────────────
export const CEDIS_DEMO = !DEMO_MODE ? [] : [
  { id: "DEMO_CED_001", codigo: "CEDI-BOG-01", nombre: "CEDI Bogotá Norte",     ciudad: "Bogotá",      region: "Cundinamarca",  administrador: "Camilo Andrés Rojas",     telefono: "+57 311 100 1001", direccion: "Calle 80 #45-22", capacidad: 8500 },
  { id: "DEMO_CED_002", codigo: "CEDI-MED-01", nombre: "CEDI Medellín Central", ciudad: "Medellín",    region: "Antioquia",     administrador: "Patricia Elena Ramos",    telefono: "+57 314 200 2002", direccion: "Cra 50 #65-30",   capacidad: 7200 },
  { id: "DEMO_CED_003", codigo: "CEDI-CAL-01", nombre: "CEDI Cali Sur",         ciudad: "Cali",        region: "Valle del Cauca",administrador: "Ricardo Alonso Pérez",   telefono: "+57 318 300 3003", direccion: "Av. Roosevelt #14", capacidad: 6500 },
  { id: "DEMO_CED_004", codigo: "CEDI-BUC-01", nombre: "CEDI Bucaramanga",      ciudad: "Bucaramanga", region: "Santander",      administrador: "Adriana Lucía Sandoval",  telefono: "+57 313 400 4004", direccion: "Cl 56 #21-08",    capacidad: 4800 },
  { id: "DEMO_CED_005", codigo: "CEDI-PER-01", nombre: "CEDI Pereira",          ciudad: "Pereira",     region: "Risaralda",       administrador: "Mauricio Andrés Cano",   telefono: "+57 320 500 5005", direccion: "Av. Circunvalar 28", capacidad: 3900 },
] as const;

// ─── NAVEGACIÓN INTERNA ──────────────────────────────────────────────────────
export const CEDIS_NAV = [
  { href: "/cedis",             label: "Dashboard",          icon: "LayoutDashboard", order: 1 },
  { href: "/cedis/consolidado", label: "Consolidado",        icon: "Table2",          order: 2 },
  { href: "/cedis/reportes",    label: "Reportes",           icon: "FileText",        order: 3 },
  { href: "/cedis/cumplimiento",label: "Cumplimiento",       icon: "CheckSquare",     order: 4 },
  { href: "/cedis/evidencias",  label: "Evidencias",         icon: "Camera",          order: 5 },
  { href: "/cedis/informe",     label: "Informe Ejecutivo",  icon: "Sparkles",        order: 6 },
] as const;
