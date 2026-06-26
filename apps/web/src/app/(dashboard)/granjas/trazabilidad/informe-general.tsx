"use client";
import { useState, useMemo } from "react";
import { X, FileText, Download, Loader2, Building2, Calendar, Hash, User } from "lucide-react";
import { LOGO_SAVICOL } from "../../cedis/cumplimiento/savicol-logo";
import { evidenciasGridHTML, type FotoPDF } from "@/lib/pdf-evidencias";
import { apiGet } from "@/lib/api";
import { leerMetaFoto, calcularCumplimiento, type LoteItem, type ChecklistData, type Muestreo } from "@/hooks/useLotes";

/* ════════════════════════════════════════════════════════════════════════════
   INFORME GENERAL DE AUDITORÍA · Granjas → Trazabilidad → Lotes (Etapa 1)
   Consolida los lotes filtrados en un informe ejecutivo: portada, índice,
   Cap I–III, fichas técnicas por galpón (con indicadores y evidencias grandes)
   y anexos. Redacción técnica determinista (sin datos ficticios). Reutiliza el
   helper de evidencias y el proxy de imágenes ya existentes.
   ════════════════════════════════════════════════════════════════════════════ */

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-5", area: "Control Interno y Auditoría · Trazabilidad Avícola" };
const CYAN = "#06B6D4", VERDE = "#22C55E", ROJO = "#EF4444", NARANJA = "#F59E0B";

const numv = (v: any) => { const n = parseFloat((v ?? "").toString().replace(",", ".")); return isFinite(n) ? n : 0; };
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

