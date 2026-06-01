// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO GRANJAS — Catálogos, enumeraciones y biblioteca de checklist IA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DEMO_MODE FLAG ─────────────────────────────────────────────────────────
// Por defecto FALSE en producción · solo se activan demos si explícitamente
// se setea NEXT_PUBLIC_DEMO_MODE=true (típicamente solo en desarrollo local).
// Esto cumple la regla: "No utilizar datos ficticios en producción".
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ─── ENUMERACIONES ───────────────────────────────────────────────────────────
export const TIPO_GRANJA = ["Arrendada", "Propia", "Integrada"] as const;
export type TipoGranja = typeof TIPO_GRANJA[number];

export const TIPO_OPERATIVO = ["Engorde", "Reproductora"] as const;
export type TipoOperativo = typeof TIPO_OPERATIVO[number];

export const NIVEL_RIESGO = ["Bajo", "Medio", "Alto"] as const;
export type NivelRiesgo = typeof NIVEL_RIESGO[number];

export const ESTADO_SANITARIO = ["Óptimo", "Alerta", "Crítico"] as const;
export type EstadoSanitario = typeof ESTADO_SANITARIO[number];

export const TIPO_AUDITORIA = [
  "Acompañamiento Insumos",
  "Alimentación",
  "Inventario",
  "Sanidad",
  "Mortalidad",
  "General",
] as const;
export type TipoAuditoria = typeof TIPO_AUDITORIA[number];

export const ESTADO_AUDITORIA = [
  "Pendiente",
  "En Proceso",
  "Completada",
  "Aprobada",
  "No Aprobada",
] as const;
export type EstadoAuditoria = typeof ESTADO_AUDITORIA[number];

export const ESTADO_KPI = [
  "No Iniciado",
  "En Curso",
  "En Espera",
  "Completado",
] as const;
export type EstadoKPI = typeof ESTADO_KPI[number];

export const CATEGORIA_HALLAZGO = [
  "Ambiental",
  "Bioseguridad",
  "Sanitario",
  "Financiero",
  "Documental",
  "Mortalidad",
  "Inventario Insumos",
  "Infraestructura",
  "Operativo",
] as const;
export type CategoriaHallazgo = typeof CATEGORIA_HALLAZGO[number];

export const CRITICIDAD = ["Baja", "Media", "Alta", "Crítica"] as const;
export type Criticidad = typeof CRITICIDAD[number];

export const TIPO_RIESGO = [
  "Operativo",
  "Reputacional",
  "Financiero",
  "Legal",
  "Contagio",
] as const;
export type TipoRiesgo = typeof TIPO_RIESGO[number];

// ─── REGIONES Y VEREDAS DE COLOMBIA (catálogo amplio) ────────────────────────
export const REGIONES = [
  "Antioquia",
  "Cundinamarca",
  "Boyacá",
  "Santander",
  "Valle del Cauca",
  "Tolima",
  "Caldas",
  "Risaralda",
  "Quindío",
  "Meta",
] as const;
export type Region = typeof REGIONES[number];

// ─── INVENTARIO ──────────────────────────────────────────────────────────────
export const CATEGORIA_INVENTARIO = [
  "Alimento Concentrado",
  "Insumos Veterinarios",
  "Medicamentos",
  "Equipos",
  "Bioseguridad",
  "Infraestructura",
] as const;
export type CategoriaInventario = typeof CATEGORIA_INVENTARIO[number];

export const ESTADO_INVENTARIO = [
  "Disponible",
  "Stock Bajo",
  "Agotado",
  "Vencido",
  "Por Vencer",
] as const;
export type EstadoInventario = typeof ESTADO_INVENTARIO[number];

// ─── CHECKLIST IA (180 preguntas curadas, 9 categorías × 20) ─────────────────
// Estas preguntas reemplazan la "generación IA" descrita en el prompt maestro.
// Son estáticas, deterministas, basadas en buenas prácticas avícolas.
export interface ChecklistPregunta {
  id: string;
  categoria: CategoriaHallazgo;
  pregunta: string;
  peso: 1 | 2 | 3; // 1=informativa, 2=importante, 3=crítica
}

