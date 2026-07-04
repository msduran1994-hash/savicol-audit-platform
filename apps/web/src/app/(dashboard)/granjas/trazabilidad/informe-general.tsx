"use client";
import { useState, useMemo } from "react";
import { X, FileText, Download, Loader2, Building2, Calendar, Hash, User, Mail } from "lucide-react";
import { LOGO_SAVICOL } from "../../cedis/cumplimiento/savicol-logo";
import { evidenciasGridHTML, type FotoPDF } from "@/lib/pdf-evidencias";
import { EnvioCorreoModal } from "./envio-correo";
import { apiGet } from "@/lib/api";
import { leerMetaFoto, calcularCumplimiento, type LoteItem, type ChecklistData, type Muestreo } from "@/hooks/useLotes";

/* ════════════════════════════════════════════════════════════════════════════
   INFORME GENERAL DE AUDITORÍA · Granjas → Trazabilidad → Lotes (Etapa 1)
   Consolida los lotes filtrados en un informe ejecutivo: portada, índice,
   Cap I–III, fichas técnicas por galpón (con indicadores y evidencias grandes)
   y anexos. Redacción técnica determinista (sin datos ficticios). Reutiliza el
   helper de evidencias y el proxy de imágenes ya existentes.
   ════════════════════════════════════════════════════════════════════════════ */

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-4", area: "Control Interno y Auditoría · Trazabilidad Avícola" };
const CYAN = "#06B6D4", VERDE = "#22C55E", ROJO = "#EF4444", NARANJA = "#F59E0B";

// Conteos de aves = enteros. Ignora separadores de miles ("13.100" o "13,100" → 13100).
const numv = (v: any) => { const n = parseInt((v ?? "").toString().replace(/[^\d]/g, ""), 10); return isFinite(n) ? n : 0; };
const fFecha = (d?: string) => { if (!d) return "—"; const t = new Date(d + (d.length <= 10 ? "T00:00:00" : "")); return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }); };
const fNum = (n: number) => (n ?? 0).toLocaleString("es-CO");

const MORT_RANGO_D7 = 0.7; // % acumulado máximo al día 7 para "cumple"

function galponesDeLote(l: LoteItem): string[] {
  const s = new Set<string>();
  if (l.data.galponPrincipal) s.add(l.data.galponPrincipal);
  (l.data.galponesEvaluados || "").split(/[,;/\s]+/).filter(Boolean).forEach(g => s.add(g));
  return Array.from(s);
}

function mortLote(l: LoteItem) {
  const recep: any[] = (l.data as any).recepcion || [];
  const seg: any[] = (l.data as any).seguimiento || [];
  let pob = numv((recep.find((f: any) => /total\s+recibido/i.test(f.parametro)) || {}).valor);
  let fuente = "Total recibido (Recepción)";
  if (pob <= 0) { for (let i = 0; i < 7; i++) { const v = numv(seg[i]?.avesVivas); if (v > 0) { pob = v; fuente = `Aves vivas Día ${i + 1}`; break; } } }
  let totalMuertas = 0; for (let i = 0; i < 7; i++) totalMuertas += numv(seg[i]?.avesMuertas);
  const general = pob > 0 ? (totalMuertas / pob) * 100 : 0;
  const vivasFinales = pob > 0 ? Math.max(0, pob - totalMuertas) : 0;
  let ultimo = -1; for (let i = 0; i < 7; i++) { if (seg[i] && Object.values(seg[i]).some(v => (v ?? "").toString().trim() !== "")) ultimo = i; }
  return { pob, fuente, totalMuertas, general, vivasFinales, tieneD7: pob > 0 && ultimo >= 6, cumple: pob > 0 && ultimo >= 6 && general <= MORT_RANGO_D7, seg };
}

// ── Checklists (Encasetamiento / Trazabilidad 7 Días) y Muestreos por galpón ──
const TIPO_LABEL: Record<string, string> = { encacetamiento: "Checklist Encasetamiento", trazabilidad7: "Checklist Trazabilidad 7 Días" };
const RESULTADO_LABEL: Record<string, string> = { cumple: "Cumple", no_cumple: "No cumple", parcial: "Parcial", na: "N/A", "": "—" };
const RESULTADO_COLOR: Record<string, string> = { cumple: "#16A34A", no_cumple: "#DC2626", parcial: "#D97706", na: "#64748B", "": "#64748B" };
function checklistsGalpon(chks: ChecklistData[], g: string): ChecklistData[] {
  return chks.filter(c => !c.galpon || c.galpon === g || c.galpon === "TODOS");
}
function muestreosGalpon(chks: ChecklistData[], g: string): Muestreo[] {
  const out: Muestreo[] = [];
  chks.forEach(c => (c.muestreos || []).forEach(m => { if ((m.galpon || c.galpon) === g) out.push(m); }));
  return out;
}
function statMuestreo(ms: Muestreo[]) {
  const v = ms.filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0);
  const totalM = v.length, pollitos = v.reduce((s, m) => s + m.cantidad, 0), pesoT = v.reduce((s, m) => s + m.pesoTotal, 0);
  const unit = pollitos > 0 ? pesoT / pollitos : 0;
  const us = v.map(m => m.pesoTotal / m.cantidad);
  const mean = us.length ? us.reduce((a, u) => a + u, 0) / us.length : 0;
  const sd = us.length ? Math.sqrt(us.reduce((a, u) => a + (u - mean) ** 2, 0) / us.length) : 0;
  const cv = mean > 0 ? (sd / mean) * 100 : 0;
  const estado = totalM === 0 ? { l: "Sin datos", c: "#64748B" } : cv <= 8 ? { l: "Dentro del rango", c: VERDE } : cv <= 12 ? { l: "Variación moderada", c: NARANJA } : { l: "Variación significativa", c: ROJO };
  return { totalM, pollitos, pesoT, unit, cv, estado };
}

