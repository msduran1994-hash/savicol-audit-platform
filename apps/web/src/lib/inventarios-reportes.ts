// ═══════════════════════════════════════════════════════════════════════════════
// HOJA INVENTARIOS · Fase 8 — reportes (Excel multi-hoja + PDF ejecutivo/técnico)
// Generación en el frontend, sin backend nuevo. Mismo patrón que descartes-reportes:
// XLSX vía SheetJS (CDN), PDF vía jsPDF + html2canvas (canvas→A4), membrete
// corporativo (LOGO_SAVICOL + NIT). Opera sobre el conjunto ya filtrado (Fase 7).
// ═══════════════════════════════════════════════════════════════════════════════
import type { InventarioAuditado } from "@/lib/inventarios.types";
import { INVENTARIO_MODULOS, ESTADO_INVENTARIO_COLOR } from "@/lib/inventarios.constants";
import type { InventariosFiltros } from "@/store/inventarios-filtros.store";
import { LOGO_SAVICOL } from "@/app/(dashboard)/cedis/cumplimiento/savicol-logo";

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-4", area: "Control Interno y Auditoría · Inventarios" };
const AUDITADO = ["Auditado", "Conciliado", "Cerrado"];
const PENDIENTE = ["Registrado", "En conteo"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const esc = (v: any): string => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hoyISO = () => new Date().toISOString().slice(0, 10);
const hoyLargo = () => new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
const fFecha = (iso?: string | null): string => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const nfmt = (n: number, dec = 0) => (n ?? 0).toLocaleString("es-CO", { maximumFractionDigits: dec });
const moduloCorto = (k: string) => (INVENTARIO_MODULOS.find(m => m.key === k)?.label ?? k).replace(/^Inventario de |^Almacén de /, "");
const slug = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "inventario";

function descargarBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

// ─── Columnas planas (hoja "Registros" del Excel) ─────────────────────────────
const COLS: [string, (r: InventarioAuditado) => string | number][] = [
  ["Consecutivo", r => r.consecutivo ?? ""],
  ["Módulo", r => moduloCorto(r.modulo)],
  ["Nombre", r => r.nombre ?? ""],
  ["Descripción", r => r.descripcion ?? ""],
  ["Categoría", r => r.categoria ?? ""],
  ["Ubicación", r => r.ubicacion ?? ""],
  ["CEDI", r => r.cediNombre ?? ""],
  ["Granja", r => r.granjaNombre ?? ""],
  ["Unidad", r => r.unidadMedida ?? ""],
  ["Cantidad", r => r.cantidad ?? ""],
  ["Saldo", r => r.saldo ?? ""],
  ["Cantidad contada", r => r.cantidadContada ?? ""],
  ["Diferencia", r => r.diferencia ?? ""],
  ["Costo unitario", r => r.costoUnitario ?? ""],
  ["Valor total", r => r.valorTotal ?? ""],
  ["Estado", r => r.estado ?? ""],
  ["Responsable", r => r.responsable ?? ""],
  ["Auditor", r => r.auditor ?? ""],
  ["Fecha", r => fFecha(r.fecha)],
  ["Observaciones", r => r.observaciones ?? ""],
];

// ─── Agregados (KPIs + distribuciones) ────────────────────────────────────────
function agregados(rows: InventarioAuditado[]) {
  const total = rows.length;
  const valorTotal = rows.reduce((s, r) => s + (r.valorTotal || 0), 0);
  const auditados = rows.filter(r => AUDITADO.includes(r.estado)).length;
  const pendientes = rows.filter(r => PENDIENTE.includes(r.estado)).length;
  const finalizados = rows.filter(r => r.estado === "Cerrado").length;
  const conDif = rows.filter(r => r.diferencia != null && r.diferencia !== 0).length;
  const cumplimiento = total ? Math.round(auditados / total * 100) : 0;
  const valorRiesgo = rows.filter(r => r.diferencia != null && r.diferencia !== 0).reduce((s, r) => s + Math.abs(r.diferencia || 0) * (r.costoUnitario || 0), 0);
  const countBy = (g: (r: InventarioAuditado) => string) => {
    const m = new Map<string, number>();
    rows.forEach(r => { const k = (g(r) || "").trim(); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  return {
    total, valorTotal, auditados, pendientes, finalizados, conDif, cumplimiento, valorRiesgo,
    porModulo: countBy(r => moduloCorto(r.modulo)), porEstado: countBy(r => r.estado), porCategoria: countBy(r => r.categoria || ""),
  };
}

// Descripción legible de los filtros activos (para el encabezado de los reportes).
export function describirFiltrosInventario(f: InventariosFiltros, cedis: any[] = [], granjas: any[] = []): string[] {
  const out: string[] = [];
  const push = (l: string, v: string) => { if (v) out.push(`${l}: ${v}`); };
  if (f.modulo) push("Tipo", moduloCorto(f.modulo));
  push("Estado", f.estado); push("Categoría", f.categoria);
  push("Auditor", f.auditor); push("Responsable", f.responsable);
  const cedi = cedis.find(c => c.id === f.cediId); if (f.cediId) out.push(`CEDI: ${cedi?.nombre ?? f.cediId}`);
  const granja = granjas.find(g => g.id === f.granjaId); if (f.granjaId) out.push(`Granja: ${granja?.nombre ?? f.granjaId}`);
  if (f.fechaDesde) out.push(`Desde ${f.fechaDesde}`);
  if (f.fechaHasta) out.push(`Hasta ${f.fechaHasta}`);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1) Excel multi-hoja — Registros + Resumen + Diferencias
// ═══════════════════════════════════════════════════════════════════════════════
async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve(); s.onerror = () => reject(new Error("No se pudo cargar SheetJS"));
    document.head.appendChild(s);
  });
  return (window as any).XLSX;
}

export async function exportarInventarioXLSX(rows: InventarioAuditado[], scope = "Inventarios") {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  const registros = rows.map(r => { const o: Record<string, any> = {}; COLS.forEach(c => { o[c[0]] = c[1](r); }); return o; });
  const wsReg = XLSX.utils.json_to_sheet(registros.length ? registros : [Object.fromEntries(COLS.map(c => [c[0], ""]))]);
  XLSX.utils.book_append_sheet(wb, wsReg, "Registros");

  const a = agregados(rows);
  const resumen: any[][] = [
    [EMPRESA.nombre, `NIT ${EMPRESA.nit}`],
    ["Reporte de Inventarios", scope],
    ["Generado", hoyLargo()],
    [],
    ["INDICADORES"],
    ["Total de ítems", a.total],
    ["Valor total", Math.round(a.valorTotal)],
    ["Auditados", a.auditados],
    ["Cumplimiento (%)", a.cumplimiento],
    ["Pendientes", a.pendientes],
    ["Finalizados (cerrados)", a.finalizados],
    ["Con diferencia (hallazgos)", a.conDif],
    ["Valor en riesgo", Math.round(a.valorRiesgo)],
    [],
    ["POR MÓDULO"], ...a.porModulo.map(([k, v]) => [k, v]),
    [],
    ["POR ESTADO"], ...a.porEstado.map(([k, v]) => [k, v]),
    [],
    ["POR CATEGORÍA"], ...a.porCategoria.map(([k, v]) => [k, v]),
  ];
  const wsRes = XLSX.utils.aoa_to_sheet(resumen);
  wsRes["!cols"] = [{ wch: 40 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumen");

  const difs = rows.filter(r => r.diferencia != null && r.diferencia !== 0)
    .map(r => ({ Consecutivo: r.consecutivo, Módulo: moduloCorto(r.modulo), Nombre: r.nombre, "Cantidad": r.cantidad ?? "", "Contada": r.cantidadContada ?? "", "Diferencia": r.diferencia ?? "", "Valor en riesgo": Math.round(Math.abs(r.diferencia || 0) * (r.costoUnitario || 0)), Estado: r.estado, Responsable: r.responsable ?? "" }));
  if (difs.length) {
    const wsDif = XLSX.utils.json_to_sheet(difs);
    wsDif["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsDif, "Diferencias");
  }

  XLSX.writeFile(wb, `inventarios_${slug(scope)}_${hoyISO()}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF — helper canvas→A4 multipágina + membrete
// ═══════════════════════════════════════════════════════════════════════════════
async function generarPDFDesdeHTML(html: string, filename: string, delayMs = 500): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  let container: HTMLDivElement | null = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await new Promise(r => setTimeout(r, delayMs));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false, windowWidth: 794 });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const pxPerMm = canvas.width / pageW;
    const pageHpx = Math.floor(pageH * pxPerMm);
    let rendered = 0, idx = 0;
    while (rendered < canvas.height) {
      if (idx > 0) pdf.addPage();
      const sliceH = Math.min(pageHpx, canvas.height - rendered);
      const pc = document.createElement("canvas");
      pc.width = canvas.width; pc.height = sliceH;
      const ctx = pc.getContext("2d");
      if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pc.width, pc.height); ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg", 0.82), "JPEG", 0, 0, pageW, (sliceH * pageW) / canvas.width, undefined, "FAST");
      rendered += sliceH; idx++;
    }
    pdf.save(filename);
  } finally {
    if (container?.parentNode) document.body.removeChild(container);
    container = null;
  }
}

const membrete = (titulo: string, sub: string) => `
  <div style="display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#0D1526,#3B1a6b);color:#fff;padding:22px 32px">
    <img src="${LOGO_SAVICOL}" style="height:52px;width:auto;object-fit:contain" crossorigin="anonymous"/>
    <div style="flex:1">
      <div style="font-size:10px;letter-spacing:2px;color:#C4B5FD;text-transform:uppercase;font-weight:700">${esc(EMPRESA.area)}</div>
      <h1 style="font-size:22px;margin:3px 0 2px;font-weight:800">${esc(titulo)}</h1>
      <p style="font-size:12px;color:#CBD5E1;margin:0">${esc(sub)}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#cbd5e1"><strong style="color:#fff">${esc(EMPRESA.nombre)}</strong><br>NIT ${esc(EMPRESA.nit)}</div>
  </div>`;

const encabezadoFiltros = (filtrosTxt: string[]) => `
  <div style="font-size:11px;color:#64748b;margin-bottom:16px">
    Fecha de generación: <strong>${hoyLargo()}</strong>
    ${filtrosTxt.length ? `<br><span style="color:#8B5CF6;font-weight:700">Filtros aplicados:</span> ${esc(filtrosTxt.join(" · "))}` : `<br>Reporte completo — sin filtros aplicados`}
  </div>`;

const pieDoc = `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8">${esc(EMPRESA.nombre)} · NIT ${esc(EMPRESA.nit)} · ${esc(EMPRESA.area)} — Documento generado automáticamente por la plataforma de auditoría.</div>`;

// ═══════════════════════════════════════════════════════════════════════════════
// 2) Informe Ejecutivo PDF (KPIs + gráficas + tabla resumen)  ·  "dashboard imprimible"
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportarInventarioEjecutivoPDF(rows: InventarioAuditado[], scope = "Consolidado", filtrosTxt: string[] = []) {
  const a = agregados(rows);
  const barra = (label: string, val: number, max: number, color: string, den: number) => `
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:2px"><span>${esc(label)}</span><strong style="color:${color}">${val}${den > 0 ? ` · ${Math.round(val / den * 100)}%` : ""}</strong></div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${max > 0 ? Math.round(val / max * 100) : 0}%;background:${color};border-radius:4px"></div></div>
    </div>`;
  const maxMod = Math.max(1, ...a.porModulo.map(x => x[1]));
  const maxEst = Math.max(1, ...a.porEstado.map(x => x[1]));
  const maxCat = Math.max(1, ...a.porCategoria.map(x => x[1]));
  const kpi = (l: string, v: string, c: string) => `<div style="border:1px solid #e2e8f0;border-top:3px solid ${c};border-radius:8px;padding:12px;text-align:center"><div style="font-size:21px;font-weight:800;color:${c}">${v}</div><div style="font-size:9px;color:#64748b;text-transform:uppercase;margin-top:4px">${esc(l)}</div></div>`;

  const filas = rows.slice(0, 60).map(r => `<tr>
    <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;font-family:monospace;font-size:9px;color:#7c3aed">${esc(r.consecutivo)}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #eef2f7">${esc(r.nombre)}<span style="color:#94a3b8"> · ${esc(moduloCorto(r.modulo))}</span></td>
    <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${r.saldo != null ? nfmt(r.saldo, 2) : "—"}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace;color:${r.diferencia ? "#EF4444" : "#475569"}">${r.diferencia != null ? nfmt(r.diferencia, 2) : "—"}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #eef2f7">${esc(r.estado)}</td>
  </tr>`).join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${membrete("Informe Ejecutivo de Inventarios", scope)}
    <div style="padding:24px 32px">
      ${encabezadoFiltros(filtrosTxt)}
      <h2 style="font-size:15px;border-left:4px solid #8B5CF6;padding-left:10px;margin:0 0 14px">Resumen Ejecutivo</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:22px">
        ${kpi("Total ítems", nfmt(a.total), "#8B5CF6")}
        ${kpi("Valor total", `$ ${nfmt(a.valorTotal)}`, "#06B6D4")}
        ${kpi("Cumplimiento", `${a.cumplimiento}%`, "#22C55E")}
        ${kpi("Hallazgos (dif.)", nfmt(a.conDif), "#EF4444")}
        ${kpi("Auditados", nfmt(a.auditados), "#10B981")}
        ${kpi("Pendientes", nfmt(a.pendientes), "#F59E0B")}
        ${kpi("Finalizados", nfmt(a.finalizados), "#3B82F6")}
        ${kpi("Valor en riesgo", `$ ${nfmt(a.valorRiesgo)}`, "#EC4899")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
          <h3 style="font-size:12px;margin:0 0 10px">Inventarios por módulo</h3>
          ${a.porModulo.map(([k, v]) => barra(k, v, maxMod, "#8B5CF6", a.total)).join("") || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
          <h3 style="font-size:12px;margin:0 0 10px">Por estado</h3>
          ${a.porEstado.map(([k, v]) => barra(k, v, maxEst, ESTADO_INVENTARIO_COLOR[k] ?? "#94A3B8", a.total)).join("") || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
        </div>
      </div>
      ${a.porCategoria.length ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:22px">
        <h3 style="font-size:12px;margin:0 0 10px">Por categoría (top 8)</h3>
        ${a.porCategoria.slice(0, 8).map(([k, v]) => barra(k, v, maxCat, "#06B6D4", a.total)).join("")}
      </div>` : ""}
      <h2 style="font-size:15px;border-left:4px solid #8B5CF6;padding-left:10px;margin:0 0 12px">Detalle (${a.total}${rows.length > 60 ? ", primeros 60" : ""})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#0D1526;color:#fff;text-align:left"><th style="padding:6px">Consecutivo</th><th style="padding:6px">Ítem · Módulo</th><th style="padding:6px;text-align:right">Saldo</th><th style="padding:6px;text-align:right">Dif.</th><th style="padding:6px">Estado</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8">Sin registros</td></tr>`}</tbody>
      </table>
      ${pieDoc}
    </div>
  </div>`;
  await generarPDFDesdeHTML(html, `inventarios_ejecutivo_${slug(scope)}_${hoyISO()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3) Informe Técnico PDF (detalle completo por ítem, agrupado por módulo)
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportarInventarioTecnicoPDF(rows: InventarioAuditado[], scope = "Consolidado", filtrosTxt: string[] = []) {
  const modulos = Array.from(new Set(rows.map(r => r.modulo)));
  const bloque = (mod: string) => {
    const items = rows.filter(r => r.modulo === mod);
    if (!items.length) return "";
    const filas = items.map(r => `<tr>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;font-family:monospace;font-size:9px;color:#7c3aed">${esc(r.consecutivo)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7">${esc(r.nombre)}${r.categoria ? `<br><span style="font-size:8px;color:#94a3b8">${esc(r.categoria)}</span>` : ""}${r.observaciones ? `<br><span style="font-size:8px;color:#64748b;font-style:italic">Obs: ${esc(r.observaciones)}</span>` : ""}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7">${esc(r.ubicacion || r.cediNombre || r.granjaNombre || "—")}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${r.cantidad != null ? nfmt(r.cantidad, 2) : "—"}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${r.saldo != null ? nfmt(r.saldo, 2) : "—"}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${r.cantidadContada != null ? nfmt(r.cantidadContada, 2) : "—"}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace;font-weight:700;color:${r.diferencia ? "#EF4444" : "#475569"}">${r.diferencia != null ? nfmt(r.diferencia, 2) : "—"}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${r.valorTotal != null ? "$ " + nfmt(r.valorTotal) : "—"}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7">${esc(r.estado)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7">${esc(r.responsable || "—")}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #eef2f7;font-size:9px">${esc(fFecha(r.fecha))}</td>
    </tr>`).join("");
    return `<h3 style="font-size:12px;background:#0D1526;color:#fff;padding:5px 10px;margin:16px 0 0;border-radius:4px 4px 0 0">${esc(moduloCorto(mod))} <span style="color:#C4B5FD">(${items.length})</span></h3>
      <table style="width:100%;border-collapse:collapse;font-size:9px">
        <thead><tr style="background:#f1f5f9;text-align:left;color:#475569"><th style="padding:5px">Folio</th><th style="padding:5px">Ítem</th><th style="padding:5px">Ubicación</th><th style="padding:5px;text-align:right">Cant.</th><th style="padding:5px;text-align:right">Saldo</th><th style="padding:5px;text-align:right">Cont.</th><th style="padding:5px;text-align:right">Dif.</th><th style="padding:5px;text-align:right">Valor</th><th style="padding:5px">Estado</th><th style="padding:5px">Resp.</th><th style="padding:5px">Fecha</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>`;
  };
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${membrete("Informe Técnico de Inventarios", scope)}
    <div style="padding:24px 32px">
      ${encabezadoFiltros(filtrosTxt)}
      ${modulos.map(bloque).join("") || `<p style="text-align:center;color:#94a3b8;padding:20px">Sin registros para el reporte.</p>`}
      ${pieDoc}
    </div>
  </div>`;
  await generarPDFDesdeHTML(html, `inventarios_tecnico_${slug(scope)}_${hoyISO()}.pdf`);
}
