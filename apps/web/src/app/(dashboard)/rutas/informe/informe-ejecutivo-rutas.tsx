"use client";
import { useState, useMemo, useEffect } from "react";
import { X, FileText, Download, Loader2, Building2, MapPin, User, AlertTriangle, Calendar } from "lucide-react";
import { LOGO_SAVICOL } from "../../cedis/cumplimiento/savicol-logo";
import { formatCOP, formatKg, TIPO_RIESGO_RUTA } from "@/lib/rutas.constants";
import type { Acompanamiento, AccionCumplimiento } from "@/lib/rutas.types";
import { apiGet } from "@/lib/api";

// Evidencia tal como la entrega el API (/evidencias/ruta)
interface EvidenciaApi {
  id: string; acompanamientoId: string; tipo: string; nombre: string;
  url: string; size: number; categoria?: string; uploadedAt: string; uploadedBy: string;
}
// Foto ya resuelta a base64 para incrustar en el PDF
interface FotoEvidencia { dataUrl: string; motivo: string; cliente: string; ruta: string; fecha: string; categoria: string; nombre: string; }
interface RefEvidencia  { nombre: string; tipo: string; fecha: string; relacion: string; url: string; }

/* ════════════════════════════════════════════════════════════════════════════
   INFORME EJECUTIVO RUTAS — Exportar PDF
   Consolida Rutas → Consolidado + Cumplimiento + Evidencias para los filtros
   seleccionados. Secciones narrativas generadas en UNA llamada (/api/ai/informe-rutas)
   con respaldo determinista. Gráficas SVG con datos reales. Sin datos ficticios.
   ════════════════════════════════════════════════════════════════════════════ */

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-5", area: "Control Interno y Auditoría · Acompañamiento a Rutas" };
const VERDE = "#22C55E", NARANJA = "#F59E0B", ROJO = "#EF4444", AZUL = "#4A7AFF", MORADO = "#8B5CF6", CYAN = "#06B6D4";

const fmtFecha = (d?: string) => {
  if (!d) return "—";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const mesLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[(m || 1) - 1]} ${y}`;
};

// ── Semaforización de planes de Cumplimiento (FASE 6) ───────────────────────
// Verde: Completado · Naranja: En curso/En espera · Rojo: Pendiente/Atrasado
function clasificarAccion(a: AccionCumplimiento): { cat: "Completado"|"En curso"|"Pendiente"|"Atrasado"; color: string } {
  const est = (a.estado ?? "").toString();
  if (est.startsWith("Cerrado")) return { cat: "Completado", color: VERDE };
  const fc = a.fechaCompromiso ? new Date(a.fechaCompromiso) : null;
  const atrasado = !!fc && !isNaN(fc.getTime()) && fc < new Date();
  if (est === "Pendiente") return atrasado ? { cat: "Atrasado", color: ROJO } : { cat: "Pendiente", color: ROJO };
  if (atrasado) return { cat: "Atrasado", color: ROJO };
  return { cat: "En curso", color: NARANJA }; // En Proceso / Verificación
}

// ── Generación de PDF (jsPDF + html2canvas, multipágina A4) ──────────────────
async function generarPDF(html: string, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"), import("html2canvas"),
  ]);
  let container: HTMLDivElement | null = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await new Promise(r => setTimeout(r, 600));
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

// ── Gráficas SVG ejecutivas ─────────────────────────────────────────────────
function svgBarras(titulo: string, datos: { label: string; val: number; color: string }[]): string {
  const ds = datos.filter(d => d.val > 0);
  const max = Math.max(1, ...ds.map(d => d.val));
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px">
    <h4 style="font-size:11px;margin:0 0 10px;color:#0D1526">${titulo}</h4>
    ${ds.length === 0 ? '<p style="font-size:10px;color:#94a3b8;margin:0">Sin datos.</p>' : ds.map(d => `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#475569;margin-bottom:2px"><span>${d.label}</span><strong style="color:${d.color}">${d.val}</strong></div>
      <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(d.val / max * 100)}%;background:${d.color};border-radius:3px"></div></div>
    </div>`).join("")}
  </div>`;
}

