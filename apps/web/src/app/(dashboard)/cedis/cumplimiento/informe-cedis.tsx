"use client";
import { useState, useMemo } from "react";
import {
  X, FileText, Download, Loader2, Sparkles, Award, ClipboardList,
  TrendingUp, Building2, FileSearch, Filter, FileSpreadsheet, BarChart3, Mail,
} from "lucide-react";
import { LOGO_SAVICOL } from "./savicol-logo";
import { evidenciasGridHTML } from "@/lib/pdf-evidencias";

/* ════════════════════════════════════════════════════════════════════════════
   GENERADOR DE INFORMES EJECUTIVOS — CEDIS → Cumplimiento
   Fase 1: estructura, filtros (CEDIS, Subtema, Estado, Criticidad, Fechas) y los
   5 modelos corporativos en PDF. Reutiliza el patrón del módulo Granjas → KPI.
   Datos reales del store CEDIS. Sin datos ficticios.
   ════════════════════════════════════════════════════════════════════════════ */

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-5", area: "Control Interno y Auditoría · CEDIS" };

// ── Normalización de valores backend (MAYÚSCULAS) → legibles ────────────────
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normCrit = (c: string): "Crítica"|"Alta"|"Media"|"Baja"|"—" => {
  const v = sinAcentos((c ?? "").toString().toUpperCase());
  if (v.startsWith("CRIT")) return "Crítica";
  if (v.startsWith("ALT"))  return "Alta";
  if (v.startsWith("MED"))  return "Media";
  if (v.startsWith("BAJ"))  return "Baja";
  return "—";
};
const normEstado = (e: string): string => {
  const v = sinAcentos((e ?? "").toString().toUpperCase()).replace(/ /g, "_");
  if (v === "ABIERTO")          return "Abierto";
  if (v === "EN_PLAN")          return "En Plan";
  if (v === "EN_VERIFICACION")  return "En Verificación";
  if (v === "CERRADO")          return "Cerrado";
  if (v === "REINCIDENTE")      return "Reincidente";
  return e || "—";
};
const fmtFecha = (d?: string) => {
  if (!d) return "—";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day:"2-digit", month:"2-digit", year:"numeric" });
};

// ── Los 5 modelos corporativos ──────────────────────────────────────────────
export const MODELOS = [
  { id: "ejecutivo",   label: "Ejecutivo Gerencial",  icon: Award,        desc: "Resumen ejecutivo, indicadores, riesgos críticos y estado de cumplimiento" },
  { id: "operativo",   label: "Auditoría Operativa",  icon: ClipboardList, desc: "Hallazgos, planes de acción, seguimientos y evidencias" },
  { id: "estrategico", label: "Estratégico",          icon: TrendingUp,   desc: "Tendencias, criticidad, cumplimiento y recomendaciones IA" },
  { id: "corporativo", label: "Corporativo",          icon: Building2,    desc: "Consolidado por CEDIS, comparativos, riesgos y desempeño" },
  { id: "tecnico",     label: "Técnico",              icon: FileSearch,   desc: "Trazabilidad completa, historial y cumplimiento detallado" },
] as const;
export type ModeloId = typeof MODELOS[number]["id"];

// ── Generación de PDF (patrón jsPDF + html2canvas, sin iframe) ──────────────
export async function generarPDF(html: string, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"), import("html2canvas"),
  ]);
  let container: HTMLDivElement | null = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale:2, useCORS:true, backgroundColor:"#fff", logging:false, windowWidth:794 });
    const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4", compress:true });
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
      if (ctx) { ctx.fillStyle="#fff"; ctx.fillRect(0,0,pc.width,pc.height); ctx.drawImage(canvas,0,rendered,canvas.width,sliceH,0,0,canvas.width,sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg",0.82), "JPEG", 0, 0, pageW, (sliceH*pageW)/canvas.width, undefined, "FAST");
      rendered += sliceH; idx++;
    }
    pdf.save(filename);
  } finally {
    if (container?.parentNode) document.body.removeChild(container);
    container = null;
  }
}

// Genera el PDF y devuelve su base64 (para adjuntar al correo), sin descargarlo
async function generarPDFBase64(html: string): Promise<string> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"), import("html2canvas"),
  ]);
  let container: HTMLDivElement | null = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale:2, useCORS:true, backgroundColor:"#fff", logging:false, windowWidth:794 });
    const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4", compress:true });
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
      if (ctx) { ctx.fillStyle="#fff"; ctx.fillRect(0,0,pc.width,pc.height); ctx.drawImage(canvas,0,rendered,canvas.width,sliceH,0,0,canvas.width,sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg",0.82), "JPEG", 0, 0, pageW, (sliceH*pageW)/canvas.width, undefined, "FAST");
      rendered += sliceH; idx++;
    }
    return pdf.output("datauristring").split(",")[1];
  } finally {
    if (container?.parentNode) document.body.removeChild(container);
    container = null;
  }
}

// ── Carga dinámica de SheetJS (XLSX) desde CDN — sin dependencias nuevas ────
async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar la librería de Excel"));
    document.head.appendChild(s);
  });
  return (window as any).XLSX;
}

