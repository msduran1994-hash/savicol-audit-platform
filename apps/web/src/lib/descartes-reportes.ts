// ═══════════════════════════════════════════════════════════════════════════════
// GRANJAS · Trazabilidad de Descartes — Fase 6 (reportes + acta)
// Generación en el frontend, sin backend nuevo. Reutiliza los patrones de la
// plataforma: XLSX vía SheetJS (CDN), PDF vía jsPDF + html2canvas (canvas→A4),
// membrete corporativo (LOGO_SAVICOL + NIT) y los helpers de checklist/evidencias.
// ═══════════════════════════════════════════════════════════════════════════════
import { apiGet } from "@/lib/api";
import type { DescarteAve, EvidenciaDescarte } from "@/lib/descartes.types";
import {
  checklistStats, CHECKLIST_DESCARTE, TIEMPO_OBJETIVO_MIN,
  RIESGO_COLOR, ESTADO_DESCARTE_COLOR, type ChecklistRespuestas,
} from "@/lib/descartes.constants";
import { esImagen, imgSrc } from "@/lib/evidencias-upload";
import { LOGO_SAVICOL } from "@/app/(dashboard)/cedis/cumplimiento/savicol-logo";

// ─── Empresa / membrete ──────────────────────────────────────────────────────
const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.974-4", area: "Control Interno y Auditoría" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const esc = (v: any): string => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hoyISO = () => new Date().toISOString().slice(0, 10);
const hoyLargo = () => new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
// Fecha para exportaciones/actas: "YYYY-MM-DD HH:mm" (sin comas, apto CSV) o "".
const fFecha = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const mins = (a?: string | null, b?: string | null): number | null => {
  if (!a || !b) return null;
  const t = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return isNaN(t) || t < 0 ? null : Math.round(t);
};
const fDur = (m: number | null): string => m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
const nfmt = (n: number, dec = 0) => n.toLocaleString("es-CO", { maximumFractionDigits: dec });
const slug = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "descarte";

function descargarBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

// ─── Columnas planas (compartidas por CSV y hoja "Registros" del Excel) ────────
const COLS: [string, (r: DescarteAve) => string | number][] = [
  ["Fecha/Hora descarte", r => fFecha(r.fechaHoraDescarte)],
  ["Empresa", r => r.empresa ?? ""],
  ["Integración", r => r.integracion ?? ""],
  ["Granja", r => r.granjaNombre ?? ""],
  ["Galpón", r => r.galpon ?? ""],
  ["Lote", r => r.lote ?? ""],
  ["Línea genética", r => r.lineaGenetica ?? ""],
  ["Edad (días)", r => r.loteEdadDias ?? ""],
  ["Tipo descarte", r => r.tipoDescarte ?? ""],
  ["Motivo", r => r.motivo ?? ""],
  ["Clasificación sanitaria", r => r.clasificacionSanitaria ?? ""],
  ["Nivel de riesgo", r => r.nivelRiesgo ?? ""],
  ["Estado", r => r.estado ?? ""],
  ["Cantidad aves", r => r.cantidadAves ?? 0],
  ["Peso promedio (kg)", r => r.pesoPromedioKg ?? ""],
  ["Peso total (kg)", r => r.pesoTotalKg ?? ""],
  ["Mortalidad traslado", r => r.mortalidadTraslado ?? ""],
  ["Destino", r => r.destino ?? ""],
  ["Planta destino", r => r.plantaDestino ?? ""],
  ["Transportadora", r => r.transportadora ?? ""],
  ["Vehículo placa", r => r.vehiculoPlaca ?? ""],
  ["Conductor", r => r.conductor ?? ""],
  ["Responsable despacho", r => r.responsableDespacho ?? ""],
  ["Responsable recepción", r => r.responsableRecepcion ?? ""],
  ["Médico veterinario", r => r.medicoVeterinario ?? ""],
  ["Hora inicio cargue", r => fFecha(r.horaInicioCargue)],
  ["Hora fin cargue", r => fFecha(r.horaFinCargue)],
  ["Hora salida granja", r => fFecha(r.horaSalidaGranja)],
  ["Hora llegada planta", r => fFecha(r.horaLlegadaPlanta)],
  ["Hora inicio descarga", r => fFecha(r.horaInicioDescarga)],
  ["Hora fin descarga", r => fFecha(r.horaFinDescarga)],
  ["Tiempo total (min)", r => mins(r.horaInicioCargue, r.horaFinDescarga) ?? ""],
  ["Distancia (km)", r => r.distanciaKm ?? ""],
  ["Ruta", r => r.ruta ?? ""],
  ["Checklist %", r => { const c = checklistStats(r.checklistJSON); return c.respondidos ? c.pct : ""; }],
  ["Checklist avance", r => { const c = checklistStats(r.checklistJSON); return `${c.respondidos}/${c.total}`; }],
  ["Observaciones", r => r.observaciones ?? ""],
];

