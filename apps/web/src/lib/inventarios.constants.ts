// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · catálogos parametrizables (valores de dominio, no datos reales)
// ═══════════════════════════════════════════════════════════════════════════════
// Un motor genérico parametrizado por `modulo` sirve a los 6 módulos de la hoja.

export type ModuloInventario =
  | "PRODUCTO" | "TINAS" | "INSUMOS" | "MANTENIMIENTO" | "ACTIVOS" | "OTROS";

export interface ModuloDef {
  key: ModuloInventario;
  label: string;
  href: string;
  prefijo: string;      // prefijo del consecutivo (INV-<prefijo>-AÑO-####)
  descripcion: string;
}

// Los 6 módulos de datos (el 7º ítem de navegación es el Dashboard consolidado).
export const INVENTARIO_MODULOS: ModuloDef[] = [
  { key: "PRODUCTO",      label: "Inventario de Producto",      href: "/inventarios/producto",      prefijo: "PROD", descripcion: "Producto terminado y en proceso." },
  { key: "TINAS",         label: "Inventario de Tinas",         href: "/inventarios/tinas",         prefijo: "TINA", descripcion: "Tinas, canastillas y contenedores." },
  { key: "INSUMOS",       label: "Inventario de Insumos",       href: "/inventarios/insumos",       prefijo: "INS",  descripcion: "Insumos y materiales de operación." },
  { key: "MANTENIMIENTO", label: "Almacén de Mantenimiento",    href: "/inventarios/mantenimiento", prefijo: "MANT", descripcion: "Repuestos y elementos de mantenimiento." },
  { key: "ACTIVOS",       label: "Inventario de Activos Fijos", href: "/inventarios/activos",       prefijo: "ACT",  descripcion: "Activos fijos, equipos y maquinaria." },
  { key: "OTROS",         label: "Otros Inventarios",           href: "/inventarios/otros",         prefijo: "OTRO", descripcion: "Otros inventarios no clasificados." },
];

export const moduloByKey  = (k: string): ModuloDef | undefined => INVENTARIO_MODULOS.find(m => m.key === k);
export const moduloLabel  = (k: string): string => moduloByKey(k)?.label ?? k;
export const esModulo     = (k: string): k is ModuloInventario => !!moduloByKey(k);

// ─── Estado del ítem (ciclo de auditoría del inventario) ─────────────────────
export const ESTADO_INVENTARIO = [
  "Registrado", "En conteo", "Auditado", "Con diferencia", "Conciliado", "Cerrado",
] as const;

export const ESTADO_INVENTARIO_COLOR: Record<string, string> = {
  "Registrado": "#94A3B8", "En conteo": "#3B82F6", "Auditado": "#06B6D4",
  "Con diferencia": "#EF4444", "Conciliado": "#F59E0B", "Cerrado": "#10B981",
};

// ─── Kardex: tipos de movimiento ─────────────────────────────────────────────
export const MOVIMIENTO_TIPOS = ["Entrada", "Salida", "Ajuste", "Conteo"] as const;
export const MOVIMIENTO_COLOR: Record<string, string> = {
  "Entrada": "#10B981", "Salida": "#EF4444", "Ajuste": "#F59E0B", "Conteo": "#06B6D4",
};

// ─── Unidades de medida ──────────────────────────────────────────────────────
export const UNIDADES_MEDIDA = [
  "Unidad", "Kg", "Gramo", "Litro", "Caja", "Bulto", "Metro", "Galón",
  "Rollo", "Par", "Juego", "Paquete", "Canastilla", "Tina",
] as const;

// ─── Evidencias (reutiliza el patrón de la plataforma) ───────────────────────
export const EVIDENCIA_TIPOS = ["Foto", "PDF", "Excel", "Video", "Otro"] as const;
export const EVIDENCIA_CATEGORIAS = [
  "Acta de inventario", "Conteo físico", "Factura", "Remisión",
  "Foto del ítem", "Etiqueta / serial", "Documento", "Otro",
] as const;

// ─── Auditoría (Fase 5): etiquetas legibles de los campos para el diff ─────────
export const INVENTARIO_CAMPO_LABELS: Record<string, string> = {
  nombre: "Nombre", descripcion: "Descripción", categoria: "Categoría",
  ubicacion: "Ubicación", cediId: "CEDI (id)", cediNombre: "CEDI", granjaId: "Granja (id)", granjaNombre: "Granja",
  unidadMedida: "Unidad de medida", cantidad: "Cantidad", saldo: "Saldo", cantidadContada: "Cantidad contada",
  diferencia: "Diferencia", costoUnitario: "Costo unitario", valorTotal: "Valor total",
  estado: "Estado", responsable: "Responsable", auditor: "Auditor", fecha: "Fecha", observaciones: "Observaciones",
};