// Renderiza UN checklist una sola vez: encabezado + respuestas + muestreos + evidencias.
// Se usa en la sección consolidada para que NO se repitan tablas ni fotos entre fichas.
function renderChecklist(c: ChecklistData): string {
  const preguntas = c.preguntas || [];
  const pct = calcularCumplimiento(preguntas.map(p => p.resultado));
  const col = pct >= 90 ? VERDE : pct >= 70 ? NARANJA : ROJO;
  const resp = preguntas.filter(p => p.resultado !== "");
  const evids: FotoPDF[] = preguntas.filter(p => p.evidencia && /^data:image\//i.test(p.evidencia)).map(p => ({ src: p.evidencia as string, titulo: p.pregunta, pie: RESULTADO_LABEL[p.resultado] || p.resultado }));
  const ms = (c.muestreos || []).filter(m => (m.cantidad ?? 0) > 0 || (m.pesoTotal ?? 0) > 0);
  const st = statMuestreo(ms);
  const galTxt = c.galpon === "TODOS" ? "Todos los galpones" : c.galpon ? `Galpón ${c.galpon}` : "—";
  const galPesaje = (m: Muestreo) => m.galpon || (c.galpon && c.galpon !== "TODOS" ? c.galpon : "—");
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:11px;margin-bottom:18px">
    <div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:20px;color:#0D1526">${TIPO_LABEL[c.tipo] || c.tipo}${c.diaEvaluado ? ` · Día ${c.diaEvaluado}` : ""}</strong><span style="font-size:20px;color:${col};font-weight:700">${pct}%</span></div>
    <div style="font-size:15px;color:#94a3b8;margin:3px 0 8px">${c.granjaNombre || "—"} · ${galTxt} · Lote: ${c.lote || "—"} · Visita: ${fFecha(c.fechaVisita)} · Auditor: ${c.auditor || "—"} · ${resp.length}/${preguntas.length} respondidas</div>
    ${resp.length ? `<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Sección</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Pregunta</th><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">Resultado</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${resp.map(p => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#64748b">${p.seccion || "—"}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9">${p.pregunta}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center;color:${RESULTADO_COLOR[p.resultado] || "#64748b"};font-weight:700">${RESULTADO_LABEL[p.resultado] || p.resultado}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${p.observacion || ""}</td></tr>`).join("")}</tbody></table>` : '<p style="font-size:15px;color:#94a3b8;margin:0">Sin respuestas registradas.</p>'}
    ${ms.length ? `<div style="font-size:17px;font-weight:700;color:#475569;margin:11px 0 4px">Muestreos (pesajes)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:15px;margin-bottom:5px">
        ${[["Muestreos", String(st.totalM)], ["Aves", String(st.pollitos)], ["Peso total", `${st.pesoT.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg`], ["Peso unitario", `${st.unit.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg`], ["CV", `${st.cv.toFixed(1)}%`]].map(d => `<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 8px"><strong style="color:#0D1526">${d[1]}</strong> <span style="color:#64748b">${d[0]}</span></span>`).join("")}
        <span style="padding:4px 8px;border-radius:5px;background:${st.estado.c}22;color:${st.estado.c};font-weight:700">${st.estado.l}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">N.º</th><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">Galpón</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Pollitos</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Peso total (kg)</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${ms.map(m => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center">${m.n}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center">${galPesaje(m)}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.cantidad}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.pesoTotal}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${m.obs || ""}</td></tr>`).join("")}</tbody></table>` : ""}
    ${evids.length ? `<div style="font-size:15px;font-weight:700;color:#475569;margin:9px 0 3px">Evidencias del checklist (${evids.length})</div>${evidenciasGridHTML(evids)}` : ""}
    ${(c.observacionGeneral || "").trim() ? `<div style="margin-top:9px;background:#f8fafc;border-left:4px solid ${CYAN};border-radius:0 6px 6px 0;padding:7px 11px"><div style="font-size:15px;font-weight:700;color:#0D1526">Observación general</div><div style="font-size:15px;color:#334155;line-height:1.6">${c.observacionGeneral}</div></div>` : ""}
    ${(c.planAccion || "").trim() ? `<div style="margin-top:6px;background:#fff7ed;border-left:4px solid ${NARANJA};border-radius:0 6px 6px 0;padding:7px 11px"><div style="font-size:15px;font-weight:700;color:#0D1526">Plan de acción correctivo</div><div style="font-size:15px;color:#334155;line-height:1.6">${c.planAccion}</div></div>` : ""}
  </div>`;
}

// ── PDF (jsPDF + html2canvas) · márgenes ICONTEC + paginado inteligente ─────
// Márgenes (mm) ~ NTC 1486: superior 3, inferior 3, izquierdo 3, derecho 2.
const MARGEN = { top: 30, bottom: 30, left: 30, right: 20 };
async function generarPDF(html: string, filename: string, opts?: { pageNumbers?: boolean; returnBase64?: boolean }): Promise<string | void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  let cont: HTMLDivElement | null = document.createElement("div");
  cont.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;z-index:-1;";
  cont.innerHTML = html;
  document.body.appendChild(cont);
  try {
    await new Promise(r => setTimeout(r, 700));
    const canvas = await html2canvas(cont, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false, windowWidth: 794 });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
    const usableW = pageW - MARGEN.left - MARGEN.right, usableH = pageH - MARGEN.top - MARGEN.bottom;
    const pxPerMm = canvas.width / usableW, pageHpx = Math.floor(usableH * pxPerMm);
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const filaBlanca = (band: Uint8ClampedArray, y: number): boolean => {
      const off = y * W * 4;
      // "Fila clara": permite cortar también entre filas de tabla (bordes #f1f5f9≈241,
      // fondos #f8fafc≈248) sin partir texto/fotos (píxeles oscuros < 236).
      for (let x = 0; x < W; x += 6) { const o = off + x * 4; if (band[o] < 236 || band[o + 1] < 236 || band[o + 2] < 236) return false; }
      return true;
    };
    let rendered = 0, page = 0;
    while (rendered < canvas.height) {
      let sliceH = Math.min(pageHpx, canvas.height - rendered);
      // Si no es la última porción, busca un corte por fila blanca (evita partir tablas/fotos)
      if (rendered + sliceH < canvas.height && ctx) {
        const lo = rendered + Math.floor(pageHpx * 0.5), hi = rendered + sliceH;
        try {
          const band = ctx.getImageData(0, lo, W, hi - lo).data;
          for (let y = (hi - lo) - 1; y >= 0; y--) { if (filaBlanca(band, y)) { sliceH = (lo - rendered) + y + 1; break; } }
        } catch { /* canvas tainted improbable (todo es base64); corte duro */ }
      }
      if (page > 0) pdf.addPage();
      const pc = document.createElement("canvas"); pc.width = W; pc.height = sliceH;
      const pctx = pc.getContext("2d");
      if (pctx) { pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, pc.width, pc.height); pctx.drawImage(canvas, 0, rendered, W, sliceH, 0, 0, W, sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg", 0.85), "JPEG", MARGEN.left, MARGEN.top, usableW, sliceH / pxPerMm, undefined, "FAST");
      rendered += sliceH; page++;
    }
    if (opts?.pageNumbers) {
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i); pdf.setFont("times", "normal"); pdf.setFontSize(9); pdf.setTextColor(120, 130, 145);
        pdf.text(`Página ${i} de ${total}`, pageW - MARGEN.right, pageH - 12, { align: "right" });
      }
    }
    if (opts?.returnBase64) {
      // Devuelve el base64 (sin el prefijo data:...;base64,) para adjuntarlo al correo.
      return pdf.output("datauristring").split(",")[1] ?? "";
    }
    pdf.save(filename);
  } finally { if (cont?.parentNode) document.body.removeChild(cont); cont = null; }
}

// Resuelve una foto (data URL directa o enlace externo vía proxy) a base64
async function resolverFoto(url: string): Promise<string | null> {
  if (!url) return null;
  if (/^data:image\//i.test(url)) return url;
  try { const r = await fetch("/api/evidencia-img?url=" + encodeURIComponent(url)); if (r.ok) { const d = await r.json(); return d?.dataUrl ?? null; } } catch { /* ignore */ }
  return null;
}

interface FotoMeta { url: string; nombre: string; dia: string; galpon: string; loteCodigo: string; uploadedAt: string; }

// ── Construcción del HTML del informe ───────────────────────────────────────
function seccion(num: string, titulo: string, contenido: string): string {
  return `<div style="margin-bottom:16px"><h2 style="font-size:22px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 6px">${num} ${titulo}</h2><p style="font-size:20px;line-height:1.7;color:#334155;margin:0;text-align:justify">${(contenido || "—").replace(/\n/g, "<br>")}</p></div>`;
}

function construirInforme(opts: {
  form: any; lotes: LoteItem[]; fotosByLoteGalpon: Record<string, FotoPDF[]>; checklistsByGranja: Record<string, ChecklistData[]>; usuario: string;
}): string {
  const { form, lotes, fotosByLoteGalpon, checklistsByGranja, usuario } = opts;
  const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const morts = lotes.map(l => ({ l, m: mortLote(l) }));
  const totalAvesIni = morts.reduce((s, x) => s + x.m.pob, 0);
  const totalMuertas = morts.reduce((s, x) => s + x.m.totalMuertas, 0);
  const mortGeneral = totalAvesIni > 0 ? (totalMuertas / totalAvesIni) * 100 : 0;
  const cumplen = morts.filter(x => x.m.cumple).length;
  const granjasSet = Array.from(new Set(lotes.map(l => l.data.granjaNombre || "—")));

  // Portada
  const portada = `<div style="background:linear-gradient(135deg,#0D1526,#0A2533);color:#fff;padding:44px 40px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;gap:22px">
      <img src="${LOGO_SAVICOL}" style="width:84px;height:auto;border-radius:6px;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-size:20px;letter-spacing:3px;color:${CYAN};text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:32px;margin:10px 0 4px;font-weight:800">Informe General de Auditoría</h1>
        <p style="font-size:22px;color:#94A3B8;margin:0">${form.area || "Trazabilidad Avícola"}</p>
      </div>
    </div>
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:20px;color:#cbd5e1">
      <div><strong style="color:#fff">N.º de informe:</strong> ${form.numeroInforme || "—"}</div>
      <div><strong style="color:#fff">Empresa:</strong> ${EMPRESA.nombre}</div>
      <div><strong style="color:#fff">Granja(s):</strong> ${granjasSet.join(", ")}</div>
      <div><strong style="color:#fff">Lotes incluidos:</strong> ${lotes.length}</div>
      <div><strong style="color:#fff">Periodo de visita:</strong> ${form.visitaDesde ? fFecha(form.visitaDesde) : "—"} a ${form.visitaHasta ? fFecha(form.visitaHasta) : "—"}</div>
      <div><strong style="color:#fff">Fecha de emisión:</strong> ${form.fechaEmision ? fFecha(form.fechaEmision) : hoy}</div>
      <div><strong style="color:#fff">Auditor responsable:</strong> ${form.auditor || "—"}</div>
      <div><strong style="color:#fff">Líder del proceso:</strong> ${form.lider || "—"}</div>
    </div>
  </div>`;

  // Índice
  const indice = `<div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <h3 style="font-size:20px;color:#0D1526;margin:0 0 8px">Tabla de Contenido</h3>
    <ol style="font-size:17px;color:#475569;margin:0;padding-left:18px;line-height:1.9">
      <li>Resumen Ejecutivo</li>
      <li>Capítulo I — Aspectos Preliminares</li>
      <li>Capítulo II — Características Generales</li>
      <li>Fichas Técnicas por Galpón</li>
      <li>Anexos</li>
      <li>Capítulo III — Consideraciones (Conclusiones y Recomendaciones)</li>
    </ol>
  </div>`;

  // Resumen ejecutivo (determinista, datos reales)
  const resumen = `Se auditaron ${lotes.length} lote(s) en ${granjasSet.length} granja(s) durante el periodo ${form.visitaDesde ? fFecha(form.visitaDesde) : "—"} a ${form.visitaHasta ? fFecha(form.visitaHasta) : "—"}. La población inicial consolidada asciende a ${fNum(totalAvesIni)} aves, con ${fNum(totalMuertas)} bajas acumuladas y una mortalidad general del ${mortGeneral.toFixed(2)}%. De los lotes con seguimiento completo a 7 días, ${cumplen} cumplen el rango de mortalidad estipulado (≤ ${MORT_RANGO_D7}%). El presente informe consolida los registros de Datos Generales, Recepción, Seguimiento Día 1–7, Alistamiento, los Checklists de Encasetamiento y Trazabilidad 7 Días, los muestreos de pesaje y la evidencia fotográfica, relacionados por granja, lote, galpón y fecha de visita.`;

  // Capítulos (redacción técnica determinista)
  const capI = `<div style="page-break-before:always">
    ${seccion("1.1", "Objetivo", "Evaluar el cumplimiento de las condiciones técnicas, sanitarias y de bioseguridad en el proceso de recepción, encasetamiento y seguimiento de los primeros siete días de vida de los lotes auditados, verificando la trazabilidad y el desempeño productivo conforme a los estándares de la compañía.")}
    ${seccion("1.2", "Alcance", `La visita comprendió la revisión de los registros técnicos de ${lotes.length} lote(s) en ${granjasSet.join(", ")}, incluyendo datos generales, condiciones preliminares, recepción del pollito, seguimiento diario (D1–D7), alistamiento previo y la evidencia fotográfica por galpón, durante el periodo ${form.visitaDesde ? fFecha(form.visitaDesde) : "—"} a ${form.visitaHasta ? fFecha(form.visitaHasta) : "—"}.`)}
    ${seccion("1.3", "Enfoque", "Auditoría de cumplimiento orientada a verificar la conformidad de las condiciones operativas y sanitarias frente a los estándares técnicos, con énfasis en los indicadores de mortalidad y bioseguridad de la primera semana.")}
    ${seccion("1.4", "Métodos", "Revisión documental de los registros técnicos, análisis de los indicadores de mortalidad diaria y acumulada, contrastación contra los rangos estándar y verificación de la evidencia fotográfica.")}
    ${seccion("1.5", "Procedimientos", "Recopilación y consolidación de los registros por granja, lote y galpón; cálculo automático de los indicadores; identificación de hallazgos y clasificación de riesgos; y registro de observaciones.")}
    ${seccion("1.6", "Técnicas aplicadas", "Observación documental, análisis cuantitativo de indicadores, inspección de evidencia fotográfica y comparación contra estándar.")}
  </div>`;

  const capII = `<div style="page-break-before:always">
    ${seccion("2.1", "Marco legal aplicable", "Normativa sanitaria avícola vigente (ICA/INVIMA), lineamientos de bioseguridad de la compañía y protocolos internos de recepción, encasetamiento y seguimiento de lotes.")}
    ${seccion("2.2", "Observaciones derivadas del análisis", `La mortalidad general consolidada es del ${mortGeneral.toFixed(2)}%. ${cumplen} de ${lotes.length} lote(s) con seguimiento a 7 días se encuentran dentro del rango estipulado; el resto requiere revisión de causas y refuerzo de los planes de acción.`)}
    ${seccion("2.3", "Causas identificadas", "Cuando la mortalidad supera el rango, las causas se asocian típicamente a condiciones de recepción, manejo de temperatura de cama y ambiente, calidad del pollito y prácticas de bioseguridad en los primeros días.")}
    <div style="margin-bottom:16px">
      <h2 style="font-size:22px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 6px">2.4 Riesgos</h2>
      <table style="width:100%;border-collapse:collapse;font-size:17px">
        <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Tipo de riesgo</th><th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Descripción</th></tr></thead>
        <tbody>
        ${[["Legal", "Incumplimiento de normativa sanitaria y de bioseguridad aplicable."], ["Reputacional", "Afectación de la imagen ante clientes y autoridades por desviaciones sanitarias."], ["Financiero", "Pérdidas por mortalidad, conversión y reposición de lote."], ["Contagio", "Diseminación de agentes patógenos por fallas de bioseguridad."], ["Operativo", "Desviaciones de proceso en recepción, encasetamiento y seguimiento."]].map(r => `<tr><td style="padding:5px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0D1526">${r[0]}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;color:#334155">${r[1]}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${seccion("2.5", "Efectos y consecuencias", "Las desviaciones no controladas pueden traducirse en mayor mortalidad, menor uniformidad y desempeño productivo, además de exposición sanitaria y legal.")}
    ${seccion("2.6", "Controles existentes", "Protocolos de recepción y encasetamiento, registros de seguimiento D1–D7, control de temperatura y bioseguridad, y verificación documental por auditoría.")}
    ${seccion("2.7", "Planes de acción", "Atender los lotes fuera de rango con seguimiento reforzado, verificación de causas y cierre validado de las no conformidades identificadas.")}
  </div>`;

  const capIII = `<div style="page-break-before:always">
    ${seccion("3.1", "Fortalezas identificadas", `El proceso cuenta con registros técnicos estructurados y trazabilidad por granja, lote y galpón. ${cumplen} lote(s) se encuentran dentro del rango de mortalidad estipulado, evidenciando buenas prácticas de recepción y manejo inicial.`)}
    ${seccion("3.2", "Conclusiones", `La operación auditada presenta una mortalidad general del ${mortGeneral.toFixed(2)}% sobre ${fNum(totalAvesIni)} aves. Se recomienda priorizar la atención de los lotes que superan el rango y mantener el seguimiento sistemático de los indicadores.`)}
    ${seccion("3.3", "Recomendaciones", "Reforzar la verificación de temperatura de cama y ambiente en los primeros días, sostener las prácticas de bioseguridad, y consolidar el seguimiento de los planes de acción hasta su cierre verificado.")}
  </div>`;

  // Fichas técnicas por galpón
  let fichas = `<div style="page-break-before:always"><h2 style="font-size:24px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 12px">Fichas Técnicas por Galpón</h2></div>`;
  morts.forEach(({ l, m }) => {
    galponesDeLote(l).forEach((g, gi) => {
      const fotos = fotosByLoteGalpon[`${l.data.codigo}|${g}`] || [];
      const estadoColor = !m.tieneD7 ? "#64748B" : m.cumple ? VERDE : ROJO;
      const estadoTxt = !m.tieneD7 ? "Parcial" : m.cumple ? "CUMPLE" : "FUERA DE RANGO";
      // Los checklists/muestreos NO se dibujan por ficha (se repetirían entre galpones y
      // lotes de la misma granja); se consolidan UNA sola vez en "checklistsSection".
      // granjaChks queda vacío a propósito para anular el bloque de abajo sin alterarlo.
      const granjaChks: ChecklistData[] = [];
      const chksG = checklistsGalpon(granjaChks, g);
      const chkHtml = chksG.length === 0 ? "" : `<div style="font-size:17px;font-weight:700;color:#475569;margin:10px 0 4px">Checklists de Auditoría</div>${chksG.map(c => {
        const pct = calcularCumplimiento((c.preguntas || []).map(p => p.resultado));
        const col = pct >= 90 ? VERDE : pct >= 70 ? NARANJA : ROJO;
        const resp = (c.preguntas || []).filter(p => p.resultado !== "");
        const evidsChk: FotoPDF[] = (c.preguntas || []).filter(p => p.evidencia && /^data:image\//i.test(p.evidencia)).map(p => ({ src: p.evidencia as string, titulo: p.pregunta, pie: RESULTADO_LABEL[p.resultado] || p.resultado }));
        return `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:8px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;font-size:17px"><strong style="color:#0D1526">${TIPO_LABEL[c.tipo] || c.tipo}${c.diaEvaluado ? ` · Día ${c.diaEvaluado}` : ""}</strong><span style="color:${col};font-weight:700">${pct}%</span></div>
          <div style="font-size:14px;color:#94a3b8;margin:2px 0 4px">Lote: ${c.lote || "—"} · Fecha de visita: ${fFecha(c.fechaVisita)} · Auditor: ${c.auditor || "—"} · ${resp.length}/${(c.preguntas || []).length} respondidas</div>
          ${resp.length ? `<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Sección</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Pregunta</th><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">Resultado</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${resp.map(p => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#64748b">${p.seccion || "—"}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9">${p.pregunta}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center;color:${RESULTADO_COLOR[p.resultado] || "#64748b"};font-weight:700">${RESULTADO_LABEL[p.resultado] || p.resultado}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${p.observacion || ""}</td></tr>`).join("")}</tbody></table>` : '<p style="font-size:15px;color:#94a3b8;margin:0">Sin respuestas registradas.</p>'}
          ${evidsChk.length ? `<div style="font-size:15px;font-weight:700;color:#475569;margin:7px 0 3px">Evidencias del checklist (${evidsChk.length})</div>${evidenciasGridHTML(evidsChk)}` : ""}
        </div>`;
      }).join("")}`;
      // Muestreos (pesajes) del galpón: resumen + tabla
      const msG = muestreosGalpon(granjaChks, g).filter(m => (m.cantidad ?? 0) > 0 || (m.pesoTotal ?? 0) > 0);
      const st = statMuestreo(msG);
      const msHtml = msG.length === 0 ? "" : `<div style="font-size:17px;font-weight:700;color:#475569;margin:10px 0 4px">Muestreos (pesajes)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:15px;margin-bottom:5px">
          ${[["Muestreos", String(st.totalM)], ["Aves", String(st.pollitos)], ["Peso total", `${st.pesoT.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg`], ["Peso unitario", `${st.unit.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg`], ["CV", `${st.cv.toFixed(1)}%`]].map(d => `<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 8px"><strong style="color:#0D1526">${d[1]}</strong> <span style="color:#64748b">${d[0]}</span></span>`).join("")}
          <span style="padding:4px 8px;border-radius:5px;background:${st.estado.c}22;color:${st.estado.c};font-weight:700">${st.estado.l}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f8fafc"><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">N.º</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Pollitos</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Peso total (kg)</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${msG.map(m => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center">${m.n}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.cantidad}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.pesoTotal}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${m.obs || ""}</td></tr>`).join("")}</tbody></table>`;
      fichas += `<div style="${gi > 0 || true ? "page-break-before:always;" : ""}padding-top:6px">
        <div style="background:#0D1526;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-size:20px;font-weight:800">${l.data.granjaNombre || "—"} · Galpón ${g}</div><div style="font-size:17px;color:#94A3B8">Lote ${l.data.codigo || "—"} · ${l.data.tipoProduccion || "—"} · ${l.data.raza || "—"}</div></div>
          <span style="font-size:17px;font-weight:700;padding:3px 9px;border-radius:10px;background:${estadoColor}22;color:${estadoColor}">${estadoTxt}</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:14px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:17px;margin-bottom:12px">
            ${[["Fecha de ingreso", fFecha(l.data.fechaIngreso)], ["Edad (días)", String(l.data.edadDias || 0)], ["Población inicial", `${fNum(m.pob)} (${m.fuente})`], ["Aves vivas (final)", fNum(m.vivasFinales)], ["Aves muertas (total)", fNum(m.totalMuertas)], ["Mortalidad general", `${m.general.toFixed(2)}%`]].map(d => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px"><div style="font-size:14px;text-transform:uppercase;color:#94a3b8">${d[0]}</div><div style="font-weight:700;color:#0D1526">${d[1]}</div></div>`).join("")}
          </div>
          <div style="font-size:17px;font-weight:700;color:#475569;margin:6px 0 4px">Seguimiento Día 1–7 · Mortalidad</div>
          <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:10px">
            <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:4px;border-bottom:1px solid #e2e8f0">Indicador</th>${[1,2,3,4,5,6,7].map(d => `<th style="padding:4px;border-bottom:1px solid #e2e8f0">D${d}</th>`).join("")}</tr></thead>
            <tbody>
              ${[["Aves muertas", "avesMuertas"], ["Peso (g)", "peso"]].map(row => `<tr><td style="padding:4px;border-bottom:1px solid #f1f5f9;color:#475569">${row[0]}</td>${[0,1,2,3,4,5,6].map(i => `<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">${(m.seg[i]?.[row[1]] ?? "") || "—"}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
          ${(l.data as any).recepcionObs ? `<div style="font-size:17px;color:#475569;margin-bottom:8px"><strong>Observaciones:</strong> ${(l.data as any).recepcionObs}</div>` : ""}
          ${(l.data as any).recepcionPlan ? `<div style="font-size:17px;color:#475569;margin-bottom:8px"><strong>Plan de acción:</strong> ${(l.data as any).recepcionPlan}</div>` : ""}
          ${chkHtml}${msHtml}
          <div style="font-size:17px;font-weight:700;color:#475569;margin:8px 0 4px">Evidencias Fotográficas</div>
          ${fotos.length > 0 ? evidenciasGridHTML(fotos) : '<p style="font-size:17px;color:#94a3b8;margin:0">Sin evidencias fotográficas para este galpón.</p>'}
        </div>
      </div>`;
    });
  });

  // Sección consolidada: cada checklist (respuestas + muestreos + evidencias) UNA sola vez,
  // ordenado por granja → galpón → tipo. Evita las tablas/fotos repetidas de las fichas.
  const todosChks = Object.values(checklistsByGranja).flat()
    .sort((a, b) => (a.granjaNombre || "").localeCompare(b.granjaNombre || "") || (a.galpon || "").localeCompare(b.galpon || "") || (a.tipo || "").localeCompare(b.tipo || ""));
  const checklistsSection = todosChks.length === 0 ? "" : `<div style="page-break-before:always"><h2 style="font-size:24px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">Checklists de Auditoría y Muestreos</h2><p style="font-size:15px;color:#94a3b8;margin:0 0 14px">${todosChks.length} checklist(s) de la(s) granja(s) del alcance. Cada uno se presenta una sola vez con sus respuestas, muestreos y evidencias.</p></div>${todosChks.map(renderChecklist).join("")}`;

  // Anexos
  const anexoTabla = `<div style="page-break-before:always">
    <h2 style="font-size:24px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">Anexos · Tabla Consolidada de Lotes</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Granja</th><th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Galpón</th><th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Lote</th><th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Ingreso</th><th style="text-align:right;padding:5px;border-bottom:2px solid #e2e8f0">Pobl. inicial</th><th style="text-align:right;padding:5px;border-bottom:2px solid #e2e8f0">Muertas</th><th style="text-align:right;padding:5px;border-bottom:2px solid #e2e8f0">Mort. %</th><th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Estado</th>
      </tr></thead><tbody>
      ${morts.map(({ l, m }) => `<tr><td style="padding:5px;border-bottom:1px solid #f1f5f9">${l.data.granjaNombre || "—"}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${l.data.galponPrincipal || "—"}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9">${l.data.codigo || "—"}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${fFecha(l.data.fechaIngreso)}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:right">${fNum(m.pob)}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:right">${fNum(m.totalMuertas)}</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:right;color:${m.cumple ? VERDE : m.tieneD7 ? ROJO : "#64748B"}">${m.general.toFixed(2)}%</td><td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${!m.tieneD7 ? "Parcial" : m.cumple ? "Cumple" : "Fuera"}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  // Firmas
  const firmas = `<div style="margin-top:34px;page-break-inside:avoid">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
      ${[["Auditor responsable", form.auditor], ["Líder del proceso", form.lider]].map(f => `<div style="text-align:center"><div style="border-top:1px solid #0D1526;margin-top:36px;padding-top:5px"><div style="font-size:20px;font-weight:700;color:#0D1526">${f[1] || "—"}</div><div style="font-size:15px;color:#94a3b8">${f[0]}</div></div></div>`).join("")}
    </div>
  </div>`;

  const pie = `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:15px;color:#94a3b8;text-align:center">${EMPRESA.nombre} · ${EMPRESA.area} · Documento confidencial de uso interno · ${hoy}</div>`;

  return `<div style="font-family:'Times New Roman', Times, serif;color:#0D1526;width:794px">
    ${portada}
    <div style="padding:0 8px 20px">
      ${indice}
      ${seccion("", "Resumen Ejecutivo", resumen)}
      ${capI}${capII}
      ${fichas}
      ${checklistsSection}
      ${anexoTabla}
      ${capIII}
      ${firmas}
      ${pie}
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  INFORME EJECUTIVO · resumen gerencial (Comité/Alta Dirección) basado en la
//  misma información consolidada del Informe General. Redacción determinista.
// ════════════════════════════════════════════════════════════════════════════

// Carga compartida de evidencias + checklists (una sola consulta a /documentos).
async function cargarDatosInforme(lotes: LoteItem[]): Promise<{ fotosByLoteGalpon: Record<string, FotoPDF[]>; checklistsByGranja: Record<string, ChecklistData[]> }> {
  const codigos = new Set(lotes.map(l => l.data.codigo));
  const granjaIds = new Set(lotes.map(l => l.data.granjaId).filter(Boolean));
  let fotosByLoteGalpon: Record<string, FotoPDF[]> = {};
  const checklistsByGranja: Record<string, ChecklistData[]> = {};
  try {
    const docs = await apiGet<any[]>("/documentos");
    (docs ?? []).filter(d => (d.nombre ?? "").includes("[CHK-ENC]") || (d.nombre ?? "").includes("[CHK-TRZ7]")).forEach(d => {
      const mm = (d.ocrTexto ?? "").match(/\[CHK\]([\s\S]*?)\[\/CHK\]/);
      if (!mm) return;
      try { const data = JSON.parse(mm[1]) as ChecklistData; if (granjaIds.has(data.granjaId) || codigos.has(data.lote)) { const k = data.granjaId || "_"; (checklistsByGranja[k] = checklistsByGranja[k] || []).push(data); } } catch { /* json inválido */ }
    });
    const fotos: FotoMeta[] = (docs ?? [])
      .filter(d => (d.nombre ?? "").includes("[FOTO-LOTE]"))
      .map(d => { const meta = leerMetaFoto(d.ocrTexto); return { url: (d as any).url ?? "", nombre: (d.nombre ?? "").replace(/\s*\[FOTO-LOTE\]\s*/, "").trim(), dia: meta.dia, galpon: meta.galpon, loteCodigo: meta.loteCodigo, uploadedAt: d.uploadedAt }; })
      .filter(f => codigos.has(f.loteCodigo));
    const grupos: Record<string, FotoMeta[]> = {};
    fotos.forEach(f => { const k = `${f.loteCodigo}|${f.galpon}`; (grupos[k] = grupos[k] || []).push(f); });
    for (const k of Object.keys(grupos)) {
      const arr: FotoPDF[] = [];
      for (const f of grupos[k].slice(0, 8)) { const src = await resolverFoto(f.url); if (src) arr.push({ src, titulo: f.nombre || undefined, pie: f.dia ? `Día ${f.dia}` : undefined }); }
      if (arr.length) fotosByLoteGalpon[k] = arr;
    }
  } catch { fotosByLoteGalpon = {}; }
  return { fotosByLoteGalpon, checklistsByGranja };
}

// Mini-dashboard ejecutivo en HTML/CSS (html2canvas lo rasteriza con fidelidad).
function kpiCards(cards: { label: string; valor: string; color: string; sub?: string }[]): string {
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:6px 0 16px">${cards.map(c => `<div style="border:1px solid #e2e8f0;border-left:5px solid ${c.color};border-radius:8px;padding:10px 12px"><div style="font-size:13px;text-transform:uppercase;color:#94a3b8;letter-spacing:.4px">${c.label}</div><div style="font-size:26px;font-weight:800;color:${c.color};line-height:1.1;margin-top:3px">${c.valor}</div>${c.sub ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${c.sub}</div>` : ""}</div>`).join("")}</div>`;
}
function barsHTML(titulo: string, datos: { label: string; valor: number; color: string; texto?: string }[], opts?: { max?: number; ref?: { v: number; label: string }; labelW?: number }): string {
  if (datos.length === 0) return "";
  const labelW = opts?.labelW ?? 150;
  const max = opts?.max ?? Math.max(1, ...datos.map(d => d.valor), opts?.ref?.v ?? 0);
  const rows = datos.map(d => { const w = Math.min(100, Math.max(1, (d.valor / max) * 100)); return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><div style="width:${labelW}px;font-size:12px;color:#334155;text-align:right;flex-shrink:0;white-space:nowrap">${d.label}</div><div style="flex:1;background:#eef2f7;border-radius:4px;height:20px"><div style="width:${w}%;background:${d.color};height:100%;border-radius:4px"></div></div><div style="width:80px;font-size:12px;color:#475569;font-weight:700;flex-shrink:0">${d.texto ?? d.valor}</div></div>`; }).join("");
  const ref = opts?.ref ? `<div style="font-size:11px;color:#EF4444;margin:3px 0 0 ${labelW + 8}px">Referencia: ${opts.ref.label}</div>` : "";
  return `<div style="margin:8px 0 16px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:#0D1526;margin-bottom:6px">${titulo}</div>${rows}${ref}</div>`;
}
function stackHTML(titulo: string, segs: { label: string; valor: number; color: string }[]): string {
  const total = segs.reduce((s, x) => s + x.valor, 0) || 1;
  const bar = segs.filter(s => s.valor > 0).map(s => `<div style="width:${(s.valor / total) * 100}%;background:${s.color};height:100%"></div>`).join("");
  const leg = segs.map(s => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:13px;color:#334155;margin:0 14px 4px 0"><span style="width:11px;height:11px;border-radius:2px;background:${s.color};display:inline-block"></span>${s.label}:&nbsp;<strong>${s.valor}</strong>&nbsp;(${Math.round((s.valor / total) * 100)}%)</span>`).join("");
  return `<div style="margin:8px 0 16px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:#0D1526;margin-bottom:6px">${titulo}</div><div style="display:flex;height:24px;border-radius:5px;overflow:hidden;border:1px solid #e2e8f0">${bar}</div><div style="margin-top:7px">${leg}</div></div>`;
}

// Torta/dona dibujada en canvas real → <img> (html2canvas la rasteriza sin fallar).
function canvasPie(titulo: string, segs: { label: string; valor: number; color: string }[], opts?: { centro?: string; centroSub?: string }): string {
  const size = 188, dpr = 2;
  const cv = document.createElement("canvas"); cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext("2d"); if (!ctx) return "";
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, rin = r * 0.6;
  const total = segs.reduce((s, x) => s + x.valor, 0) || 1; let a0 = -Math.PI / 2;
  segs.filter(s => s.valor > 0).forEach(s => { const a1 = a0 + (s.valor / total) * 2 * Math.PI; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = s.color; ctx.fill(); a0 = a1; });
  ctx.beginPath(); ctx.arc(cx, cy, rin, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
  if (opts?.centro) { ctx.fillStyle = "#0D1526"; ctx.textAlign = "center"; ctx.font = "bold 26px 'Times New Roman', serif"; ctx.fillText(opts.centro, cx, cy + 2); if (opts.centroSub) { ctx.font = "12px 'Times New Roman', serif"; ctx.fillStyle = "#64748b"; ctx.fillText(opts.centroSub, cx, cy + 18); } }
  const img = cv.toDataURL("image/png");
  const leg = segs.map(s => `<div style="display:flex;align-items:center;gap:7px;font-size:13px;color:#334155;margin-bottom:5px"><span style="width:12px;height:12px;border-radius:3px;background:${s.color};display:inline-block;flex-shrink:0"></span>${s.label}:&nbsp;<strong>${s.valor}</strong>&nbsp;(${Math.round((s.valor / total) * 100)}%)</div>`).join("");
  return `<div style="margin:8px 0 14px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:#0D1526;margin-bottom:6px">${titulo}</div><div style="display:flex;align-items:center;gap:18px"><img src="${img}" style="width:${size}px;height:${size}px;flex-shrink:0"/><div>${leg}</div></div></div>`;
}
// Tendencia (línea + área con degradado) en canvas → <img>.
function canvasLine(titulo: string, labels: string[], valores: number[], color: string, opts?: { ref?: number; refLabel?: string; unidad?: string }): string {
  const cssW = 720, cssH = 210, dpr = 2;
  const cv = document.createElement("canvas"); cv.width = cssW * dpr; cv.height = cssH * dpr;
  const ctx = cv.getContext("2d"); if (!ctx) return "";
  ctx.scale(dpr, dpr);
  const padL = 46, padR = 18, padT = 16, padB = 30, w = cssW - padL - padR, h = cssH - padT - padB;
  const max = Math.max(0.001, ...valores, opts?.ref ?? 0) * 1.18;
  const X = (i: number) => padL + (valores.length <= 1 ? w / 2 : (i / (valores.length - 1)) * w);
  const Y = (v: number) => padT + h - (v / max) * h;
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1; ctx.fillStyle = "#94a3b8"; ctx.font = "11px 'Times New Roman', serif"; ctx.textAlign = "right";
  for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; const y = Y(v); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke(); ctx.fillText(v.toFixed(1), padL - 6, y + 3); }
  if (opts?.ref != null) { const y = Y(opts.ref); ctx.strokeStyle = "#EF4444"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke(); ctx.setLineDash([]); }
  const grad = ctx.createLinearGradient(0, padT, 0, padT + h); grad.addColorStop(0, color + "55"); grad.addColorStop(1, color + "08");
  ctx.beginPath(); valores.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.lineTo(X(valores.length - 1), padT + h); ctx.lineTo(X(0), padT + h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); valores.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.textAlign = "center"; valores.forEach((v, i) => { const x = X(i), y = Y(v); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); ctx.fillStyle = "#334155"; ctx.font = "bold 11px 'Times New Roman', serif"; ctx.fillText(v.toFixed(2) + (opts?.unidad || ""), x, y - 8); });
  ctx.fillStyle = "#64748b"; ctx.font = "12px 'Times New Roman', serif"; labels.forEach((l, i) => ctx.fillText(l, X(i), padT + h + 18));
  const img = cv.toDataURL("image/png");
  const ref = opts?.ref != null ? `<span style="color:#EF4444;font-size:11px;margin-left:10px">— Referencia: ${opts.refLabel || opts.ref}</span>` : "";
  return `<div style="margin:8px 0 16px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:#0D1526;margin-bottom:6px">${titulo}${ref}</div><img src="${img}" style="width:100%;height:auto"/></div>`;
}
// Heatmap / tablero semáforo por galpón (HTML/CSS puro, seguro en html2canvas).
function heatmapHTML(titulo: string, cols: string[], rows: { label: string; sub?: string; cells: { text: string; color: string }[] }[]): string {
  if (rows.length === 0) return "";
  const head = `<tr><th style="text-align:left;padding:6px 8px;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0">Galpón</th>${cols.map(c => `<th style="padding:6px 8px;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;text-align:center">${c}</th>`).join("")}</tr>`;
  const body = rows.map(r => `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0D1526"><strong>${r.label}</strong>${r.sub ? `<span style="color:#94a3b8;font-weight:400"> · ${r.sub}</span>` : ""}</td>${r.cells.map(c => `<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="display:inline-block;min-width:54px;padding:3px 8px;border-radius:5px;font-size:13px;font-weight:700;color:${c.color};background:${c.color}22">${c.text}</span></td>`).join("")}</tr>`).join("");
  return `<div style="margin:8px 0 16px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:#0D1526;margin-bottom:6px">${titulo}</div><table style="width:100%;border-collapse:collapse">${head}${body}</table></div>`;
}

function construirInformeEjecutivo(opts: { form: any; lotes: LoteItem[]; fotosByLoteGalpon: Record<string, FotoPDF[]>; checklistsByGranja: Record<string, ChecklistData[]>; usuario: string }): string {
  const { form, lotes, fotosByLoteGalpon, checklistsByGranja } = opts;
  const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const parseDec = (v: any) => { let s = (v ?? "").toString().trim(); if (!s) return 0; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const n = parseFloat(s.replace(/[^\d.\-]/g, "")); return isFinite(n) ? n : 0; };
  const fechaCorta = (d?: string) => { if (!d) return "—"; const t = new Date(d + (d.length <= 10 ? "T00:00:00" : "")); return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "2-digit" }); };
  const morts = lotes.map(l => ({ l, m: mortLote(l) }));
  const totalAves = morts.reduce((s, x) => s + x.m.pob, 0);
  const totalMuertas = morts.reduce((s, x) => s + x.m.totalMuertas, 0);
  const mortGeneral = totalAves > 0 ? (totalMuertas / totalAves) * 100 : 0;
  const conD7 = morts.filter(x => x.m.tieneD7);
  const cumplenMort = conD7.filter(x => x.m.cumple).length;
  const granjasSet = Array.from(new Set(lotes.map(l => l.data.granjaNombre || "—")));
  const lotesSet = Array.from(new Set(lotes.map(l => l.data.codigo || "—")));

  const allChks = Object.values(checklistsByGranja).flat();
  const enc = allChks.filter(c => c.tipo === "encacetamiento");
  const trz = allChks.filter(c => c.tipo === "trazabilidad7");
  const pctTipo = (arr: ChecklistData[]) => arr.length ? Math.round(arr.reduce((s, c) => s + calcularCumplimiento((c.preguntas || []).map(p => p.resultado)), 0) / arr.length) : 0;
  const pctEnc = pctTipo(enc), pctTrz = pctTipo(trz);
  const cumplProm = (enc.length + trz.length) ? Math.round((pctEnc * enc.length + pctTrz * trz.length) / (enc.length + trz.length)) : 0;
  const colPct = (p: number) => p >= 90 ? VERDE : p >= 70 ? NARANJA : ROJO;

  const hall: Record<string, number> = { cumple: 0, no_cumple: 0, parcial: 0, na: 0 };
  allChks.forEach(c => (c.preguntas || []).forEach(p => { if (p.resultado && hall[p.resultado] !== undefined) hall[p.resultado]++; }));

  const allMs = allChks.flatMap(c => (c.muestreos || []).filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0));
  const stMs = statMuestreo(allMs);
  const pesoLote = (x: { m: ReturnType<typeof mortLote> }) => { for (let i = 6; i >= 0; i--) { const v = parseDec(x.m.seg[i]?.peso); if (v > 0) return v; } return 0; };
  let pesoProm = stMs.unit > 0 ? stMs.unit * 1000 : 0;
  if (pesoProm === 0) { const ps = morts.map(pesoLote).filter(v => v > 0); pesoProm = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0; }
  // Observaciones generales y planes de acción correctivos consignados en los checklists.
  const obsPlan = allChks.filter(c => (c.observacionGeneral || "").trim() || (c.planAccion || "").trim());
  const planes = allChks.filter(c => (c.planAccion || "").trim()).length;

  // Riesgos / fortalezas / hallazgos (deterministas)
  const riesgos: string[] = [];
  conD7.filter(x => !x.m.cumple).forEach(x => riesgos.push(`${x.l.data.codigo} — ${x.l.data.granjaNombre || "—"}: mortalidad ${x.m.general.toFixed(2)}% (supera el rango de ${MORT_RANGO_D7}%).`));
  [...enc, ...trz].forEach(c => { const p = calcularCumplimiento((c.preguntas || []).map(q => q.resultado)); if ((c.preguntas || []).length && p < 70) riesgos.push(`${TIPO_LABEL[c.tipo]} — ${c.granjaNombre || "—"}${c.galpon && c.galpon !== "TODOS" ? ` (Galpón ${c.galpon})` : ""}: cumplimiento ${p}%.`); });
  if (stMs.totalM > 0 && stMs.cv > 12) riesgos.push(`Muestreos con variación de peso significativa (CV ${stMs.cv.toFixed(1)}%), indicio de desuniformidad.`);
  if (hall.no_cumple > 0) riesgos.push(`${hall.no_cumple} ítem(s) de auditoría marcados como "No cumple" pendientes de cierre.`);
  if (riesgos.length === 0) riesgos.push("No se identificaron riesgos relevantes en el alcance evaluado.");

  const fortalezas: string[] = [];
  if (conD7.length > 0 && cumplenMort === conD7.length) fortalezas.push(`La totalidad de los lotes con seguimiento completo (${conD7.length}) cumple el rango de mortalidad (≤ ${MORT_RANGO_D7}%).`);
  else if (cumplenMort > 0) fortalezas.push(`${cumplenMort} de ${conD7.length} lote(s) con seguimiento completo cumple(n) el rango de mortalidad.`);
  if (pctEnc >= 90) fortalezas.push(`Alto cumplimiento del Checklist Encasetamiento (${pctEnc}%).`);
  if (pctTrz >= 90) fortalezas.push(`Alto cumplimiento del Checklist Trazabilidad 7 Días (${pctTrz}%).`);
  if (stMs.totalM > 0 && stMs.cv <= 8) fortalezas.push(`Uniformidad de peso adecuada en muestreos (CV ${stMs.cv.toFixed(1)}%).`);
  if (fortalezas.length === 0) fortalezas.push("Registros técnicos estructurados y trazables por granja, lote y galpón.");

  const criticos: string[] = [];
  if (hall.no_cumple > 0) criticos.push(`${hall.no_cumple} ítem(s) "No cumple" en los checklists de auditoría.`);
  if (hall.parcial > 0) criticos.push(`${hall.parcial} ítem(s) con cumplimiento parcial por verificar.`);
  conD7.filter(x => !x.m.cumple).forEach(x => criticos.push(`Mortalidad fuera de rango en ${x.l.data.codigo} (${x.m.general.toFixed(2)}%).`));
  if (criticos.length === 0) criticos.push("Sin hallazgos críticos en el alcance evaluado.");

  // Evidencias relevantes (selección automática por criticidad)
  const evidsCrit: FotoPDF[] = [];
  allChks.forEach(c => (c.preguntas || []).forEach(p => { if (p.evidencia && /^data:image\//i.test(p.evidencia) && (p.resultado === "no_cumple" || p.resultado === "parcial")) evidsCrit.push({ src: p.evidencia as string, titulo: `${c.granjaNombre || ""}${c.galpon && c.galpon !== "TODOS" ? ` · Galpón ${c.galpon}` : ""} · ${p.pregunta}`.trim(), pie: RESULTADO_LABEL[p.resultado] }); }));
  conD7.filter(x => !x.m.cumple).forEach(x => galponesDeLote(x.l).forEach(g => (fotosByLoteGalpon[`${x.l.data.codigo}|${g}`] || []).forEach(f => evidsCrit.push({ ...f, pie: `${f.pie ? f.pie + " · " : ""}Galpón ${g} · mortalidad ${x.m.general.toFixed(2)}%` }))));
  let evidSel = evidsCrit.slice(0, 9);
  if (evidSel.length === 0) evidSel = Object.values(fotosByLoteGalpon).flat().slice(0, 6);

  // ── Helpers de maquetación ──
  const h2 = (num: string, t: string) => `<h2 style="font-size:22px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:18px 0 8px">${num ? num + " " : ""}${t}</h2>`;
  const parr = (t: string) => `<p style="font-size:20px;line-height:1.7;color:#334155;margin:0 0 10px;text-align:justify">${t}</p>`;
  const bloque = (titulo: string, items: string[]) => `<div style="margin:0 0 12px;page-break-inside:avoid"><div style="font-size:18px;font-weight:700;color:#0D1526;margin:0 0 4px">${titulo}</div><ul style="margin:0;padding-left:22px;font-size:19px;line-height:1.6;color:#334155">${items.map(i => `<li style="margin-bottom:3px">${i}</li>`).join("")}</ul></div>`;

  const estado = mortGeneral <= MORT_RANGO_D7 ? "satisfactorio" : "requiere atención prioritaria";
  const sanitario = mortGeneral <= MORT_RANGO_D7
    ? `El comportamiento sanitario es favorable: la mortalidad acumulada al día 7 (${mortGeneral.toFixed(2)}%) se mantiene dentro del rango técnico esperado (≤ ${MORT_RANGO_D7}%).`
    : `El comportamiento sanitario presenta alerta: la mortalidad acumulada (${mortGeneral.toFixed(2)}%) supera el rango técnico (${MORT_RANGO_D7}%), lo que sugiere revisar condiciones de recepción, temperatura de cama y manejo en los primeros días.`;
  const operativa = cumplProm >= 90
    ? `La ejecución operativa es sólida (cumplimiento de auditoría ${cumplProm}%), con procesos de alistamiento y recepción consistentes.`
    : cumplProm >= 70
      ? `La ejecución operativa es aceptable (cumplimiento ${cumplProm}%), con oportunidades de estandarización en los puntos parciales.`
      : `La ejecución operativa presenta debilidades (cumplimiento ${cumplProm}%) que requieren intervención y reentrenamiento del personal.`;

  // ── Portada ──
  const portada = `<div style="background:linear-gradient(135deg,#0D1526,#0A2533);color:#fff;padding:46px 40px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;gap:22px">
      <img src="${LOGO_SAVICOL}" style="width:84px;height:auto;border-radius:6px;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-size:20px;letter-spacing:3px;color:${CYAN};text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:32px;margin:10px 0 4px;font-weight:800">Informe Ejecutivo de Auditoría</h1>
        <p style="font-size:22px;color:#94A3B8;margin:0">Resumen gerencial para Comité de Gerencia y Alta Dirección</p>
      </div>
    </div>
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:20px;color:#cbd5e1">
      <div><strong style="color:#fff">N.º de informe:</strong> ${form.numeroInforme || "—"}</div>
      <div><strong style="color:#fff">Empresa:</strong> ${EMPRESA.nombre}</div>
      <div><strong style="color:#fff">Granja(s):</strong> ${granjasSet.join(", ")}</div>
      <div><strong style="color:#fff">Lote(s):</strong> ${lotesSet.join(", ")}</div>
      <div><strong style="color:#fff">Auditor:</strong> ${form.auditor || "—"}</div>
      <div><strong style="color:#fff">Fecha de emisión:</strong> ${form.fechaEmision ? fFecha(form.fechaEmision) : hoy}</div>
    </div>
  </div>`;

  const indice = `<div style="margin-bottom:18px"><h2 style="font-size:22px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">Contenido</h2><ol style="font-size:20px;line-height:1.8;color:#334155;margin:0;padding-left:24px"><li>Resumen Ejecutivo</li><li>Indicadores Gerenciales</li><li>Análisis Ejecutivo</li><li>Observaciones y Planes de Acción Correctivos</li><li>Evidencias Relevantes</li><li>Conclusiones</li><li>Recomendaciones</li><li>Firmas</li></ol></div>`;

  // 1) Resumen Ejecutivo
  const resumen = `<div style="page-break-before:always">
    ${h2("1.", "Resumen Ejecutivo")}
    ${parr(`El presente informe consolida <strong>${lotes.length} lote(s)</strong> de <strong>${granjasSet.join(", ")}</strong>, con una población inicial de <strong>${fNum(totalAves)}</strong> aves y una mortalidad acumulada general del <strong>${mortGeneral.toFixed(2)}%</strong> al día 7. El estado general del proceso es <strong>${estado}</strong>: ${cumplenMort} de ${conD7.length} lote(s) con seguimiento completo se encuentran dentro del rango de mortalidad. El cumplimiento promedio de auditoría es del <strong>${cumplProm}%</strong> (Encasetamiento ${pctEnc}%, Trazabilidad 7 Días ${pctTrz}%).`)}
    ${bloque("Principales fortalezas", fortalezas)}
    ${bloque("Hallazgos críticos", criticos)}
    ${bloque("Riesgos relevantes", riesgos)}
    ${parr(`<strong>Nivel de cumplimiento:</strong> ${cumplProm}% (auditoría) · Mortalidad ${mortGeneral.toFixed(2)}% (${mortGeneral <= MORT_RANGO_D7 ? "dentro de rango" : "fuera de rango"}).`)}
    ${parr(`<strong>Conclusión ejecutiva:</strong> ${mortGeneral <= MORT_RANGO_D7 && cumplProm >= 90 ? "El proceso evaluado evidencia un desempeño adecuado y bajo control. Se recomienda sostener las prácticas actuales y el seguimiento sistemático." : mortGeneral <= MORT_RANGO_D7 ? "El proceso es estable en lo sanitario; conviene cerrar los puntos de auditoría pendientes para elevar el cumplimiento." : "El proceso requiere atención de la Dirección para corregir las desviaciones de mortalidad y cerrar las no conformidades identificadas."}`)}
  </div>`;

  // Datos por GALPÓN: expande cada lote en sus galpones. Mortalidad atribuida del
  // lote (se registra a nivel de lote); cumplimiento/peso/CV son del galpón real.
  const galpones = morts.flatMap(({ l, m }) => galponesDeLote(l).map(g => {
    const chks = checklistsGalpon(checklistsByGranja[l.data.granjaId] || [], g);
    const cumpl = chks.length ? Math.round(chks.reduce((s, c) => s + calcularCumplimiento((c.preguntas || []).map(p => p.resultado)), 0) / chks.length) : null;
    const ms = muestreosGalpon(checklistsByGranja[l.data.granjaId] || [], g).filter(x => (x.cantidad ?? 0) > 0 && (x.pesoTotal ?? 0) > 0);
    const st = statMuestreo(ms);
    const peso = st.unit > 0 ? st.unit * 1000 : pesoLote({ m });
    return { g, lote: l.data.codigo || "—", granja: l.data.granjaNombre || "—", mort: m.general, cumple: m.cumple, tieneD7: m.tieneD7, cumpl, peso, cv: ms.length ? st.cv : null };
  }));
  const galConD7 = galpones.filter(x => x.tieneD7).length;
  const galCumplen = galpones.filter(x => x.tieneD7 && x.cumple).length;
  const galFuera = galpones.filter(x => x.tieneD7 && !x.cumple).length;
  const galParcial = galpones.filter(x => !x.tieneD7).length;
  const colMort = (v: number, tiene: boolean) => !tiene ? "#94A3B8" : v <= MORT_RANGO_D7 ? VERDE : ROJO;
  const colCv = (v: number | null) => v == null ? "#94A3B8" : v <= 8 ? VERDE : v <= 12 ? NARANJA : ROJO;

  // Tendencia: mortalidad acumulada promedio por día (D1–D7) sobre los lotes del alcance.
  const tendencia = [1, 2, 3, 4, 5, 6, 7].map(d => {
    const vals = morts.map(({ m }) => { if (m.pob <= 0) return null; let acc = 0; for (let i = 0; i < d; i++) acc += numv(m.seg[i]?.avesMuertas); return (acc / m.pob) * 100; }).filter((v): v is number => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3) : 0;
  });

  // 2) Indicadores Gerenciales (dashboard)
  const dashboard = `<div style="page-break-before:always">
    ${h2("2.", "Indicadores Gerenciales")}
    ${kpiCards([
      { label: "Cumpl. Encasetamiento", valor: `${pctEnc}%`, color: colPct(pctEnc) },
      { label: "Cumpl. Trazabilidad 7d", valor: `${pctTrz}%`, color: colPct(pctTrz) },
      { label: "Mortalidad general", valor: `${mortGeneral.toFixed(2)}%`, color: mortGeneral <= MORT_RANGO_D7 ? VERDE : ROJO, sub: `Rango ≤ ${MORT_RANGO_D7}%` },
      { label: "Peso promedio", valor: pesoProm > 0 ? `${Math.round(pesoProm)} g` : "—", color: CYAN, sub: stMs.unit > 0 ? "Muestreos" : "Seguimiento D1–7" },
      { label: "CV muestreos", valor: stMs.totalM > 0 ? `${stMs.cv.toFixed(1)}%` : "—", color: stMs.totalM === 0 ? "#94A3B8" : stMs.cv <= 8 ? VERDE : stMs.cv <= 12 ? NARANJA : ROJO, sub: stMs.totalM > 0 ? stMs.estado.l : "Sin datos" },
      { label: "Galpones en cumplimiento", valor: `${galCumplen}/${galConD7 || 0}`, color: galConD7 > 0 && galFuera === 0 ? VERDE : NARANJA, sub: "Rango de mortalidad" },
    ])}
    ${barsHTML("Mortalidad por galpón (%)", galpones.map(x => ({ label: `Galpón ${x.g}`, valor: +x.mort.toFixed(2), color: colMort(x.mort, x.tieneD7), texto: `${x.mort.toFixed(2)}%` })), { ref: { v: MORT_RANGO_D7, label: `${MORT_RANGO_D7}% máx.` }, max: Math.max(MORT_RANGO_D7 * 1.6, ...galpones.map(x => x.mort)), labelW: 130 })}
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:320px">${canvasPie("Distribución de hallazgos", [{ label: "Cumple", valor: hall.cumple, color: VERDE }, { label: "Parcial", valor: hall.parcial, color: NARANJA }, { label: "No cumple", valor: hall.no_cumple, color: ROJO }, { label: "N/A", valor: hall.na, color: "#94A3B8" }], { centro: `${hall.cumple + hall.no_cumple + hall.parcial + hall.na}`, centroSub: "ítems" })}</div>
      <div style="flex:1;min-width:320px">${canvasPie("Estado de galpones (mortalidad)", [{ label: "En cumplimiento", valor: galCumplen, color: VERDE }, { label: "Fuera de rango", valor: galFuera, color: ROJO }, { label: "Parcial / sin D7", valor: galParcial, color: "#94A3B8" }], { centro: `${galpones.length}`, centroSub: "galpones" })}</div>
    </div>
    ${canvasLine("Tendencia de mortalidad acumulada (D1–D7)", ["D1", "D2", "D3", "D4", "D5", "D6", "D7"], tendencia, CYAN, { ref: MORT_RANGO_D7, refLabel: `${MORT_RANGO_D7}% máx.`, unidad: "%" })}
    ${heatmapHTML("Tablero por galpón (semáforo)", ["Mortalidad", "Cumplimiento", "Peso", "CV"], galpones.map(x => ({ label: `Galpón ${x.g}`, sub: x.lote, cells: [
      { text: x.tieneD7 ? `${x.mort.toFixed(2)}%` : "—", color: colMort(x.mort, x.tieneD7) },
      { text: x.cumpl != null ? `${x.cumpl}%` : "—", color: x.cumpl == null ? "#94A3B8" : colPct(x.cumpl) },
      { text: x.peso > 0 ? `${Math.round(x.peso)} g` : "—", color: x.peso > 0 ? CYAN : "#94A3B8" },
      { text: x.cv != null ? `${x.cv.toFixed(1)}%` : "—", color: colCv(x.cv) },
    ] })))}
    ${barsHTML("Cumplimiento por día de visita (%)", [...enc, ...trz].map(c => { const p = calcularCumplimiento((c.preguntas || []).map(q => q.resultado)); return { label: `${c.diaEvaluado ? "Día " + c.diaEvaluado + " · " : ""}${fechaCorta(c.fechaVisita)}`, valor: p, color: colPct(p), texto: `${p}%` }; }), { max: 100, labelW: 170 })}
    ${kpiCards([
      { label: "Planes de acción", valor: `${planes}`, color: planes > 0 ? NARANJA : VERDE, sub: planes > 0 ? "Registrados / por cerrar" : "Sin planes abiertos" },
      { label: "Hallazgos no conformes", valor: `${hall.no_cumple}`, color: hall.no_cumple > 0 ? ROJO : VERDE, sub: "Ítems 'No cumple'" },
      { label: "Galpones fuera de rango", valor: `${galFuera}`, color: galFuera > 0 ? ROJO : VERDE, sub: "Mortalidad > rango" },
    ])}
  </div>`;

  // 3) Análisis Ejecutivo
  const analisis = `<div style="page-break-before:always">
    ${h2("3.", "Análisis Ejecutivo")}
    ${bloque("Aspectos críticos", criticos)}
    ${bloque("Hallazgos de mayor impacto", [
      `Cumplimiento de auditoría: ${cumplProm}% (Encasetamiento ${pctEnc}%, Trazabilidad 7 Días ${pctTrz}%).`,
      `Mortalidad acumulada general: ${mortGeneral.toFixed(2)}% sobre ${fNum(totalAves)} aves.`,
      stMs.totalM > 0 ? `Muestreos: ${stMs.totalM} pesaje(s), peso unitario ${(stMs.unit).toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg, CV ${stMs.cv.toFixed(1)}% (${stMs.estado.l}).` : "Muestreos: sin registros de pesaje en el alcance.",
    ])}
    ${parr(`<strong>Comportamiento sanitario:</strong> ${sanitario}`)}
    ${parr(`<strong>Evaluación operativa:</strong> ${operativa}`)}
    ${bloque("Riesgos prioritarios", riesgos)}
    ${bloque("Oportunidades de mejora", [
      hall.parcial > 0 || hall.no_cumple > 0 ? "Cerrar los ítems parciales y no conformes de los checklists con verificación de causa raíz." : "Sostener el nivel de cumplimiento mediante auditorías periódicas.",
      "Reforzar el control de temperatura y manejo en los primeros días para estabilizar la mortalidad temprana.",
      stMs.totalM > 0 && stMs.cv > 8 ? "Mejorar la uniformidad del lote (CV de peso por encima del óptimo)." : "Mantener el muestreo sistemático de peso para sostener la uniformidad.",
      planes > 0 ? "Dar seguimiento al cierre verificado de los planes de acción registrados." : "Documentar planes de acción para las desviaciones que se detecten.",
    ])}
  </div>`;

  // 4) Observaciones y Planes de Acción Correctivos (consignados en los checklists)
  const obsPlanSection = `<div style="page-break-before:always">
    ${h2("4.", "Observaciones y Planes de Acción Correctivos")}
    ${parr(obsPlan.length ? `Se relacionan las observaciones generales y los planes de acción correctivos consignados en ${obsPlan.length} checklist(s) de auditoría, como contexto para la toma de decisiones y el cierre de hallazgos.` : "No se registraron observaciones generales ni planes de acción correctivos en los checklists del alcance.")}
    ${obsPlan.map(c => { const gal = c.galpon === "TODOS" ? "Todos los galpones" : c.galpon ? `Galpón ${c.galpon}` : "—"; return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:12px;page-break-inside:avoid"><div style="font-size:17px;font-weight:700;color:#0D1526">${TIPO_LABEL[c.tipo] || c.tipo}${c.diaEvaluado ? ` · Día ${c.diaEvaluado}` : ""}</div><div style="font-size:14px;color:#94a3b8;margin:2px 0 8px">${c.granjaNombre || "—"} · ${gal} · Lote: ${c.lote || "—"} · Visita: ${fFecha(c.fechaVisita)} · Auditor: ${c.auditor || "—"}</div>${(c.observacionGeneral || "").trim() ? `<div style="margin-bottom:7px"><span style="display:inline-block;font-size:13px;font-weight:700;color:#0369a1;background:#e0f2fe;border-radius:4px;padding:2px 8px;margin-bottom:3px">Observación general</span><div style="font-size:19px;color:#334155;line-height:1.6">${c.observacionGeneral}</div></div>` : ""}${(c.planAccion || "").trim() ? `<div><span style="display:inline-block;font-size:13px;font-weight:700;color:#b45309;background:#ffedd5;border-radius:4px;padding:2px 8px;margin-bottom:3px">Plan de acción correctivo</span><div style="font-size:19px;color:#334155;line-height:1.6">${c.planAccion}</div></div>` : ""}</div>`; }).join("")}
  </div>`;

  // 5) Evidencias Relevantes
  const evidencias = `<div style="page-break-before:always">
    ${h2("5.", "Evidencias Relevantes")}
    ${parr(evidSel.length ? "Selección de evidencias fotográficas más representativas según la criticidad de los hallazgos registrados." : "No se registraron evidencias fotográficas en el alcance evaluado.")}
    ${evidSel.length ? evidenciasGridHTML(evidSel) : ""}
  </div>`;

  // 6) Conclusiones
  const conclusiones = `<div style="page-break-before:always">
    ${h2("6.", "Conclusiones")}
    ${bloque("Conclusiones ejecutivas", [
      `El alcance evaluado comprende ${lotes.length} lote(s) y ${allChks.length} checklist(s) de auditoría en ${granjasSet.join(", ")}.`,
      `${cumplenMort} de ${conD7.length} lote(s) con seguimiento completo cumplen el rango de mortalidad (≤ ${MORT_RANGO_D7}%).`,
      `El cumplimiento promedio de auditoría es del ${cumplProm}%.`,
    ])}
    ${parr(`<strong>Impacto operativo:</strong> ${cumplProm >= 90 ? "Procesos operativos consistentes con bajo riesgo de reproceso." : "Existen desviaciones operativas que pueden afectar la eficiencia y deben atenderse."}`)}
    ${parr(`<strong>Impacto productivo:</strong> ${mortGeneral <= MORT_RANGO_D7 ? "La mortalidad bajo control favorece la conversión y el desempeño productivo esperado." : "La mortalidad fuera de rango compromete el potencial productivo del lote."}`)}
    ${parr(`<strong>Nivel de cumplimiento:</strong> ${cumplProm}% global de auditoría.`)}
    ${parr(`<strong>Estado general del proceso:</strong> ${estado}.`)}
  </div>`;

  // 7) Recomendaciones
  const recomendaciones = `<div style="page-break-before:always">
    ${h2("7.", "Recomendaciones")}
    ${bloque("Gerencia", [
      conD7.some(x => !x.m.cumple) ? "Priorizar la atención de los lotes fuera de rango y asignar recursos para el cierre de no conformidades." : "Sostener el modelo de control interno que mantiene el proceso dentro de los rangos técnicos.",
      "Institucionalizar el seguimiento del tablero de indicadores como insumo de decisión del Comité.",
    ])}
    ${bloque("Dirección de Engorde", [
      "Reforzar el control de temperatura de cama y ambiente durante los primeros días.",
      conD7.some(x => !x.m.cumple) ? "Implementar seguimiento reforzado en los lotes con mortalidad elevada hasta su normalización." : "Mantener el protocolo de recepción y manejo inicial que sostiene la baja mortalidad.",
    ])}
    ${bloque("Operación", [
      "Estandarizar el alistamiento y la recepción conforme a los checklists de auditoría.",
      hall.no_cumple > 0 || hall.parcial > 0 ? "Atender de forma inmediata los ítems parciales y no conformes detectados." : "Mantener la disciplina operativa que sostiene el cumplimiento.",
    ])}
    ${bloque("Cumplimiento", [
      "Verificar el cierre documentado de los planes de acción.",
      "Conservar la trazabilidad por granja, lote y galpón para auditorías posteriores.",
    ])}
  </div>`;

  // 8) Firmas
  const firmantes: [string, string][] = [["Auditor", form.auditor], ["Director de Engorde", form.directorEngorde], ["Oficial de Cumplimiento", form.oficialCumplimiento], ["Gerente General", form.gerenteGeneral]];
  const firmas = `<div style="margin-top:24px;page-break-inside:avoid">
    ${h2("8.", "Firmas")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:34px 40px;margin-top:18px">
      ${firmantes.map(f => `<div style="text-align:center"><div style="border-top:1px solid #0D1526;margin-top:46px;padding-top:6px"><div style="font-size:20px;font-weight:700;color:#0D1526">${f[1] || "—"}</div><div style="font-size:15px;color:#94a3b8">${f[0]}</div><div style="font-size:14px;color:#94a3b8;margin-top:5px">Fecha: ______________</div></div></div>`).join("")}
    </div>
  </div>`;

  const pie = `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:15px;color:#94a3b8;text-align:center">${EMPRESA.nombre} · ${EMPRESA.area} · Documento confidencial de uso interno · ${hoy}</div>`;

  return `<div style="font-family:'Times New Roman', Times, serif;color:#0D1526;width:794px">
    ${portada}
    <div style="padding:0 8px 20px">
      ${indice}
      ${resumen}
      ${dashboard}
      ${analisis}
      ${obsPlanSection}
      ${evidencias}
      ${conclusiones}
      ${recomendaciones}
      ${firmas}
      ${pie}
    </div>
  </div>`;
}

// ── Modal · Informe Ejecutivo ────────────────────────────────────────────────
export function InformeEjecutivoModal({ lotes, granjas, usuario, onClose }: {
  lotes: LoteItem[]; granjas: any[]; usuario: string; onClose: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const granjasSet = Array.from(new Set(lotes.map(l => l.data.granjaNombre).filter(Boolean)));
  const [form, setForm] = useState({
    numeroInforme: `IE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    fechaEmision: hoy,
    auditor: usuario,
    directorEngorde: "",
    oficialCumplimiento: "",
    gerenteGeneral: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [fase, setFase] = useState<"idle" | "fotos" | "pdf">("idle");
  const [error, setError] = useState<string | null>(null);
  const [envio, setEnvio] = useState<{ base64: string; filename: string } | null>(null);

  async function exportar(modo: "descargar" | "correo" = "descargar") {
    if (lotes.length === 0) { setError("No hay lotes en el alcance (ajusta los filtros)."); return; }
    if (!form.numeroInforme.trim()) { setError("Indica el número de informe."); return; }
    setError(null);
    try {
      setFase("fotos");
      const { fotosByLoteGalpon, checklistsByGranja } = await cargarDatosInforme(lotes);
      setFase("pdf");
      const html = construirInformeEjecutivo({ form, lotes, fotosByLoteGalpon, checklistsByGranja, usuario });
      const filename = `Informe-Ejecutivo-${(granjasSet[0] || "Granjas").replace(/\s+/g, "-")}-${hoy}.pdf`;
      if (modo === "correo") {
        const base64 = await generarPDF(html, filename, { pageNumbers: true, returnBase64: true }) as string;
        setEnvio({ base64, filename });
      } else {
        await generarPDF(html, filename, { pageNumbers: true });
        onClose();
      }
    } catch (e: any) {
      setError("Error al generar el informe: " + (e?.message ?? "desconocido"));
    } finally { setFase("idle"); }
  }

  const generando = fase !== "idle";
  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400"/><h3 className="font-display font-bold text-white text-sm">Generar Informe Ejecutivo · PDF</h3></div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <div className="px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-[#94A3B8]">
            Resumen gerencial de <strong className="text-amber-300">{lotes.length} lote(s)</strong> ({granjasSet.join(", ") || "todas las granjas"}). Incluye resumen ejecutivo, dashboard de indicadores, análisis, evidencias relevantes (selección automática por criticidad), conclusiones, recomendaciones y firmas.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className={LBL}><Hash className="w-3 h-3 inline mr-1"/>N.º de informe</label><input value={form.numeroInforme} onChange={e => set("numeroInforme", e.target.value)} className={IN}/></div>
            <div><label className={LBL}><Calendar className="w-3 h-3 inline mr-1"/>Fecha de emisión</label><input type="date" value={form.fechaEmision} onChange={e => set("fechaEmision", e.target.value)} className={IN}/></div>
          </div>

          <div className="pt-1"><div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Firmas (nombre y cargo)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className={LBL}><User className="w-3 h-3 inline mr-1"/>Auditor</label><input value={form.auditor} onChange={e => set("auditor", e.target.value)} className={IN}/></div>
              <div><label className={LBL}>Director de Engorde</label><input value={form.directorEngorde} onChange={e => set("directorEngorde", e.target.value)} placeholder="Nombre" className={IN}/></div>
              <div><label className={LBL}>Oficial de Cumplimiento</label><input value={form.oficialCumplimiento} onChange={e => set("oficialCumplimiento", e.target.value)} placeholder="Nombre" className={IN}/></div>
              <div><label className={LBL}>Gerente General</label><input value={form.gerenteGeneral} onChange={e => set("gerenteGeneral", e.target.value)} placeholder="Nombre" className={IN}/></div>
            </div>
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
          <p className="text-[10px] text-[#64748B]">Documento en formato corporativo (Times New Roman, títulos 14 pt / contenido 12 pt), con índice, numeración de páginas, márgenes y saltos inteligentes para no cortar tablas, gráficos ni imágenes. La generación puede tardar ~15–30 s.</p>
        </div>

        <footer className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={generando}>Cancelar</button>
          <button onClick={() => exportar("correo")} disabled={generando || lotes.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 hover:bg-emerald-600/30 disabled:opacity-40">
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}Enviar por correo
          </button>
          <button onClick={() => exportar("descargar")} disabled={generando || lotes.length === 0}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
            {fase === "fotos" ? "Procesando evidencias…" : fase === "pdf" ? "Construyendo PDF…" : "Generar Ejecutivo"}
          </button>
        </footer>
      </div>

      {envio && (
        <EnvioCorreoModal
          tipo="Ejecutivo" filename={envio.filename} pdfBase64={envio.base64}
          asuntoDefault={`Informe Ejecutivo de Auditoría ${form.numeroInforme} · ${granjasSet[0] || "Granjas"}`}
          mensajeDefault={`Cordial saludo,\n\nAdjunto el Informe Ejecutivo de Auditoría (${form.numeroInforme}) correspondiente a ${granjasSet.join(", ") || "las granjas evaluadas"}, con fecha de emisión ${form.fechaEmision}.\n\nQuedo atento(a) a sus comentarios.\n\n${usuario}\nControl Interno y Auditoría · Pollos Savicol S.A.S.`}
          onClose={() => setEnvio(null)}
        />
      )}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export function InformeGeneralModal({ lotes, granjas, usuario, onClose }: {
  lotes: LoteItem[]; granjas: any[]; usuario: string; onClose: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const fechas = lotes.map(l => l.data.fechaIngreso).filter(Boolean).sort();
  const granjasSet = Array.from(new Set(lotes.map(l => l.data.granjaNombre).filter(Boolean)));
  const granjaSel = granjasSet.length === 1 ? granjas.find((g: any) => g.nombre === granjasSet[0]) : null;

  const [form, setForm] = useState({
    numeroInforme: `IG-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    area: "Trazabilidad Avícola · Recepción y Encasetamiento",
    fechaEmision: hoy,
    visitaDesde: fechas[0] ?? "",
    visitaHasta: fechas[fechas.length - 1] ?? "",
    capacidad: granjaSel?.capacidadAves ? String(granjaSel.capacidadAves) : "",
    numGalpones: "",
    auditor: usuario,
    lider: lotes[0]?.data.administrador || lotes[0]?.data.veterinario || "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [fase, setFase] = useState<"idle" | "fotos" | "pdf">("idle");
  const [error, setError] = useState<string | null>(null);
  const [envio, setEnvio] = useState<{ base64: string; filename: string } | null>(null);

  async function exportar(modo: "descargar" | "correo" = "descargar") {
    if (lotes.length === 0) { setError("No hay lotes en el alcance (ajusta los filtros)."); return; }
    if (!form.numeroInforme.trim()) { setError("Indica el número de informe."); return; }
    setError(null);
    try {
      // 1) Evidencias por lote/galpón (una sola consulta de documentos)
      setFase("fotos");
      const codigos = new Set(lotes.map(l => l.data.codigo));
      const granjaIds = new Set(lotes.map(l => l.data.granjaId).filter(Boolean));
      let fotosByLoteGalpon: Record<string, FotoPDF[]> = {};
      let checklistsByGranja: Record<string, ChecklistData[]> = {};
      try {
        const docs = await apiGet<any[]>("/documentos");
        // Checklists Encasetamiento / Trazabilidad 7 Días (misma consulta, sin duplicar).
        // Se relacionan por GRANJA (el campo "lote" del checklist es texto libre y puede no
        // coincidir con el código del lote), respetando la granja filtrada.
        (docs ?? []).filter(d => (d.nombre ?? "").includes("[CHK-ENC]") || (d.nombre ?? "").includes("[CHK-TRZ7]")).forEach(d => {
          const mm = (d.ocrTexto ?? "").match(/\[CHK\]([\s\S]*?)\[\/CHK\]/);
          if (!mm) return;
          try { const data = JSON.parse(mm[1]) as ChecklistData; if (granjaIds.has(data.granjaId) || codigos.has(data.lote)) { const k = data.granjaId || "_"; (checklistsByGranja[k] = checklistsByGranja[k] || []).push(data); } } catch { /* json inválido */ }
        });
        const fotos: FotoMeta[] = (docs ?? [])
          .filter(d => (d.nombre ?? "").includes("[FOTO-LOTE]"))
          .map(d => { const meta = leerMetaFoto(d.ocrTexto); return { url: (d as any).url ?? "", nombre: (d.nombre ?? "").replace(/\s*\[FOTO-LOTE\]\s*/, "").trim(), dia: meta.dia, galpon: meta.galpon, loteCodigo: meta.loteCodigo, uploadedAt: d.uploadedAt }; })
          .filter(f => codigos.has(f.loteCodigo));
        // Resolver hasta 8 fotos por lote/galpón a base64
        const grupos: Record<string, FotoMeta[]> = {};
        fotos.forEach(f => { const k = `${f.loteCodigo}|${f.galpon}`; (grupos[k] = grupos[k] || []).push(f); });
        for (const k of Object.keys(grupos)) {
          const arr: FotoPDF[] = [];
          for (const f of grupos[k].slice(0, 8)) {
            const src = await resolverFoto(f.url);
            if (src) arr.push({ src, titulo: f.nombre || undefined, pie: f.dia ? `Día ${f.dia}` : undefined });
          }
          if (arr.length) fotosByLoteGalpon[k] = arr;
        }
      } catch { fotosByLoteGalpon = {}; }

      // 2) Construir HTML y generar PDF
      setFase("pdf");
      const html = construirInforme({ form, lotes, fotosByLoteGalpon, checklistsByGranja, usuario });
      const filename = `Informe-General-${(granjasSet[0] || "Granjas").replace(/\s+/g, "-")}-${hoy}.pdf`;
      if (modo === "correo") {
        const base64 = await generarPDF(html, filename, { returnBase64: true }) as string;
        setEnvio({ base64, filename });
      } else {
        await generarPDF(html, filename);
        onClose();
      }
    } catch (e: any) {
      setError("Error al generar el informe: " + (e?.message ?? "desconocido"));
    } finally { setFase("idle"); }
  }

  const generando = fase !== "idle";
  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-400"/><h3 className="font-display font-bold text-white text-sm">Generar Informe General · PDF</h3></div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <div className="px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-[#94A3B8]">
            Se incluirán <strong className="text-emerald-300">{lotes.length} lote(s)</strong> según los filtros actuales ({granjasSet.join(", ") || "todas las granjas"}). El informe consolida Datos Generales, Recepción, Seguimiento D1–D7, Alistamiento y evidencias por galpón.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className={LBL}><Hash className="w-3 h-3 inline mr-1"/>N.º de informe</label><input value={form.numeroInforme} onChange={e => set("numeroInforme", e.target.value)} className={IN}/></div>
            <div><label className={LBL}>Área / Proceso auditado</label><input value={form.area} onChange={e => set("area", e.target.value)} className={IN}/></div>
            <div><label className={LBL}><Calendar className="w-3 h-3 inline mr-1"/>Fecha de emisión</label><input type="date" value={form.fechaEmision} onChange={e => set("fechaEmision", e.target.value)} className={IN}/></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={LBL}>Visita desde</label><input type="date" value={form.visitaDesde} onChange={e => set("visitaDesde", e.target.value)} className={IN}/></div>
              <div><label className={LBL}>Visita hasta</label><input type="date" value={form.visitaHasta} onChange={e => set("visitaHasta", e.target.value)} className={IN}/></div>
            </div>
            <div><label className={LBL}><Building2 className="w-3 h-3 inline mr-1"/>Capacidad de la granja</label><input value={form.capacidad} onChange={e => set("capacidad", e.target.value)} placeholder="aves" className={IN}/></div>
            <div><label className={LBL}>N.º de galpones</label><input value={form.numGalpones} onChange={e => set("numGalpones", e.target.value)} placeholder="14" className={IN}/></div>
            <div><label className={LBL}><User className="w-3 h-3 inline mr-1"/>Auditor responsable</label><input value={form.auditor} onChange={e => set("auditor", e.target.value)} className={IN}/></div>
            <div><label className={LBL}>Líder del proceso</label><input value={form.lider} onChange={e => set("lider", e.target.value)} className={IN}/></div>
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}
          <p className="text-[10px] text-[#64748B]">El informe incluye portada, índice, Capítulos I–III, fichas técnicas por galpón (con indicadores y evidencias grandes), anexos y bloque de firmas (nombre y cargo). La generación puede tardar ~20–40 s según el número de lotes y fotos.</p>
        </div>

        <footer className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={generando}>Cancelar</button>
          <button onClick={() => exportar("correo")} disabled={generando || lotes.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 hover:bg-emerald-600/30 disabled:opacity-40">
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}Enviar por correo
          </button>
          <button onClick={() => exportar("descargar")} disabled={generando || lotes.length === 0}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
            {fase === "fotos" ? "Procesando evidencias…" : fase === "pdf" ? "Construyendo PDF…" : "Generar Informe"}
          </button>
        </footer>
      </div>

      {envio && (
        <EnvioCorreoModal
          tipo="General" filename={envio.filename} pdfBase64={envio.base64}
          asuntoDefault={`Informe General de Auditoría ${form.numeroInforme} · ${granjasSet[0] || "Granjas"}`}
          mensajeDefault={`Cordial saludo,\n\nAdjunto el Informe General de Auditoría (${form.numeroInforme}) — ${form.area} — correspondiente a ${granjasSet.join(", ") || "las granjas evaluadas"}, con fecha de emisión ${form.fechaEmision}.\n\nQuedo atento(a) a sus comentarios.\n\n${usuario}\nControl Interno y Auditoría · Pollos Savicol S.A.S.`}
          onClose={() => setEnvio(null)}
        />
      )}
    </div>
  );
}