// ─── Agregados (reutilizados por el PDF ejecutivo y la hoja "Resumen") ─────────
function agregados(rows: DescarteAve[]) {
  const total = rows.length;
  const totalAves = rows.reduce((s, r) => s + (r.cantidadAves || 0), 0);
  const pesoTotal = rows.reduce((s, r) => s + (r.pesoTotalKg || 0), 0);
  const tiempos = rows.map(r => mins(r.horaInicioCargue, r.horaFinDescarga)).filter((x): x is number => x != null);
  const tProm = tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null;
  const dentro = tiempos.filter(t => t <= TIEMPO_OBJETIVO_MIN).length;
  const retraso = tiempos.filter(t => t > TIEMPO_OBJETIVO_MIN).length;
  const sinTiempo = total - tiempos.length;
  const countBy = (g: (r: DescarteAve) => string | null | undefined) => {
    const m = new Map<string, number>();
    rows.forEach(r => { const k = (g(r) || "").trim(); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  const chk = rows.map(r => checklistStats(r.checklistJSON));
  const chkCompleto = chk.filter(c => c.respondidos > 0 && c.pendientes === 0).length;
  const chkSin = chk.filter(c => c.respondidos === 0).length;
  const chkPcts = chk.filter(c => c.respondidos > 0).map(c => c.pct);
  const chkProm = chkPcts.length ? Math.round(chkPcts.reduce((a, b) => a + b, 0) / chkPcts.length) : 0;
  return {
    total, totalAves, pesoTotal, tProm, dentro, retraso, sinTiempo,
    porMotivo: countBy(r => r.motivo), porRiesgo: countBy(r => r.nivelRiesgo),
    porEstado: countBy(r => r.estado), porPlanta: countBy(r => r.plantaDestino),
    chkCompleto, chkSin, chkProm,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1) CSV — tabla plana del conjunto filtrado
// ═══════════════════════════════════════════════════════════════════════════════
export function exportarDescartesCSV(rows: DescarteAve[]) {
  const cell = (v: string | number) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lineas = [COLS.map(c => cell(c[0])).join(",")];
  rows.forEach(r => lineas.push(COLS.map(c => cell(c[1](r))).join(",")));
  // BOM para que Excel respete los acentos UTF-8.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  descargarBlob(blob, `descartes_${hoyISO()}.csv`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2) Excel multi-hoja — Registros + Resumen + Checklist
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

export async function exportarDescartesXLSX(rows: DescarteAve[]) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  // Hoja "Registros": tabla plana (mismas columnas del CSV)
  const registros = rows.map(r => { const o: Record<string, any> = {}; COLS.forEach(c => { o[c[0]] = c[1](r); }); return o; });
  const wsReg = XLSX.utils.json_to_sheet(registros.length ? registros : [Object.fromEntries(COLS.map(c => [c[0], ""]))]);
  XLSX.utils.book_append_sheet(wb, wsReg, "Registros");

  // Hoja "Resumen": KPIs + distribuciones
  const a = agregados(rows);
  const resumen: any[][] = [
    [EMPRESA.nombre, `NIT ${EMPRESA.nit}`],
    ["Reporte de Trazabilidad de Descartes"],
    ["Generado", hoyLargo()],
    [],
    ["INDICADORES"],
    ["Total de descartes (viajes)", a.total],
    ["Total de aves descartadas", a.totalAves],
    ["Peso total (kg)", Math.round(a.pesoTotal)],
    ["Tiempo total promedio (min)", a.tProm ?? "—"],
    ["Cumplimiento logístico — dentro de objetivo", a.dentro],
    ["Cumplimiento logístico — con retraso", a.retraso],
    ["Cumplimiento logístico — sin dato de tiempo", a.sinTiempo],
    ["Checklist — completos", a.chkCompleto],
    ["Checklist — sin iniciar", a.chkSin],
    ["Checklist — % cumplimiento promedio", a.chkProm + "%"],
    [],
    ["DESCARTES POR MOTIVO"], ...a.porMotivo.map(([k, v]) => [k, v]),
    [],
    ["DESCARTES POR NIVEL DE RIESGO"], ...a.porRiesgo.map(([k, v]) => [k, v]),
    [],
    ["DESCARTES POR ESTADO"], ...a.porEstado.map(([k, v]) => [k, v]),
    [],
    ["DESCARTES POR PLANTA DE DESTINO"], ...a.porPlanta.map(([k, v]) => [k, v]),
  ];
  const wsRes = XLSX.utils.aoa_to_sheet(resumen);
  wsRes["!cols"] = [{ wch: 42 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumen");

  // Hoja "Checklist": una fila por ítem respondido de cada descarte
  const chkRows: Record<string, any>[] = [];
  rows.forEach(r => {
    let ans: ChecklistRespuestas = {};
    try { if (r.checklistJSON) ans = JSON.parse(r.checklistJSON); } catch { ans = {}; }
    CHECKLIST_DESCARTE.forEach(cat => cat.items.forEach(it => {
      const resp = ans[it.id];
      if (!resp || !resp.estado) return;
      chkRows.push({
        "Fecha": fFecha(r.fechaHoraDescarte), "Granja": r.granjaNombre, "Galpón": r.galpon, "Lote": r.lote,
        "Categoría": cat.categoria, "Ítem": it.pregunta, "Estado": resp.estado,
        "Observación": resp.obs ?? "", "Criticidad": resp.criticidad ?? "",
      });
    }));
  });
  if (chkRows.length) {
    const wsChk = XLSX.utils.json_to_sheet(chkRows);
    wsChk["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 48 }, { wch: 11 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsChk, "Checklist");
  }

  XLSX.writeFile(wb, `descartes_${hoyISO()}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF — helper canvas→A4 multipágina (patrón de la plataforma)
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
  <div style="display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#0D1526,#1a2847);color:#fff;padding:22px 32px">
    <img src="${LOGO_SAVICOL}" style="height:52px;width:auto;object-fit:contain" crossorigin="anonymous"/>
    <div style="flex:1">
      <div style="font-size:10px;letter-spacing:2px;color:#4A7AFF;text-transform:uppercase;font-weight:700">${esc(EMPRESA.area)}</div>
      <h1 style="font-size:22px;margin:3px 0 2px;font-weight:800">${esc(titulo)}</h1>
      <p style="font-size:12px;color:#94A3B8;margin:0">${esc(sub)}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#cbd5e1">
      <strong style="color:#fff">${esc(EMPRESA.nombre)}</strong><br>NIT ${esc(EMPRESA.nit)}
    </div>
  </div>`;

// ═══════════════════════════════════════════════════════════════════════════════
// 3) PDF ejecutivo — reporte del conjunto filtrado (KPIs + gráficas + tabla)
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportarDescartesReportePDF(rows: DescarteAve[], filtrosTxt: string[] = []) {
  const a = agregados(rows);
  const dentroPct = (a.dentro + a.retraso) > 0 ? Math.round(a.dentro / (a.dentro + a.retraso) * 100) : 0;
  const barra = (label: string, val: number, max: number, color: string, den: number) => `
    <div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:2px">
        <span>${esc(label)}</span><strong style="color:${color}">${val}${den > 0 ? ` · ${Math.round(val / den * 100)}%` : ""}</strong>
      </div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${max > 0 ? Math.round(val / max * 100) : 0}%;background:${color};border-radius:4px"></div>
      </div>
    </div>`;
  const maxMotivo = Math.max(1, ...a.porMotivo.map(x => x[1]));
  const maxRiesgo = Math.max(1, ...a.porRiesgo.map(x => x[1]));
  const maxEstado = Math.max(1, ...a.porEstado.map(x => x[1]));

  const kpi = (l: string, v: string, c: string) => `<div style="border:1px solid #e2e8f0;border-top:3px solid ${c};border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:23px;font-weight:800;color:${c}">${v}</div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;margin-top:4px">${esc(l)}</div></div>`;

  const filas = rows.map(r => {
    const t = mins(r.horaInicioCargue, r.horaFinDescarga);
    const rc = RIESGO_COLOR[r.nivelRiesgo] ?? "#94A3B8";
    return `<tr>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;font-family:monospace;font-size:9px;color:#475569">${esc(fFecha(r.fechaHoraDescarte))}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7">${esc(r.granjaNombre)}<span style="color:#94a3b8"> · G${esc(r.galpon)} · L${esc(r.lote)}</span></td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;color:#475569">${esc(r.motivo)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${nfmt(r.cantidadAves || 0)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace">${nfmt(r.pesoTotalKg || 0, 1)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:center"><span style="color:${rc};font-weight:700">${esc(r.nivelRiesgo)}</span></td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7">${esc(r.estado)}</td>
      <td style="padding:5px 6px;border-bottom:1px solid #eef2f7;text-align:right;font-family:monospace;color:${t != null && t > TIEMPO_OBJETIVO_MIN ? "#EF4444" : "#475569"}">${fDur(t)}</td>
    </tr>`;
  }).join("");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${membrete("Reporte de Trazabilidad de Descartes", "Informe ejecutivo · Granja → Planta de beneficio")}
    <div style="padding:24px 32px">
      <div style="font-size:11px;color:#64748b;margin-bottom:16px">
        Fecha de generación: <strong>${hoyLargo()}</strong>
        ${filtrosTxt.length ? `<br><span style="color:#4A7AFF;font-weight:700">Filtros aplicados:</span> ${esc(filtrosTxt.join(" · "))}` : `<br>Reporte completo — sin filtros aplicados`}
      </div>
      <h2 style="font-size:15px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 14px">Resumen Ejecutivo</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:22px">
        ${kpi("Descartes (viajes)", nfmt(a.total), "#4A7AFF")}
        ${kpi("Aves descartadas", nfmt(a.totalAves), "#EF4444")}
        ${kpi("Peso total (kg)", nfmt(a.pesoTotal), "#06B6D4")}
        ${kpi("Tiempo total prom.", fDur(a.tProm), "#8B5CF6")}
        ${kpi("Dentro de objetivo", `${dentroPct}%`, "#22C55E")}
        ${kpi("Checklist prom.", `${a.chkProm}%`, "#F59E0B")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
          <h3 style="font-size:12px;margin:0 0 10px">Descartes por Motivo</h3>
          ${a.porMotivo.slice(0, 8).map(([k, v]) => barra(k, v, maxMotivo, "#4A7AFF", a.total)).join("") || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
          <h3 style="font-size:12px;margin:0 0 10px">Por Nivel de Riesgo</h3>
          ${a.porRiesgo.map(([k, v]) => barra(k, v, maxRiesgo, RIESGO_COLOR[k] ?? "#94A3B8", a.total)).join("") || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
          <h3 style="font-size:12px;margin:14px 0 10px">Por Estado</h3>
          ${a.porEstado.map(([k, v]) => barra(k, v, maxEstado, ESTADO_DESCARTE_COLOR[k] ?? "#94A3B8", a.total)).join("") || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
        </div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:22px">
        <h3 style="font-size:12px;margin:0 0 10px">Cumplimiento Logístico (objetivo ${TIEMPO_OBJETIVO_MIN} min)</h3>
        <div style="display:flex;gap:20px;font-size:12px">
          <div><span style="color:#22C55E;font-weight:800;font-size:20px">${a.dentro}</span> dentro de objetivo</div>
          <div><span style="color:#EF4444;font-weight:800;font-size:20px">${a.retraso}</span> con retraso</div>
          <div><span style="color:#94A3B8;font-weight:800;font-size:20px">${a.sinTiempo}</span> sin dato</div>
        </div>
      </div>
      <h2 style="font-size:15px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 12px">Detalle de Registros (${a.total})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#0D1526;color:#fff;text-align:left">
          <th style="padding:6px">Fecha</th><th style="padding:6px">Granja · Galpón · Lote</th><th style="padding:6px">Motivo</th>
          <th style="padding:6px;text-align:right">Aves</th><th style="padding:6px;text-align:right">Peso kg</th>
          <th style="padding:6px;text-align:center">Riesgo</th><th style="padding:6px">Estado</th><th style="padding:6px;text-align:right">T. total</th>
        </tr></thead>
        <tbody>${filas || `<tr><td colspan="8" style="padding:16px;text-align:center;color:#94a3b8">Sin registros</td></tr>`}</tbody>
      </table>
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8">
        ${esc(EMPRESA.nombre)} · NIT ${esc(EMPRESA.nit)} · ${esc(EMPRESA.area)} — Documento generado automáticamente por la plataforma de auditoría.
      </div>
    </div>
  </div>`;
  await generarPDFDesdeHTML(html, `reporte_descartes_${hoyISO()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4) Acta de descarte — documento formal por registro (datos + checklist + fotos + firmas)
// ═══════════════════════════════════════════════════════════════════════════════
export async function imprimirActaDescarte(r: DescarteAve) {
  // Evidencias del descarte (fotos para el acta). Si falla, se genera sin fotos.
  let evid: EvidenciaDescarte[] = [];
  try { evid = await apiGet<EvidenciaDescarte[]>(`/descartes/evidencias?descarteId=${r.id}`); } catch { evid = []; }
  const fotos = evid.filter(e => esImagen({ tipo: e.tipo, url: e.url }));
  const docs = evid.filter(e => !esImagen({ tipo: e.tipo, url: e.url }));

  const tTotal = mins(r.horaInicioCargue, r.horaFinDescarga);
  const rc = RIESGO_COLOR[r.nivelRiesgo] ?? "#94A3B8";

  const fila = (l: string, v: any) => `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;background:#f8fafc;font-size:10px;color:#64748b;width:38%">${esc(l)}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:11px">${esc(v || "—")}</td></tr>`;
  const seccion = (titulo: string, filas: string) => `
    <h3 style="font-size:12px;background:#0D1526;color:#fff;padding:5px 10px;margin:16px 0 0;border-radius:4px 4px 0 0">${esc(titulo)}</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:2px">${filas}</table>`;

  // Checklist
  let ans: ChecklistRespuestas = {};
  try { if (r.checklistJSON) ans = JSON.parse(r.checklistJSON); } catch { ans = {}; }
  const cs = checklistStats(r.checklistJSON);
  const colEstado = (e: string) => e === "Cumple" ? "#10B981" : e === "No cumple" ? "#EF4444" : "#94A3B8";
  const chkHTML = CHECKLIST_DESCARTE.map(cat => {
    const items = cat.items.filter(it => ans[it.id]?.estado);
    if (!items.length) return "";
    return `<div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#0D1526;margin:6px 0 3px">${esc(cat.categoria)}</div>
      ${items.map(it => { const a = ans[it.id]; return `<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;gap:8px">
        <span style="color:#334155">${esc(it.pregunta)}${a.obs ? `<br><span style="color:#94a3b8;font-style:italic">Obs: ${esc(a.obs)}</span>` : ""}${a.criticidad ? ` <span style="color:#EF4444">[${esc(a.criticidad)}]</span>` : ""}</span>
        <strong style="color:${colEstado(a.estado)};white-space:nowrap">${esc(a.estado)}</strong></div>`; }).join("")}
    </div>`;
  }).join("");

  const fotosHTML = fotos.length ? `
    <h3 style="font-size:12px;background:#0D1526;color:#fff;padding:5px 10px;margin:16px 0 8px;border-radius:4px">Evidencias Fotográficas (${fotos.length})</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${fotos.map(f => `<div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <img src="${imgSrc(f.url)}" crossorigin="anonymous" style="width:100%;height:200px;object-fit:cover;display:block"/>
        <div style="padding:5px 8px;font-size:9px;color:#64748b">${esc(f.categoria || f.tipo)} · ${esc(f.nombre)}</div></div>`).join("")}
    </div>` : "";

  const docsHTML = docs.length ? `<div style="font-size:10px;color:#64748b;margin-top:8px"><strong>Documentos adjuntos:</strong> ${docs.map(d => esc(`${d.categoria || d.tipo}: ${d.nombre}`)).join(" · ")}</div>` : "";

  const firma = (cargo: string, nombre?: string | null) => `
    <div style="width:46%;text-align:center">
      <div style="height:44px"></div>
      <div style="border-top:1px solid #0D1526;padding-top:4px;font-size:11px;font-weight:700">${esc(nombre || "")}</div>
      <div style="font-size:9px;color:#64748b">${esc(cargo)}</div>
    </div>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${membrete("Acta de Descarte de Aves", `Folio ${esc(r.id.slice(0, 8).toUpperCase())} · ${esc(fFecha(r.fechaHoraDescarte))}`)}
    <div style="padding:20px 32px">
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:${rc}22;color:${rc};font-weight:700">Riesgo: ${esc(r.nivelRiesgo)}</span>
        <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#f1f5f9;color:#334155;font-weight:700">Estado: ${esc(r.estado)}</span>
        <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#f1f5f9;color:#334155;font-weight:700">Checklist: ${cs.respondidos ? `${cs.pct}% (${cs.respondidos}/${cs.total})` : "sin iniciar"}</span>
      </div>
      ${seccion("Información General", [
        fila("Fecha y hora del descarte", fFecha(r.fechaHoraDescarte)),
        fila("Empresa / Integración", [r.empresa, r.integracion].filter(Boolean).join(" / ")),
        fila("Granja", r.granjaNombre), fila("Galpón", r.galpon), fila("Lote", r.lote),
        fila("Línea genética", r.lineaGenetica), fila("Edad del lote (días)", r.loteEdadDias),
        fila("Tipo de descarte", r.tipoDescarte), fila("Motivo", r.motivo),
        fila("Clasificación sanitaria", r.clasificacionSanitaria),
      ].join(""))}
      ${seccion("Información Productiva", [
        fila("Cantidad de aves", r.cantidadAves != null ? nfmt(r.cantidadAves) : ""),
        fila("Peso promedio (kg)", r.pesoPromedioKg), fila("Peso total (kg)", r.pesoTotalKg != null ? nfmt(r.pesoTotalKg, 1) : ""),
        fila("Mortalidad en traslado", r.mortalidadTraslado),
      ].join(""))}
      ${seccion("Información Logística", [
        fila("Destino", r.destino), fila("Planta de destino", r.plantaDestino),
        fila("Transportadora", r.transportadora), fila("Vehículo / placa", r.vehiculoPlaca),
        fila("Conductor", r.conductor), fila("Distancia (km)", r.distanciaKm), fila("Ruta", r.ruta),
      ].join(""))}
      ${seccion("Responsables", [
        fila("Responsable de despacho", r.responsableDespacho),
        fila("Responsable de recepción", r.responsableRecepcion),
        fila("Médico veterinario", r.medicoVeterinario),
      ].join(""))}
      ${seccion("Control de Tiempos", [
        fila("Inicio de cargue", fFecha(r.horaInicioCargue)), fila("Fin de cargue", fFecha(r.horaFinCargue)),
        fila("Salida de granja", fFecha(r.horaSalidaGranja)), fila("Llegada a planta", fFecha(r.horaLlegadaPlanta)),
        fila("Inicio de descarga", fFecha(r.horaInicioDescarga)), fila("Fin de descarga", fFecha(r.horaFinDescarga)),
        fila("Tiempo total del proceso", `${fDur(tTotal)}${tTotal != null && tTotal > TIEMPO_OBJETIVO_MIN ? " (con retraso)" : tTotal != null ? " (dentro de objetivo)" : ""}`),
      ].join(""))}
      ${(r.gpsSalidaLat || r.gpsLlegadaLat) ? seccion("Georreferenciación", [
        fila("GPS salida (lat, lng)", [r.gpsSalidaLat, r.gpsSalidaLng].filter(v => v != null).join(", ")),
        fila("GPS llegada (lat, lng)", [r.gpsLlegadaLat, r.gpsLlegadaLng].filter(v => v != null).join(", ")),
      ].join("")) : ""}
      ${r.observaciones ? seccion("Observaciones", `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-size:11px">${esc(r.observaciones)}</td></tr>`) : ""}
      ${chkHTML ? `<h3 style="font-size:12px;background:#0D1526;color:#fff;padding:5px 10px;margin:16px 0 8px;border-radius:4px">Checklist de Trazabilidad — ${cs.pct}% de cumplimiento</h3>${chkHTML}` : ""}
      ${fotosHTML}
      ${docsHTML}
      <div style="display:flex;justify-content:space-between;margin-top:40px">
        ${firma("Responsable de despacho (granja)", r.responsableDespacho)}
        ${firma("Responsable de recepción (planta)", r.responsableRecepcion)}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:28px">
        ${firma("Médico veterinario", r.medicoVeterinario)}
        ${firma("Auditor · Control Interno", "")}
      </div>
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8">
        ${esc(EMPRESA.nombre)} · NIT ${esc(EMPRESA.nit)} · ${esc(EMPRESA.area)} — Acta generada el ${hoyLargo()}.
      </div>
    </div>
  </div>`;
  await generarPDFDesdeHTML(html, `acta_descarte_${slug(r.granjaNombre)}_${hoyISO()}.pdf`, fotos.length ? 900 : 500);
}