export const CHECKLIST_PREGUNTAS: ChecklistPregunta[] = [
  // ─── AMBIENTAL (20) ────────────────────────────────────────────────────────
  { id: "AMB-01", categoria: "Ambiental", pregunta: "¿La granja cuenta con licencia ambiental vigente?", peso: 3 },
  { id: "AMB-02", categoria: "Ambiental", pregunta: "¿Existe plan de manejo de residuos sólidos?", peso: 3 },
  { id: "AMB-03", categoria: "Ambiental", pregunta: "¿Los lixiviados son tratados antes de su disposición?", peso: 3 },
  { id: "AMB-04", categoria: "Ambiental", pregunta: "¿Las aguas residuales tienen sistema de tratamiento operativo?", peso: 3 },
  { id: "AMB-05", categoria: "Ambiental", pregunta: "¿Se realiza monitoreo de calidad de aire en galpones?", peso: 2 },
  { id: "AMB-06", categoria: "Ambiental", pregunta: "¿Existe registro de consumo energético mensual?", peso: 1 },
  { id: "AMB-07", categoria: "Ambiental", pregunta: "¿Se aplica gestión de mortalidad ambientalmente adecuada?", peso: 3 },
  { id: "AMB-08", categoria: "Ambiental", pregunta: "¿La pollinaza es manejada según norma técnica?", peso: 3 },
  { id: "AMB-09", categoria: "Ambiental", pregunta: "¿Existe plan de contingencia ambiental documentado?", peso: 2 },
  { id: "AMB-10", categoria: "Ambiental", pregunta: "¿Se realiza monitoreo de ruido y emisiones?", peso: 1 },
  { id: "AMB-11", categoria: "Ambiental", pregunta: "¿La fuente de agua tiene certificación de potabilidad?", peso: 3 },
  { id: "AMB-12", categoria: "Ambiental", pregunta: "¿Los empaques de productos químicos se disponen correctamente?", peso: 2 },
  { id: "AMB-13", categoria: "Ambiental", pregunta: "¿Existe zona de aislamiento sanitario perimetral?", peso: 3 },
  { id: "AMB-14", categoria: "Ambiental", pregunta: "¿Se realiza control de plagas con productos autorizados?", peso: 2 },
  { id: "AMB-15", categoria: "Ambiental", pregunta: "¿Existe registro de capacitaciones ambientales al personal?", peso: 1 },
  { id: "AMB-16", categoria: "Ambiental", pregunta: "¿Se mide consumo de agua mensual por galpón?", peso: 2 },
  { id: "AMB-17", categoria: "Ambiental", pregunta: "¿Se cumple con la distancia mínima a poblaciones?", peso: 3 },
  { id: "AMB-18", categoria: "Ambiental", pregunta: "¿Existe protocolo de barreras vivas y arborización?", peso: 1 },
  { id: "AMB-19", categoria: "Ambiental", pregunta: "¿Se reportan incidentes ambientales a la autoridad?", peso: 3 },
  { id: "AMB-20", categoria: "Ambiental", pregunta: "¿Existe auditoría ambiental externa anual?", peso: 2 },

  // ─── BIOSEGURIDAD (20) ─────────────────────────────────────────────────────
  { id: "BIO-01", categoria: "Bioseguridad", pregunta: "¿Existe control de acceso vehicular con desinfección?", peso: 3 },
  { id: "BIO-02", categoria: "Bioseguridad", pregunta: "¿El personal usa ropa exclusiva dentro de la granja?", peso: 3 },
  { id: "BIO-03", categoria: "Bioseguridad", pregunta: "¿Se aplica vacío sanitario entre lotes?", peso: 3 },
  { id: "BIO-04", categoria: "Bioseguridad", pregunta: "¿Existen pediluvios funcionales en cada galpón?", peso: 3 },
  { id: "BIO-05", categoria: "Bioseguridad", pregunta: "¿Hay control de ingreso de fauna silvestre y roedores?", peso: 3 },
  { id: "BIO-06", categoria: "Bioseguridad", pregunta: "¿Existe protocolo escrito de bioseguridad?", peso: 2 },
  { id: "BIO-07", categoria: "Bioseguridad", pregunta: "¿Se registra el ingreso/salida de visitantes?", peso: 2 },
  { id: "BIO-08", categoria: "Bioseguridad", pregunta: "¿La granja cuenta con cerco perimetral funcional?", peso: 3 },
  { id: "BIO-09", categoria: "Bioseguridad", pregunta: "¿Las duchas de ingreso están operativas?", peso: 3 },
  { id: "BIO-10", categoria: "Bioseguridad", pregunta: "¿Se realiza limpieza y desinfección entre ciclos?", peso: 3 },
  { id: "BIO-11", categoria: "Bioseguridad", pregunta: "¿Se cuenta con certificación de bioseguridad ICA?", peso: 3 },
  { id: "BIO-12", categoria: "Bioseguridad", pregunta: "¿El personal recibe capacitación periódica en bioseguridad?", peso: 2 },
  { id: "BIO-13", categoria: "Bioseguridad", pregunta: "¿Se controla el ingreso de alimentos al galpón?", peso: 2 },
  { id: "BIO-14", categoria: "Bioseguridad", pregunta: "¿Existe protocolo de manejo de aves muertas?", peso: 3 },
  { id: "BIO-15", categoria: "Bioseguridad", pregunta: "¿Hay zonas diferenciadas sucia/limpia?", peso: 3 },
  { id: "BIO-16", categoria: "Bioseguridad", pregunta: "¿Se desinfectan equipos antes de entrar?", peso: 2 },
  { id: "BIO-17", categoria: "Bioseguridad", pregunta: "¿Existen señalizaciones de bioseguridad visibles?", peso: 1 },
  { id: "BIO-18", categoria: "Bioseguridad", pregunta: "¿Se prohíbe el ingreso de otras especies pecuarias?", peso: 3 },
  { id: "BIO-19", categoria: "Bioseguridad", pregunta: "¿Existe registro de movimientos de personal entre granjas?", peso: 2 },
  { id: "BIO-20", categoria: "Bioseguridad", pregunta: "¿Se cumple con cuarentena de 48h antes de visitas?", peso: 3 },

  // ─── SANITARIO (20) ────────────────────────────────────────────────────────
  { id: "SAN-01", categoria: "Sanitario", pregunta: "¿Existe historial vacunal actualizado por lote?", peso: 3 },
  { id: "SAN-02", categoria: "Sanitario", pregunta: "¿Las vacunas se almacenan en cadena de frío?", peso: 3 },
  { id: "SAN-03", categoria: "Sanitario", pregunta: "¿El veterinario visita la granja según frecuencia mínima?", peso: 3 },
  { id: "SAN-04", categoria: "Sanitario", pregunta: "¿Existe registro diario de mortalidad?", peso: 3 },
  { id: "SAN-05", categoria: "Sanitario", pregunta: "¿Se realizan necropsias en casos sospechosos?", peso: 2 },
  { id: "SAN-06", categoria: "Sanitario", pregunta: "¿Las aves muestran condición corporal homogénea?", peso: 2 },
  { id: "SAN-07", categoria: "Sanitario", pregunta: "¿Existe protocolo de uso de antibióticos?", peso: 3 },
  { id: "SAN-08", categoria: "Sanitario", pregunta: "¿Se respetan los tiempos de retiro de medicamentos?", peso: 3 },
  { id: "SAN-09", categoria: "Sanitario", pregunta: "¿Se realiza monitoreo serológico periódico?", peso: 2 },
  { id: "SAN-10", categoria: "Sanitario", pregunta: "¿Existen reportes de enfermedades notificables al ICA?", peso: 3 },
  { id: "SAN-11", categoria: "Sanitario", pregunta: "¿El agua de bebida tiene cloración monitoreada?", peso: 3 },
  { id: "SAN-12", categoria: "Sanitario", pregunta: "¿Se controla temperatura corporal y ambiental?", peso: 2 },
  { id: "SAN-13", categoria: "Sanitario", pregunta: "¿Existe diagnóstico parasitario reciente?", peso: 2 },
  { id: "SAN-14", categoria: "Sanitario", pregunta: "¿Se cumple con esquema vacunal contra Newcastle?", peso: 3 },
  { id: "SAN-15", categoria: "Sanitario", pregunta: "¿Existe esquema preventivo contra coccidiosis?", peso: 2 },
  { id: "SAN-16", categoria: "Sanitario", pregunta: "¿Se realiza pesaje semanal por muestreo?", peso: 1 },
  { id: "SAN-17", categoria: "Sanitario", pregunta: "¿Hay aislamiento de aves enfermas en zona especial?", peso: 3 },
  { id: "SAN-18", categoria: "Sanitario", pregunta: "¿Las cadenas de custodia de medicamentos están firmadas?", peso: 2 },
  { id: "SAN-19", categoria: "Sanitario", pregunta: "¿Existen alertas tempranas por anomalías clínicas?", peso: 2 },
  { id: "SAN-20", categoria: "Sanitario", pregunta: "¿El programa sanitario está aprobado por médico veterinario?", peso: 3 },

  // ─── FINANCIERO (20) ───────────────────────────────────────────────────────
  { id: "FIN-01", categoria: "Financiero", pregunta: "¿Existen estados financieros mensuales por granja?", peso: 3 },
  { id: "FIN-02", categoria: "Financiero", pregunta: "¿Se calcula costo unitario por kilo producido?", peso: 3 },
  { id: "FIN-03", categoria: "Financiero", pregunta: "¿La conversión alimenticia está dentro del rango objetivo?", peso: 3 },
  { id: "FIN-04", categoria: "Financiero", pregunta: "¿Existe presupuesto operativo aprobado?", peso: 2 },
  { id: "FIN-05", categoria: "Financiero", pregunta: "¿Las facturas de insumos están al día?", peso: 2 },
  { id: "FIN-06", categoria: "Financiero", pregunta: "¿Se reconcilia inventario contable vs físico mensual?", peso: 3 },
  { id: "FIN-07", categoria: "Financiero", pregunta: "¿Existe control de gastos imprevistos?", peso: 2 },
  { id: "FIN-08", categoria: "Financiero", pregunta: "¿Los servicios públicos están al día?", peso: 2 },
  { id: "FIN-09", categoria: "Financiero", pregunta: "¿El personal está al día con seguridad social?", peso: 3 },
  { id: "FIN-10", categoria: "Financiero", pregunta: "¿Se calcula EBITDA por lote producido?", peso: 2 },
  { id: "FIN-11", categoria: "Financiero", pregunta: "¿Existe seguro vigente sobre infraestructura?", peso: 2 },
  { id: "FIN-12", categoria: "Financiero", pregunta: "¿Se controla rotación de inventario de insumos?", peso: 2 },
  { id: "FIN-13", categoria: "Financiero", pregunta: "¿La granja cumple el contrato de integración?", peso: 3 },
  { id: "FIN-14", categoria: "Financiero", pregunta: "¿Existe reserva financiera para emergencias?", peso: 1 },
  { id: "FIN-15", categoria: "Financiero", pregunta: "¿Se reportan desviaciones presupuestarias mayores al 10%?", peso: 2 },
  { id: "FIN-16", categoria: "Financiero", pregunta: "¿Se documenta el costo de mortalidad?", peso: 2 },
  { id: "FIN-17", categoria: "Financiero", pregunta: "¿Hay control de subsidios o créditos vigentes?", peso: 1 },
  { id: "FIN-18", categoria: "Financiero", pregunta: "¿Existen indicadores ROI por ciclo productivo?", peso: 2 },
  { id: "FIN-19", categoria: "Financiero", pregunta: "¿Se factura puntualmente a la integradora?", peso: 3 },
  { id: "FIN-20", categoria: "Financiero", pregunta: "¿Existe auditoría contable externa anual?", peso: 2 },

  // ─── DOCUMENTAL (20) ───────────────────────────────────────────────────────
  { id: "DOC-01", categoria: "Documental", pregunta: "¿La granja tiene registro ICA vigente?", peso: 3 },
  { id: "DOC-02", categoria: "Documental", pregunta: "¿Los contratos del personal están firmados y archivados?", peso: 3 },
  { id: "DOC-03", categoria: "Documental", pregunta: "¿Existe manual de procedimientos operativos?", peso: 2 },
  { id: "DOC-04", categoria: "Documental", pregunta: "¿Los registros de mortalidad están completos?", peso: 3 },
  { id: "DOC-05", categoria: "Documental", pregunta: "¿Las guías sanitarias de movilización están archivadas?", peso: 3 },
  { id: "DOC-06", categoria: "Documental", pregunta: "¿Existen actas de visitas técnicas firmadas?", peso: 2 },
  { id: "DOC-07", categoria: "Documental", pregunta: "¿Los planes de capacitación están documentados?", peso: 1 },
  { id: "DOC-08", categoria: "Documental", pregunta: "¿La hoja de vida de equipos críticos está actualizada?", peso: 2 },
  { id: "DOC-09", categoria: "Documental", pregunta: "¿Las fichas técnicas de productos químicos están disponibles?", peso: 2 },
  { id: "DOC-10", categoria: "Documental", pregunta: "¿Existe registro de calibración de equipos de medición?", peso: 2 },
  { id: "DOC-11", categoria: "Documental", pregunta: "¿Los permisos municipales están vigentes?", peso: 3 },
  { id: "DOC-12", categoria: "Documental", pregunta: "¿Hay archivo de informes mensuales operativos?", peso: 2 },
  { id: "DOC-13", categoria: "Documental", pregunta: "¿La política de bioseguridad está firmada?", peso: 2 },
  { id: "DOC-14", categoria: "Documental", pregunta: "¿Las cartas de no objeción de vecinos están vigentes?", peso: 1 },
  { id: "DOC-15", categoria: "Documental", pregunta: "¿Los reportes de auditoría previa están archivados?", peso: 2 },
  { id: "DOC-16", categoria: "Documental", pregunta: "¿Existe protocolo de retención y disposición documental?", peso: 1 },
  { id: "DOC-17", categoria: "Documental", pregunta: "¿Los registros se digitalizan periódicamente?", peso: 1 },
  { id: "DOC-18", categoria: "Documental", pregunta: "¿Se firma cadena de custodia de muestras?", peso: 3 },
  { id: "DOC-19", categoria: "Documental", pregunta: "¿Las actas de comité de bioseguridad existen?", peso: 2 },
  { id: "DOC-20", categoria: "Documental", pregunta: "¿La normatividad aplicable está disponible al personal?", peso: 2 },

  // ─── MORTALIDAD (20) ───────────────────────────────────────────────────────
  { id: "MOR-01", categoria: "Mortalidad", pregunta: "¿La mortalidad diaria está dentro del rango aceptable?", peso: 3 },
  { id: "MOR-02", categoria: "Mortalidad", pregunta: "¿Se identifica causa probable de mortalidad?", peso: 2 },
  { id: "MOR-03", categoria: "Mortalidad", pregunta: "¿Las aves muertas se retiran al menos 2 veces/día?", peso: 3 },
  { id: "MOR-04", categoria: "Mortalidad", pregunta: "¿Existe fosa, composta o incinerador funcionando?", peso: 3 },
  { id: "MOR-05", categoria: "Mortalidad", pregunta: "¿Se notifica pico anómalo de mortalidad inmediatamente?", peso: 3 },
  { id: "MOR-06", categoria: "Mortalidad", pregunta: "¿Existen reportes históricos por lote?", peso: 2 },
  { id: "MOR-07", categoria: "Mortalidad", pregunta: "¿El porcentaje de descarte está documentado?", peso: 2 },
  { id: "MOR-08", categoria: "Mortalidad", pregunta: "¿La mortalidad semanal se compara con benchmarks?", peso: 2 },
  { id: "MOR-09", categoria: "Mortalidad", pregunta: "¿El personal está capacitado para identificar enfermedades?", peso: 2 },
  { id: "MOR-10", categoria: "Mortalidad", pregunta: "¿Se realizan necropsias por veterinario en sospechas?", peso: 3 },
  { id: "MOR-11", categoria: "Mortalidad", pregunta: "¿Existen acciones correctivas documentadas?", peso: 2 },
  { id: "MOR-12", categoria: "Mortalidad", pregunta: "¿La fosa está alejada de fuentes de agua?", peso: 3 },
  { id: "MOR-13", categoria: "Mortalidad", pregunta: "¿Se cubre adecuadamente la disposición de muertas?", peso: 3 },
  { id: "MOR-14", categoria: "Mortalidad", pregunta: "¿Existe inspector encargado del registro diario?", peso: 2 },
  { id: "MOR-15", categoria: "Mortalidad", pregunta: "¿La tasa de mortalidad acumulada por lote es < 5%?", peso: 3 },
  { id: "MOR-16", categoria: "Mortalidad", pregunta: "¿Se segrega mortalidad sospechosa de enfermedad?", peso: 3 },
  { id: "MOR-17", categoria: "Mortalidad", pregunta: "¿Existe protocolo de actuación ante mortalidad masiva?", peso: 3 },
  { id: "MOR-18", categoria: "Mortalidad", pregunta: "¿La cifra concuerda con el reporte oficial?", peso: 2 },
  { id: "MOR-19", categoria: "Mortalidad", pregunta: "¿Se evita el descarte de aves sin diagnóstico?", peso: 2 },
  { id: "MOR-20", categoria: "Mortalidad", pregunta: "¿Existe revisión mensual de tendencias?", peso: 1 },

  // ─── INVENTARIO INSUMOS (20) ───────────────────────────────────────────────
  { id: "INV-01", categoria: "Inventario Insumos", pregunta: "¿El inventario físico coincide con el sistema?", peso: 3 },
  { id: "INV-02", categoria: "Inventario Insumos", pregunta: "¿Existe rotación FIFO de alimento concentrado?", peso: 3 },
  { id: "INV-03", categoria: "Inventario Insumos", pregunta: "¿Los medicamentos están en lugar refrigerado?", peso: 3 },
  { id: "INV-04", categoria: "Inventario Insumos", pregunta: "¿El stock de vacunas no está vencido?", peso: 3 },
  { id: "INV-05", categoria: "Inventario Insumos", pregunta: "¿Existe Kardex actualizado de insumos?", peso: 2 },
  { id: "INV-06", categoria: "Inventario Insumos", pregunta: "¿Se controlan ingresos y salidas con firma?", peso: 2 },
  { id: "INV-07", categoria: "Inventario Insumos", pregunta: "¿El consumo de alimento se compara con teórico?", peso: 3 },
  { id: "INV-08", categoria: "Inventario Insumos", pregunta: "¿Las desviaciones de consumo se reportan?", peso: 3 },
  { id: "INV-09", categoria: "Inventario Insumos", pregunta: "¿Existe responsable único de bodega?", peso: 2 },
  { id: "INV-10", categoria: "Inventario Insumos", pregunta: "¿Se realiza inventario físico mensual?", peso: 3 },
  { id: "INV-11", categoria: "Inventario Insumos", pregunta: "¿La bodega cuenta con control de humedad?", peso: 2 },
  { id: "INV-12", categoria: "Inventario Insumos", pregunta: "¿Hay protocolo de manejo de productos vencidos?", peso: 3 },
  { id: "INV-13", categoria: "Inventario Insumos", pregunta: "¿Los equipos de medición están calibrados?", peso: 2 },
  { id: "INV-14", categoria: "Inventario Insumos", pregunta: "¿Existe seguro de inventario crítico?", peso: 1 },
  { id: "INV-15", categoria: "Inventario Insumos", pregunta: "¿La merma se reporta y documenta?", peso: 2 },
  { id: "INV-16", categoria: "Inventario Insumos", pregunta: "¿Las órdenes de compra están autorizadas?", peso: 2 },
  { id: "INV-17", categoria: "Inventario Insumos", pregunta: "¿Hay segregación de funciones (recibo/registro/uso)?", peso: 3 },
  { id: "INV-18", categoria: "Inventario Insumos", pregunta: "¿Existen alertas de stock mínimo?", peso: 2 },
  { id: "INV-19", categoria: "Inventario Insumos", pregunta: "¿Los proveedores están certificados?", peso: 2 },
  { id: "INV-20", categoria: "Inventario Insumos", pregunta: "¿Las diferencias de inventario se justifican por escrito?", peso: 3 },

  // ─── INFRAESTRUCTURA (20) ──────────────────────────────────────────────────
  { id: "INF-01", categoria: "Infraestructura", pregunta: "¿Los galpones están en buen estado estructural?", peso: 3 },
  { id: "INF-02", categoria: "Infraestructura", pregunta: "¿Las cortinas / ventilación funcionan correctamente?", peso: 3 },
  { id: "INF-03", categoria: "Infraestructura", pregunta: "¿Existe sistema eléctrico con respaldo (planta)?", peso: 3 },
  { id: "INF-04", categoria: "Infraestructura", pregunta: "¿Los comederos están en cantidad y estado adecuados?", peso: 2 },
  { id: "INF-05", categoria: "Infraestructura", pregunta: "¿Los bebederos garantizan agua limpia y suficiente?", peso: 3 },
  { id: "INF-06", categoria: "Infraestructura", pregunta: "¿Existe sistema de calefacción operativo?", peso: 2 },
  { id: "INF-07", categoria: "Infraestructura", pregunta: "¿Los pisos están en condiciones higiénicas?", peso: 2 },
  { id: "INF-08", categoria: "Infraestructura", pregunta: "¿Las cubiertas son impermeables y sin filtraciones?", peso: 3 },
  { id: "INF-09", categoria: "Infraestructura", pregunta: "¿La densidad de aves cumple la norma técnica?", peso: 3 },
  { id: "INF-10", categoria: "Infraestructura", pregunta: "¿Existe sistema de iluminación adecuado?", peso: 2 },
  { id: "INF-11", categoria: "Infraestructura", pregunta: "¿Hay bodega exclusiva para alimento?", peso: 3 },
  { id: "INF-12", categoria: "Infraestructura", pregunta: "¿Hay bodega exclusiva para medicamentos?", peso: 3 },
  { id: "INF-13", categoria: "Infraestructura", pregunta: "¿Las vías de acceso son transitables todo el año?", peso: 2 },
  { id: "INF-14", categoria: "Infraestructura", pregunta: "¿El sistema de drenaje funciona correctamente?", peso: 2 },
  { id: "INF-15", categoria: "Infraestructura", pregunta: "¿Existe oficina administrativa equipada?", peso: 1 },
  { id: "INF-16", categoria: "Infraestructura", pregunta: "¿Las baterías sanitarias están operativas?", peso: 2 },
  { id: "INF-17", categoria: "Infraestructura", pregunta: "¿Hay extintores vigentes y señalización?", peso: 3 },
  { id: "INF-18", categoria: "Infraestructura", pregunta: "¿Existen tanques de agua con capacidad suficiente?", peso: 3 },
  { id: "INF-19", categoria: "Infraestructura", pregunta: "¿Los silos de alimento están sellados?", peso: 2 },
  { id: "INF-20", categoria: "Infraestructura", pregunta: "¿Hay mantenimiento preventivo documentado?", peso: 2 },

  // ─── OPERATIVO (20) ────────────────────────────────────────────────────────
  { id: "OPE-01", categoria: "Operativo", pregunta: "¿Existe cronograma operativo semanal cumplido?", peso: 2 },
  { id: "OPE-02", categoria: "Operativo", pregunta: "¿El personal tiene asignación de roles documentada?", peso: 2 },
  { id: "OPE-03", categoria: "Operativo", pregunta: "¿Se cumplen horarios de alimentación?", peso: 3 },
  { id: "OPE-04", categoria: "Operativo", pregunta: "¿Existen turnos nocturnos de vigilancia operativa?", peso: 2 },
  { id: "OPE-05", categoria: "Operativo", pregunta: "¿Las tareas críticas tienen check-list diario?", peso: 2 },
  { id: "OPE-06", categoria: "Operativo", pregunta: "¿Existen procedimientos de emergencia visibles?", peso: 3 },
  { id: "OPE-07", categoria: "Operativo", pregunta: "¿Las recepciones de alimento se pesan y registran?", peso: 3 },
  { id: "OPE-08", categoria: "Operativo", pregunta: "¿Las salidas de aves se realizan según calendario?", peso: 2 },
  { id: "OPE-09", categoria: "Operativo", pregunta: "¿Se cumple el protocolo de transporte de aves?", peso: 3 },
  { id: "OPE-10", categoria: "Operativo", pregunta: "¿Los reportes diarios llegan a la integradora?", peso: 3 },
  { id: "OPE-11", categoria: "Operativo", pregunta: "¿El personal cumple el horario laboral?", peso: 1 },
  { id: "OPE-12", categoria: "Operativo", pregunta: "¿Hay supervisión técnica al menos quincenal?", peso: 3 },
  { id: "OPE-13", categoria: "Operativo", pregunta: "¿Las anomalías operativas se escalan oportunamente?", peso: 2 },
  { id: "OPE-14", categoria: "Operativo", pregunta: "¿La rotación de personal está controlada?", peso: 1 },
  { id: "OPE-15", categoria: "Operativo", pregunta: "¿Existe inducción a personal nuevo?", peso: 2 },
  { id: "OPE-16", categoria: "Operativo", pregunta: "¿Los KPI operativos se miden semanalmente?", peso: 2 },
  { id: "OPE-17", categoria: "Operativo", pregunta: "¿Las decisiones críticas tienen aprobación documentada?", peso: 2 },
  { id: "OPE-18", categoria: "Operativo", pregunta: "¿Las metas de producción se comunican al personal?", peso: 1 },
  { id: "OPE-19", categoria: "Operativo", pregunta: "¿Se realizan reuniones operativas periódicas?", peso: 1 },
  { id: "OPE-20", categoria: "Operativo", pregunta: "¿Las acciones correctivas se cierran dentro del plazo?", peso: 3 },
];