// ── XLSX ejecutivo (hojas organizadas + resumen gerencial) ──────────────────
export async function generarXLSXCedis(hallazgos: any[], cedisMap: Record<string,string>, filename: string): Promise<void> {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const k = calcular(hallazgos);

  // Hoja 1: Resumen Gerencial
  const resumen = [
    ["POLLOS SAVICOL S.A.S. — INFORME EJECUTIVO CEDIS"],
    ["NIT", "860.403.972-5"],
    ["Fecha de generación", new Date().toLocaleDateString("es-CO")],
    [],
    ["INDICADOR", "VALOR"],
    ["Total Hallazgos", k.total],
    ["Críticos", k.criticos],
    ["Altos", k.altos],
    ["Abiertos", k.abiertos],
    ["Cerrados", k.cerrados],
    ["Reincidentes", k.reincidentes],
    ["Cumplimiento Global (%)", k.cumpl],
    ["Avance Promedio (%)", k.avancePromedio],
    [],
    ["DISTRIBUCIÓN POR CRITICIDAD", ""],
    ...Object.entries(k.critCount).map(([c, v]) => [c, v as number]),
    [],
    ["DISTRIBUCIÓN POR ESTADO", ""],
    ...Object.entries(k.estadoCount).map(([e, v]) => [e, v as number]),
    [],
    ["DISTRIBUCIÓN POR TIPO DE RIESGO", ""],
    ...Object.entries(k.riesgoCount).map(([r, v]) => [r, v as number]),
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR["!cols"] = [{ wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen Gerencial");

  // Hoja 2: Hallazgos detallado
  const hallData = hallazgos.map(h => ({
    "CEDI": cedisMap[h.cediId] || "—",
    "Título": h.titulo || "—",
    "Subtema": h.subtema || "—",
    "Categoría": h.categoria || "—",
    "Descripción": (h.descripcion || "").slice(0, 250),
    "Criticidad": normCrit(h.criticidad),
    "Tipo de Riesgo": h.tipoRiesgo || "—",
    "Estado": normEstado(h.estado),
    "Responsable": h.responsable || "—",
    "Avance (%)": h.porcentajeAvance ?? 0,
    "Fecha Compromiso": fmtFecha(h.fechaCompromiso),
    "Recomendación IA": (h.recomendacionIA || "").replace(/[#*]/g, "").slice(0, 300),
  }));
  const wsH = XLSX.utils.json_to_sheet(hallData);
  wsH["!cols"] = [{wch:18},{wch:28},{wch:16},{wch:16},{wch:40},{wch:12},{wch:14},{wch:14},{wch:18},{wch:10},{wch:16},{wch:40}];
  XLSX.utils.book_append_sheet(wb, wsH, "Hallazgos");

  // Hoja 3: Consolidado por CEDI
  const porCedi: Record<string, any[]> = {};
  hallazgos.forEach(h => { (porCedi[h.cediId] = porCedi[h.cediId] || []).push(h); });
  const cediData = Object.entries(porCedi).map(([cid, hs]) => {
    const kc = calcular(hs);
    return {
      "CEDI": cedisMap[cid] || "—",
      "Hallazgos": kc.total,
      "Críticos": kc.criticos,
      "Altos": kc.altos,
      "Abiertos": kc.abiertos,
      "Cerrados": kc.cerrados,
      "Cumplimiento (%)": kc.cumpl,
    };
  });
  const wsC = XLSX.utils.json_to_sheet(cediData);
  wsC["!cols"] = [{wch:20},{wch:11},{wch:10},{wch:8},{wch:10},{wch:10},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsC, "Consolidado por CEDI");

  XLSX.writeFile(wb, filename);
}

// ── Envío por correo con trazabilidad (patrón del módulo KPI) ───────────────
async function enviarInformeCorreo(opts: {
  destinatarios: string[];
  asunto: string;
  htmlEmail: string;
  pdfBase64: string;
  pdfFilename: string;
  apiToken: string;
}): Promise<{ ok: boolean; message: string }> {
  const { destinatarios, asunto, htmlEmail, pdfBase64, pdfFilename, apiToken } = opts;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({
        to: destinatarios.join(","),
        subject: asunto,
        html: htmlEmail,
        pdfBase64,
        pdfFilename,
      }),
    });
    const data = await response.json().catch(() => ({}));
    // Trazabilidad: el backend devuelve HTTP 200 aunque Brevo rechace; verificar data.ok
    if (response.ok && data?.ok === true) {
      return { ok: true, message: `Informe enviado correctamente a ${destinatarios.join(", ")}` };
    }
    return { ok: false, message: data?.error || data?.message || `Error HTTP ${response.status}` };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Error de red al enviar el correo" };
  }
}


function portada(titulo: string, subtitulo: string, usuario: string, filtrosTxt: string[]): string {
  const hoy = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" });
  return `
  <div style="background:linear-gradient(135deg,#0D1526,#0A2D1F);color:#fff;padding:36px 40px">
    <div style="display:flex;align-items:flex-start;gap:22px">
      <img src="${LOGO_SAVICOL}" alt="Pollos Savicol S.A.S." style="width:74px;height:auto;border-radius:6px;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-size:11px;letter-spacing:3px;color:#10B981;text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:28px;margin:10px 0 6px;font-weight:800">${titulo}</h1>
        <p style="font-size:14px;color:#94A3B8;margin:0">${subtitulo}</p>
      </div>
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.15);font-size:12px;color:#cbd5e1">
      <strong style="color:#fff">${EMPRESA.nombre}</strong> · NIT ${EMPRESA.nit}<br>
      Generado: ${hoy} · Usuario: ${usuario}
    </div>
    ${filtrosTxt.length
      ? `<div style="margin-top:12px;font-size:11px;color:#94A3B8"><strong style="color:#10B981">Filtros aplicados:</strong> ${filtrosTxt.join(" · ")}</div>`
      : `<div style="margin-top:12px;font-size:11px;color:#94A3B8">Informe completo — sin filtros</div>`}
  </div>`;
}

function tarjetasIndicadores(items: { l: string; v: any; c: string }[]): string {
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px">
    ${items.map(k => `<div style="border:1px solid #e2e8f0;border-top:3px solid ${k.c};border-radius:8px;padding:13px;text-align:center">
      <div style="font-size:24px;font-weight:800;color:${k.c}">${k.v}</div>
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-top:3px">${k.l}</div>
    </div>`).join("")}
  </div>`;
}

function barras(titulo: string, datos: { label: string; val: number; color: string }[]): string {
  const max = Math.max(1, ...datos.map(d => d.val));
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:18px">
    <h3 style="font-size:12px;margin:0 0 12px;color:#0D1526">${titulo}</h3>
    ${datos.map(d => `<div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:2px"><span>${d.label}</span><strong style="color:${d.color}">${d.val}</strong></div>
      <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(d.val/max*100)}%;background:${d.color};border-radius:4px"></div></div>
    </div>`).join("")}
  </div>`;
}

function tablaHallazgos(hallazgos: any[], cedisMap: Record<string,string>, limite = 30): string {
  const filas = hallazgos.slice(0, limite).map(h => `<tr>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${(h.titulo||"—").slice(0,38)}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${cedisMap[h.cediId]||"—"}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${h.subtema||"—"}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${normCrit(h.criticidad)}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${normEstado(h.estado)}</td>
    <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${h.responsable||"—"}</td>
  </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:20px">
    <thead><tr style="background:#f8fafc">
      <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">Hallazgo</th>
      <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">CEDI</th>
      <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">Subtema</th>
      <th style="text-align:center;padding:6px;border-bottom:2px solid #e2e8f0">Criticidad</th>
      <th style="text-align:center;padding:6px;border-bottom:2px solid #e2e8f0">Estado</th>
      <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">Responsable</th>
    </tr></thead><tbody>${filas}</tbody></table>`;
}

function pie(): string {
  const hoy = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" });
  return `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
    ${EMPRESA.nombre} · ${EMPRESA.area} · Documento generado automáticamente · ${hoy}
  </div>`;
}

// ── Cálculo de indicadores comunes ──────────────────────────────────────────
export function calcular(hallazgos: any[]) {
  const total = hallazgos.length;
  const criticos = hallazgos.filter(h => normCrit(h.criticidad)==="Crítica").length;
  const altos    = hallazgos.filter(h => normCrit(h.criticidad)==="Alta").length;
  const cerrados = hallazgos.filter(h => normEstado(h.estado)==="Cerrado").length;
  const abiertos = hallazgos.filter(h => normEstado(h.estado)==="Abierto").length;
  const reincidentes = hallazgos.filter(h => h.reincidente).length;
  const cumpl = total>0 ? Math.round(cerrados/total*100) : 0;
  const avancePromedio = total>0 ? Math.round(hallazgos.reduce((a,h)=>a+(h.porcentajeAvance??0),0)/total) : 0;
  const critCount = { "Crítica":criticos, "Alta":altos,
    "Media": hallazgos.filter(h=>normCrit(h.criticidad)==="Media").length,
    "Baja":  hallazgos.filter(h=>normCrit(h.criticidad)==="Baja").length };
  const estadoCount: Record<string,number> = {};
  hallazgos.forEach(h => { const e = normEstado(h.estado); estadoCount[e] = (estadoCount[e]??0)+1; });
  const riesgoCount: Record<string,number> = {};
  hallazgos.forEach(h => { const r = h.tipoRiesgo||"—"; riesgoCount[r] = (riesgoCount[r]??0)+1; });
  return { total, criticos, altos, cerrados, abiertos, reincidentes, cumpl, avancePromedio, critCount, estadoCount, riesgoCount };
}

// ── Visualizaciones SVG ejecutivas (rasterizan en el PDF) ───────────────────
// Estilo dashboard ejecutivo: dona, gauge, tendencia. Colores corporativos.
function svgDona(datos: { label: string; val: number; color: string }[], titulo: string): string {
  const total = datos.reduce((a, d) => a + d.val, 0) || 1;
  let acum = 0;
  const r = 52, cx = 70, cy = 70, sw = 26;
  const circ = 2 * Math.PI * r;
  const segs = datos.filter(d => d.val > 0).map(d => {
    const frac = d.val / total;
    const dash = frac * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-acum * circ}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acum += frac;
    return seg;
  }).join("");
  const leyenda = datos.map(d => `<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:#475569;margin-bottom:3px">
    <span style="width:10px;height:10px;border-radius:2px;background:${d.color};display:inline-block"></span>
    ${d.label}: <strong>${d.val}</strong> (${Math.round(d.val / total * 100)}%)
  </div>`).join("");
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:18px">
    <h3 style="font-size:12px;margin:0 0 10px;color:#0D1526">${titulo}</h3>
    <div style="display:flex;align-items:center;gap:20px">
      <svg width="140" height="140" viewBox="0 0 140 140">${segs}
        <text x="70" y="66" text-anchor="middle" font-size="22" font-weight="800" fill="#0D1526">${total}</text>
        <text x="70" y="82" text-anchor="middle" font-size="9" fill="#94a3b8">TOTAL</text>
      </svg>
      <div style="flex:1">${leyenda}</div>
    </div>
  </div>`;
}

function svgGauge(pct: number, titulo: string, sub: string): string {
  const r = 56, cx = 70, cy = 70;
  const ang = (pct / 100) * 180;
  const rad = (180 - ang) * Math.PI / 180;
  const x = cx + r * Math.cos(rad), y = cy - r * Math.sin(rad);
  const largeArc = ang > 180 ? 1 : 0;
  const color = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:18px;text-align:center">
    <h3 style="font-size:12px;margin:0 0 6px;color:#0D1526">${titulo}</h3>
    <svg width="150" height="90" viewBox="0 0 140 80">
      <path d="M 14 70 A 56 56 0 0 1 126 70" fill="none" stroke="#f1f5f9" stroke-width="14" stroke-linecap="round"/>
      <path d="M 14 70 A 56 56 0 ${largeArc} 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
      <text x="70" y="60" text-anchor="middle" font-size="24" font-weight="800" fill="${color}">${pct}%</text>
    </svg>
    <p style="font-size:10px;color:#94a3b8;margin:4px 0 0">${sub}</p>
  </div>`;
}

function svgTendencia(porMes: { mes: string; val: number }[], titulo: string): string {
  if (porMes.length === 0) return "";
  const w = 480, h = 130, pad = 28;
  const max = Math.max(1, ...porMes.map(p => p.val));
  const stepX = (w - pad * 2) / Math.max(1, porMes.length - 1);
  const puntos = porMes.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (p.val / max) * (h - pad * 2);
    return { x, y, ...p };
  });
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${linea} L ${puntos[puntos.length - 1].x.toFixed(1)} ${h - pad} L ${puntos[0].x.toFixed(1)} ${h - pad} Z`;
  const dots = puntos.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#10B981"/>
    <text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(1)}" text-anchor="middle" font-size="9" fill="#0D1526" font-weight="700">${p.val}</text>`).join("");
  const labels = puntos.map(p => `<text x="${p.x.toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="8" fill="#94a3b8">${p.mes}</text>`).join("");
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:18px">
    <h3 style="font-size:12px;margin:0 0 10px;color:#0D1526">${titulo}</h3>
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}">
      <path d="${area}" fill="#10B98115"/>
      <path d="${linea}" fill="none" stroke="#10B981" stroke-width="2"/>
      ${dots}${labels}
    </svg>
  </div>`;
}

// Agrupa hallazgos por mes (de createdAt) para la tendencia
function tendenciaPorMes(hallazgos: any[]): { mes: string; val: number }[] {
  const meses: Record<string, number> = {};
  hallazgos.forEach(h => {
    const f = (h.createdAt ?? h.fechaCompromiso ?? "").slice(0, 7);
    if (f) meses[f] = (meses[f] ?? 0) + 1;
  });
  return Object.entries(meses).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
    .map(([mes, val]) => ({ mes: mes.slice(5) + "/" + mes.slice(2, 4), val }));
}

// ── Evidencias fotográficas desde Consolidado, relacionadas por cediId ───────
// Las fotos viven embebidas en los campos observacion* de las auditorías CEDI.
export function extraerEvidencias(auditorias: any[], cediIds: Set<string>): { cedi: string; fecha: string; fotos: any[] }[] {
  const campos = ["observacionInventario","observacionCaja","observacionCartera","observacionLogistica","observacionBioseguridad","observacionInfraestructura","observacionProcedimientos","observacionRiesgo"];
  const resultado: { cedi: string; fecha: string; fotos: any[] }[] = [];
  auditorias.forEach(a => {
    if (cediIds.size > 0 && !cediIds.has(a.cediId)) return;
    const fotos: any[] = [];
    campos.forEach(campo => {
      const txt = a[campo] ?? "";
      const m = txt.match(/\[FOTOS\]([\s\S]*?)\[\/FOTOS\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[1]);
          if (Array.isArray(arr)) arr.forEach((f: any) => fotos.push({ ...f, area: campo.replace("observacion", "") }));
        } catch { /* ignore */ }
      }
    });
    if (fotos.length > 0) resultado.push({ cedi: a.cediId, fecha: a.fechaVisita ?? "", fotos });
  });
  return resultado;
}

function seccionEvidencias(evidencias: { cedi: string; fecha: string; fotos: any[] }[], cedisMap: Record<string,string>): string {
  if (evidencias.length === 0) return "";
  const bloques = evidencias.map(ev => {
    const imgs = evidenciasGridHTML(ev.fotos.map((f: any) => ({ src: f.d, titulo: f.area || undefined })), { max: 6 });
    return `<div style="margin-bottom:14px">
      <p style="font-size:11px;font-weight:600;color:#0D1526;margin:0 0 4px">${cedisMap[ev.cedi] || "—"} · Visita ${fmtFecha(ev.fecha)} · ${ev.fotos.length} evidencia(s)</p>
      ${imgs}
    </div>`;
  }).join("");
  return `<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:18px 0 16px">Evidencias Fotográficas</h2>
    <p style="font-size:10px;color:#94a3b8;margin:0 0 10px">Imágenes obtenidas automáticamente desde el módulo Consolidado, relacionadas por CEDI.</p>
    ${bloques}`;
}

// ── Construcción del HTML por modelo ────────────────────────────────────────
export function construirInforme(modelo: ModeloId, hallazgos: any[], cedisMap: Record<string,string>, usuario: string, filtrosTxt: string[], evidencias: { cedi: string; fecha: string; fotos: any[] }[] = []): string {
  const k = calcular(hallazgos);
  const md = MODELOS.find(m => m.id === modelo)!;
  const cuerpo: string[] = [];

  const indicadoresBase = [
    { l:"Hallazgos", v:k.total, c:"#4A7AFF" },
    { l:"Críticos", v:k.criticos, c:"#EF4444" },
    { l:"Abiertos", v:k.abiertos, c:"#F59E0B" },
    { l:"Cerrados", v:k.cerrados, c:"#22C55E" },
    { l:"Reincidentes", v:k.reincidentes, c:"#8B5CF6" },
    { l:"Cumplimiento", v:k.cumpl+"%", c:"#10B981" },
  ];
  const barrasCrit = Object.entries(k.critCount).map(([label,val]) => ({ label, val: val as number, color: label==="Crítica"?"#EF4444":label==="Alta"?"#F59E0B":label==="Media"?"#FBBF24":"#22C55E" }));
  const barrasEstado = Object.entries(k.estadoCount).map(([label,val]) => ({ label, val: val as number, color:"#4A7AFF" }));
  const barrasRiesgo = Object.entries(k.riesgoCount).map(([label,val]) => ({ label, val: val as number, color:"#8B5CF6" }));

  if (modelo === "ejecutivo") {
    cuerpo.push(`<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:0 0 16px">Resumen Ejecutivo</h2>`);
    cuerpo.push(tarjetasIndicadores(indicadoresBase));
    // Dashboard ejecutivo con visualizaciones
    cuerpo.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      ${svgDona(barrasCrit, "Distribución por Criticidad")}
      ${svgGauge(k.cumpl, "Estado de Cumplimiento Global", `${k.cerrados} de ${k.total} hallazgos cerrados`)}
    </div>`);
    cuerpo.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">${barras("Estado de Cumplimiento", barrasEstado)}${barras("Riesgos por Tipo", barrasRiesgo)}</div>`);
    cuerpo.push(`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;font-size:11px;line-height:1.7;color:#166534;margin-top:6px">
      <strong>Diagnóstico:</strong> Se evaluaron ${k.total} hallazgos en los CEDIS auditados, con ${k.criticos} de criticidad crítica (${k.total>0?Math.round(k.criticos/k.total*100):0}%) y ${k.abiertos} abiertos. El cumplimiento global es del ${k.cumpl}%. ${k.reincidentes>0?`Se registran ${k.reincidentes} hallazgo(s) reincidente(s) que requieren atención prioritaria.`:"Sin reincidencias registradas."}</div>`);
    cuerpo.push(seccionEvidencias(evidencias, cedisMap));
  } else if (modelo === "operativo") {
    cuerpo.push(`<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:0 0 16px">Hallazgos y Planes de Acción</h2>`);
    cuerpo.push(tarjetasIndicadores(indicadoresBase.slice(0,3)));
    cuerpo.push(tablaHallazgos(hallazgos, cedisMap));
    cuerpo.push(`<h3 style="font-size:13px;margin:14px 0 10px;color:#0D1526">Detalle de Planes y Seguimiento</h3>`);
    hallazgos.slice(0,10).forEach(h => {
      cuerpo.push(`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:#0D1526">${h.titulo||"—"} <span style="font-weight:400;color:#94a3b8;font-size:10px">· ${cedisMap[h.cediId]||"—"} · ${normCrit(h.criticidad)}</span></div>
        <p style="font-size:10.5px;color:#475569;margin:6px 0">${(h.descripcion||"Sin descripción").slice(0,260)}</p>
        ${h.recomendacionIA?`<div style="font-size:10px;color:#166534;background:#f0fdf4;border-radius:6px;padding:8px;margin-top:6px"><strong>Plan/Recomendación IA:</strong> ${h.recomendacionIA.replace(/[#*]/g,"").slice(0,280)}</div>`:""}
        <div style="font-size:9.5px;color:#94a3b8;margin-top:6px">Responsable: ${h.responsable||"—"} · Avance: ${h.porcentajeAvance??0}% · Estado: ${normEstado(h.estado)}</div>
      </div>`);
    });
    cuerpo.push(seccionEvidencias(evidencias, cedisMap));
  } else if (modelo === "estrategico") {
    cuerpo.push(`<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:0 0 16px">Análisis Estratégico</h2>`);
    cuerpo.push(tarjetasIndicadores(indicadoresBase));
    cuerpo.push(svgTendencia(tendenciaPorMes(hallazgos), "Tendencia de Hallazgos por Mes"));
    cuerpo.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">${svgDona(barrasCrit, "Distribución por Criticidad")}${barras("Distribución por Tipo de Riesgo", barrasRiesgo)}</div>`);
    cuerpo.push(`<h3 style="font-size:13px;margin:14px 0 10px;color:#0D1526">Recomendaciones IA Consolidadas</h3>`);
    const conIA = hallazgos.filter(h => h.recomendacionIA);
    if (conIA.length) {
      conIA.slice(0,8).forEach(h => cuerpo.push(`<div style="border-left:3px solid #10B981;padding:6px 12px;margin-bottom:8px;background:#f8fafc">
        <div style="font-size:11px;font-weight:600;color:#0D1526">${h.titulo||"—"}</div>
        <p style="font-size:10px;color:#475569;margin:4px 0 0">${h.recomendacionIA.replace(/[#*]/g,"").slice(0,240)}</p></div>`));
    } else {
      cuerpo.push(`<p style="font-size:11px;color:#94a3b8">No hay recomendaciones IA generadas para los hallazgos filtrados. Usa los botones "Recomendaciones IA" en cada plan para generarlas.</p>`);
    }
  } else if (modelo === "corporativo") {
    cuerpo.push(`<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:0 0 16px">Consolidado Corporativo por CEDIS</h2>`);
    cuerpo.push(tarjetasIndicadores(indicadoresBase));
    // Agrupar por CEDI
    const porCedi: Record<string, any[]> = {};
    hallazgos.forEach(h => { (porCedi[h.cediId] = porCedi[h.cediId] || []).push(h); });
    const filasCedi = Object.entries(porCedi).map(([cid, hs]) => {
      const kc = calcular(hs);
      return `<tr>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-weight:600">${cedisMap[cid]||"—"}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${kc.total}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#EF4444;font-weight:700">${kc.criticos}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${kc.abiertos}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${kc.cerrados}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:${kc.cumpl>=70?"#22C55E":kc.cumpl>=40?"#F59E0B":"#EF4444"}">${kc.cumpl}%</td>
      </tr>`;
    }).join("");
    cuerpo.push(`<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:8px;border-bottom:2px solid #e2e8f0">CEDI</th>
        <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Hallazgos</th>
        <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Críticos</th>
        <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Abiertos</th>
        <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Cerrados</th>
        <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Cumplimiento</th>
      </tr></thead><tbody>${filasCedi}</tbody></table>`);
    cuerpo.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">${svgDona(barrasRiesgo.map(r=>({...r,color:r.label==="REPUTACIONAL"?"#8B5CF6":r.label==="FINANCIERO"?"#F59E0B":r.label==="CONTAGIO"?"#EC4899":r.label==="LEGAL"?"#EF4444":"#4A7AFF"})), "Riesgos por Tipo (Consolidado)")}${barras("Cumplimiento por CEDI", Object.entries(porCedi).map(([cid,hs])=>({label:cedisMap[cid]||"—",val:calcular(hs).cumpl,color:"#10B981"})))}</div>`);
    cuerpo.push(seccionEvidencias(evidencias, cedisMap));
  } else if (modelo === "tecnico") {
    cuerpo.push(`<h2 style="font-size:16px;border-left:4px solid #10B981;padding-left:10px;margin:0 0 16px">Trazabilidad y Cumplimiento Detallado</h2>`);
    cuerpo.push(tarjetasIndicadores(indicadoresBase));
    cuerpo.push(`<h3 style="font-size:13px;margin:10px 0;color:#0D1526">Registro Completo de Hallazgos</h3>`);
    hallazgos.forEach((h, i) => {
      cuerpo.push(`<div style="border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px;font-size:10px">
        <div style="font-weight:700;color:#0D1526;font-size:11px">#${i+1} · ${h.titulo||"—"}</div>
        <table style="width:100%;margin-top:6px;font-size:9.5px;color:#475569">
          <tr><td style="padding:2px;width:33%"><strong>CEDI:</strong> ${cedisMap[h.cediId]||"—"}</td><td style="padding:2px;width:33%"><strong>Subtema:</strong> ${h.subtema||"—"}</td><td style="padding:2px"><strong>Categoría:</strong> ${h.categoria||"—"}</td></tr>
          <tr><td style="padding:2px"><strong>Criticidad:</strong> ${normCrit(h.criticidad)}</td><td style="padding:2px"><strong>Riesgo:</strong> ${h.tipoRiesgo||"—"}</td><td style="padding:2px"><strong>Estado:</strong> ${normEstado(h.estado)}</td></tr>
          <tr><td style="padding:2px"><strong>Responsable:</strong> ${h.responsable||"—"}</td><td style="padding:2px"><strong>Compromiso:</strong> ${fmtFecha(h.fechaCompromiso)}</td><td style="padding:2px"><strong>Avance:</strong> ${h.porcentajeAvance??0}%</td></tr>
        </table>
        <p style="font-size:9.5px;color:#475569;margin:6px 0 0"><strong>Descripción:</strong> ${(h.descripcion||"—").slice(0,300)}</p>
      </div>`);
    });
  }

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${portada("Informe " + md.label, md.desc, usuario, filtrosTxt)}
    <div style="padding:30px 40px">${cuerpo.join("")}${pie()}</div>
  </div>`;
}

// ── Modal generador de informes ─────────────────────────────────────────────
export function InformeCedisModal({ hallazgos, cedis, auditorias = [], usuario, apiToken = "", usuarioEmail = "", onClose }: {
  hallazgos: any[];
  cedis: { id: string; nombre: string }[];
  auditorias?: any[];
  usuario: string;
  apiToken?: string;
  usuarioEmail?: string;
  onClose: () => void;
}) {
  const [modelo, setModelo]       = useState<ModeloId>("ejecutivo");
  const [fCedi, setFCedi]         = useState("");
  const [fSubtema, setFSubtema]   = useState("");
  const [fEstado, setFEstado]     = useState("");
  const [fCrit, setFCrit]         = useState("");
  const [fFechaVisita, setFFechaVisita]   = useState("");
  const [fFechaRegistro, setFFechaRegistro] = useState("");
  const [generando, setGenerando] = useState(false);
  const [generandoXlsx, setGenerandoXlsx] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [correosExtra, setCorreosExtra] = useState("");
  const [envioMsg, setEnvioMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const cedisMap = useMemo(() => Object.fromEntries(cedis.map(c => [c.id, c.nombre])), [cedis]);
  const subtemas = useMemo(() => Array.from(new Set(hallazgos.map(h => h.subtema).filter(Boolean))), [hallazgos]);

  // Filtrado por los filtros activos
  const filtrados = useMemo(() => {
    return hallazgos.filter(h => {
      if (fCedi && h.cediId !== fCedi) return false;
      if (fSubtema && h.subtema !== fSubtema) return false;
      if (fEstado && normEstado(h.estado) !== fEstado) return false;
      if (fCrit && normCrit(h.criticidad) !== fCrit) return false;
      if (fFechaVisita) { const f = (h.fechaCompromiso ?? h.createdAt ?? "").slice(0,7); if (f !== fFechaVisita) return false; }
      if (fFechaRegistro) { const f = (h.createdAt ?? "").slice(0,7); if (f !== fFechaRegistro) return false; }
      return true;
    });
  }, [hallazgos, fCedi, fSubtema, fEstado, fCrit, fFechaVisita, fFechaRegistro]);

  const filtrosTxt = useMemo(() => {
    const t: string[] = [];
    if (fCedi) t.push(`CEDI: ${cedisMap[fCedi]||fCedi}`);
    if (fSubtema) t.push(`Subtema: ${fSubtema}`);
    if (fEstado) t.push(`Estado: ${fEstado}`);
    if (fCrit) t.push(`Criticidad: ${fCrit}`);
    if (fFechaVisita) t.push(`Fecha visita: ${fFechaVisita}`);
    if (fFechaRegistro) t.push(`Fecha registro: ${fFechaRegistro}`);
    return t;
  }, [fCedi, fSubtema, fEstado, fCrit, fFechaVisita, fFechaRegistro, cedisMap]);

  function construirHTMLActual(): string {
    const cediIds = new Set(filtrados.map(h => h.cediId).filter(Boolean));
    const evidencias = extraerEvidencias(auditorias, cediIds);
    return construirInforme(modelo, filtrados, cedisMap, usuario, filtrosTxt, evidencias);
  }

  async function descargar() {
    if (filtrados.length === 0) return;
    setGenerando(true);
    try {
      const html = construirHTMLActual();
      const md = MODELOS.find(m => m.id === modelo)!;
      await generarPDF(html, `Informe-${md.label.replace(/ /g,"-")}-CEDIS-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e: any) {
      alert("Error al generar el informe: " + (e?.message ?? "desconocido"));
    } finally { setGenerando(false); }
  }

  async function descargarXlsx() {
    if (filtrados.length === 0) return;
    setGenerandoXlsx(true);
    try {
      const md = MODELOS.find(m => m.id === modelo)!;
      await generarXLSXCedis(filtrados, cedisMap, `Informe-${md.label.replace(/ /g,"-")}-CEDIS-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      alert("Error al generar el Excel: " + (e?.message ?? "desconocido"));
    } finally { setGenerandoXlsx(false); }
  }

  async function enviarCorreo() {
    if (filtrados.length === 0) return;
    const destinatarios = [usuarioEmail, ...correosExtra.split(/[,;\s]+/).map(s => s.trim())].filter(e => e && e.includes("@"));
    if (destinatarios.length === 0) { setEnvioMsg({ ok: false, texto: "No hay correo de destino válido" }); return; }
    setEnviando(true); setEnvioMsg(null);
    try {
      const html = construirHTMLActual();
      const md = MODELOS.find(m => m.id === modelo)!;
      const pdfBase64 = await generarPDFBase64(html);
      const k = calcular(filtrados);
      const htmlEmail = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0D1526,#0A2D1F);padding:28px;text-align:center;border-radius:8px 8px 0 0">
          <div style="color:#fff;font-size:20px;font-weight:800">Pollos Savicol S.A.S.</div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Control Interno y Auditoría · CEDIS</div>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
          <h2 style="color:#1a202c;font-size:16px;margin-bottom:12px">Informe ${md.label}</h2>
          <p style="color:#475569;font-size:13px;line-height:1.7">Se adjunta el informe ejecutivo de cumplimiento CEDIS (${filtrados.length} hallazgos en alcance). Cumplimiento global: <strong>${k.cumpl}%</strong> · Críticos: <strong>${k.criticos}</strong>.</p>
          ${filtrosTxt.length ? `<p style="color:#94a3b8;font-size:11px">Filtros: ${filtrosTxt.join(" · ")}</p>` : ""}
        </div>
        <div style="background:#0D1526;padding:12px;text-align:center;border-radius:0 0 8px 8px">
          <p style="color:rgba(255,255,255,0.5);font-size:10px;margin:0">Pollos Savicol S.A.S. · Auditoría Interna</p>
        </div></div>`;
      const r = await enviarInformeCorreo({
        destinatarios, asunto: `Informe ${md.label} · CEDIS · Savicol`,
        htmlEmail, pdfBase64,
        pdfFilename: `Informe-${md.label.replace(/ /g,"-")}-CEDIS-${new Date().toISOString().slice(0,10)}.pdf`,
        apiToken,
      });
      setEnvioMsg({ ok: r.ok, texto: r.message });
    } catch (e: any) {
      setEnvioMsg({ ok: false, texto: e?.message ?? "Error al enviar" });
    } finally { setEnviando(false); }
  }

  const SEL = "bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500/50 outline-none";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D4A] sticky top-0 bg-[#0D1526] z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400"/>
            <h3 className="font-display font-semibold text-white text-sm">Generar Informe Ejecutivo · CEDIS</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Selector de modelo */}
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Modelo de Informe</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODELOS.map(m => (
                <button key={m.id} onClick={() => setModelo(m.id)}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors ${modelo===m.id ? "bg-emerald-500/15 border-emerald-500/50" : "bg-[#0A111F] border-[#1E2D4A] hover:border-[#2A3F6A]"}`}>
                  <m.icon className={`w-4 h-4 mt-0.5 shrink-0 ${modelo===m.id ? "text-emerald-400" : "text-[#94A3B8]"}`}/>
                  <div>
                    <p className="text-xs font-semibold text-white">{m.label}</p>
                    <p className="text-[10px] text-[#94A3B8] leading-snug mt-0.5">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Filter className="w-3 h-3"/> Filtros de Generación</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <select value={fCedi} onChange={e=>setFCedi(e.target.value)} className={SEL}><option value="">Todos los CEDIS</option>{cedis.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
              <select value={fSubtema} onChange={e=>setFSubtema(e.target.value)} className={SEL}><option value="">Todos los subtemas</option>{subtemas.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className={SEL}><option value="">Todos los estados</option>{["Abierto","En Plan","En Verificación","Cerrado","Reincidente"].map(e=><option key={e} value={e}>{e}</option>)}</select>
              <select value={fCrit} onChange={e=>setFCrit(e.target.value)} className={SEL}><option value="">Toda criticidad</option>{["Crítica","Alta","Media","Baja"].map(c=><option key={c} value={c}>{c}</option>)}</select>
              <input type="month" value={fFechaVisita} onChange={e=>setFFechaVisita(e.target.value)} className={SEL} title="Fecha de visita"/>
              <input type="month" value={fFechaRegistro} onChange={e=>setFFechaRegistro(e.target.value)} className={SEL} title="Fecha de registro"/>
            </div>
          </div>

          {/* Resumen alcance */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0A111F] border border-[#1E2D4A]">
            <span className="text-xs text-[#94A3B8]">Registros en alcance: <strong className="text-white">{filtrados.length}</strong> de {hallazgos.length}</span>
            {filtrados.length === 0 && <span className="text-[10px] text-amber-400">Ajusta los filtros: no hay registros</span>}
          </div>

          {/* Exportaciones */}
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Exportar / Visualizar</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={descargar} disabled={generando || filtrados.length===0}
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                {generando ? "Generando..." : "PDF Ejecutivo"}
              </button>
              <button onClick={descargarXlsx} disabled={generandoXlsx || filtrados.length===0}
                className="px-3 py-2 rounded-lg bg-[#1A2540] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {generandoXlsx ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5"/>}
                {generandoXlsx ? "Generando..." : "XLSX Ejecutivo"}
              </button>
              <a href="/cedis" target="_self"
                className="px-3 py-2 rounded-lg bg-[#1A2540] border border-[#4A7AFF]/30 text-[#4A7AFF] hover:bg-[#4A7AFF]/10 text-xs font-bold flex items-center justify-center gap-2">
                <BarChart3 className="w-3.5 h-3.5"/> Abrir Dashboard BI
              </a>
            </div>
          </div>

          {/* Envío por correo con trazabilidad */}
          <div className="rounded-lg border border-[#1E2D4A] bg-[#0A111F] p-3">
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Mail className="w-3 h-3"/> Enviar Informe por Correo</p>
            <p className="text-[10px] text-[#64748B] mb-2">Destinatario principal: <strong className="text-[#94A3B8]">{usuarioEmail || "(usuario autenticado)"}</strong>. Adjunta el PDF generado.</p>
            <div className="flex items-center gap-2">
              <input value={correosExtra} onChange={e=>setCorreosExtra(e.target.value)}
                placeholder="Correos adicionales (separados por coma)"
                className="flex-1 bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-[#475569] focus:border-emerald-500/50 outline-none"/>
              <button onClick={enviarCorreo} disabled={enviando || filtrados.length===0}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40 shrink-0">
                {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </div>
            {envioMsg && (
              <p className={`text-[10px] mt-2 ${envioMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{envioMsg.texto}</p>
            )}
          </div>

          <div className="flex items-center justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
