// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO ACOMPAÑAMIENTO A RUTAS — Catálogos y enumeraciones
// ═══════════════════════════════════════════════════════════════════════════════

// ─── MOTIVOS DE DEVOLUCIÓN ───────────────────────────────────────────────────
export const MOTIVOS_DEVOLUCION = [
  "Producto Vencido",
  "Empaque Dañado",
  "Cadena de Frío Rota",
  "Producto No Solicitado",
  "Diferencia de Peso",
  "Calidad No Conforme",
  "Cantidad Equivocada",
  "Entrega Tardía",
  "Cliente Ausente",
  "Otro",
] as const;
export type MotivoDevolucion = typeof MOTIVOS_DEVOLUCION[number];

// ─── ESTADO DEL ACOMPAÑAMIENTO ───────────────────────────────────────────────
export const ESTADO_ACOMPANAMIENTO = [
  "Programado",
  "En Curso",
  "Completado",
  "Con Hallazgos",
  "Cerrado",
] as const;
export type EstadoAcompanamiento = typeof ESTADO_ACOMPANAMIENTO[number];

// ─── CRITICIDAD OPERACIONAL ──────────────────────────────────────────────────
export const CRITICIDAD_OPERACIONAL = ["Crítico", "Alto", "Medio", "Bajo"] as const;
export type CriticidadOperacional = typeof CRITICIDAD_OPERACIONAL[number];

// ─── TIPOS DE RIESGO (reutiliza del módulo Granjas) ──────────────────────────
export const TIPO_RIESGO_RUTA = [
  "Legal",
  "Operativo",
  "Reputacional",
  "Financiero",
  "Contagio",
] as const;
export type TipoRiesgoRuta = typeof TIPO_RIESGO_RUTA[number];

// ─── ESTADO CUMPLIMIENTO ─────────────────────────────────────────────────────
export const ESTADO_CUMPLIMIENTO = [
  "Pendiente",
  "En Proceso",
  "Verificación",
  "Cerrado",
  "Cerrado con Reincidencia",
] as const;
export type EstadoCumplimiento = typeof ESTADO_CUMPLIMIENTO[number];

// ─── RUTAS DEMO ──────────────────────────────────────────────────────────────
export const RUTAS_DEMO = [
  { id: "RT-001", codigo: "MED-NORTE-01", nombre: "Medellín Norte",     ciudad: "Medellín",   region: "Antioquia" },
  { id: "RT-002", codigo: "MED-SUR-01",   nombre: "Medellín Sur",       ciudad: "Medellín",   region: "Antioquia" },
  { id: "RT-003", codigo: "BOG-NORTE-01", nombre: "Bogotá Norte",       ciudad: "Bogotá",     region: "Cundinamarca" },
  { id: "RT-004", codigo: "BOG-OCCID-01", nombre: "Bogotá Occidente",   ciudad: "Bogotá",     region: "Cundinamarca" },
  { id: "RT-005", codigo: "BUC-SAB-01",   nombre: "Bucaramanga Sabana", ciudad: "Bucaramanga",region: "Santander" },
  { id: "RT-006", codigo: "CAL-CENT-01",  nombre: "Cali Centro",        ciudad: "Cali",       region: "Valle del Cauca" },
  { id: "RT-007", codigo: "PER-EJE-01",   nombre: "Pereira Eje",        ciudad: "Pereira",    region: "Risaralda" },
  { id: "RT-008", codigo: "IBA-MET-01",   nombre: "Ibagué Metropolitana",ciudad: "Ibagué",    region: "Tolima" },
] as const;