// ─── TÉCNICOS VETERINARIOS DEMO (DEMO_MODE) ──────────────────────────────────
type VeterinarioDemo = { id: string; name: string; color: string; _demo: boolean };
const _VETERINARIOS_DEMO_DATA: ReadonlyArray<VeterinarioDemo> = [
  { id: "VET-01", name: "Dra. María Fernanda López",   color: "#10B981", _demo: true },
  { id: "VET-02", name: "Dr. Carlos Andrés Restrepo",   color: "#3B82F6", _demo: true },
  { id: "VET-03", name: "Dra. Ana Lucía Cárdenas",      color: "#8B5CF6", _demo: true },
  { id: "VET-04", name: "Dr. Juan Pablo Mendoza",       color: "#F59E0B", _demo: true },
];
export const VETERINARIOS_DEMO: ReadonlyArray<VeterinarioDemo> = !DEMO_MODE ? [] : _VETERINARIOS_DEMO_DATA;

// ─── NAVEGACIÓN INTERNA DEL MÓDULO ───────────────────────────────────────────
export const GRANJAS_NAV = [
  { href: "/granjas",             label: "Dashboard",          icon: "LayoutDashboard", order: 1 },
  { href: "/granjas/registro",    label: "Granjas",            icon: "Tractor",         order: 2 },
  { href: "/granjas/auditorias",  label: "Auditorías",         icon: "ClipboardCheck",  order: 3 },
  { href: "/granjas/hallazgos",   label: "Hallazgos",          icon: "AlertTriangle",   order: 4 },
  { href: "/granjas/kpi",         label: "Cumplimiento KPI",   icon: "Target",          order: 5 },
  { href: "/granjas/ranking",     label: "Ranking",            icon: "Trophy",          order: 6 },
  { href: "/granjas/inventario",  label: "Inventario",         icon: "Package",         order: 7 },
  { href: "/granjas/reportes",    label: "Reportes",           icon: "FileText",        order: 8 },
  { href: "/granjas/actividad",   label: "Actividad",          icon: "Activity",        order: 9 },
  { href: "/granjas/documentos",  label: "Documentos",         icon: "Files",          order: 10 },
] as const;