// ── PDF (jsPDF + html2canvas, multipágina A4) ───────────────────────────────
async function generarPDF(html: string, filename: string): Promise<void> {
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
    const pxPerMm = canvas.width / pageW, pageHpx = Math.floor(pageH * pxPerMm);
    let rendered = 0, idx = 0;
    while (rendered < canvas.height) {
      if (idx > 0) pdf.addPage();
      const sliceH = Math.min(pageHpx, canvas.height - rendered);
      const pc = document.createElement("canvas"); pc.width = canvas.width; pc.height = sliceH;
      const ctx = pc.getContext("2d");
      if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pc.width, pc.height); ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg", 0.85), "JPEG", 0, 0, pageW, (sliceH * pageW) / canvas.width, undefined, "FAST");
      rendered += sliceH; idx++;
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
  return `<div style="margin-bottom:16px"><h2 style="font-size:14px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 6px">${num} ${titulo}</h2><p style="font-size:11px;line-height:1.7;color:#334155;margin:0;text-align:justify">${(contenido || "—").replace(/\n/g, "<br>")}</p></div>`;
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
        <div style="font-size:11px;letter-spacing:3px;color:${CYAN};text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:26px;margin:10px 0 4px;font-weight:800">Informe General de Auditoría</h1>
        <p style="font-size:14px;color:#94A3B8;margin:0">${form.area || "Trazabilidad Avícola"}</p>
      </div>
    </div>
    <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#cbd5e1">
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
    <h3 style="font-size:13px;color:#0D1526;margin:0 0 8px">Tabla de Contenido</h3>
    <ol style="font-size:10.5px;color:#475569;margin:0;padding-left:18px;line-height:1.9">
      <li>Resumen Ejecutivo</li>
      <li>Capítulo I — Aspectos Preliminares</li>
      <li>Capítulo II — Características Generales</li>
      <li>Capítulo III — Consideraciones</li>
      <li>Fichas Técnicas por Galpón</li>
      <li>Anexos</li>
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
      <h2 style="font-size:14px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 6px">2.4 Riesgos</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
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
  let fichas = `<div style="page-break-before:always"><h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 12px">Fichas Técnicas por Galpón</h2></div>`;
  morts.forEach(({ l, m }) => {
    galponesDeLote(l).forEach((g, gi) => {
      const fotos = fotosByLoteGalpon[`${l.data.codigo}|${g}`] || [];
      const estadoColor = !m.tieneD7 ? "#64748B" : m.cumple ? VERDE : ROJO;
      const estadoTxt = !m.tieneD7 ? "Parcial" : m.cumple ? "CUMPLE" : "FUERA DE RANGO";
      // Checklists de auditoría de la GRANJA que aplican al galpón (con todas las respuestas)
      const granjaChks = checklistsByGranja[l.data.granjaId] || [];
      const chksG = checklistsGalpon(granjaChks, g);
      const chkHtml = chksG.length === 0 ? "" : `<div style="font-size:10px;font-weight:700;color:#475569;margin:10px 0 4px">Checklists de Auditoría</div>${chksG.map(c => {
        const pct = calcularCumplimiento((c.preguntas || []).map(p => p.resultado));
        const col = pct >= 90 ? VERDE : pct >= 70 ? NARANJA : ROJO;
        const resp = (c.preguntas || []).filter(p => p.resultado !== "");
        return `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:8px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;font-size:10px"><strong style="color:#0D1526">${TIPO_LABEL[c.tipo] || c.tipo}${c.diaEvaluado ? ` · Día ${c.diaEvaluado}` : ""}</strong><span style="color:${col};font-weight:700">${pct}%</span></div>
          <div style="font-size:8.5px;color:#94a3b8;margin:2px 0 4px">Lote: ${c.lote || "—"} · Fecha de visita: ${fFecha(c.fechaVisita)} · Auditor: ${c.auditor || "—"} · ${resp.length}/${(c.preguntas || []).length} respondidas</div>
          ${resp.length ? `<table style="width:100%;border-collapse:collapse;font-size:8px"><thead><tr style="background:#f8fafc"><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Sección</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Pregunta</th><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">Resultado</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${resp.map(p => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#64748b">${p.seccion || "—"}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9">${p.pregunta}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center;color:${RESULTADO_COLOR[p.resultado] || "#64748b"};font-weight:700">${RESULTADO_LABEL[p.resultado] || p.resultado}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${p.observacion || ""}</td></tr>`).join("")}</tbody></table>` : '<p style="font-size:9px;color:#94a3b8;margin:0">Sin respuestas registradas.</p>'}
        </div>`;
      }).join("")}`;
      // Muestreos (pesajes) del galpón: resumen + tabla
      const msG = muestreosGalpon(granjaChks, g).filter(m => (m.cantidad ?? 0) > 0 || (m.pesoTotal ?? 0) > 0);
      const st = statMuestreo(msG);
      const msHtml = msG.length === 0 ? "" : `<div style="font-size:10px;font-weight:700;color:#475569;margin:10px 0 4px">Muestreos (pesajes)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:9px;margin-bottom:5px">
          ${[["Muestreos", String(st.totalM)], ["Aves", String(st.pollitos)], ["Peso total", `${st.pesoT.toLocaleString("es-CO", { maximumFractionDigits: 2 })} kg`], ["Peso unitario", `${st.unit.toLocaleString("es-CO", { maximumFractionDigits: 3 })} kg`], ["CV", `${st.cv.toFixed(1)}%`]].map(d => `<span style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:4px 8px"><strong style="color:#0D1526">${d[1]}</strong> <span style="color:#64748b">${d[0]}</span></span>`).join("")}
          <span style="padding:4px 8px;border-radius:5px;background:${st.estado.c}22;color:${st.estado.c};font-weight:700">${st.estado.l}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px"><thead><tr style="background:#f8fafc"><th style="text-align:center;padding:3px;border-bottom:1px solid #e2e8f0">N.º</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Pollitos</th><th style="text-align:right;padding:3px;border-bottom:1px solid #e2e8f0">Peso total (kg)</th><th style="text-align:left;padding:3px;border-bottom:1px solid #e2e8f0">Observación</th></tr></thead><tbody>${msG.map(m => `<tr><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:center">${m.n}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.cantidad}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;text-align:right">${m.pesoTotal}</td><td style="padding:3px;border-bottom:1px solid #f1f5f9;color:#475569">${m.obs || ""}</td></tr>`).join("")}</tbody></table>`;
      fichas += `<div style="${gi > 0 || true ? "page-break-before:always;" : ""}padding-top:6px">
        <div style="background:#0D1526;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-size:13px;font-weight:800">${l.data.granjaNombre || "—"} · Galpón ${g}</div><div style="font-size:10px;color:#94A3B8">Lote ${l.data.codigo || "—"} · ${l.data.tipoProduccion || "—"} · ${l.data.raza || "—"}</div></div>
          <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;background:${estadoColor}22;color:${estadoColor}">${estadoTxt}</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:14px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;margin-bottom:12px">
            ${[["Fecha de ingreso", fFecha(l.data.fechaIngreso)], ["Edad (días)", String(l.data.edadDias || 0)], ["Población inicial", `${fNum(m.pob)} (${m.fuente})`], ["Aves vivas (final)", fNum(m.vivasFinales)], ["Aves muertas (total)", fNum(m.totalMuertas)], ["Mortalidad general", `${m.general.toFixed(2)}%`]].map(d => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px"><div style="font-size:8px;text-transform:uppercase;color:#94a3b8">${d[0]}</div><div style="font-weight:700;color:#0D1526">${d[1]}</div></div>`).join("")}
          </div>
          <div style="font-size:10px;font-weight:700;color:#475569;margin:6px 0 4px">Seguimiento Día 1–7 · Mortalidad</div>
          <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:10px">
            <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:4px;border-bottom:1px solid #e2e8f0">Indicador</th>${[1,2,3,4,5,6,7].map(d => `<th style="padding:4px;border-bottom:1px solid #e2e8f0">D${d}</th>`).join("")}</tr></thead>
            <tbody>
              ${[["Aves muertas", "avesMuertas"], ["Peso (g)", "peso"]].map(row => `<tr><td style="padding:4px;border-bottom:1px solid #f1f5f9;color:#475569">${row[0]}</td>${[0,1,2,3,4,5,6].map(i => `<td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">${(m.seg[i]?.[row[1]] ?? "") || "—"}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
          ${(l.data as any).recepcionObs ? `<div style="font-size:10px;color:#475569;margin-bottom:8px"><strong>Observaciones:</strong> ${(l.data as any).recepcionObs}</div>` : ""}
          ${(l.data as any).recepcionPlan ? `<div style="font-size:10px;color:#475569;margin-bottom:8px"><strong>Plan de acción:</strong> ${(l.data as any).recepcionPlan}</div>` : ""}
          ${chkHtml}${msHtml}
          <div style="font-size:10px;font-weight:700;color:#475569;margin:8px 0 4px">Evidencias Fotográficas</div>
          ${fotos.length > 0 ? evidenciasGridHTML(fotos) : '<p style="font-size:10px;color:#94a3b8;margin:0">Sin evidencias fotográficas para este galpón.</p>'}
        </div>
      </div>`;
    });
  });

  // Anexos
  const anexoTabla = `<div style="page-break-before:always">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">Anexos · Tabla Consolidada de Lotes</h2>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
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
      ${[["Auditor responsable", form.auditor], ["Líder del proceso", form.lider]].map(f => `<div style="text-align:center"><div style="border-top:1px solid #0D1526;margin-top:36px;padding-top:5px"><div style="font-size:11px;font-weight:700;color:#0D1526">${f[1] || "—"}</div><div style="font-size:9px;color:#94a3b8">${f[0]}</div></div></div>`).join("")}
    </div>
  </div>`;

  const pie = `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center">${EMPRESA.nombre} · ${EMPRESA.area} · Documento confidencial de uso interno · ${hoy}</div>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${portada}
    <div style="padding:0 40px 30px">
      ${indice}
      ${seccion("", "Resumen Ejecutivo", resumen)}
      ${capI}${capII}${capIII}
      ${fichas}
      ${anexoTabla}
      ${firmas}
      ${pie}
    </div>
  </div>`;
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

  async function exportar() {
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
      await generarPDF(html, `Informe-General-${(granjasSet[0] || "Granjas").replace(/\s+/g, "-")}-${hoy}.pdf`);
      onClose();
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
          <button onClick={exportar} disabled={generando || lotes.length === 0}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
            {fase === "fotos" ? "Procesando evidencias…" : fase === "pdf" ? "Construyendo PDF…" : "Generar Informe"}
          </button>
        </footer>
      </div>
    </div>
  );
}