// ─── VEHÍCULOS DEMO ──────────────────────────────────────────────────────────
export const VEHICULOS_DEMO = [
  { id: "VH-001", placa: "ABC-123", tipo: "Camión Refrigerado",  capacidadKg: 3500, color: "#3B82F6" },
  { id: "VH-002", placa: "DEF-456", tipo: "Camión Furgón",       capacidadKg: 2800, color: "#10B981" },
  { id: "VH-003", placa: "GHI-789", tipo: "Camioneta Doble Cabina",capacidadKg: 1500, color: "#F59E0B" },
  { id: "VH-004", placa: "JKL-012", tipo: "Camión Refrigerado",  capacidadKg: 4200, color: "#8B5CF6" },
  { id: "VH-005", placa: "MNO-345", tipo: "Camión Furgón",       capacidadKg: 3000, color: "#EF4444" },
  { id: "VH-006", placa: "PQR-678", tipo: "Camioneta Doble Cabina",capacidadKg: 1200, color: "#06B6D4" },
] as const;

// ─── CONDUCTORES DEMO ────────────────────────────────────────────────────────
export const CONDUCTORES_DEMO = [
  { id: "CN-001", nombre: "Pedro Antonio Ramírez", documento: "CC 71.234.567", licencia: "C2" },
  { id: "CN-002", nombre: "Luis Eduardo Castaño",  documento: "CC 80.345.678", licencia: "C2" },
  { id: "CN-003", nombre: "José Manuel Salazar",   documento: "CC 71.456.789", licencia: "C3" },
  { id: "CN-004", nombre: "Andrés Felipe Ortiz",   documento: "CC 80.567.890", licencia: "C2" },
  { id: "CN-005", nombre: "Carlos Mario Henao",    documento: "CC 71.678.901", licencia: "C3" },
] as const;

// ─── AUXILIARES DEMO ─────────────────────────────────────────────────────────
export const AUXILIARES_DEMO = [
  { id: "AX-001", nombre: "Wilson David Pérez",    documento: "CC 1.001.234" },
  { id: "AX-002", nombre: "Brayan Esteban Gómez",  documento: "CC 1.002.345" },
  { id: "AX-003", nombre: "Daniel Felipe Morales", documento: "CC 1.003.456" },
  { id: "AX-004", nombre: "Sebastián Cardona",     documento: "CC 1.004.567" },
] as const;

// ─── CLIENTES DEMO ───────────────────────────────────────────────────────────
export const CLIENTES_DEMO = [
  { id: "CL-001", nombre: "Supermercados La Vaquita", tipo: "Supermercado",   ciudad: "Medellín" },
  { id: "CL-002", nombre: "Distribuidora El Trébol",   tipo: "Distribuidor",   ciudad: "Bogotá" },
  { id: "CL-003", nombre: "Carnes Premium S.A.S",      tipo: "Comercializador",ciudad: "Cali" },
  { id: "CL-004", nombre: "Mercado Central Bogotá",    tipo: "Mercado",        ciudad: "Bogotá" },
  { id: "CL-005", nombre: "Restaurante La Brasa",      tipo: "Restaurante",    ciudad: "Medellín" },
  { id: "CL-006", nombre: "Tiendas D1 Norte",          tipo: "Cadena",         ciudad: "Bucaramanga" },
  { id: "CL-007", nombre: "Hoteles Estelar",           tipo: "Hotelería",      ciudad: "Cartagena" },
  { id: "CL-008", nombre: "Distribuidora El Pollo Feliz",tipo: "Distribuidor",ciudad: "Pereira" },
] as const;

// ─── NAVEGACIÓN INTERNA DEL MÓDULO ───────────────────────────────────────────
export const RUTAS_NAV = [
  { href: "/rutas",               label: "Dashboard",        icon: "LayoutDashboard", order: 1 },
  { href: "/rutas/consolidado",   label: "Consolidado",      icon: "Table2",          order: 2 },
  { href: "/rutas/reportes",      label: "Reportes",         icon: "FileText",        order: 3 },
  { href: "/rutas/cumplimiento",  label: "Cumplimiento",     icon: "CheckSquare",     order: 4 },
  { href: "/rutas/evidencias",    label: "Evidencias",       icon: "Camera",          order: 5 },
  { href: "/rutas/informe",       label: "Informe Ejecutivo",icon: "Sparkles",        order: 6 },
] as const;

// ─── HELPER DE FORMATO COP ───────────────────────────────────────────────────
export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} kg`;
}
