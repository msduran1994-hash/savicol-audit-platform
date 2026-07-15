// ════════════════════════════════════════════════════════════════════════════
// Estándar corporativo de EVIDENCIAS FOTOGRÁFICAS para los informes PDF
// (Granjas · Rutas · CEDIS). Único punto de verdad para mantener consistencia.
//
// Criterios:
//  - Proporción original preservada (sin recorte ni deformación).
//  - Tamaño uniforme de auditoría (ni miniatura ni desbordado).
//  - Cuadrícula adaptativa: 1 foto → amplia a 1 columna; 2+ → 2 columnas.
//  - Pie de foto opcional (título del hallazgo + fecha/ubicación/categoría).
//  - Separación visual y page-break seguro por evidencia.
//
// No usa object-fit (compatibilidad con html2canvas y puppeteer): el ajuste se
// logra con max-width/max-height + width/height auto, que preserva la relación
// de aspecto de forma nativa.
// ════════════════════════════════════════════════════════════════════════════

export interface FotoPDF {
  src: string;      // data URL base64 o URL de imagen accesible
  titulo?: string;  // título/categoría del hallazgo
  pie?: string;     // pie de foto: fecha, ubicación o descripción
}

export function evidenciasGridHTML(fotos: FotoPDF[], opts?: { max?: number; maxH?: number; maxHUna?: number }): string {
  const items = fotos.filter(f => f && f.src).slice(0, opts?.max ?? 24);
  if (items.length === 0) return "";

  const una   = items.length === 1;
  const cellW = una ? "100%" : "calc(50% - 7px)";
  const maxH  = una ? (opts?.maxHUna ?? 360) : (opts?.maxH ?? 240);

  const cell = (f: FotoPDF) => `
    <div style="flex:0 0 ${cellW};max-width:${cellW};page-break-inside:avoid;margin-bottom:12px">
      <div style="text-align:center;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;padding:6px">
        <img src="${f.src}" style="max-width:100%;max-height:${maxH}px;width:auto;height:auto;border-radius:4px;display:inline-block;vertical-align:middle"/>
      </div>
      ${(f.titulo || f.pie) ? `<div style="font-size:8.5px;color:#475569;margin-top:5px;line-height:1.4">${f.titulo ? `<strong style="color:#0D1526">${f.titulo}</strong>` : ""}${f.titulo && f.pie ? "<br>" : ""}${f.pie ? `<span style="color:#94a3b8">${f.pie}</span>` : ""}</div>` : ""}
    </div>`;

  return `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:4px">${items.map(cell).join("")}</div>`;
}