function svgDona(titulo: string, datos: { label: string; val: number; color: string }[]): string {
  const total = datos.reduce((a, d) => a + d.val, 0) || 1;
  let acum = 0;
  const r = 46, cx = 60, cy = 60, sw = 22, circ = 2 * Math.PI * r;
  const segs = datos.filter(d => d.val > 0).map(d => {
    const frac = d.val / total, dash = frac * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${sw}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-acum * circ}" transform="rotate(-90 ${cx} ${cy})"/>`;
    acum += frac; return seg;
  }).join("");
  const leyenda = datos.map(d => `<div style="display:flex;align-items:center;gap:5px;font-size:9px;color:#475569;margin-bottom:2px"><span style="width:9px;height:9px;border-radius:2px;background:${d.color};display:inline-block"></span>${d.label}: <strong>${d.val}</strong></div>`).join("");
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px">
    <h4 style="font-size:11px;margin:0 0 8px;color:#0D1526">${titulo}</h4>
    <div style="display:flex;align-items:center;gap:16px">
      <svg width="120" height="120" viewBox="0 0 120 120">${segs}<text x="60" y="56" text-anchor="middle" font-size="18" font-weight="800" fill="#0D1526">${total}</text><text x="60" y="70" text-anchor="middle" font-size="8" fill="#94a3b8">TOTAL</text></svg>
      <div style="flex:1">${leyenda}</div>
    </div>
  </div>`;
}

function svgLineas(titulo: string, datos: { label: string; val: number }[], color: string, sufijo = ""): string {
  if (datos.length === 0) return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px"><h4 style="font-size:11px;margin:0 0 8px;color:#0D1526">${titulo}</h4><p style="font-size:10px;color:#94a3b8;margin:0">Sin datos.</p></div>`;
  const W = 320, H = 110, padL = 28, padB = 18, padT = 8;
  const max = Math.max(1, ...datos.map(d => d.val));
  const stepX = datos.length > 1 ? (W - padL - 8) / (datos.length - 1) : 0;
  const pts = datos.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + (H - padT - padB) * (1 - d.val / max);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dots = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${color}"/>`).join("");
  const labels = pts.map(p => `<text x="${p.x.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="7" fill="#94a3b8">${p.label}</text>`).join("");
  const vals = pts.map(p => `<text x="${p.x.toFixed(1)}" y="${(p.y - 5).toFixed(1)}" text-anchor="middle" font-size="7" font-weight="700" fill="#475569">${p.val}${sufijo}</text>`).join("");
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px">
    <h4 style="font-size:11px;margin:0 0 8px;color:#0D1526">${titulo}</h4>
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <line x1="${padL}" y1="${H - padB}" x2="${W - 4}" y2="${H - padB}" stroke="#e2e8f0" stroke-width="1"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>
      ${dots}${vals}${labels}
    </svg>
  </div>`;
}

// ── Indicadores reales ──────────────────────────────────────────────────────
function calcular(acomp: Acompanamiento[], acciones: AccionCumplimiento[]) {
  const total = acomp.length;
  const criticos = acomp.filter(a => a.criticidad === "Crítico").length;
  const altos = acomp.filter(a => a.criticidad === "Alto").length;
  const conHallazgos = acomp.filter(a => a.estado === "Con Hallazgos").length;
  const valorCOP = acomp.reduce((s, a) => s + (a.valorDevueltoCOP || 0), 0);
  const kg = acomp.reduce((s, a) => s + (a.cantidadKgDevueltos || 0), 0);
  const completados = acciones.filter(a => clasificarAccion(a).cat === "Completado").length;
  const cumplimiento = acciones.length > 0 ? Math.round(completados / acciones.length * 100) : 0;
  return { total, criticos, altos, conHallazgos, valorCOP, kg, cumplimiento, completados, planes: acciones.length };
}

function topN(map: Record<string, number>, n: number) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// ── Narrativa determinista de respaldo (si no hay conector disponible) ───────
function narrativaFallback(opts: {
  k: ReturnType<typeof calcular>; al: any; motivosTop: [string, number][];
  rutasTop: [string, number][]; clientesTop: [string, number][]; riesgosTop: [string, number][];
}): Record<string, string> {
  const { k, al, motivosTop, rutasTop, clientesTop, riesgosTop } = opts;
  const motivoP = motivosTop[0]?.[0] ?? "—";
  const rutaP = rutasTop[0]?.[0] ?? "—";
  const alc = `Cliente: ${al.cliente || "Todos"} · Ruta: ${al.ruta || "Todas"} · Auditor: ${al.auditor || "Todos"} · Riesgo: ${al.riesgo || "Todos"}`;
  return {
    resumenEjecutivo: k.total === 0
      ? "No se registran acompañamientos dentro del alcance seleccionado."
      : `Se auditaron ${k.total} acompañamientos a rutas de distribución, de los cuales ${k.conHallazgos} presentaron hallazgos (${k.criticos} críticos y ${k.altos} altos). El impacto financiero acumulado por devoluciones asciende a ${formatCOP(k.valorCOP)} sobre ${formatKg(k.kg)} de mercancía. El cumplimiento de los planes de acción se ubica en ${k.cumplimiento}%. El motivo de mayor recurrencia fue "${motivoP}".`,
    objetivo: `Evaluar el cumplimiento operativo y de calidad en el proceso de distribución a clientes dentro del alcance definido (${alc}), identificando hallazgos, riesgos asociados y el estado de los planes de acción correspondientes.`,
    alcance: `La auditoría abarcó ${k.total} acompañamientos registrados${al.desde || al.hasta ? ` en el periodo ${al.desde || "inicio"} a ${al.hasta || "la fecha"}` : ""}, con cobertura sobre los clientes y rutas resultantes de los filtros aplicados y la evidencia documental asociada a cada registro.`,
    diagnosticoGeneral: k.total === 0 ? "Sin información para diagnóstico." : `El estado general muestra ${k.conHallazgos} acompañamientos con hallazgos sobre ${k.total} ejecutados (${Math.round(k.conHallazgos / k.total * 100)}% de incidencia). Los riesgos dominantes son ${riesgosTop.slice(0, 3).map(r => r[0]).join(", ") || "—"}. La ruta con mayor concentración de eventos es "${rutaP}".`,
    tendencias: `El comportamiento histórico evidencia recurrencia en el motivo "${motivoP}" y en los riesgos ${riesgosTop.slice(0, 2).map(r => r[0]).join(" y ") || "—"}. Se recomienda monitorear su evolución mensual para anticipar desviaciones.`,
    evaluacionOperativa: `El desempeño operativo se refleja en ${k.completados} de ${k.planes} planes de acción completados (${k.cumplimiento}%). El seguimiento de compromisos debe priorizar los planes pendientes o atrasados identificados en la sección de cumplimiento.`,
    recomendaciones: [
      k.criticos > 0 ? `Escalar de forma inmediata los ${k.criticos} acompañamientos críticos al comité de auditoría.` : "",
      motivoP !== "—" ? `Implementar un plan de control específico sobre el motivo recurrente "${motivoP}".` : "",
      clientesTop[0] ? `Sostener una reunión proactiva con ${clientesTop[0][0]} para prevenir el deterioro de la relación comercial.` : "",
      "Establecer indicadores mensuales de cumplimiento por ruta y vincularlos al esquema de seguimiento gerencial.",
      "Reforzar la verificación de los planes de acción atrasados hasta su cierre validado.",
    ].filter(Boolean).join(" "),
    conclusionesGenerales: k.total === 0 ? "Sin datos suficientes para concluir." : `La operación logística auditada presenta un nivel de incidencia del ${Math.round(k.conHallazgos / k.total * 100)}% y un cumplimiento de planes del ${k.cumplimiento}%, lo que exige fortalecer los controles en las rutas y clientes de mayor concentración.`,
    conclusionesOperativas: `Las acciones correctivas deben concentrarse en el motivo "${motivoP}" y en la ruta "${rutaP}", asegurando el cierre oportuno de los compromisos pactados.`,
    conclusionesEstrategicas: `A nivel estratégico se recomienda institucionalizar el seguimiento periódico de los riesgos ${riesgosTop.slice(0, 2).map(r => r[0]).join(" y ") || "operativos"} y vincular el desempeño de cumplimiento al tablero ejecutivo de la Dirección.`,
  };
}

// ── Construcción del HTML del informe ───────────────────────────────────────
function seccion(num: string, titulo: string, contenido: string): string {
  return `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">${num}. ${titulo}</h2>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0;text-align:justify">${(contenido || "—").replace(/\n/g, "<br>")}</p>
  </div>`;
}

function construirInforme(opts: {
  al: any; usuario: string; acomp: Acompanamiento[]; acciones: AccionCumplimiento[];
  fotos: FotoEvidencia[]; evRefs: RefEvidencia[]; secciones: Record<string, string>;
}): string {
  const { al, usuario, acomp, acciones, fotos, evRefs, secciones } = opts;
  const k = calcular(acomp, acciones);
  const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const S = (key: string) => secciones[key] || "—";
  const acompById = Object.fromEntries(acomp.map(a => [a.id, a]));

  // Agregados reales para gráficas
  const motivoCount: Record<string, number> = {};
  const riesgoCount: Record<string, number> = {};
  const clienteCount: Record<string, number> = {};
  const rutaCount: Record<string, number> = {};
  const mesCount: Record<string, number> = {};
  acomp.forEach(a => {
    motivoCount[a.motivo] = (motivoCount[a.motivo] ?? 0) + 1;
    (a.riesgosAsociados || []).forEach(r => riesgoCount[r] = (riesgoCount[r] ?? 0) + 1);
    clienteCount[a.clienteNombre] = (clienteCount[a.clienteNombre] ?? 0) + 1;
    rutaCount[a.rutaNombre] = (rutaCount[a.rutaNombre] ?? 0) + 1;
    const ym = (a.fecha || "").slice(0, 7);
    if (ym) mesCount[ym] = (mesCount[ym] ?? 0) + 1;
  });
  const critCount = {
    "Crítico": k.criticos, "Alto": k.altos,
    "Medio": acomp.filter(a => a.criticidad === "Medio").length,
    "Bajo": acomp.filter(a => a.criticidad === "Bajo").length,
  };
  const semaforo = { "Completado": 0, "En curso": 0, "Pendiente": 0, "Atrasado": 0 };
  acciones.forEach(a => { semaforo[clasificarAccion(a).cat]++; });
  const mesesOrden = Object.keys(mesCount).sort();
  const tendencia = mesesOrden.map(ym => ({ label: mesLabel(ym), val: mesCount[ym] }));
  // Evolución de cumplimiento: % avance promedio por mes de compromiso
  const avancePorMes: Record<string, { sum: number; n: number }> = {};
  acciones.forEach(a => {
    const ym = (a.fechaCompromiso || "").slice(0, 7);
    if (!ym) return;
    if (!avancePorMes[ym]) avancePorMes[ym] = { sum: 0, n: 0 };
    avancePorMes[ym].sum += (a.porcentajeAvance || 0); avancePorMes[ym].n += 1;
  });
  const evolucion = Object.keys(avancePorMes).sort().map(ym => ({ label: mesLabel(ym), val: Math.round(avancePorMes[ym].sum / avancePorMes[ym].n) }));

  // Portada
  const portada = `<div style="background:linear-gradient(135deg,#0D1526,#082F36);color:#fff;padding:40px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;gap:22px">
      <img src="${LOGO_SAVICOL}" alt="Pollos Savicol S.A.S." style="width:80px;height:auto;border-radius:6px;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-size:11px;letter-spacing:3px;color:${CYAN};text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:25px;margin:10px 0 4px;font-weight:800">Informe Ejecutivo de Auditoría</h1>
        <p style="font-size:15px;color:#94A3B8;margin:0">Acompañamiento a Rutas de Distribución</p>
      </div>
    </div>
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#cbd5e1">
      <div><strong style="color:#fff">Empresa:</strong> ${EMPRESA.nombre}</div>
      <div><strong style="color:#fff">NIT:</strong> ${EMPRESA.nit}</div>
      <div><strong style="color:#fff">Cliente:</strong> ${al.cliente || "Todos"}</div>
      <div><strong style="color:#fff">Ruta:</strong> ${al.ruta || "Todas"}</div>
      <div><strong style="color:#fff">Auditor:</strong> ${al.auditor || "Todos"}</div>
      <div><strong style="color:#fff">Riesgo:</strong> ${al.riesgo || "Todos"}</div>
      <div><strong style="color:#fff">Periodo:</strong> ${al.desde ? fmtFecha(al.desde) : "Inicio"} — ${al.hasta ? fmtFecha(al.hasta) : "Hoy"}</div>
      <div><strong style="color:#fff">Fecha de generación:</strong> ${hoy}</div>
      <div><strong style="color:#fff">Generado por:</strong> ${usuario}</div>
      <div><strong style="color:#fff">Registros en alcance:</strong> ${k.total}</div>
    </div>
  </div>`;

  // Índice
  const indice = `<div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <h3 style="font-size:13px;color:#0D1526;margin:0 0 8px">Índice</h3>
    <ol style="font-size:10.5px;color:#475569;margin:0;padding-left:18px;line-height:1.9">
      <li>Resumen Ejecutivo</li><li>Objetivo</li><li>Alcance</li>
      <li>Análisis Ejecutivo (Diagnóstico, Tendencias, Evaluación Operativa)</li>
      <li>Gráficos Ejecutivos</li><li>Información de Cumplimiento</li>
      <li>Evidencias</li><li>Recomendaciones Ejecutivas</li>
      <li>Conclusiones</li><li>Anexos</li>
    </ol>
  </div>`;

  // KPI strip
  const kpis = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${[
      ["Impacto Financiero", formatCOP(k.valorCOP)],
      ["Acompañamientos", String(k.total)],
      ["Críticos / Altos", `${k.criticos} / ${k.altos}`],
      ["Cumplimiento", `${k.cumplimiento}%`],
    ].map(([t, v]) => `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#fff">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">${t}</div>
      <div style="font-size:16px;font-weight:800;color:#0D1526;margin-top:4px">${v}</div>
    </div>`).join("")}
  </div>`;

  // 4. Análisis Ejecutivo
  const analisis = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">4. Análisis Ejecutivo</h2>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">4.1 Diagnóstico General</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0 0 8px;text-align:justify">${S("diagnosticoGeneral").replace(/\n/g, "<br>")}</p>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">4.2 Tendencias</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0 0 8px;text-align:justify">${S("tendencias").replace(/\n/g, "<br>")}</p>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">4.3 Evaluación Operativa</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0;text-align:justify">${S("evaluacionOperativa").replace(/\n/g, "<br>")}</p>
  </div>`;

  // 5. Gráficos Ejecutivos
  const graficos = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 12px">5. Gráficos Ejecutivos</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${svgDona("Cumplimiento por Estado", Object.entries(semaforo).map(([l, v]) => ({ label: l, val: v as number, color: l === "Completado" ? VERDE : l === "En curso" ? NARANJA : ROJO })))}
      ${svgDona("Acompañamientos por Criticidad", Object.entries(critCount).map(([l, v]) => ({ label: l, val: v as number, color: l === "Crítico" ? ROJO : l === "Alto" ? NARANJA : l === "Medio" ? "#FBBF24" : VERDE })))}
      ${svgBarras("Hallazgos por Categoría (Motivo)", topN(motivoCount, 8).map(([l, v]) => ({ label: l, val: v, color: AZUL })))}
      ${svgBarras("Ranking de Riesgos", topN(riesgoCount, 6).map(([l, v]) => ({ label: l, val: v, color: ROJO })))}
      ${svgBarras("Hallazgos por Cliente", topN(clienteCount, 8).map(([l, v]) => ({ label: l, val: v, color: MORADO })))}
      ${svgBarras("Hallazgos por Ruta", topN(rutaCount, 8).map(([l, v]) => ({ label: l, val: v, color: CYAN })))}
      ${svgLineas("Tendencia de Acompañamientos", tendencia, AZUL)}
      ${svgLineas("Evolución de Cumplimiento", evolucion, VERDE, "%")}
    </div>
  </div>`;

  // 6. Cumplimiento (tabla con semaforización)
  const filasCump = acciones.map(a => {
    const c = clasificarAccion(a);
    const ac = acompById[a.acompanamientoId];
    const hallazgo = ac ? `${ac.motivo}` : "—";
    const desc = ac ? (ac.observacionAuditor || "").slice(0, 110) : "";
    const seguimiento = a.evidenciaCorreccion || (a.validadoPor ? `Validado por ${a.validadoPor}` : "En seguimiento");
    return `<tr>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9">${hallazgo}<br><span style="color:#94a3b8;font-size:8px">${desc}</span></td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9">${a.responsable || "—"}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${fmtFecha(a.fechaCompromiso)}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9">${seguimiento}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center"><span style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:8px;font-weight:700;color:#fff;background:${c.color}">${c.cat}</span></td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${a.porcentajeAvance ?? 0}%</td>
    </tr>`;
  }).join("");
  const cumplimiento = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">6. Información de Cumplimiento</h2>
    ${acciones.length === 0 ? '<p style="font-size:11px;color:#94a3b8">Sin planes de acción registrados en el alcance.</p>' : `<table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Hallazgo / Descripción</th>
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Responsable</th>
        <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Compromiso</th>
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Seguimiento</th>
        <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Estado</th>
        <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Avance</th>
      </tr></thead><tbody>${filasCump}</tbody></table>
      <div style="display:flex;gap:14px;margin-top:8px;font-size:8.5px;color:#475569">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${VERDE}"></span> Completado</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${NARANJA}"></span> En curso</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${ROJO}"></span> Pendiente / Atrasado</span>
      </div>`}
  </div>`;

  // 7. Evidencias — fotos reales del módulo Evidencias incrustadas + referencias
  const fotosHtml = fotos.length === 0 ? "" : `<div style="margin-bottom:10px">
    ${fotos.map(f => `<div style="display:inline-block;width:150px;margin:5px;vertical-align:top">
      <img src="${f.dataUrl}" style="width:150px;height:150px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"/>
      <p style="font-size:8px;color:#475569;margin:3px 0 0;text-align:center;line-height:1.35"><strong>${f.motivo}</strong><br>${[f.cliente, f.ruta].filter(Boolean).join(" · ")}<br><span style="color:#94a3b8">${f.categoria || "Evidencia"} · ${fmtFecha(f.fecha)}</span></p>
    </div>`).join("")}
  </div>`;
  const refsHtml = evRefs.length === 0 ? "" : `<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:8px">
    <thead><tr style="background:#f8fafc">
      <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Evidencia</th>
      <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Tipo</th>
      <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Fecha</th>
      <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Relación con hallazgo</th>
    </tr></thead><tbody>
    ${evRefs.map(ev => `<tr>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9">${ev.nombre || "—"}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${ev.tipo}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${fmtFecha(ev.fecha)}</td>
      <td style="padding:5px;border-bottom:1px solid #f1f5f9">${ev.relacion}</td>
    </tr>`).join("")}
    </tbody></table>`;
  const totalEv = fotos.length + evRefs.length;
  const evidenciasSec = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">7. Evidencias</h2>
    ${totalEv === 0
      ? '<p style="font-size:11px;color:#94a3b8">Sin evidencias registradas en el alcance. Cárguelas en Rutas → Evidencias para incluir soporte fotográfico de los hallazgos.</p>'
      : `<p style="font-size:10px;color:#475569;margin:0 0 8px">Soporte documental vinculado a los hallazgos${fotos.length ? ` · ${fotos.length} fotografía(s) incrustada(s)` : ""}${evRefs.length ? ` · ${evRefs.length} referencia(s) externa(s)` : ""}.</p>${fotosHtml}${refsHtml}`}
  </div>`;

  // 9. Conclusiones
  const conclusiones = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">9. Conclusiones</h2>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">9.1 Generales</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0 0 8px;text-align:justify">${S("conclusionesGenerales").replace(/\n/g, "<br>")}</p>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">9.2 Operativas</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0 0 8px;text-align:justify">${S("conclusionesOperativas").replace(/\n/g, "<br>")}</p>
    <h3 style="font-size:12px;color:#0D1526;margin:8px 0 4px">9.3 Estratégicas</h3>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0;text-align:justify">${S("conclusionesEstrategicas").replace(/\n/g, "<br>")}</p>
  </div>`;

  // 10. Anexos: tabla consolidada de acompañamientos + indicadores
  const filasAnexo = acomp.map(a => `<tr>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9">${fmtFecha(a.fecha)}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9">${a.clienteNombre}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9">${a.rutaNombre}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9">${a.auditorNombre}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9">${a.motivo}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:center">${a.criticidad}</td>
    <td style="padding:4px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCOP(a.valorDevueltoCOP || 0)}</td>
  </tr>`).join("");
  const anexos = `<div style="margin-bottom:18px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid ${CYAN};padding-left:10px;margin:0 0 8px">10. Anexos</h2>
    <h3 style="font-size:11px;color:#0D1526;margin:0 0 6px">10.1 Tabla Consolidada de Acompañamientos</h3>
    ${acomp.length === 0 ? '<p style="font-size:11px;color:#94a3b8">Sin registros.</p>' : `<table style="width:100%;border-collapse:collapse;font-size:8.5px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0">Fecha</th>
        <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0">Cliente</th>
        <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0">Ruta</th>
        <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0">Auditor</th>
        <th style="text-align:left;padding:4px;border-bottom:2px solid #e2e8f0">Motivo</th>
        <th style="text-align:center;padding:4px;border-bottom:2px solid #e2e8f0">Criticidad</th>
        <th style="text-align:right;padding:4px;border-bottom:2px solid #e2e8f0">Valor</th>
      </tr></thead><tbody>${filasAnexo}</tbody></table>`}
    <h3 style="font-size:11px;color:#0D1526;margin:12px 0 6px">10.2 Indicadores Consolidados</h3>
    <table style="width:100%;border-collapse:collapse;font-size:9.5px">
      <tbody>
        ${[
          ["Acompañamientos auditados", String(k.total)],
          ["Con hallazgos", String(k.conHallazgos)],
          ["Críticos / Altos", `${k.criticos} / ${k.altos}`],
          ["Impacto financiero (devoluciones)", formatCOP(k.valorCOP)],
          ["Mercancía devuelta", formatKg(k.kg)],
          ["Planes de acción", String(k.planes)],
          ["Planes completados", `${k.completados} (${k.cumplimiento}%)`],
        ].map(([t, v]) => `<tr><td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;color:#475569">${t}</td><td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#0D1526">${v}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  const pie = `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center">
    ${EMPRESA.nombre} · ${EMPRESA.area} · Documento confidencial de uso interno · ${hoy}
  </div>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${portada}
    <div style="padding:0 40px 30px">
      ${indice}
      ${kpis}
      ${seccion("1", "Resumen Ejecutivo", S("resumenEjecutivo"))}
      ${seccion("2", "Objetivo", S("objetivo"))}
      ${seccion("3", "Alcance", S("alcance"))}
      ${analisis}
      ${graficos}
      ${cumplimiento}
      ${evidenciasSec}
      ${seccion("8", "Recomendaciones Ejecutivas", S("recomendaciones"))}
      ${conclusiones}
      ${anexos}
      ${pie}
    </div>
  </div>`;
}

// ── Modal generador ─────────────────────────────────────────────────────────
export function InformeEjecutivoRutasModal({ acompanamientos, cumplimiento, usuario, onClose }: {
  acompanamientos: Acompanamiento[];
  cumplimiento: AccionCumplimiento[];
  usuario: string;
  onClose: () => void;
}) {
  const [cliente, setCliente]   = useState("");
  const [ruta, setRuta]         = useState("");
  const [riesgo, setRiesgo]     = useState("");
  const [auditor, setAuditor]   = useState("");
  const [desde, setDesde]       = useState("");
  const [hasta, setHasta]       = useState("");
  const [fase, setFase]         = useState<"idle"|"ia"|"fotos"|"pdf">("idle");
  const [error, setError]       = useState<string | null>(null);

  // Catálogos para los filtros (derivados de los datos reales)
  const clientes = useMemo(() => Array.from(new Map(acompanamientos.map(a => [a.clienteId, a.clienteNombre])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [acompanamientos]);
  const rutas    = useMemo(() => Array.from(new Map(acompanamientos.map(a => [a.rutaId, a.rutaNombre])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [acompanamientos]);
  const auditores = useMemo(() => Array.from(new Map(acompanamientos.map(a => [a.auditorId, a.auditorNombre])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [acompanamientos]);

  // Intersección de filtros (AND)
  const acompFiltrados = useMemo(() => acompanamientos.filter(a => {
    if (cliente && a.clienteId !== cliente) return false;
    if (ruta && a.rutaId !== ruta) return false;
    if (auditor && a.auditorId !== auditor) return false;
    if (riesgo && !(a.riesgosAsociados || []).includes(riesgo as any)) return false;
    if (desde && a.fecha < desde) return false;
    if (hasta && a.fecha > hasta) return false;
    return true;
  }), [acompanamientos, cliente, ruta, auditor, riesgo, desde, hasta]);

  const idsScope = useMemo(() => new Set(acompFiltrados.map(a => a.id)), [acompFiltrados]);
  const accionesScope = useMemo(() => cumplimiento.filter(c => idsScope.has(c.acompanamientoId)), [cumplimiento, idsScope]);

  // Evidencias desde el API (el store no las hidrata); se cargan una vez y se filtran por alcance
  const [allEvidencias, setAllEvidencias] = useState<EvidenciaApi[]>([]);
  useEffect(() => {
    let alive = true;
    apiGet<EvidenciaApi[]>("/evidencias/ruta")
      .then(d => { if (alive) setAllEvidencias(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) setAllEvidencias([]); });
    return () => { alive = false; };
  }, []);
  const evidenciasScope = useMemo(() => allEvidencias.filter(e => idsScope.has(e.acompanamientoId)), [allEvidencias, idsScope]);

  const nombrePara = (arr: [string, string][], id: string) => arr.find(([k]) => k === id)?.[1] ?? "";

  async function exportar() {
    if (acompFiltrados.length === 0) { setError("No hay acompañamientos para los filtros seleccionados."); return; }
    setError(null);
    const al = {
      cliente: nombrePara(clientes, cliente), ruta: nombrePara(rutas, ruta),
      auditor: nombrePara(auditores, auditor), riesgo, desde, hasta,
    };
    const k = calcular(acompFiltrados, accionesScope);
    const acompById = Object.fromEntries(acompFiltrados.map(a => [a.id, a]));

    // Agregados para el contexto narrativo
    const motivoCount: Record<string, number> = {}, riesgoCount: Record<string, number> = {}, clienteCount: Record<string, number> = {}, rutaCount: Record<string, number> = {};
    acompFiltrados.forEach(a => {
      motivoCount[a.motivo] = (motivoCount[a.motivo] ?? 0) + 1;
      (a.riesgosAsociados || []).forEach(r => riesgoCount[r] = (riesgoCount[r] ?? 0) + 1);
      clienteCount[a.clienteNombre] = (clienteCount[a.clienteNombre] ?? 0) + 1;
      rutaCount[a.rutaNombre] = (rutaCount[a.rutaNombre] ?? 0) + 1;
    });

    try {
      // 1) Narrativa: intenta conector Anthropic; si falla, respaldo determinista
      setFase("ia");
      let secciones = narrativaFallback({
        k, al, motivosTop: topN(motivoCount, 5), rutasTop: topN(rutaCount, 5),
        clientesTop: topN(clienteCount, 5), riesgosTop: topN(riesgoCount, 5),
      });
      try {
        const resp = await fetch("/api/ai/informe-rutas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alcance: al,
            indicadores: { total: k.total, criticos: k.criticos, altos: k.altos, conHallazgos: k.conHallazgos, valorCOP: formatCOP(k.valorCOP), kg: formatKg(k.kg), cumplimiento: k.cumplimiento },
            acompanamientos: acompFiltrados.map(a => ({ fecha: a.fecha, cliente: a.clienteNombre, ruta: a.rutaNombre, auditor: a.auditorNombre, motivo: a.motivo, criticidad: a.criticidad, estado: a.estado, riesgos: a.riesgosAsociados })),
            planes: accionesScope.map(c => ({ hallazgo: acompById[c.acompanamientoId]?.motivo ?? "—", responsable: c.responsable, estado: c.estado, avance: c.porcentajeAvance, fechaCompromiso: c.fechaCompromiso })),
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.secciones && typeof data.secciones === "object") {
            const limpias = Object.fromEntries(
              Object.entries(data.secciones).filter(([, v]) => typeof v === "string" && (v as string).trim())
            ) as Record<string, string>;
            secciones = { ...secciones, ...limpias };
          }
        }
      } catch { /* respaldo determinista ya cargado */ }

      // 2) Resolver fotos del módulo Evidencias (proxy server-side → base64, sin CORS)
      setFase("fotos");
      const fotos: FotoEvidencia[] = [];
      const evRefs: RefEvidencia[] = [];
      const refDe = (e: EvidenciaApi): RefEvidencia => {
        const ac = acompById[e.acompanamientoId];
        return { nombre: e.nombre, tipo: e.tipo, fecha: e.uploadedAt, url: e.url,
          relacion: ac ? `${ac.motivo} · ${ac.clienteNombre} (${ac.rutaNombre})` : "—" };
      };
      const fotosEv = evidenciasScope.filter(e => e.tipo === "Foto");
      evidenciasScope.filter(e => e.tipo !== "Foto").forEach(e => evRefs.push(refDe(e)));
      const CAP = 12; // tope de fotos incrustadas para mantener el PDF manejable
      for (const e of fotosEv.slice(0, CAP)) {
        const ac = acompById[e.acompanamientoId];
        const pushFoto = (dataUrl: string) => fotos.push({ dataUrl, motivo: ac?.motivo ?? e.nombre, cliente: ac?.clienteNombre ?? "", ruta: ac?.rutaNombre ?? "", fecha: e.uploadedAt, categoria: e.categoria ?? "", nombre: e.nombre });
        // Subida directa a la plataforma: la url ya es base64 → incrustar sin proxy
        if (/^data:image\//i.test(e.url)) { pushFoto(e.url); continue; }
        // Enlace externo (legado): descargar vía proxy server-side
        try {
          const r = await fetch("/api/evidencia-img?url=" + encodeURIComponent(e.url));
          const d = r.ok ? await r.json() : null;
          if (d?.dataUrl) pushFoto(d.dataUrl);
          else evRefs.push(refDe(e)); // no incrustable (privada / no es imagen) → referencia
        } catch { evRefs.push(refDe(e)); }
      }
      fotosEv.slice(CAP).forEach(e => evRefs.push(refDe(e))); // exceso del tope → referencia

      // 3) Construir HTML y generar PDF
      setFase("pdf");
      const html = construirInforme({ al, usuario, acomp: acompFiltrados, acciones: accionesScope, fotos, evRefs, secciones });
      const fname = `Informe-Ejecutivo-Rutas${al.cliente ? "-" + al.cliente.replace(/\s+/g, "-") : ""}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await generarPDF(html, fname);
      onClose();
    } catch (e: any) {
      setError("Error al generar el informe: " + (e?.message ?? "desconocido"));
    } finally {
      setFase("idle");
    }
  }

  const generando = fase !== "idle";
  const SEL = "bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 outline-none w-full";
  const LBL = "text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center gap-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D4A] sticky top-0 bg-[#0D1526] z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400"/>
            <h3 className="font-display font-semibold text-white text-sm">Exportar Informe Ejecutivo · PDF</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Filtra por uno o varios criterios. El informe se genera con la <strong className="text-white">intersección</strong> de los filtros, usando únicamente datos reales de Consolidado, Cumplimiento y Evidencias.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={LBL}><Building2 className="w-3 h-3"/> Cliente</label>
              <select value={cliente} onChange={e => { setCliente(e.target.value); setError(null); }} className={SEL}>
                <option value="">Todos los clientes</option>
                {clientes.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}><MapPin className="w-3 h-3"/> Ruta</label>
              <select value={ruta} onChange={e => { setRuta(e.target.value); setError(null); }} className={SEL}>
                <option value="">Todas las rutas</option>
                {rutas.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}><AlertTriangle className="w-3 h-3"/> Riesgo</label>
                <select value={riesgo} onChange={e => { setRiesgo(e.target.value); setError(null); }} className={SEL}>
                  <option value="">Todos</option>
                  {TIPO_RIESGO_RUTA.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}><User className="w-3 h-3"/> Auditor</label>
                <select value={auditor} onChange={e => { setAuditor(e.target.value); setError(null); }} className={SEL}>
                  <option value="">Todos</option>
                  {auditores.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}><Calendar className="w-3 h-3"/> Desde</label>
                <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setError(null); }} className={SEL}/>
              </div>
              <div>
                <label className={LBL}><Calendar className="w-3 h-3"/> Hasta</label>
                <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setError(null); }} className={SEL}/>
              </div>
            </div>
          </div>

          <div className="px-3 py-2.5 rounded-lg bg-[#0A111F] border border-[#1E2D4A] text-xs text-[#94A3B8] space-y-1">
            <div>Acompañamientos en alcance: <strong className="text-white">{acompFiltrados.length}</strong></div>
            <div>Planes de acción: <strong className="text-white">{accionesScope.length}</strong> · Evidencias: <strong className="text-white">{evidenciasScope.length}</strong></div>
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

          <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 px-3 py-2.5 text-[10px] text-[#94A3B8] leading-relaxed">
            El informe consolida <strong className="text-cyan-400">Consolidado + Cumplimiento + Evidencias</strong> con portada corporativa, índice, análisis ejecutivo, gráficos, semaforización de cumplimiento, recomendaciones, conclusiones y anexos. La generación puede tardar ~20–40 s.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={generando}>Cancelar</button>
            <button onClick={exportar} disabled={generando || acompFiltrados.length === 0}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
              {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
              {fase === "ia" ? "Generando análisis…" : fase === "fotos" ? "Procesando evidencias…" : fase === "pdf" ? "Construyendo PDF…" : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
