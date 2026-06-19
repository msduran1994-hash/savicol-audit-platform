// ═══════════════════════════════════════════════════════════════════════════════
// Utilidad · Pertenencia de documentos por hoja/módulo
// Cada documento de gestión documental pertenece a una sola hoja (Granjas,
// Auditoría, Rutas, CEDIS). Como el backend guarda todo en una tabla /documentos
// sin campo de módulo, la pertenencia se marca con [HOJA=xxx] en el nombre.
// Los marcadores funcionales (formatos, checklists, fotos, lotes, actividades de
// auditor) NO son documentos de gestión y se excluyen de TODAS las hojas.
// ═══════════════════════════════════════════════════════════════════════════════

export type Hoja = "granjas" | "auditoria" | "rutas" | "cedis";

// Marcadores funcionales de otros módulos: nunca son "documentos de gestión".
// Se excluyen de todos los módulos de Documentos.
const MARCADORES_FUNCIONALES = [
  "[FA]",          // formatos de auditoría
  "[CHK-ENC]",     // checklist encacetamiento
  "[CHK-TRZ7]",    // checklist trazabilidad 7 días
  "[FOTO-LOTE]",   // fotos de lote
  "[LOTE-TRZ]",    // lotes de trazabilidad
  "[AUDITOR-ACT]", // actividades de auditor (obsoleto)
];

// Etiqueta de hoja embebida en el nombre del documento
export function etiquetaHoja(hoja: Hoja): string {
  return `[HOJA=${hoja}]`;
}

// ¿El documento es un artefacto funcional de otro módulo (no de gestión)?
export function esFuncional(nombre: string): boolean {
  const n = nombre ?? "";
  return MARCADORES_FUNCIONALES.some(m => n.includes(m));
}

// Lee la hoja a la que pertenece un documento.
// - Si tiene [HOJA=xxx] → esa hoja
// - Si NO tiene etiqueta y NO es funcional → "granjas" (compatibilidad: los
//   documentos antiguos viven en Granjas, que es donde se cargaron)
// - Si es funcional → null (no pertenece a ningún módulo de gestión)
export function hojaDeDocumento(nombre: string): Hoja | null {
  const n = nombre ?? "";
  if (esFuncional(n)) return null;
  const m = n.match(/\[HOJA=(granjas|auditoria|rutas|cedis)\]/);
  if (m) return m[1] as Hoja;
  return "granjas"; // sin etiqueta → Granjas por defecto
}

// Filtra una lista de documentos para una hoja específica.
export function documentosDeHoja<T extends { nombre: string }>(docs: T[], hoja: Hoja): T[] {
  return docs.filter(d => hojaDeDocumento(d.nombre) === hoja);
}

// Quita la etiqueta [HOJA=xxx] del nombre para mostrarlo limpio en la UI.
export function nombreLimpio(nombre: string): string {
  return (nombre ?? "").replace(/\s*\[HOJA=(granjas|auditoria|rutas|cedis)\]\s*/g, " ").trim();
}

// Añade (o reemplaza) la etiqueta de hoja en el nombre al guardar un documento.
export function conEtiquetaHoja(nombre: string, hoja: Hoja): string {
  const limpio = nombreLimpio(nombre);
  return `${limpio} ${etiquetaHoja(hoja)}`;
}
