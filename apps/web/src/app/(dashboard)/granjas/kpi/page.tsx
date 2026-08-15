"use client";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useAuthStore } from "@/store/auth.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI, TIPO_RIESGO } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { KPI } from "@/lib/granjas.types";
import { evidenciasGridHTML } from "@/lib/pdf-evidencias";
import {
  parseAnexos, anexosTienenDatos, difConteoPicos, totalRecepcion, totalInvBultos,
  pesoTotalIngreso, subtotalBloque, cantidadBloque, totalGeneralBultos, num as anexNum,
  faltanteConciliacion, recepcionResumenTieneDatos, pctMortalidad, avesRecibidasTotal, totalMortalidadAves,
  calcMortalidadDiaria, calcBultosConsumidos, registroMortalidadTieneDatos, mortalidadPorGalpon,
  totalIngresoUnidades, totalIngresoKg, totalInventarioBultos, totalInventarioBultosSolo, totalInventarioLonas, totalBultosConsumidos, totalKgConsumidos,
  resumenMortalidadDiaria, resumenBultosConsumidos, resumenRecepcionAves, resumenIngresoBultos, safeResumen,
  type ResumenEjecutivo,
} from "@/lib/anexos-tecnicos";
import { EnvioCorreoModal } from "@/components/informes/envio-correo";
import {
  Target, Plus, Filter, X, Trash2, Edit2, AlertCircle, Check,
  Loader2, CheckCircle2, Sparkles, FileText, TrendingUp, Bell, ChevronDown,
  ImagePlus, Image as ImageIcon,
} from "lucide-react";
import { useKpiAlerts, useSendKpiReminders } from "@/hooks/useKpiAlerts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatErr(e: any, fallback: string): string {
  const raw = e?.response?.data;
  let msg = fallback;
  if (raw) {
    if (typeof raw === "string") msg = raw;
    else if (raw.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
  } else if (e?.message) msg = e.message;
  if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
  return msg;
}

// ─── Semaforización ──────────────────────────────────────────────────────────
function estadoColor(estado: string) {
  const e = estado?.toUpperCase().replace(" ","_").replace(" ","_");
  if (e === "COMPLETADO")  return { bg:"rgba(34,197,94,0.15)",  text:"#22C55E", border:"rgba(34,197,94,0.30)" };
  if (e === "EN_CURSO")    return { bg:"rgba(249,115,22,0.15)", text:"#F97316", border:"rgba(249,115,22,0.30)" };
  if (e === "EN_ESPERA")   return { bg:"rgba(251,191,36,0.15)", text:"#FBBF24", border:"rgba(251,191,36,0.30)" };
  if (e === "ATRASADO")    return { bg:"rgba(239,68,68,0.15)",  text:"#EF4444", border:"rgba(239,68,68,0.30)" };
  if (e === "PENDIENTE")   return { bg:"rgba(239,68,68,0.12)",  text:"#F87171", border:"rgba(239,68,68,0.25)" };
  return                          { bg:"rgba(100,116,139,0.15)",text:"#94A3B8", border:"rgba(100,116,139,0.25)" };
}
function estadoEmoji(estado: string) {
  const e = estado?.toUpperCase().replace(/ /g,"_");
  if (e === "COMPLETADO")        return "🟢";
  if (e === "EN_CURSO" || e === "EN_ESPERA") return "🟠";
  return "🔴";
}
function displayEstado(e: string) {
  return ({COMPLETADO:"Completado",EN_CURSO:"En Curso",EN_ESPERA:"En Espera",
           NO_INICIADO:"No Iniciado",ATRASADO:"Atrasado",PENDIENTE:"Pendiente"})[e] ?? e;
}

// Estado calificación auditor (etiquetas visuales)
const CALIFICACION_AUDITOR = ["Completado","En Curso","Pendiente","En Espera","Atrasado"] as const;

// ─── Compresión inteligente de imágenes (browser) ────────────────────────────
// Redimensiona y comprime a JPEG/WEBP antes de subir. Mantiene calidad visual,
// reduce peso, evita consumo innecesario de almacenamiento.
async function comprimirImagen(
  file: File,
  opts: { maxDim?: number; quality?: number; preferWebp?: boolean } = {}
): Promise<{ dataUrl: string; tipoMime: string; sizeBytes: number }> {
  const { maxDim = 1600, quality = 0.72, preferWebp = true } = opts;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar manteniendo proporción
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else                 { width  = Math.round(width  * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas no disponible")); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Preferir WEBP si el navegador lo soporta, fallback a JPEG
        const tipoMime = preferWebp ? "image/webp" : "image/jpeg";
        let dataUrl = canvas.toDataURL(tipoMime, quality);
        // Si el navegador no soportó webp, toDataURL devuelve png — fallback a jpeg
        const mimeReal = dataUrl.substring(5, dataUrl.indexOf(";"));
        if (preferWebp && mimeReal !== "image/webp") {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        const finalMime = dataUrl.substring(5, dataUrl.indexOf(";"));
        const sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4);
        resolve({ dataUrl, tipoMime: finalMime, sizeBytes });
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

// ─── Generar Plan IA ─────────────────────────────────────────────────────────
async function generarPlanIA(
  accion: string, tipoRiesgo: string, estadoHallazgo: string,
  nombreGranja: string, descripcionHallazgo?: string,
  extra?: {
    auditor?: string; categoria?: string; criticidad?: string;
    evidencias?: { mediaType: string; data: string }[];
  }
): Promise<string> {
  // Usa la API Route de Next.js como proxy seguro (sin CORS, sin exponer API key)
  const response = await fetch("/api/ai/generar-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion, tipoRiesgo, estadoHallazgo, nombreGranja, descripcionHallazgo,
      auditor:    extra?.auditor,
      categoria:  extra?.categoria,
      criticidad: extra?.criticidad,
      evidencias: extra?.evidencias,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error ?? `Error ${response.status} al generar el plan`);
  }
  const data = await response.json();
  return data.plan ?? "No se pudo generar el plan.";
}

// ─── Exportar Informe Auditoría PDF ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR DE INFORMES DE AUDITORÍA — POLLOS SAVICOL S.A.S.
// 5 Modelos + 1 General combinado · Firma digital · Envío por correo
// ═══════════════════════════════════════════════════════════════════════════════

const EMPRESA = {
  nombre:    "Pollos Savicol S.A.S.",
  nit:       "860.403.972-4",
  ciudad:    "Bogotá D.C., Colombia",
  telefono:  "+57 (1) XXX XXXX",
  email:     "auditoria@savicol.com.co",
  web:       "www.savicol.com.co",
  area:      "Control Interno y Auditoría",
  color1:    "#C41230",  // rojo Savicol
  color2:    "#0D1526",  // azul oscuro
  color3:    "#F59E0B",  // amber
};

export type ModeloInforme = "1-ejecutivo" | "2-resumen" | "3-dashboard" | "5-general" | "6-hallazgos";

export const MODELOS_INFO: Record<ModeloInforme, { titulo: string; desc: string; icon: string }> = {
  "1-ejecutivo": { titulo: "Ejecutivo Corporativo",    desc: "Hallazgos, planes, mortalidad y evidencias — sin gráficos", icon: "🔷" },
  "2-resumen":   { titulo: "Informe Resumen",          desc: "Ejecutivo comparativo: tabla de hallazgos, indicadores, gráficas y evidencias — compacto", icon: "📊" },
  "3-dashboard": { titulo: "Dashboard Visual",          desc: "Gráficas de KPI, hallazgos y riesgos — sin evidencias",     icon: "🔵" },
  "5-general":   { titulo: "Informe General Completo",  desc: "Ejecutivo + Dashboard con estructura de auditoría",         icon: "⭐" },
  "6-hallazgos": { titulo: "Informe Hallazgos",         desc: "Solo hallazgos con evidencias, mortalidad e inventarios — sin planes ni KPI", icon: "📋" },
};

// Datos generales del informe (formulario único, FASE 3). Se piden una vez y se
// incorporan automáticamente en portada + firmas de los 3 modelos. Efímero (sin BD).
export type DatosGenerales = {
  numeroInforme: string;
  auditor1: string;
  auditor2: string;
  fechaVisita: string;
  fechaGeneracion: string;
  gerenteGeneral: string;
  administrador: string;
  oficialCumplimiento: string;
  tituloActividad: string;
  // Campos del Informe Ejecutivo (opcionales — sólo portada de ese modelo).
  tecnicoVeterinario?: string;
  lote?: string;
  edadLote?: string;
  // Fortalezas Identificadas (manuales, sólo Informe Ejecutivo · efímeras en el formulario).
  fortalezas?: { fortaleza: string; observacion: string; foto?: string }[];
};

// ─── Utilidades ───────────────────────────────────────────────────────────────
// Parsea una fecha respetando el día LOCAL: las cadenas "YYYY-MM-DD" (input date) se
// interpretan en zona local, no UTC, para que no muestren el día anterior (Colombia UTC-5).
function parseFechaLocal(d: string): Date {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
}
function fmtFecha(d?: string) {
  if (!d) return "—";
  return parseFechaLocal(d).toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" });
}
function fmtFechaCorta(d?: string) {
  if (!d) return "—";
  return parseFechaLocal(d).toLocaleDateString("es-CO");
}
function clsBadge(e: string) {
  const u = e?.toUpperCase().replace(/ /g,"_");
  if (u==="COMPLETADO"||u==="CERRADO"||u==="VERIFICADO") return "verde";
  if (u==="EN_CURSO"||u==="EN_ESPERA"||u==="EN_PLAN")   return "naranja";
  return "rojo";
}
function porcentaje(kpis: any[]) {
  return kpis.length ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/kpis.length) : 0;
}

// ─── CSS compartido ───────────────────────────────────────────────────────────
const CSS_BASE = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman', Times, serif;color:#1a202c;font-size:14px;background:#fff}
.page{max-width:900px;margin:0 auto;padding:0}

/* Portada */
.cover{background:linear-gradient(135deg,#0D1526 0%,#1a2d4a 60%,#C41230 100%);
  color:white;padding:60px 50px;min-height:280px;position:relative;overflow:hidden}
.cover::after{content:'';position:absolute;right:-50px;top:-50px;width:300px;height:300px;
  border-radius:50%;background:rgba(196,18,48,0.15)}
.logo-box{display:flex;align-items:center;gap:16px;margin-bottom:32px}
.logo-icon{width:48px;height:48px;background:linear-gradient(135deg,#C41230,#F59E0B);
  border-radius:8px;display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:900;color:white}
.company-name{font-size:18px;font-weight:700;color:white}
.company-sub{font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.1em}
.cover h1{font-size:26px;font-weight:800;margin-bottom:8px;color:white}
.cover h2{font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:24px}
.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}
.cover-meta-item{background:rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;
  backdrop-filter:blur(10px)}
.cover-meta-label{font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.08em}
.cover-meta-value{font-size:13px;font-weight:600;color:white;margin-top:2px}
.confidencial{display:inline-block;background:rgba(196,18,48,0.8);color:white;
  padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.1em;margin-top:12px}

/* Secciones */
.section{padding:28px 50px;border-bottom:1px solid #edf2f7}
.section:last-child{border-bottom:none}
.section-title{font-size:15px;font-weight:700;color:#0D1526;margin:0 0 16px;
  padding:10px 0 8px 12px;line-height:1.6;border-left:4px solid #C41230;overflow:visible}

/* KPI Cards resumen */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:4px}
.kpi-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}
.kpi-card-num{font-size:24px;font-weight:800}
.kpi-card-label{font-size:10px;color:#64748b;margin-top:3px}

/* Barra de progreso */
.progress-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.progress-label{font-size:11px;color:#475569;min-width:130px}
.progress-bar-bg{flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
.progress-bar-fill{height:100%;border-radius:4px}
.progress-pct{font-size:11px;font-weight:600;color:#1a202c;min-width:35px;text-align:right}

/* Tabla hallazgos */
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#0D1526;color:white;padding:8px 10px;text-align:left;font-size:10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #f0f4f8;vertical-align:top}
tr:nth-child(even) td{background:#f9fafb}

/* Badges */
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700}
.verde{background:#dcfce7;color:#166534}
.naranja{background:#ffedd5;color:#9a3412}
.rojo{background:#fee2e2;color:#991b1b}

/* Plan IA */
.plan-box{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;
  border-radius:8px;padding:12px 14px;margin-top:8px}
.plan-box-title{font-size:10px;font-weight:700;color:#92400e;margin-bottom:4px;
  display:flex;align-items:center;gap:4px}
.plan-box-text{font-size:12px;color:#78350f;line-height:1.6}

/* KPI detalle */
.kpi-item{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:10px;
  page-break-inside:avoid}
.kpi-item-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
.kpi-item-title{font-size:12px;font-weight:700;color:#1a202c;flex:1;margin-right:8px}
.kpi-meta{font-size:10px;color:#64748b;margin-bottom:8px}

/* Firma */
.firma-section{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:24px}
.firma-box{text-align:center}
.firma-line{border-top:2px solid #1a202c;margin-bottom:6px;padding-top:6px}
.firma-name{font-size:12px;font-weight:700;color:#1a202c}
.firma-cargo{font-size:10px;color:#64748b}
.firma-digital{font-size:9px;color:#4A7AFF;margin-top:4px;font-style:italic}
.sello{display:inline-block;border:2px solid #C41230;border-radius:50%;
  width:70px;height:70px;line-height:70px;text-align:center;font-size:8px;
  font-weight:700;color:#C41230;margin-bottom:6px}

/* Gráfico dona SVG */
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.chart-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
.chart-title{font-size:11px;font-weight:700;color:#1a202c;margin-bottom:12px;text-align:center}

/* Footer */
.footer{text-align:center;padding:16px 50px;color:#94a3b8;font-size:9px;
  border-top:1px solid #e2e8f0;background:#f8fafc}
.footer strong{color:#1a202c}

/* Colores gráfico */
.completado-color{background:#22C55E}
.encurso-color{background:#F97316}
.enespera-color{background:#FBBF24}
.noiniciado-color{background:#EF4444}

@page{size:A4;margin:10mm 0}
@media print{
  .no-print{display:none}
  .page{max-width:100%}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover{page-break-after:avoid}
  .divider{page-break-inside:avoid;page-break-after:avoid}
  .section{page-break-inside:avoid}
  .section-title{page-break-after:avoid}
  table,tr,img,svg,.chart-box,.kpi-item,.kpi-card,.firma-section{page-break-inside:avoid}
}
`;

// ─── Gráfico dona SVG inline ──────────────────────────────────────────────────
function donaChart(data: {v:number;c:string;label:string}[], size=120): string {
  const total = data.reduce((a,d)=>a+d.v,0) || 1;
  let offset = 0;
  const cx = size/2, cy = size/2, r = size*0.38, stroke = size*0.12;
  const circles = data.map(d => {
    const pct = d.v/total;
    const dash = pct * 2*Math.PI*r;
    const gap  = (1-pct) * 2*Math.PI*r;
    const ro   = offset * 2*Math.PI*r / total;
    offset += d.v;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.c}"
      stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${2*Math.PI*r*0.25 - ro}" stroke-linecap="round"/>`;
  }).join('\n');
  const pct = total > 0 ? Math.round(data.filter(d=>d.label==='Completado')[0]?.v/total*100||0) : 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${stroke}"/>
    ${circles}
    <text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="${size*0.12}" font-weight="800" fill="#1a202c">${pct}%</text>
    <text x="${cx}" y="${cy+10}" text-anchor="middle" font-size="${size*0.08}" fill="#64748b">completado</text>
  </svg>`;
}

// ─── Barra horizontal ─────────────────────────────────────────────────────────
function barraHorizontal(label:string, value:number, max:number, color:string): string {
  const pct = max > 0 ? Math.min(100, value/max*100) : 0;
  return `<div class="progress-row">
    <span class="progress-label">${label}</span>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="progress-pct">${value}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD EJECUTIVO BI — Visualizaciones estilo Power BI / Google Analytics
// Todas las gráficas son SVG inline (se rasterizan correctamente en el PDF).
// Usan EXCLUSIVAMENTE los KPIs filtrados — sin datos ficticios.
// ═══════════════════════════════════════════════════════════════════════════════

// Clasificación normalizada de estado KPI (incluye "Atrasado" calculado dinámicamente)
// Atrasado = fechaCompromiso ya pasó y el KPI no está completado.
type EstadoBI = "Completado" | "En Curso" | "En Espera" | "Atrasado" | "No Iniciado";
const BI_COLORS: Record<EstadoBI, string> = {
  "Completado":  "#22C55E",
  "En Curso":    "#4A7AFF",
  "En Espera":   "#FBBF24",
  "Atrasado":    "#EF4444",
  "No Iniciado": "#94A3B8",
};
const BI_ORDEN: EstadoBI[] = ["Completado", "En Curso", "En Espera", "Atrasado", "No Iniciado"];

function clasificarEstadoBI(k: any): EstadoBI {
  const raw = (k.estado ?? "").toString().toUpperCase().replace(/ /g, "_");
  if (raw === "COMPLETADO" || raw === "CERRADO") return "Completado";
  // Atrasado: fecha de compromiso vencida y no completado
  if (k.fechaCompromiso) {
    const fc = new Date(k.fechaCompromiso).getTime();
    if (!isNaN(fc) && fc < Date.now()) return "Atrasado";
  }
  if (raw === "EN_CURSO")    return "En Curso";
  if (raw === "EN_ESPERA")   return "En Espera";
  if (raw === "NO_INICIADO" || raw === "PENDIENTE") return "No Iniciado";
  return "En Curso";
}

function conteoEstadosBI(kpis: any[]): Record<EstadoBI, number> {
  const c: Record<EstadoBI, number> = {
    "Completado": 0, "En Curso": 0, "En Espera": 0, "Atrasado": 0, "No Iniciado": 0,
  };
  kpis.forEach(k => { c[clasificarEstadoBI(k)]++; });
  return c;
}

// ── 1. Resumen Ejecutivo KPI — tarjetas de indicadores ────────────────────────
function biResumenEjecutivo(kpis: any[]): string {
  const c = conteoEstadosBI(kpis);
  const total = kpis.length;
  const cards = [
    { label: "Total KPI",     val: total,            color: "#0D1526" },
    { label: "Completados",   val: c["Completado"],  color: BI_COLORS["Completado"] },
    { label: "En Curso",      val: c["En Curso"],    color: BI_COLORS["En Curso"] },
    { label: "En Espera",     val: c["En Espera"],   color: BI_COLORS["En Espera"] },
    { label: "Atrasados",     val: c["Atrasado"],    color: BI_COLORS["Atrasado"] },
    { label: "No Iniciados",  val: c["No Iniciado"], color: BI_COLORS["No Iniciado"] },
  ];
  return `
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px">
    ${cards.map(cd => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${cd.color};border-radius:8px;padding:12px 8px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${cd.color};line-height:1">${cd.val}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600">${cd.label}</div>
      </div>`).join("")}
  </div>`;
}

// ── 2. Distribución de Estados — dona con % por estado ────────────────────────
function biDistribucionEstados(kpis: any[], size = 150): string {
  const c = conteoEstadosBI(kpis);
  const total = kpis.length || 1;
  const data = BI_ORDEN.map(e => ({ label: e, v: c[e], color: BI_COLORS[e] })).filter(d => d.v > 0);
  const cx = size/2, cy = size/2, r = size*0.36, stroke = size*0.16;
  let offset = 0;
  const arcs = data.map(d => {
    const frac = d.v/total;
    const dash = frac * 2*Math.PI*r;
    const gap  = (1-frac) * 2*Math.PI*r;
    const ro   = offset * 2*Math.PI*r;
    offset += frac;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}"
      stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${2*Math.PI*r*0.25 - ro}"/>`;
  }).join("\n");
  const completados = c["Completado"];
  const pctComp = Math.round(completados/total*100);
  return `
  <div style="display:flex;align-items:center;gap:20px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${stroke}"/>
      ${arcs}
      <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="${size*0.16}" font-weight="800" fill="#0D1526">${pctComp}%</text>
      <text x="${cx}" y="${cy+13}" text-anchor="middle" font-size="${size*0.07}" fill="#64748b">cumplimiento</text>
    </svg>
    <div style="flex:1">
      ${BI_ORDEN.map(e => {
        const v = c[e]; const pct = Math.round(v/total*100);
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:10px">
          <div style="width:11px;height:11px;border-radius:3px;background:${BI_COLORS[e]};flex-shrink:0"></div>
          <span style="flex:1;color:#475569">${e}</span>
          <strong style="color:#0D1526">${v}</strong>
          <span style="color:#94a3b8;width:34px;text-align:right">${pct}%</span>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

// ── 3. Avance de Cumplimiento — gauge semicircular ────────────────────────────
function biGaugeCumplimiento(kpis: any[]): string {
  const c = conteoEstadosBI(kpis);
  const total = kpis.length || 1;
  const cerrados  = c["Completado"];
  const activos   = c["En Curso"] + c["En Espera"];
  const pendientes= c["No Iniciado"] + c["Atrasado"];
  const pct = Math.round(cerrados/total*100);
  // Gauge semicircular SVG (180°)
  const W = 240, H = 130, cx = W/2, cy = H-10, r = 90;
  const ang = Math.PI * (1 - pct/100); // 180°→0°
  const x2 = cx + r*Math.cos(ang), y2 = cy - r*Math.sin(ang);
  const color = pct>=70?"#22C55E":pct>=40?"#FBBF24":"#EF4444";
  return `
  <div style="text-align:center">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}" fill="none" stroke="#f1f5f9" stroke-width="16" stroke-linecap="round"/>
      <path d="M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/>
      <text x="${cx}" y="${cy-18}" text-anchor="middle" font-size="34" font-weight="800" fill="${color}">${pct}%</text>
      <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="10" fill="#64748b">Cumplimiento General</text>
    </svg>
    <div style="display:flex;justify-content:center;gap:16px;margin-top:6px;font-size:10px">
      <span style="color:#22C55E;font-weight:700">● Cerrados: ${cerrados}</span>
      <span style="color:#4A7AFF;font-weight:700">● Activos: ${activos}</span>
      <span style="color:#EF4444;font-weight:700">● Pendientes: ${pendientes}</span>
    </div>
  </div>`;
}

// ── 4. Tendencia de Cumplimiento — línea cronológica por mes ──────────────────
function biTendenciaCumplimiento(kpis: any[], hallazgos: any[]): string {
  // Agrupar por mes (YYYY-MM) usando fecha de hallazgo, compromiso y cumplimiento
  const meses: Record<string, { hallazgo: number; compromiso: number; cumplimiento: number }> = {};
  const ymKey = (d?: string) => { if (!d) return null; const t=new Date(d); return isNaN(t.getTime())?null:`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`; };
  const bump = (key: string|null, campo: "hallazgo"|"compromiso"|"cumplimiento") => {
    if (!key) return;
    if (!meses[key]) meses[key] = { hallazgo:0, compromiso:0, cumplimiento:0 };
    meses[key][campo]++;
  };
  kpis.forEach(k => {
    const h = hallazgos.find(hh => hh.id === k.hallazgoId);
    bump(ymKey(h?.fechaVisita), "hallazgo");
    bump(ymKey(k.fechaCompromiso), "compromiso");
    bump(ymKey(k.fechaCumplimiento), "cumplimiento");
  });
  const keys = Object.keys(meses).sort();
  if (keys.length === 0) return `<p style="font-size:10px;color:#94a3b8;text-align:center;padding:20px">Sin datos de fechas para mostrar tendencia.</p>`;

  const W = 520, H = 180, padL = 32, padB = 28, padT = 12, padR = 12;
  const plotW = W-padL-padR, plotH = H-padB-padT;
  const maxV = Math.max(1, ...keys.flatMap(k => [meses[k].hallazgo, meses[k].compromiso, meses[k].cumplimiento]));
  const xStep = keys.length>1 ? plotW/(keys.length-1) : 0;
  const xAt = (i:number) => padL + (keys.length>1 ? i*xStep : plotW/2);
  const yAt = (v:number) => padT + plotH - (v/maxV)*plotH;

  const serie = (campo: "hallazgo"|"compromiso"|"cumplimiento", color: string) => {
    const pts = keys.map((k,i) => `${xAt(i)},${yAt(meses[k][campo])}`).join(" ");
    const dots = keys.map((k,i) => `<circle cx="${xAt(i)}" cy="${yAt(meses[k][campo])}" r="2.5" fill="${color}"/>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>${dots}`;
  };
  // Gridlines Y
  const grid = [0,0.5,1].map(f => {
    const y = padT + plotH - f*plotH;
    return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>
            <text x="${padL-4}" y="${y+3}" text-anchor="end" font-size="7" fill="#94a3b8">${Math.round(f*maxV)}</text>`;
  }).join("");
  const xlabels = keys.map((k,i) => `<text x="${xAt(i)}" y="${H-padB+12}" text-anchor="middle" font-size="7" fill="#64748b">${k.slice(2)}</text>`).join("");

  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    ${grid}
    ${serie("hallazgo", "#94A3B8")}
    ${serie("compromiso", "#FBBF24")}
    ${serie("cumplimiento", "#22C55E")}
    ${xlabels}
  </svg>
  <div style="display:flex;justify-content:center;gap:16px;margin-top:4px;font-size:9px">
    <span style="color:#94A3B8;font-weight:700">● Hallazgos</span>
    <span style="color:#FBBF24;font-weight:700">● Compromisos</span>
    <span style="color:#22C55E;font-weight:700">● Cumplimientos</span>
  </div>`;
}

// ── 5. Riesgos vs Estado KPI — matriz cruzada (heatmap) ───────────────────────
function biRiesgosVsEstado(kpis: any[], hallazgos: any[]): string {
  // Filas = tipo de riesgo, columnas = estado KPI
  const riesgosSet = new Set<string>();
  const matriz: Record<string, Record<EstadoBI, number>> = {};
  kpis.forEach(k => {
    const h = hallazgos.find(hh => hh.id === k.hallazgoId);
    const riesgos: string[] = Array.isArray(h?.tiposRiesgo) && h.tiposRiesgo.length ? h.tiposRiesgo : ["Sin clasificar"];
    const est = clasificarEstadoBI(k);
    riesgos.forEach(rg => {
      riesgosSet.add(rg);
      if (!matriz[rg]) matriz[rg] = { "Completado":0,"En Curso":0,"En Espera":0,"Atrasado":0,"No Iniciado":0 };
      matriz[rg][est]++;
    });
  });
  const riesgos = Array.from(riesgosSet);
  if (riesgos.length === 0) return `<p style="font-size:10px;color:#94a3b8;text-align:center;padding:16px">Sin datos de riesgo para cruzar.</p>`;
  const maxCelda = Math.max(1, ...riesgos.flatMap(rg => BI_ORDEN.map(e => matriz[rg][e])));

  return `
  <table style="width:100%;border-collapse:collapse;font-size:9px">
    <thead>
      <tr>
        <th style="text-align:left;padding:6px 8px;color:#64748b;border-bottom:2px solid #e2e8f0">Tipo de Riesgo</th>
        ${BI_ORDEN.map(e => `<th style="padding:6px 4px;color:${BI_COLORS[e]};border-bottom:2px solid #e2e8f0;font-size:8px">${e}</th>`).join("")}
        <th style="padding:6px 4px;color:#0D1526;border-bottom:2px solid #e2e8f0">Total</th>
      </tr>
    </thead>
    <tbody>
      ${riesgos.map(rg => {
        const filaTotal = BI_ORDEN.reduce((a,e)=>a+matriz[rg][e],0);
        return `<tr>
          <td style="padding:5px 8px;font-weight:600;color:#0D1526;border-bottom:1px solid #f1f5f9">${rg}</td>
          ${BI_ORDEN.map(e => {
            const v = matriz[rg][e];
            const intensidad = v/maxCelda;
            const bg = v>0 ? `${BI_COLORS[e]}${Math.round(20+intensidad*60).toString(16).padStart(2,"0")}` : "transparent";
            return `<td style="padding:5px 4px;text-align:center;border-bottom:1px solid #f1f5f9;background:${bg};font-weight:${v>0?"700":"400"};color:${v>0?"#0D1526":"#cbd5e1"}">${v}</td>`;
          }).join("")}
          <td style="padding:5px 4px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:800;color:#0D1526">${filaTotal}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

// ── BLOQUE COMPLETO: Dashboard Ejecutivo BI ───────────────────────────────────
function seccionDashboardEjecutivo(kpis: any[], hallazgos: any[], granjas: any[]): string {
  if (!kpis.length) return "";
  return `
  <div class="section">
    <div class="section-title">Dashboard Ejecutivo · Cumplimiento KPI</div>

    <!-- 1. Resumen Ejecutivo -->
    ${biResumenEjecutivo(kpis)}

    <div class="charts-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <!-- 2. Distribución de Estados -->
      <div class="chart-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div class="chart-title" style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:10px">Distribución de Estados KPI</div>
        ${biDistribucionEstados(kpis)}
      </div>
      <!-- 3. Avance de Cumplimiento -->
      <div class="chart-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div class="chart-title" style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:10px">Avance de Cumplimiento</div>
        ${biGaugeCumplimiento(kpis)}
      </div>
    </div>

    <!-- 4. Tendencia de Cumplimiento -->
    <div class="chart-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px">
      <div class="chart-title" style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:10px">Tendencia de Cumplimiento (cronológica)</div>
      ${biTendenciaCumplimiento(kpis, hallazgos)}
    </div>

    <!-- 5. Riesgos vs Estado KPI -->
    <div class="chart-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
      <div class="chart-title" style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:10px">Matriz Analítica · Riesgos vs Estado KPI</div>
      ${biRiesgosVsEstado(kpis, hallazgos)}
    </div>
  </div>`;
}

// ─── PORTADA COMPARTIDA ───────────────────────────────────────────────────────
function portada(titulo: string, subtitulo: string, kpis: any[], hallazgos: any[], auditor: string, granjaFiltro?: string, datos?: DatosGenerales, ocultarKPI?: boolean, extraMeta?: { label: string; value: string }[]): string {
  const fecha = fmtFecha(new Date().toISOString());
  const pct   = porcentaje(kpis);
  const auditores = [datos?.auditor1, datos?.auditor2].filter(Boolean).join(" · ") || auditor || "Equipo de Auditoría";
  const fGen = datos?.fechaGeneracion ? fmtFecha(datos.fechaGeneracion) : fecha;
  const meta: { label: string; value: string }[] = [];
  if (datos?.numeroInforme) meta.push({ label: "N° de Informe", value: datos.numeroInforme });
  meta.push({ label: "Fecha de Generación", value: fGen });
  if (datos?.fechaVisita) meta.push({ label: "Fecha de Visita", value: fmtFecha(datos.fechaVisita) });
  meta.push({ label: datos?.auditor2 ? "Auditores" : "Auditor Responsable", value: auditores });
  meta.push(ocultarKPI
    ? { label: "Hallazgos Reportados", value: `${hallazgos.length}` }
    : { label: "Avance Global KPI", value: `${pct}% · ${kpis.length} planes` });
  if (extraMeta) extraMeta.forEach(m => { if (m.value) meta.push(m); });
  return `
  <div class="cover">
    <div class="logo-box">
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABUCAIAAABROcMSAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAc4klEQVR42s17aZgWxdX2Oaeqt2ebmWdWhoEREBgWFxQFNQKixIUIUYOKCS4kuUzyJa9LQOPu9+mbGLeocYnLiyZEFuOCGkVc4oIYJEQdRBgXFgeYYfaZZ+/uqjrfjwcIGgUJyXtZV/+Yqe6uvvv0OXedOnU/CACIyMyLFi2aOHGi53lCCPg6NaVUOp1evHjx3LlzicgYI3edGzJkSC6XmzdvnpTSGLOfT0LEoi2YeX8GYWat9Zw5c+rq6oo9/zgHAI2NjYsXL4avZWtubl60aBEAFL1A7v5anudJKYUQWusdnQC8j8YhxCAI6urqYrHY1q1bM5mMFFLIf4y5r5YGAMuydu+Xu//DzEqp4hfZHTICEMBenokADBZRYMycSy+56pprPS+yadPGhQsevf2uOzJ9GSmk0hqB+bOWIEADAMjIAJ+10S7QX+BjRfdYs2bN008/vesTFE84QAIBCSQgIAF86SFQ2CgFQFVNbTqfZWbNO9r76xuPOmo8AFhSCgQg3P1GiSgAAYEAkADw88AAoKWlZXf3oD0Zj5nRMBCAMEXI+KWHQGDJDOBFbDagAz+zvino6/YBRjcc/PILyyZNnhgq5ZAUBne/0UgWCARgAxF8JeKiPboUBAQM5Bk0ZAwYw196BEaHho1lfbp587uNa4S0C/n0pktv6Hvo96HKuInE008+fdihY3NaaYLP3BvKkNEA+GTQ8FeJIbmHc4KBNTKwT7qS5EBph2wAEBB2eiYigmaO2G7VwYe8/87qmryfkdZrv5834ajxFYcdkfh5vHnGbP/FpRV33pzoN3D+o/NnTTiWUunAFsBcDASDLJgJxTouFEJGs3fYewKtCImBwCiECdGSu6qHBEGfBdpWFJI0AMQMCEgUprLxM76l7vxV+vYF6u3X1KNLUtNmxE+ZYo9s6P/o3W0TvtN19oWVC+4dObJhyRVX6xtvt5MxDBkBNDIDIFIBnTNamxpNAQH3au09+zSJopdotFmXdWyrSWcjRhJDTPlR7Ud0GFFhJAxiQncufqpy1Jj6R3878Kn5yZ//uPW++3LvvQPGRA49NHL+GfbyFS2/uEb7Qc2MbztVZV4h67GKqjCiw4hWURVGTNYwA/BX4dg9gzaG2SAAcMFy09On95T383v6tG0ABDBpBI2ggMFzIhu3pd54XbGxDjq05vr/W3/fXfm81oUQtLHGHu7Fo96zr7c99HtrYL05Yixnw0CiLxgZDIJG0Luzxn6BRjYINhAA4PhDqh6+J7r4ATVzmkrloZABCxERd7A4uTmV+3ujg9T1l9WF1m1uXV3ZUUeQ1CgkpnryoCNxK7zjvrCrPXLMWK0YEQAZARkAYV8g74U9GIBBIwHAEROOA2adKMMTTnLuuLHv8LFBbxZ8HwkB0QBry9gfNgOAXeNt+tllqWUvqHTG2JHsmjWF+Y+Rl/AdJ9ryaXreYzh4YE6iMCAZDJEWtG+Q98IeAIbIGAaE478xERBj9XXh23/v/PPLyemn4rjDCy++6nyyGS2Nrm2znwsLmrl05KhMZbJzxkxnzNgwkXTXrXHTGXajSocxz0k9+RwMPt+LxiwTKoUUBkIYRNARzyDBVzP5nkAbAEAyOhwyZHDDwaOVUchcNfN0mXDbfnKJO2qEc9zRZvSQ4P0PIttTfZBwDjuCEDWAO368++hT4qNNKvxQOA45UdsXYKEf8ZxNn8Aba/ORRK5nk105IKgoZ7btMBPf2i4ZAIF5f0ELAWgA+lf1i8diCoDIBCqfnHqKeMBKz7zQXflefki9U1IdlJfbB49JzvxmGOa5N+2/uFzalmXZthS+RAStBbO2hVHG0ebPj+nKyuhVtyQmHY/9a9CSfff/rve6m7UACPfbPQDAGE0CV/7tb3dfefUPZl9AtUkrUmYASk6coud+37/tLtn6qdi0TUcBt7R1vvZ61ovIVNpq22J7VkHkBaCbAh3mAwykjEPUgrzJDq+r/uM9Xn0DAORat4lsunDnYo+sYgjhfoM2jCxZBNo88+ubznz8WV1erfrXiob6iov/K3rOrOCBxV7QHUQ9gMDu7MaOgmsI0WbX1iS8bJA2JtcwPHLQqIgb79u43np/jcEwee21bn1DbuNH2265J3bCCeLtN5xPm0xVBRTJ9Stkw7S3dFMAaQBTlihL+LnYxqbIkqfyjz+njC+MLbQMSAhN0hBYRLbLXsQ4NqOEbCFfU+nce1vtiheSv7st/OZYkYjITAFGNMSnTOz50+OtJ55kvftR2YD6/JN/tkpjinUxiPbfPZh2ZAIsjZbGaw8y/skT6+/8rV1Vu+WyK71Mq4hHISQWxEwArKRBDCOpbGpIQ/KR+9wRDdnlyzuuv8VZvdKybNZMFf3aH17kX3ZVWV+vuOZ76b+vtLZ3ckUF8M65kPd7ciEAMISIKgi6RWD9/KIhS56SddUtP7/SmrdAJDxmAqnYDmwRMCiZzVr5sLuituR/7nJGNPQ9+GjXmee6696Jl5bZkQjEMPLOX/Haa0tkvufAId43xmffeF04NjDvE1Xv0dIMGsgiUEbpwQfG591rjzs61/RJ5w/Psxs/irvl+YJCFYLKKlBoMJ2sjB3cAH/bVPKLy6OjD+p94gn/8isSnpXWoifEGIBybOOTcUGnCpHTjpO1dbF1m4TjGgQAJKJ/A2gEACLFqrqq8sannvCGDfGNyW7epDLaHjKgWwtL2Fgey9dWewOG04GD+x13TGbZc53yzeHfPd1v+qjz6usqXQq08H52bnzGrO5f/nfimWX5uGsFnPNKS8/7NluyYKHdlZalUSDIFHL/BtAMIAmVMsccc0zDsCGhHziOVX3SlKpJE4NcGlAIECIijOMJQADoXb2q/cbb6/7nAbBk5y13xlt7VIXLfUqUlxfefNO88XYQFYihyuVo2jR73NEIUPG72/rufaSjuZnD8KgD6lref7eQze4vT4MOEXHlO+9s62qrLa/2VShISMd23PLilGkMCAAG6FiwKPjZ1WXjDklMmZRd9Te99KVYPBGEyrKILr+ZMYh5bsGxLC0tKybWNvZNPoHj1ZnxR8rzZ9UfOhItq3zO1frdVUSozf7k0wiKjUDR8mnz1eedb9JpR1qCiBkMgwIgAEGQX79uy48v0Rdf7YVt9uyZgNj98Hy70GMxOoGlJHOJUKVR3/Iivm1AhQ5mWjvybT1hVVlixOCqg8e4jrv9oquevPfOIAzA8H5amgiZ0RDKzhdf3XLOT0p+dIF9zKF2NCpDE/Z2ZNd9nH72JfX8Mq+rw3Os3uHD+33zpEJrM/7lddeNZoRSklxlFFoisAQyk7EDv2/kiNg1c0snn1A0mN/R2vzDK8TLy6qjkS05H8HslfbknhmPgBmNYVMSiVb+bXnH239xBg6SiRKfjOnskdva7LDgRV2rJOF39znHHmclYuknFlttbVySJKMirMhAIEAL3zY6EEDkuh99Gv7yzo7VjaaqCrd0Bk8/kfi4OVuZ9LemgA3vfbW1l0BUCqTQCGAKjOhFS0Ift2w1qtlDEFKCa3HEZmOU1qFtJU45DgD6Xl6RIGDWxMyAioCYAVChJAMMLFHzu+8Fq1aBIDQm4kWgNAKhBjZfWJbZ90D8bCZiGNG2wUEEMMzADJoBEQu+HjLQPXpCoWO7/fd3HJkIipWhL65DAUQ9B6PIwMia2RgDX5mk95p7fJH1mcEYMGZX5otEyve98eNEJJZ+83XZ3hq4Nu/t/VlrYzRrDfteVt1X0F/k+oYDW4rjJyKAeW0lGNQixP2o8P5HQTMxAQKEBd2/f+SYo8JCQb3TyJ5naYXw9QPNAIyskViACgpizGF2sly//wFs3CRsGw3+ByH/y6ARgBEMMQH4bMcnfAMB0m+8JTMFh+ErL0H+xSb/9Ts1EoMBpatqrEkTgE24YrklpUKjCYWBr6NPGwQjMSgU6NjDvEF1+abNZk2jazsKtTCE/0lL/8ugUSMzcCi8xFmnAkD65RdlR8Z3yQlRMPPXMBARAFHqXFocNiY6cbIpFArPPR8lW4MhRv8/vKf3L7OHscHxjXJnTCM7knrtDXv1eyohnNAoAkb8OoJGJC7kgkFDot86CQznFz8udZCzUCMCoDTm60h5QOT7PfbUk6ya6uwH69Srr4toPJ4TBgR+tsa8i7EZ/m2xSfvix2jIIKClLWNUkCxLnPltAOhd8CenJ0MkGBUA+CSJgcmEUjOiNGiIDRKjICNCEsU1/v8GaATQCAwYkgltg+ksf+PY2OiD/M1bzLNPyZgXoCESDiMyChCWEgCWNFiQaAQ4oBwT+E7oYEio/zctzZYWCMAUaOHGv3s2AnY9/Ah9vI4I0Zh8KhcWsjFVKIS+EcbNhgYKDoTYF6g+36C0stpP58HsLx3uSxbLBljYLDlTyI8Zk5g8Kbv54/wrf41Mm5mPl7GyxemnZI46pACWHjrYB20GDwpK4pnAwHHfMNNO6GarMLheTj3Od539zAHl3skNARiIgRFyNnuIoTLR751GttP9/25NHDMm/63ptG510JPyKgeUlsvuASsqDz+k+7JfuhfPlg8/TqOr9MxvUb4Qrz1QHH9YoWmzWv6+DYaxuCvHXEwIkfHfYmkCIZCRiomGRkO2Qd/Ph6MOKp15Rt/qt9KPL3PiZRAEqU8280EH9d18k//uh3r4GJXLZnQOUPjpHho3qu9Pj/fN+6N1WF3Xwmfs4cNEbZkO2aAwIAwIYGGHBAyACEBfBfteijXEgJoBNAEZgZ7JFNJA/+dHQtq5y35dHqSFyOSXPJa8+48RL57/9c12vjv841Pezy6Mn/9dTAXehefkVm6oOWs6GxE895KbKEO3VJZEhQkRJBQ3OlloIQQLhQSIX2Ufcc+gWSGQBNBMRvaKSCbfRceMGTrzjI3X3hC8tzpRVbb10acwb1RtWfMjvw/efo862kq3bd1wYycgpV5azrWJ6EctW9euYrSdD9ebg+pzb63ElmYrGmVmIEEMwhhfUkAaWe1V6rB30FIgIToMeeRlfk/TtnxXwf/rnb9ZuGjxFTdcLx1psmBvB2NMSGgQvS0bSDhMGK741Ahpsw7XMUlBzeuYhOs4+de2KWPIssGwEIIQASEEAM0Oq43GFmgjarM3ZYjcg0BEaQ0AAQAApCynsZD77W/vfn/jlnNmng0kINRgdo6uCYBAEGgfNAII0AoAAB0osrLRkN9ZXwwDIIQg/FwAEQhjgt1lHvsWiETEzLNnz160aNE999wzatQoU/AvufjiZFnJrbfddN1117lSEJuaqurrrrmmJJEgBEGGDF82Z+6QwYNiUfcXl18ei8UIAgjVoEEH3HXnHYsXLbryyisqKyqkEGD4uEmTHnn44UULF954ww3lySQxMgdHjR//4x//uAhgr9nPZ0Qqtm0DwHnnndfa2jp79uybb775/PPPP/PMM2+88UYAePXVV5l5woQJABCNRnt6es4+++ziOIccckg2m00mk/X19X19fTU1NQDQ0NDQ1tY2b9682Rdc8MILL8ydOxcAZs+e3dvbe9VVV82aNWv58uXr1q0rKSkBgDlz5jStb9oF+stEKl8A2nVdAJg3b96SJUuKF5x22mknnngiAIwbN+7NN9988MEHFyxYUDx1xx13PPvss8VBfvWrXz355JMAMHTo0E2bNlXXVAPAs88+W3xescWiUdu2W1tbZ82atauztbX1Jz/5CQBcdNFFK1eu3Cvoz3yFoicFQQAADzzwwMknn/z888/PmDHjueeeW7ZsGSLOmjXr7bffvummm0488cTS0lIAWLBgwbhx45LJJDNPnTp14cKFxSdJKVWoAGDMmDHz588XQjiOI6XMZLNDhw4VQixdulRKWTTQK6+8cvTRRxexfhVVIO2OWErpeV5VVVVNTU1TU9PEiROVUvfff//ZZ58thLAsa9KkSUuWLNmwYcP27dtPPfVURFy9enV3d/eUKVPq6+vj8fjSpUv/odva2QqFQrETEYUQsVjM931jjNaamYUQuVzOcZzd3RX3uIz4DGhEJKJMJtPd3d3b27ty5cpp06ZdeeWVv/nNb7TW48aNGz58+LXXXvv8888nk8nTTz+dmY0xTz/99NSpU88444y33nork8kAgDGmOBoAKKXq6+uL6sQwDLXWLS0tiUSitLS0+CZa61GjRjU1Ne3cbjX//NpfGoiNjY1FJxZCIOL06dOHDRsmpbzooos2b94MAAsXLpw/f/6gQYMGDx48ZcqUVCo1cOBAABg9evSWLVuam5uPP/744oCDBg1qaWkpBuL111/f0dExYsQI13WPP/74GTNmIOKqVaueeeaZkpISKeWsWbMKhcKwYcMA4NJLL127dm08Hi8rK3Nddx8Csajcu+GGGz7++ONVq1Z9/PHHkydPtm173bp1Rc8rthUrVlx44YXFv1988cX169cLIYoBNHDgwDVr1lRUVBS56KGHHtq8efNbb721du3a008/HRGHDh26YsWKtWvXrl69+sMPP5w+fXpxnO985ztbt2594403Vq9ePWfOnF0o9wT6mWeeEULYtl3EPWDAgCOPPDIejwOA53m1tbW2bTuO4ziObdvl5eVVVVWWZVmWlUwmKyoqijcWR+jXr5/rusXri0ONHj3a8zwA2OW+I0eOHDt2bDEWPc+zLMt13YqKitra2v79+yeTSSllUZH5paAbGxsfe+wx+Fq2LVu2fLHWNAzDSZMm/eEPf5BSFrnvc8rcz82uxVfddQo+W8X/54v/WeRb9KXPde7OG8V+Y0xtbe3uQuN/gN60adOAAQOmT59ORF8rMyul2tvbW1tbP7MrW3y/aDRKREqpr6F72Lbl+0GR7+ELP8rXttFOkBJwh9KMBEojGFiyUYLAsAYgEAZYgCEmg8CkwQgGZFREQAoIEdAyrHhnnioYESgUmhgtI3xQAggFgGFFTAyOESGxZi2QgEkyB+Qg5tlIQibWWhBpRNSaCRmAJAFoDFDzDr8uaoMFCAABgIBYVNY6OyZLBElfWBYTxetwp0ANhQQpQQABIEggBAABuENlDAAoQYod1kIAazcPRQBAQTvVzl+cLsNOzS9KRANsgAYL6zAvsjTT4wh5sJt4I9NtSfxWJL4mlx3gltRaqEPF5LaZbK+Bd3OFYY4Ts6kz70+KRkK0VmVTG5Ry2HwzWrKZgw/yhYOsiGeLt7OpJNKEWOnaIPuJHxDy5Fg8HYQtGo+KeJ6wP/JTSmFUyldzvaNsp9ryEtJydSDB66CC7+thlixY8pV0epsKkTUDCEZpA2vmU0qSi2rrt4SqV6lf9m+Y391yYqRsSf9BBdadAr8fKzkjWtrJekJZyUFe4rm+zrMSpd+Nl0nD15ZXaC3/q6z/kmx7jUUv1Y4aLbzfpzvOSvab6ZU9lu48MuI+3r9+qBVdmOoaa8de7jciJpTrOJdUVmf8oEOH50T73VJVuyDTNTUS+W55shfE3ET8UCvaycEF5QMOIJEj/XFY6AnDnc4NWiMAoGRrW7rjrJLyBtfr1d0ewLRoyYOdnWPc6iVdHQ/1dH7AwZXtWzZmA0cTASjWSitisd7Pz+9rjQsdZ/xmouKJ7Fa2eSS53SYdiDQCJI14P9+XkNbh0puccJp0dy9DxJjOIPWXbOr1fDYHPdsKPZeVVCWYPy0Ubt/evMrPPZpvv6WzPUCzNvSfS6U3+ApQ8o6yETCxBcBx5FcL/lo/f2mkIq1VvZCHRkRTvq/OCiZFXANgAyAiSWAODWCOmaUOQR8EsfvqDnw219Ws1dSS0ibf91Q4IREHjRoMAyDiZiNW5fouLa9scJ2lfhYtYh2WkjOxrGqA42rLu6/QPUQkTnQSWTCECOQkNCOiFarDIs6xpeU2FsuJO0DvkFlLSaHl/a6j9dCIOyAMpsTLJHllsWgvmzOj1REUJCxm3qoyo7zoaBLHeIleJVFQI6q52zeMj1WdGUkeGECl7aYhPCkeGQh2KUcHSquK0CP7uXTXWaUe5aymfOhZjpLeduPcve2T7blMf5Sf+uEfU91HJSoFS8McMbYLDjDYTmxZX9/ijm0WWLBzc1cgCIFskAdbEZLy8UyPdsmEEddST6bTd3W1NwdmcCK53k/FUf4lk93oB0eK6JkVJZZtbt3e6UmK23Bvb+8xNh8SLXnKT1/f3vpqPjg8EesumKF2YnwiYoFpB72wLzXUiy1Kd3ewKpPuhmzXeM+ZUlotEVPoblTmmWzbGCeyPl9YUciOikU+Mn5jIXeIC8c63sTSijV+brsKqFjnFiABlHbIU6SMClmWgbLJSpswh5IADKt+hA5SO+ucQUABoPqR6NI6QNtGJgMCjAaKgU6hIRCSiSFUwnI5NABghAImQAJMo3YACGTIpgK0DxgAZRGIDDFaBpkwYEuAL4AJ0RjjgURQPkCWdkj3EElIozVZAFSD4eUVVZMjCQBnXZi5qK1Fc3h1Zf8pdpkt/PZAPpxqeSjVOyISubO8JqPNle0tTco/JVr608rqc5o/Oaes7AdeGZow6li/C1RTb9cVlYN+tO3DtWFgEd1aUz6Zkjektz/W1wOI3y+r/KlXwqx8KV4q5G/tbKsk+dDAuvs7uxan+5j5xETyxkSFRt8C4Qvrh62bPvD9ImyJrA0AMwkM/7uq7vxI6T193etU77SK2BHR6AzXOz1ecmtnx0aVnxWv+G31AZ+aj9Iax9l2nLG5vPqituZyC8aTHWc+RFhDHXFrV68ocKPSA0kcZUGcAMEcbHvnWMkKVt+LlTyV7lUGRhOPlPbPUz0jSFxZXt8c5F9Op44W7vOIzAYAagWOlfadqXST8QXKTm0RamYFANIgEAKb4HDbnR6pvr+v66edWwGsB3vbJ0fKzqiouKOr9frudgBakcu+3X/kuXbyNr8rH8JG3/92InZXj51RHGoOmEBxO8P1vR1FNr2gtDzD2RCAAU6NxXpC84jKnRsvGyntxsAPkZuldXdPZ72wzimtiSH7KHPGhDtTImXYF+rhbFujbwAY0MKdQmVCg8XfgNS5Xpn23y10I2JEWiFAtZARY94M8gJtG/FTVpvC3EBJCaDAonvznU6oLymtRgQt2UKdk1QCdH/lgIdrayfF4wWtHRMDYEKc7pUuDfvu6eqIGevkaBwAyLj9VW5p3aCX6g7I+sHz6bRHevfEExCtUC8oq187YMRN/esRQsFq1+TCcse6HEGonDDADKwAwFAA2nghMQSGjNRIqFO2BiZX0Ft+7uF07uyod6wVLyhtkMmAq029HTnQjZaQZGYgDAwfbHkHeNjJwSDPbvP9k2NxAWAQFMGqXPqJfC8JcXGy1gUTIgKRACREQNZCLvdzi7Nd72QzgPbOHAbkTumvaMvnCoDjndL5kMppJRB7TFiwxCjXfbLQZzSPtuwGO/pKNpM32jbsgnVPX/s5sbrvuPE8aAPoaZNl/l7rh50GAOD7pUmF2ZDNaQnXC9W5zsCz4iSUGi7cEdJJQdAlEtd1dwJAQ5U7IV76WG+HFVgmNBoYGGQoEOW9qY41O379JtRuKxcKwSCK1cpfEmR/EInHqvt/CHyCW/ObzObns5m5yWrPpY5Qnxstyxjn0d6+qLAk2JaQW/3cvGz++nisRQXE6FuCpWekRGWADQEKduqldVo8uTQwl7Z9wIaPcCOLqxumxxIRLcsZLq8aUM48KVKyJJfpIGbC0+Kxes9rR2PYMPiXVNR8QqRR/qFza4tSxYK7sJA0sWAICN/LpuOOdaxnHy2sDX74YE/bq/lUjeN824ofHrG3KXNF19blYbbccg6LeE+nu9tZb1CFA9xYL6s/ZHobXC8m8NFUj9ZsCOts60BbvBuEY93SB/o63ipkewVvVOHhjhUKs96oQZYYLKO1EfuJoOv29pY8WKOjkahlDpbRmCVWhOkaEnXkDHbckdJ7JdvdpnRxcvn/4AbtQIj7XmAAAAAASUVORK5CYII=" alt="Pollos Savicol" style="width:52px;height:72px;object-fit:contain;border-radius:4px"/>
      <div>
        <div class="company-name">Pollos Savicol S.A.S.</div>
        <div class="company-sub">NIT: 860.403.972-4 · Control Interno y Auditoria</div>
      </div>
    </div>
    <h1>${titulo}</h1>
    <h2>${subtitulo}</h2>
    ${datos?.tituloActividad ? `<p style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;margin-bottom:4px">${datos.tituloActividad}</p>` : ""}
    ${granjaFiltro ? `<p style="color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:4px">Granja: <strong style="color:white">${granjaFiltro}</strong></p>` : ""}
    <div><span class="confidencial">CONFIDENCIAL</span></div>
    <div class="cover-meta">
      ${meta.map(m => `<div class="cover-meta-item"><div class="cover-meta-label">${m.label}</div><div class="cover-meta-value">${m.value}</div></div>`).join("")}
    </div>
  </div>`;
}

// ─── SECCIÓN RESUMEN EJECUTIVO ────────────────────────────────────────────────
function seccionResumen(kpis: any[], hallazgos: any[]): string {
  const total     = kpis.length;
  const comp      = kpis.filter(k=>k.estado==="COMPLETADO").length;
  const enCurso   = kpis.filter(k=>k.estado==="EN_CURSO").length;
  const enEspera  = kpis.filter(k=>k.estado==="EN_ESPERA").length;
  const noInicio  = kpis.filter(k=>k.estado==="NO_INICIADO").length;
  const hallAb    = hallazgos.filter(h=>h.estado==="ABIERTO").length;
  const hallCerr  = hallazgos.filter(h=>h.estado==="CERRADO").length;
  const pct       = porcentaje(kpis);
  return `
  <div class="section">
    <div class="section-title">Resumen Ejecutivo</div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-card-num" style="color:#4A7AFF">${total}</div><div class="kpi-card-label">Total KPIs</div></div>
      <div class="kpi-card"><div class="kpi-card-num" style="color:#22C55E">${comp}</div><div class="kpi-card-label">Completados</div></div>
      <div class="kpi-card"><div class="kpi-card-num" style="color:#F97316">${enCurso}</div><div class="kpi-card-label">En Curso</div></div>
      <div class="kpi-card"><div class="kpi-card-num" style="color:#EF4444">${noInicio}</div><div class="kpi-card-label">No Iniciados</div></div>
    </div>
    <div style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px">
        <span style="color:#475569;font-weight:600">Avance global de planes de acción</span>
        <span style="font-weight:800;color:#1a202c">${pct}%</span>
      </div>
      <div class="progress-bar-bg" style="height:12px">
        <div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#4A7AFF,#22C55E)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:10px;color:#64748b">
        <span>Hallazgos abiertos: <strong style="color:#EF4444">${hallAb}</strong></span>
        <span>Hallazgos cerrados: <strong style="color:#22C55E">${hallCerr}</strong></span>
        <span>En plan de acción: <strong style="color:#F97316">${hallazgos.filter(h=>h.estado==="EN_PLAN").length}</strong></span>
      </div>
    </div>
  </div>`;
}

// ─── SECCIÓN TRAZABILIDAD DETALLADA POR KPI ──────────────────────────────────
// Genera el detalle completo de cada KPI filtrado (estructura solicitada):
// Información General · Hallazgo · Gestión KPI · Evidencias · Evaluación
// Solo usa los registros filtrados — sin contenido ficticio ni datos externos.
function seccionTrazabilidadKPI(
  kpis: any[], hallazgos: any[], granjas: any[],
  evidenciasPorHallazgo?: Record<string, any[]>
): string {
  if (!kpis.length) return "";

  // Ordenar por fecha del hallazgo (más reciente primero)
  const ordenados = [...kpis].sort((a, b) => {
    const ha = hallazgos.find(h => h.id === a.hallazgoId);
    const hb = hallazgos.find(h => h.id === b.hallazgoId);
    const fa = ha?.fechaVisita ? new Date(ha.fechaVisita).getTime() : 0;
    const fb = hb?.fechaVisita ? new Date(hb.fechaVisita).getTime() : 0;
    return fb - fa;
  });

  const parseSeguimiento = (s: string) => {
    const parts = (s ?? "").split("||");
    return {
      resp:      (parts.find(p => p.startsWith("RESP:"))?.slice(5) ?? "").trim(),
      aud:       (parts.find(p => p.startsWith("AUD:"))?.slice(4) ?? "").trim(),
      audNombre: (parts.find(p => p.startsWith("AUDNOM:"))?.slice(7) ?? "").trim(),
    };
  };

  const fichas = ordenados.map((k, idx) => {
    const h = hallazgos.find(hh => hh.id === k.hallazgoId);
    const g = granjas.find(gr => gr.id === k.granjaId);
    const seg = parseSeguimiento(k.seguimiento);
    const pct = k.porcentajeAvance ?? 0;
    const evs = (h && evidenciasPorHallazgo?.[h.id]) ? evidenciasPorHallazgo[h.id] : [];

    const galeria = evs.length > 0 ? `
      <div style="margin-top:10px">
        <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px">Evidencias Fotográficas (${evs.length})</div>
        ${evidenciasGridHTML(evs.map((ev: any) => ({ src: ev.url, titulo: ev.nombre || undefined, pie: ev.categoria || undefined })))}
      </div>` : `<div style="margin-top:8px;font-size:10px;color:#94a3b8">Sin evidencias fotográficas asociadas.</div>`;

    return `
    <div class="section" style="page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0D1526;padding-bottom:8px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:800;color:#0D1526">Registro KPI #${idx + 1}</div>
        <span class="badge ${clsBadge(k.estado)}">${displayEstado(k.estado)}</span>
      </div>

      <div style="font-size:10px;font-weight:700;color:#4A7AFF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Información General</div>
      <table style="width:100%;font-size:10px;margin-bottom:10px">
        <tr><td style="color:#64748b;width:30%">Granja</td><td style="font-weight:600">${g?.nombre || "—"}</td></tr>
        <tr><td style="color:#64748b">Auditor</td><td style="font-weight:600">${h?.auditorNombre || "—"}</td></tr>
        <tr><td style="color:#64748b">Tipo de Producción</td><td>${g?.tipoOperativo || "—"}</td></tr>
        <tr><td style="color:#64748b">Tipo de Granja</td><td>${g?.tipoGranja || "—"}</td></tr>
      </table>

      <div style="font-size:10px;font-weight:700;color:#4A7AFF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Información del Hallazgo</div>
      <table style="width:100%;font-size:10px;margin-bottom:6px">
        <tr><td style="color:#64748b;width:30%">Hallazgo</td><td style="font-weight:600">${h?.titulo || k.accion?.slice(0,60) || "—"}</td></tr>
        <tr><td style="color:#64748b">Tipo de Riesgo</td><td>${(Array.isArray(h?.tiposRiesgo) ? h.tiposRiesgo.join(", ") : "") || "—"}</td></tr>
        <tr><td style="color:#64748b">Estado del Hallazgo</td><td>${displayEstado(h?.estado || "—")}</td></tr>
        <tr><td style="color:#64748b">Fecha Hallazgo</td><td>${fmtFechaCorta(h?.fechaVisita)}</td></tr>
      </table>
      <div style="background:#f8fafc;border-radius:6px;padding:8px 10px;font-size:10px;color:#475569;line-height:1.6;margin-bottom:10px">
        <strong style="color:#0D1526">Descripción Completa:</strong><br>${h?.descripcion || k.accion || "Sin descripción registrada."}
      </div>

      <div style="font-size:10px;font-weight:700;color:#4A7AFF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Gestión KPI</div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;font-size:10px;color:#1e40af;line-height:1.6;margin-bottom:8px">
        <strong>Plan de Acción:</strong><br>${k.planAccionVeterinario && k.planAccionVeterinario !== "—" ? k.planAccionVeterinario : "Pendiente de generar."}
      </div>
      <table style="width:100%;font-size:10px;margin-bottom:6px">
        <tr><td style="color:#64748b;width:30%">Responsable</td><td style="font-weight:600">${k.responsable || "—"}</td></tr>
        <tr><td style="color:#64748b">Fecha Compromiso</td><td>${fmtFechaCorta(k.fechaCompromiso)}</td></tr>
        <tr><td style="color:#64748b">Fecha Cumplimiento</td><td>${fmtFechaCorta(k.fechaCumplimiento)}</td></tr>
        <tr><td style="color:#64748b">Calificación Auditor</td><td>${displayEstado(k.estado)}</td></tr>
      </table>
      ${seg.resp ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Seguimiento Responsable:</strong> ${seg.resp}</div>` : ""}
      ${seg.audNombre ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Auditor de seguimiento:</strong> ${seg.audNombre}</div>` : ""}
      ${seg.aud  ? `<div style="font-size:10px;color:#475569;margin-bottom:6px"><strong>Seguimiento Auditor:</strong> ${seg.aud}</div>` : ""}
      <div style="margin:8px 0">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;margin-bottom:3px">
          <span>Porcentaje de Avance</span><span style="font-weight:800;color:#0D1526">${pct}%</span>
        </div>
        <div class="progress-bar-bg" style="height:8px"><div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,#4A7AFF,#22C55E)"></div></div>
      </div>

      <div style="font-size:10px;font-weight:700;color:#4A7AFF;text-transform:uppercase;letter-spacing:0.5px;margin-top:10px">Evidencias</div>
      ${galeria}
    </div>`;
  }).join("");

  return `
  <div class="section">
    <div class="section-title">Trazabilidad Detallada por KPI (${kpis.length} registro${kpis.length !== 1 ? "s" : ""})</div>
    ${fichas}
  </div>`;
}

// ─── SECCIÓN HALLAZGOS TABLA ──────────────────────────────────────────────────
function seccionHallazgos(hallazgos: any[], granjas: any[], limite=15, introHTML=""): string {
  const lista = hallazgos.slice(0, limite);
  return `
  <div class="section">
    <div class="section-title">Hallazgos Identificados${hallazgos.length > limite ? ` (mostrando ${limite} de ${hallazgos.length})` : ""}</div>
    ${introHTML}
    <table>
      <thead><tr>
        <th>Hallazgo</th><th>Granja</th><th>Auditor</th><th>Fecha</th><th>Riesgo</th><th>Estado</th>
      </tr></thead>
      <tbody>${lista.map(h => {
        const g = granjas.find(gr=>gr.id===h.granjaId);
        return `<tr>
          <td>${h.titulo || "—"}</td>
          <td>${g?.nombre || "—"}</td>
          <td>${h.auditorNombre || "—"}</td>
          <td>${fmtFechaCorta(h.fechaVisita)}</td>
          <td>${h.tiposRiesgo?.join(", ") || "—"}</td>
          <td><span class="badge ${clsBadge(h.estado)}">${displayEstado(h.estado)}</span></td>
        </tr>`;
      }).join("")}</tbody>
    </table>
  </div>`;
}

// ─── SECCIÓN PLANES KPI ───────────────────────────────────────────────────────
function seccionKPIs(kpis: any[], granjas: any[], hallazgos: any[], evidenciasPorHallazgo?: Record<string, any[]>, detallado=false): string {
  return `
  <div class="section">
    <div class="section-title">Gestión de Planes de Acción KPI</div>
    ${kpis.slice(0,12).map(k => {
      const g = granjas.find(gr=>gr.id===k.granjaId);
      const h = k.hallazgoId ? hallazgos.find(hh=>hh.id===k.hallazgoId) : null;
      const pct = k.porcentajeAvance ?? 0;
      const fillColor = pct>=80?"#22C55E":pct>=40?"#F97316":"#EF4444";
      const seguPartsK = (k.seguimiento || "").split("||");
      const seguResp = seguPartsK.find((p:string)=>p.startsWith("RESP:"))?.slice(5) || "";
      const seguAud  = seguPartsK.find((p:string)=>p.startsWith("AUD:"))?.slice(4) || "";
      const seguAudNombre = seguPartsK.find((p:string)=>p.startsWith("AUDNOM:"))?.slice(7) || "";
      if (detallado) {
        const fotosAll = (k.hallazgoId ? (evidenciasPorHallazgo?.[k.hallazgoId] || []) : []);
        const fotosHall = fotosAll.filter((ev:any) => (ev.categoria||"") !== "Seguimiento");
        const fotosSeg  = fotosAll.filter((ev:any) => ev.categoria === "Seguimiento");
        const categoria = h?.categoria || (h?.tiposRiesgo?.join(", ")) || "";
        const auditorNom = seguAudNombre || h?.auditorNombre || "";
        return `<div class="kpi-item" style="page-break-inside:avoid">
          <div class="kpi-item-header">
            <div class="kpi-item-title">${h?.titulo || k.accion}</div>
            <span class="badge ${clsBadge(k.estado)}">${displayEstado(k.estado)}</span>
          </div>
          <div class="kpi-meta">
            Granja: <strong>${g?.nombre||"—"}</strong> ·
            Responsable: <strong>${k.responsable||"—"}</strong>
            ${k.fechaCompromiso ? ` · Compromiso: ${fmtFechaCorta(k.fechaCompromiso)}` : ""}
            ${categoria ? ` · Categoría: <strong>${categoria}</strong>` : ""}
          </div>
          ${h?.descripcion ? `<div style="font-size:10px;color:#475569;margin:2px 0 6px"><strong>Descripción del Hallazgo:</strong> ${h.descripcion}</div>` : ""}
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div class="progress-bar-bg" style="flex:1"><div class="progress-bar-fill" style="width:${pct}%;background:${fillColor}"></div></div>
            <span style="font-size:10px;font-weight:700">${pct}%</span>
          </div>
          ${auditorNom ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Auditor:</strong> ${auditorNom}</div>` : ""}
          ${k.fechaSeguimiento ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Fecha de seguimiento:</strong> <span style="background:#FEF3C7;color:#92400E;font-weight:700;padding:1px 5px;border-radius:3px">${fmtFechaCorta(k.fechaSeguimiento)}</span></div>` : ""}
          ${seguResp ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Seguimiento:</strong> ${seguResp}</div>` : ""}
          ${seguAud ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Observación del Seguimiento:</strong> ${seguAud}</div>` : ""}
          ${k.planAccionVeterinario && k.planAccionVeterinario !== "—" ? `
          <div class="plan-box"><div class="plan-box-title">Plan de Acción</div><div class="plan-box-text">${k.planAccionVeterinario}</div></div>` : ""}
          ${fotosHall.length ? `<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:#0D1526;margin-bottom:4px">Evidencia Fotográfica del Hallazgo (${fotosHall.length})</div>${evidenciasGridHTML(fotosHall.map((ev:any)=>({src:ev.url, titulo:ev.nombre||undefined})))}</div>` : ""}
          ${fotosSeg.length ? `<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:#0D1526;margin-bottom:4px">Evidencia Fotográfica del Seguimiento (${fotosSeg.length})</div>${evidenciasGridHTML(fotosSeg.map((ev:any)=>({src:ev.url, titulo:ev.nombre||undefined})))}</div>` : ""}
        </div>`;
      }
      // Ejecutivo: evidencias en 2 COLUMNAS (filas de 2) para ocupar menos hojas; cada fila
      // (page-break-inside:avoid) no se corta entre páginas. Se separan las del Hallazgo y las del Seguimiento.
      const todasFotos = k.hallazgoId ? (evidenciasPorHallazgo?.[k.hallazgoId] || []) : [];
      const fotosHallazgo    = todasFotos.filter((ev: any) => (ev.categoria || "") !== "Seguimiento");
      const fotosSeguimiento = todasFotos.filter((ev: any) => ev.categoria === "Seguimiento");
      const bloqueFotos = (fotos: any[], titulo: string, mostrarCat: boolean) => {
        if (!fotos.length) return "";
        const filas: string[] = [];
        for (let i = 0; i < fotos.length; i += 2) {
          const par = fotos.slice(i, i + 2);
          filas.push(`<div style="display:flex;gap:10px;page-break-inside:avoid;margin-bottom:8px">${par.map((ev: any) => { const pie = mostrarCat ? [ev.categoria, ev.nombre].filter(Boolean).join(" · ") : (ev.nombre || ""); return `<div style="flex:1;min-width:0;text-align:center"><img src="${ev.url}" style="max-width:100%;max-height:300px;width:auto;height:auto;border-radius:6px;border:1px solid #e2e8f0;display:inline-block"/>${pie ? `<div style="font-size:11px;color:#64748b;margin-top:3px">${pie}</div>` : ""}</div>`; }).join("")}${par.length === 1 ? `<div style="flex:1"></div>` : ""}</div>`);
        }
        return `<div style="margin:2px 0 12px"><div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:5px">${titulo} (${fotos.length})</div>${filas.join("")}</div>`;
      };
      const fotosHTML            = bloqueFotos(fotosHallazgo,    "Evidencia Fotográfica del Hallazgo",    true);
      const fotosSeguimientoHTML = bloqueFotos(fotosSeguimiento, "Evidencia Fotográfica del Seguimiento", false);
      // "Auditor y seguimiento" al mismo tamaño que el Hallazgo (14px), con la fecha del seguimiento resaltada.
      const SEGUI = "font-size:14px;color:#334155;line-height:1.5;margin-bottom:3px";
      // Conciso y SIN duplicados: el título es el Hallazgo y su descripción se muestra UNA sola vez.
      // La acción del plan suele autocompletarse del hallazgo, por eso se omite para no repetir el texto.
      const tituloItem = h?.titulo || k.accion;
      const descItem = h?.descripcion?.trim()
        ? h.descripcion
        : (k.accion && k.accion.trim() !== tituloItem.trim() ? k.accion : "");
      return `<div class="kpi-item">
        <div class="kpi-item-header">
          <div class="kpi-item-title">${tituloItem}</div>
          <span class="badge ${clsBadge(k.estado)}">${displayEstado(k.estado)}</span>
        </div>
        <div class="kpi-meta">
          Granja: <strong>${g?.nombre||"—"}</strong> ·
          Responsable: <strong>${k.responsable||"—"}</strong>
        </div>
        ${descItem ? `<div class="hallazgo-desc">${descItem}</div>` : ""}
        ${k.fechaSeguimiento ? `<div style="${SEGUI}"><strong>Fecha de seguimiento:</strong> <span style="background:#FEF3C7;color:#92400E;font-weight:700;padding:1px 6px;border-radius:4px">${fmtFechaCorta(k.fechaSeguimiento)}</span></div>` : ""}
        ${seguResp ? `<div style="${SEGUI}"><strong>Seguimiento:</strong> ${seguResp}</div>` : ""}
        ${seguAudNombre ? `<div style="${SEGUI}"><strong>Auditor de seguimiento:</strong> ${seguAudNombre}</div>` : ""}
        ${seguAud  ? `<div style="${SEGUI}"><strong>Observación del seguimiento:</strong> ${seguAud}</div>` : ""}
        ${k.planAccionVeterinario && k.planAccionVeterinario !== "—" ? `
        <div class="plan-box">
          <div class="plan-box-title">Plan de Acción</div>
          <div class="plan-box-text">${k.planAccionVeterinario}</div>
        </div>` : ""}
      </div>
      ${fotosHTML}${fotosSeguimientoHTML}`;
    }).join("")}
  </div>`;
}

// ─── SECCIÓN FIRMA DIGITAL ────────────────────────────────────────────────────
function seccionFirma(auditor: string, cargo="Auditor Interno", datos?: DatosGenerales, ordenGeneral=false, rolesEjecutivo=false): string {
  const fecha = fmtFechaCorta(new Date().toISOString());
  const hash  = `SHA-${Date.now().toString(36).toUpperCase()}`;
  // Firmantes: con datos generales se usan los roles del formulario; si no, auditor + gerencia.
  const firmantes: { nombre: string; cargo: string; nota?: string }[] = [];
  if (rolesEjecutivo) {
    // Informe Ejecutivo — orden solicitado: Auditor · Técnico Veterinario · Administrador · Oficial de Cumplimiento
    firmantes.push({ nombre: datos?.auditor1 || auditor || "Auditor Interno", cargo: "Auditor", nota: `Firma digital: ${hash}` });
    firmantes.push({ nombre: datos?.tecnicoVeterinario || "", cargo: "Técnico Veterinario" });
    firmantes.push({ nombre: datos?.administrador || "", cargo: "Administrador" });
    firmantes.push({ nombre: datos?.oficialCumplimiento || "", cargo: "Oficial de Cumplimiento" });
  } else {
    if (datos?.auditor1) firmantes.push({ nombre: datos.auditor1, cargo: "Auditor 1", nota: `Firma digital: ${hash}` });
    if (datos?.auditor2) firmantes.push({ nombre: datos.auditor2, cargo: "Auditor 2" });
    if (!datos?.auditor1 && !datos?.auditor2) firmantes.push({ nombre: auditor || "Auditor Interno", cargo, nota: `Firma digital: ${hash}` });
    if (ordenGeneral) {
      // Informe General — orden solicitado: Auditor · Responsable del Proceso · Administrador · Oficial de Cumplimiento · Gerencia
      firmantes.push({ nombre: "", cargo: "Responsable del Proceso" });
      firmantes.push({ nombre: datos?.administrador || "", cargo: "Administrador" });
      firmantes.push({ nombre: datos?.oficialCumplimiento || "", cargo: "Oficial de Cumplimiento" });
      firmantes.push({ nombre: datos?.gerenteGeneral || "Gerencia General", cargo: "Gerencia", nota: "V°B° — Pendiente de aprobación" });
    } else {
      firmantes.push({ nombre: datos?.gerenteGeneral || "Gerencia General", cargo: "Gerente General", nota: "V°B° — Pendiente de aprobación" });
      if (datos?.administrador)        firmantes.push({ nombre: datos.administrador, cargo: "Administrador" });
      if (datos?.oficialCumplimiento)  firmantes.push({ nombre: datos.oficialCumplimiento, cargo: "Oficial de Cumplimiento" });
    }
  }

  const box = (f: { nombre: string; cargo: string; nota?: string }) => `
      <div class="firma-box" style="page-break-inside:avoid">
        <div class="firma-line"></div>
        <div class="firma-name">${f.nombre}</div>
        <div class="firma-cargo">${f.cargo}</div>
        <div class="firma-cargo">${EMPRESA.nombre}</div>
        ${f.nota ? `<div class="firma-digital">${f.nota}</div>` : ""}
      </div>`;
  return `
  <div class="section">
    <div class="section-title">Firmas y Certificación</div>
    <div style="display:grid;grid-template-columns:repeat(${firmantes.length >= 3 ? 3 : 2},1fr);gap:28px 30px;margin-top:22px">
      ${firmantes.map(box).join("")}
    </div>
    <div style="margin-top:20px;padding:10px 14px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;font-size:10px;color:#0c4a6e">
      <strong>Nota de confidencialidad:</strong> Este informe contiene información confidencial de ${EMPRESA.nombre}.
      Su distribución está restringida a los destinatarios autorizados. Generado automáticamente por el
      Sistema de Auditoría Interna el ${fecha}.
    </div>
  </div>`;
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function footer(): string {
  return `<div class="footer">
    <strong>${EMPRESA.nombre}</strong> · ${EMPRESA.area} · ${EMPRESA.ciudad} · ${EMPRESA.telefono} · ${EMPRESA.email}
    <br>Documento generado por Audit Platform Software · ${fmtFechaCorta(new Date().toISOString())}
  </div>`;
}

// ─── SECCIÓN INDICADORES DE MORTALIDAD ────────────────────────────────────────
// Trazabilidad (lotes) + Mortalidad por Conteo de Picos (de los anexos del hallazgo,
// con el % respecto al conteo de picos en letra grande y el reporte de detalle).
function seccionMortalidad(mortalidad: MortalidadResumen | undefined, granjas: any[], hallazgos: any[] = [], ocultarConteoPicos = false, ocultarConciliacion = false): string {
  const fmt = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

  // Bloque 1 — Trazabilidad (aves ingresadas/actuales/muertes): RETIRADO por solicitud
  // (no relevante en el informe). "Indicadores de Mortalidad" queda solo con el bloque de
  // anexos (conteo de picos + recepción de aves + % desde la mortalidad diaria).

  // Bloque 2 — Mortalidad por Conteo de Picos (Anexos Técnicos del hallazgo)
  const conAnexos = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) }))
    .filter(x => x.a.actaConteoPicos.length > 0 || x.a.recepcionAves.length > 0 || recepcionResumenTieneDatos(x.a.recepcionAvesResumen));
  let anexosHTML = "";
  if (conAnexos.length) {
    let conteo = 0, fisico = 0, aves = 0, repSaldo = 0, mortDiaria = 0;
    conAnexos.forEach(({ a }) => {
      a.actaConteoPicos.forEach(r => { conteo += anexNum(r.reporteConteo); fisico += anexNum(r.reporteFisico); });
      a.recepcionAves.forEach(r => aves += totalRecepcion(r));
      repSaldo += anexNum(a.recepcionAvesResumen.reporteSaldoAves);
      mortDiaria += calcMortalidadDiaria(a.registroMortalidadDiaria).totalGeneral;
    });
    // Conciliación reestructurada: acta conteo = Σ conteo, saldo identificado = Σ físico,
    // faltante = conteo − físico (= Diferencia). "Reporte saldo de aves" es el único manual.
    const faltanteConcil = conteo - fisico;
    const hayConcil = conteo !== 0 || fisico !== 0 || repSaldo !== 0;
    // Indicador PRINCIPAL: % Mortalidad = Total mortalidad de aves (Σ mortalidad diaria) / aves recibidas
    const mortNueva = mortDiaria;
    const pctNueva = aves > 0 ? (mortNueva / aves) * 100 : null;
    const pctNColor = (pctNueva ?? 0) >= 8 ? "#EF4444" : (pctNueva ?? 0) >= 4 ? "#F97316" : "#22C55E";
    const filasMort = conAnexos.filter(x => avesRecibidasTotal(x.a) > 0).map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      const rec = avesRecibidasTotal(a); const saldo = anexNum(a.recepcionAvesResumen.reporteSaldoAves); const mAve = totalMortalidadAves(a); const pm = pctMortalidad(a);
      const c = (pm ?? 0) >= 8 ? "#EF4444" : (pm ?? 0) >= 4 ? "#F97316" : "#22C55E";
      return `<tr><td><strong>${h.titulo?.slice(0, 42) || "—"}</strong></td><td>${g?.nombre || "—"}</td><td>${h.auditorNombre || "—"}</td><td style="text-align:right">${fmt(rec)}</td><td style="text-align:right">${fmt(saldo)}</td><td style="text-align:right;font-weight:700">${fmt(mAve)}</td><td style="text-align:right"><span class="badge" style="background:${c}1f;color:${c}">${pm != null ? pm.toFixed(2) + "%" : "—"}</span></td></tr>`;
    }).join("");
    // Detalle secundario: conteo de picos
    const mort = conteo - fisico;
    const pctCP = conteo > 0 ? (mort / conteo) * 100 : 0;
    const detalle = conAnexos.filter(x => x.a.actaConteoPicos.length).map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      return `<div style="page-break-inside:avoid;margin-top:8px">
        <div style="font-size:11px;font-weight:700;color:#0D1526">${h.titulo?.slice(0, 60) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
        <table><thead><tr><th>Fecha</th><th style="text-align:right">Conteo de Picos</th><th style="text-align:right">Reporte Físico</th><th style="text-align:right">Mortalidad</th></tr></thead>
        <tbody>${a.actaConteoPicos.map(r => `<tr><td>${r.fechaConteo || "—"}</td><td style="text-align:right">${fmt(anexNum(r.reporteConteo))}</td><td style="text-align:right">${fmt(anexNum(r.reporteFisico))}</td><td style="text-align:right;font-weight:700;color:${difConteoPicos(r) !== 0 ? "#EF4444" : "#22C55E"}">${fmt(difConteoPicos(r))}</td></tr>`).join("")}</tbody></table></div>`;
    }).join("");

    const headline = pctNueva != null ? `
      <div style="font-size:13px;font-weight:800;color:#0D1526;margin-bottom:10px">% Mortalidad</div>
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:12px">
        <div style="text-align:center;min-width:150px">
          <div style="font-size:46px;font-weight:800;color:${pctNColor};line-height:1">${pctNueva.toFixed(2)}%</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Mortalidad del alcance</div>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;min-width:280px">
          ${[{ l: "Aves recibidas", v: fmt(aves) }, { l: "Reporte saldo", v: fmt(repSaldo) }, { l: "Mortalidad", v: fmt(mortNueva) }].map(k => `<div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#0D1526">${k.v}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase">${k.l}</div></div>`).join("")}
        </div>
      </div>
      ${filasMort ? `<div style="font-size:11px;font-weight:700;color:#4A7AFF;margin-bottom:2px">Detalle por hallazgo</div>
      <table><thead><tr><th>Hallazgo</th><th>Granja</th><th>Auditor</th><th style="text-align:right">Recibidas</th><th style="text-align:right">Saldo</th><th style="text-align:right">Mortalidad</th><th style="text-align:right">%</th></tr></thead><tbody>${filasMort}</tbody></table>` : ""}
      <div style="font-size:11px;color:#334155;margin-top:6px"><strong>Interpretación técnica:</strong> mortalidad del ${pctNueva.toFixed(2)}%, ${pctNueva >= 8 ? "crítica — requiere atención inmediata" : pctNueva >= 4 ? "elevada — requiere seguimiento y plan de acción" : "dentro de parámetros aceptables"}.</div>
      <p style="font-size:9px;color:#94a3b8;margin-top:4px">% Mortalidad = Total mortalidad de aves (Σ mortalidad diaria) ÷ aves recibidas.</p>` : "";

    const conteoPicos = (conteo > 0 && !ocultarConteoPicos) ? `
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin:14px 0 6px">Mortalidad por conteo de picos (detalle)</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;margin-bottom:4px">
        <span>Conteo de picos: <strong>${fmt(conteo)}</strong></span>
        <span>Reporte físico: <strong>${fmt(fisico)}</strong></span>
        <span>Mortalidad: <strong style="color:${mort !== 0 ? "#EF4444" : "#22C55E"}">${fmt(mort)}</strong> (${pctCP.toFixed(2)}%)</span>
      </div>
      ${detalle}` : "";

    anexosHTML = `
    <div style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px;page-break-inside:avoid">
      ${headline}
      ${conteoPicos}
      ${(hayConcil && !ocultarConciliacion) ? `
      <div style="font-size:11px;font-weight:700;color:#4A7AFF;margin:12px 0 2px">Conciliación de saldo de aves</div>
      <table><tbody>
        <tr><td>Reporte acta conteo de picos (Σ Reporte conteo)</td><td style="text-align:right;font-weight:700">${fmt(conteo)}</td></tr>
        <tr><td>Reporte saldo de aves</td><td style="text-align:right">${fmt(repSaldo)}</td></tr>
        <tr><td>Saldo identificado de aves (Σ Reporte físico)</td><td style="text-align:right">${fmt(fisico)}</td></tr>
        <tr><td>Total mortalidad de aves (Σ mortalidad diaria)</td><td style="text-align:right;font-weight:700;color:#EF4444">${fmt(mortNueva)}</td></tr>
        <tr><td style="font-weight:700;color:#0D1526">Diferencia (Reporte conteo − Saldo identificado)</td><td style="text-align:right;font-weight:800;font-size:15px;color:${faltanteConcil !== 0 ? "#EF4444" : "#22C55E"}">${fmt(faltanteConcil)}</td></tr>
        <tr><td style="font-weight:700;color:#0D1526">Diferencia conteo vs mortalidad (Reporte conteo − Total mortalidad)</td><td style="text-align:right;font-weight:800;font-size:15px;color:${(conteo - mortNueva) !== 0 ? "#EF4444" : "#22C55E"}">${fmt(conteo - mortNueva)}</td></tr>
      </tbody></table>` : ""}
    </div>`;
  }

  if (!anexosHTML) return "";
  return `<div class="section"><div class="section-title">Indicadores de Mortalidad</div>${anexosHTML}</div>`;
}

// ─── SECCIÓN EVIDENCIAS FOTOGRÁFICAS (reutiliza evidenciasGridHTML) ────────────
function seccionEvidencias(hallazgos: any[], granjas: any[], evidenciasPorHallazgo?: Record<string, any[]>): string {
  const conFotos = evidenciasPorHallazgo ? hallazgos.filter(h => (evidenciasPorHallazgo[h.id]?.length ?? 0) > 0) : [];
  if (!conFotos.length) {
    return `<div class="section"><div class="section-title">Evidencias Fotográficas</div>
      <p style="font-size:12px;color:#94a3b8"><em>No hay evidencias fotográficas cargadas para los hallazgos del alcance.</em></p></div>`;
  }
  const bloques = conFotos.slice(0, 15).map(h => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const evs = evidenciasPorHallazgo![h.id] || [];
    return `<div style="margin-bottom:16px;page-break-inside:avoid">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:2px">${h.titulo?.slice(0, 70) || "Hallazgo"}</div>
      <div style="font-size:9px;color:#64748b;margin-bottom:6px">${g?.nombre || "—"} · ${fmtFechaCorta(h.fechaVisita)} · ${evs.length} foto(s)</div>
      ${evidenciasGridHTML(evs.map((ev: any) => ({ src: ev.url, titulo: ev.nombre || undefined, pie: ev.categoria || undefined })), { maxH: 360, maxHUna: 520 })}
    </div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Evidencias Fotográficas</div>${bloques}</div>`;
}

// ─── ANEXOS TÉCNICOS del hallazgo en los informes (Fase B) ────────────────────
// modo "detalle" = tablas completas · "resumen" = una línea de totales por pestaña.
const _fmtAnx = (n: number): string => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

// Solo "Inventario de Alimento" (bultos). La mortalidad (conteo de picos + recepción
// de aves) se muestra en la sección Indicadores de Mortalidad.
function seccionAnexosTecnicos(hallazgos: any[], granjas: any[], modo: "resumen" | "detalle"): string {
  const tieneAlimento = (a: any) => a.inventarioBultos.length > 0 || a.ingresoBultos.length > 0 || a.totalBultos.bloques.some((b: any) => b.filas.length) || a.registroBultosConsumidos.semanas.some((w: any[]) => w.length);
  const conAnexos = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) })).filter(x => tieneAlimento(x.a));
  if (!conAnexos.length) return "";
  const th = (cols: string[]) => `<thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>`;
  const R = (v: any) => `<td style="text-align:right">${_fmtAnx(anexNum(v))}</td>`;

  const bloques = conAnexos.map(({ h, a }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const t: string[] = [];

    if (a.inventarioBultos.length) {
      const tot = a.inventarioBultos.reduce((s, r) => s + totalInvBultos(r), 0);
      if (modo === "detalle") t.push(`<div style="font-size:11px;font-weight:700;color:#4A7AFF;margin:8px 0 4px">Inventario Bultos Físicos</div>
        <table>${th(["N° Galpón", "Bultos", "Lonas", "Total"])}<tbody>${a.inventarioBultos.map(r => `<tr><td>${r.galpon || "—"}</td>${R(r.bultos)}${R(r.lonas)}<td style="text-align:right;font-weight:700">${_fmtAnx(totalInvBultos(r))}</td></tr>`).join("")}<tr><td colspan="3" style="text-align:right;font-weight:700">Total</td><td style="text-align:right;font-weight:800;color:#22C55E">${_fmtAnx(tot)}</td></tr></tbody></table>`);
      else t.push(`<div style="font-size:11px;color:#475569">• Inventario Bultos Físicos: ${a.inventarioBultos.length} galpón(es) · total <strong>${_fmtAnx(tot)}</strong></div>`);
    }
    if (a.ingresoBultos.length) {
      const tot = a.ingresoBultos.reduce((s, r) => s + pesoTotalIngreso(r), 0);
      if (modo === "detalle") t.push(`<div style="font-size:11px;font-weight:700;color:#4A7AFF;margin:8px 0 4px">Ingreso de Bultos</div>
        <table>${th(["Fecha", "Concepto", "Unidades", "Cantidad (Kg)", "Peso Total Kg"])}<tbody>${a.ingresoBultos.map(r => `<tr><td>${r.fecha || "—"}</td><td>${r.concepto || "—"}</td>${R(r.unidades)}${R(r.cantidadKg)}<td style="text-align:right;font-weight:700">${_fmtAnx(pesoTotalIngreso(r))}</td></tr>`).join("")}<tr><td colspan="4" style="text-align:right;font-weight:700">Peso total (Kg)</td><td style="text-align:right;font-weight:800;color:#22C55E">${_fmtAnx(tot)}</td></tr></tbody></table>`);
      else t.push(`<div style="font-size:11px;color:#475569">• Ingreso de Bultos: ${a.ingresoBultos.length} registro(s) · <strong>${_fmtAnx(tot)}</strong> Kg</div>`);
    }
    // Total de Bultos · Diferencia en alimento = (Salida + Conteo físico) − Ingreso [bultos];
    // Kg = diferencia × kg/bulto (config, def. 40). "Bultos consumidos" NO entra en la validación.
    const _ing = totalIngresoUnidades(a), _ingKg = totalIngresoKg(a);
    const _salF = a.totalBultos.bloques[0]?.filas ?? [];
    const _sal = _salF.reduce((s: number, f: any) => s + anexNum(f.cantidad), 0), _salKg = _salF.reduce((s: number, f: any) => s + anexNum(f.pesoTotalKg), 0);
    const _fis = totalInventarioBultos(a);
    const _kgBulto = anexNum(a.registroBultosConsumidos?.kgPorBulto) || 40;
    const _difUnd = (_sal + _fis) - _ing, _difKg = _difUnd * _kgBulto;
    if (_ing > 0 || _sal > 0 || _fis > 0 || a.totalBultos.observaciones?.trim()) {
      if (modo === "detalle") {
        t.push(`<div style="font-size:11px;font-weight:700;color:#4A7AFF;margin:8px 0 4px">Total de Bultos · Diferencia en alimento</div>
          <table>${th(["Bloque", "Bultos", "Kg"])}<tbody>
            <tr><td>Ingreso Bultos Alimento</td>${R(_ing)}<td style="text-align:right">${_fmtAnx(_ingKg)}</td></tr>
            <tr><td>Salida de Bultos</td>${R(_sal)}<td style="text-align:right">${_fmtAnx(_salKg)}</td></tr>
            <tr><td>Conteo físico Bultos</td>${R(_fis)}<td style="text-align:right">—</td></tr>
            <tr><td style="text-align:right;font-weight:700">Diferencia en alimento ((Salida + Conteo físico) − Ingreso)</td><td style="text-align:right;font-weight:800;color:${_difUnd !== 0 ? "#F97316" : "#22C55E"}">${_fmtAnx(_difUnd)}</td><td style="text-align:right;font-weight:800;color:#0EA5E9">${_fmtAnx(_difKg)}</td></tr>
          </tbody></table>${a.totalBultos.observaciones?.trim() ? `<div style="font-size:11px;margin-top:4px"><strong>Observaciones:</strong> ${a.totalBultos.observaciones}</div>` : ""}`);
      } else t.push(`<div style="font-size:11px;color:#475569">• Total de Bultos — diferencia en alimento: (salida ${_fmtAnx(_sal)} + físico ${_fmtAnx(_fis)}) − ingreso ${_fmtAnx(_ing)} = <strong>${_fmtAnx(_difUnd)}</strong> bultos · <strong>${_fmtAnx(_difKg)}</strong> Kg</div>`);
    }

    return `<div style="page-break-inside:avoid;margin-bottom:${modo === "detalle" ? "16" : "8"}px;${modo === "detalle" ? "border:1px solid #e2e8f0;border-radius:8px;padding:12px" : ""}">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:${modo === "detalle" ? "8" : "2"}px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
      ${t.join("")}
    </div>`;
  }).join("");

  return `<div class="section"><div class="section-title">Anexos Técnicos · Inventario de Alimento${modo === "resumen" ? " (resumen)" : ""}</div>${bloques}</div>`;
}

// Indicadores agregados de anexos (Dashboard: solo indicadores, sin tablas).
function indicadoresAnexos(hallazgos: any[]): string {
  const anexos = hallazgos.map(h => parseAnexos(h.anexosTecnicos)).filter(anexosTienenDatos);
  if (!anexos.length) return "";
  let aves = 0, bultosLonas = 0, pesoIngreso = 0, totGralBultos = 0, difPicos = 0, bitacora = 0, colaboradores = 0;
  anexos.forEach(a => {
    a.recepcionAves.forEach(r => aves += totalRecepcion(r));
    a.inventarioBultos.forEach(r => bultosLonas += totalInvBultos(r));
    a.ingresoBultos.forEach(r => pesoIngreso += pesoTotalIngreso(r));
    totGralBultos += totalGeneralBultos(a.totalBultos);
    a.actaConteoPicos.forEach(r => difPicos += difConteoPicos(r));
    bitacora += a.bitacoraIngreso.length;
    colaboradores += a.registroColaboradores.length;
  });
  const cards = [
    { l: "Hallazgos c/ anexos", v: _fmtAnx(anexos.length), c: "#4A7AFF" },
    { l: "Aves recibidas",      v: _fmtAnx(aves),          c: "#22C55E" },
    { l: "Bultos + lonas",      v: _fmtAnx(bultosLonas),   c: "#8B5CF6" },
    { l: "Peso ingreso (Kg)",   v: _fmtAnx(pesoIngreso),   c: "#0D1526" },
    { l: "Total bultos (Kg)",   v: _fmtAnx(totGralBultos), c: "#F97316" },
    { l: "Dif. conteo picos",   v: _fmtAnx(difPicos),      c: difPicos !== 0 ? "#EF4444" : "#22C55E" },
    { l: "Ingresos a granja",   v: _fmtAnx(bitacora),      c: "#4A7AFF" },
    { l: "Colaboradores",       v: _fmtAnx(colaboradores), c: "#8B5CF6" },
  ];
  return `<div class="section"><div class="section-title">Indicadores de Anexos Técnicos</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px">
      ${cards.map(k => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid ${k.c};border-radius:8px;padding:12px 8px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:${k.c}">${k.v}</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px;text-transform:uppercase;letter-spacing:.3px">${k.l}</div></div>`).join("")}
    </div></div>`;
}

// ─── GRÁFICOS DE MORTALIDAD (Dashboard) — % por granja/auditor/período + tendencia + comparativo ──
function graficosMortalidad(hallazgos: any[], granjas: any[]): string {
  const datos = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) }))
    .filter(x => avesRecibidasTotal(x.a) > 0)
    .map(({ h, a }) => ({
      h, granjaId: h.granjaId, auditor: h.auditorNombre || "—", mes: (h.fechaVisita || "").slice(0, 7),
      recibidas: avesRecibidasTotal(a), mort: totalMortalidadAves(a), pct: pctMortalidad(a) ?? 0,
    }));
  if (!datos.length) return "";
  const colorPct = (p: number) => p >= 8 ? "#EF4444" : p >= 4 ? "#F97316" : "#22C55E";
  // Agregación ponderada por grupo: % = Σ mortalidad diaria / Σ recibidas
  const agrupar = (keyFn: (d: typeof datos[number]) => string, nombreFn?: (k: string) => string) => {
    const m: Record<string, { rec: number; mort: number }> = {};
    datos.forEach(d => { const k = keyFn(d) || "—"; (m[k] ||= { rec: 0, mort: 0 }); m[k].rec += d.recibidas; m[k].mort += d.mort; });
    return Object.entries(m).map(([k, v]) => ({ label: nombreFn ? nombreFn(k) : k, pct: v.rec > 0 ? (v.mort / v.rec) * 100 : 0 }));
  };
  const barras = (arr: { label: string; pct: number }[]) => arr.length
    ? arr.map(x => barraHorizontal((x.label || "—").slice(0, 20), Math.round(x.pct * 100) / 100, 100, colorPct(x.pct))).join("")
    : "<p style='font-size:10px;color:#94a3b8;text-align:center'>Sin datos</p>";
  const porGranja  = agrupar(d => d.granjaId, gid => granjas.find(g => g.id === gid)?.nombre || "—");
  const porAuditor = agrupar(d => d.auditor);
  const porMes     = agrupar(d => d.mes).sort((a, b) => a.label.localeCompare(b.label));
  const comparativo = datos.map(d => barraHorizontal((d.h.titulo || "—").slice(0, 20), Math.round(d.pct * 100) / 100, 100, colorPct(d.pct))).join("");
  // Tendencia porcentual (línea por mes)
  const tendencia = (() => {
    if (porMes.length < 2) return barras(porMes);
    const W = 520, H = 160, padL = 30, padB = 24, padT = 14, padR = 12, plotW = W - padL - padR, plotH = H - padB - padT;
    const maxV = Math.max(1, ...porMes.map(p => p.pct));
    const xAt = (i: number) => padL + i * plotW / (porMes.length - 1);
    const yAt = (v: number) => padT + plotH - (v / maxV) * plotH;
    const poly = porMes.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.pct).toFixed(1)}`).join(" ");
    const dots = porMes.map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.pct).toFixed(1)}" r="3" fill="#EF4444"/><text x="${xAt(i).toFixed(1)}" y="${(yAt(p.pct) - 6).toFixed(1)}" text-anchor="middle" font-size="8" fill="#0D1526">${p.pct.toFixed(1)}%</text>`).join("");
    const xl = porMes.map((p, i) => `<text x="${xAt(i).toFixed(1)}" y="${H - padB + 12}" text-anchor="middle" font-size="8" fill="#64748b">${p.label.slice(2)}</text>`).join("");
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><polyline points="${poly}" fill="none" stroke="#EF4444" stroke-width="2"/>${dots}${xl}</svg>`;
  })();
  return `<div class="section"><div class="section-title">Mortalidad · Análisis</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px">
      ${chartCard(1, "Mortalidad por Granja", barras(porGranja), "% ponderado por granja")}
      ${chartCard(2, "Mortalidad por Auditor", barras(porAuditor), "% ponderado por auditor")}
      ${chartCard(3, "Mortalidad por Período", barras(porMes), "% por mes")}
      ${chartCard(4, "Comparativo entre Hallazgos", comparativo, "% por hallazgo")}
    </div>
    ${chartCard(5, "Tendencia de Mortalidad", tendencia, "% en el tiempo")}
  </div>`;
}

// ─── SECCIÓN BITÁCORA DE INGRESO A LA GRANJA (resumen / detalle) ──────────────
function seccionBitacora(hallazgos: any[], granjas: any[], modo: "resumen" | "detalle" | "compacto"): string {
  const conBit = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) })).filter(x => x.a.bitacoraIngreso.length > 0);
  if (!conBit.length) return "";
  const total = conBit.reduce((s, x) => s + x.a.bitacoraIngreso.length, 0);
  if (modo === "compacto") {
    // Tabla comprimida en 4 columnas (2 ingresos por fila) para ahorrar espacio: Fecha · Responsable · Fecha · Responsable.
    const items = conBit.flatMap(({ a }) => a.bitacoraIngreso.map(r => ({ f: r.fecha || "—", n: r.responsable || "—" })));
    const filas: string[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const x = items[i], y = items[i + 1];
      filas.push(`<tr><td>${x.f}</td><td>${x.n}</td><td>${y ? y.f : ""}</td><td>${y ? y.n : ""}</td></tr>`);
    }
    return `<div class="section"><div class="section-title">Bitácora de Ingreso</div>
      <table><thead><tr><th style="width:16%">Fecha</th><th style="width:34%">Responsable</th><th style="width:16%">Fecha</th><th style="width:34%">Responsable</th></tr></thead><tbody>${filas.join("")}</tbody></table></div>`;
  }
  if (modo === "resumen") {
    const lineas = conBit.map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      return `<div style="font-size:11px;color:#475569">• ${h.titulo?.slice(0, 55) || "Hallazgo"} <span style="color:#94a3b8">· ${g?.nombre || "—"}</span>: <strong>${a.bitacoraIngreso.length}</strong> ingreso(s)</div>`;
    }).join("");
    return `<div class="section"><div class="section-title">Bitácora de Ingreso a la Granja (resumen)</div>
      <p style="font-size:12px;margin-bottom:6px"><strong>${total}</strong> ingreso(s) registrado(s) en ${conBit.length} hallazgo(s).</p>${lineas}</div>`;
  }
  const bloques = conBit.map(({ h, a }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    return `<div style="page-break-inside:avoid;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:4px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
      <table><thead><tr><th>Fecha de visita</th><th>Nombre del responsable</th></tr></thead>
      <tbody>${a.bitacoraIngreso.map(r => `<tr><td>${r.fecha || "—"}</td><td>${r.responsable || "—"}</td></tr>`).join("")}</tbody></table></div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Bitácora de Ingreso a la Granja</div>
    <p style="font-size:11px;color:#64748b;margin-bottom:8px">${total} ingreso(s) registrado(s) en ${conBit.length} hallazgo(s), asociados a su hallazgo correspondiente.</p>${bloques}</div>`;
}

// ─── SECCIÓN REGISTRO DE COLABORADORES (resumen / detalle) ────────────────────
function seccionColaboradores(hallazgos: any[], granjas: any[], modo: "resumen" | "detalle" | "compacto"): string {
  const conCol = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) })).filter(x => x.a.registroColaboradores.length > 0);
  if (!conCol.length) return "";
  const total = conCol.reduce((s, x) => s + x.a.registroColaboradores.length, 0);
  if (modo === "compacto") {
    // Participantes registrados en 4 columnas (2 por fila) para ahorrar espacio: Nombre · Cargo · Nombre · Cargo.
    const items = conCol.flatMap(({ a }) => a.registroColaboradores.map(r => ({ n: r.nombre || "—", c: r.cargo || "—" })));
    const filas: string[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const x = items[i], y = items[i + 1];
      filas.push(`<tr><td>${x.n}</td><td>${x.c}</td><td>${y ? y.n : ""}</td><td>${y ? y.c : ""}</td></tr>`);
    }
    return `<div class="section"><div class="section-title">Registro de Colaboradores</div>
      <table><thead><tr><th>Nombre</th><th>Cargo</th><th>Nombre</th><th>Cargo</th></tr></thead><tbody>${filas.join("")}</tbody></table></div>`;
  }
  if (modo === "resumen") {
    const lineas = conCol.map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      return `<div style="font-size:11px;color:#475569">• ${h.titulo?.slice(0, 55) || "Hallazgo"} <span style="color:#94a3b8">· ${g?.nombre || "—"}</span>: <strong>${a.registroColaboradores.length}</strong> colaborador(es)</div>`;
    }).join("");
    return `<div class="section"><div class="section-title">Registro de Colaboradores (resumen)</div>
      <p style="font-size:12px;margin-bottom:6px"><strong>${total}</strong> colaborador(es) registrado(s) en ${conCol.length} hallazgo(s).</p>${lineas}</div>`;
  }
  const bloques = conCol.map(({ h, a }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    return `<div style="page-break-inside:avoid;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:4px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
      <table><thead><tr><th>Nombre colaborador</th><th>Cargo</th></tr></thead>
      <tbody>${a.registroColaboradores.map(r => `<tr><td>${r.nombre || "—"}</td><td>${r.cargo || "—"}</td></tr>`).join("")}</tbody></table></div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Registro de Colaboradores</div>
    <p style="font-size:11px;color:#64748b;margin-bottom:8px">${total} colaborador(es) registrado(s) en ${conCol.length} hallazgo(s), asociados a su hallazgo correspondiente.</p>${bloques}</div>`;
}

// ─── Gráfico de línea de tendencia reutilizable (SVG, para el PDF) ─────────────
function lineTrendSVG(puntos: { label: string; value: number }[], color: string, sufijo = ""): string {
  if (!puntos.length) return "<p style='font-size:10px;color:#94a3b8;text-align:center'>Sin datos</p>";
  if (puntos.length === 1) {
    const p = puntos[0];
    return `<div style="text-align:center;padding:14px"><div style="font-size:24px;font-weight:800;color:${color}">${_fmtAnx(p.value)}${sufijo}</div><div style="font-size:10px;color:#64748b">${p.label}</div></div>`;
  }
  const W = 520, H = 160, padL = 34, padB = 24, padT = 14, padR = 12, plotW = W - padL - padR, plotH = H - padB - padT;
  const maxV = Math.max(1, ...puntos.map(p => p.value));
  const xAt = (i: number) => padL + i * plotW / (puntos.length - 1);
  const yAt = (v: number) => padT + plotH - (v / maxV) * plotH;
  const poly = puntos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const dots = puntos.map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.value).toFixed(1)}" r="3" fill="${color}"/><text x="${xAt(i).toFixed(1)}" y="${(yAt(p.value) - 6).toFixed(1)}" text-anchor="middle" font-size="8" fill="#0D1526">${_fmtAnx(p.value)}${sufijo}</text>`).join("");
  const xl = puntos.map((p, i) => `<text x="${xAt(i).toFixed(1)}" y="${H - padB + 12}" text-anchor="middle" font-size="8" fill="#64748b">${p.label}</text>`).join("");
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2"/>${dots}${xl}</svg>`;
}

// Consolida la producción diaria (mortalidad/bultos) por índice de semana entre hallazgos del alcance.
function consolidarProduccionDiaria(hallazgos: any[]) {
  const mortSemana: number[] = [], bultosSemana: number[] = [], feedKgSemana: number[] = [];
  let avesMort = 0, avesBultos = 0;
  hallazgos.forEach(h => {
    const a = parseAnexos(h.anexosTecnicos);
    if (registroMortalidadTieneDatos(a.registroMortalidadDiaria)) {
      const c = calcMortalidadDiaria(a.registroMortalidadDiaria);
      avesMort += c.aves;
      c.semanas.forEach((s, i) => { mortSemana[i] = (mortSemana[i] || 0) + s.totalSemanal; });
    }
    if (a.registroBultosConsumidos.semanas.some((w: any[]) => w.length)) {
      const base = anexNum(a.registroMortalidadDiaria.avesIniciales) > 0 ? anexNum(a.registroMortalidadDiaria.avesIniciales) : avesRecibidasTotal(a);
      avesBultos += base;
      const c = calcBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a));
      c.semanas.forEach((s, i) => { bultosSemana[i] = (bultosSemana[i] || 0) + s.totalBultos; feedKgSemana[i] = (feedKgSemana[i] || 0) + s.totalBultos * c.kgPorBulto; });
    }
  });
  return { mortSemana, bultosSemana, feedKgSemana, avesMort, avesBultos };
}

// ─── GRÁFICOS DE PRODUCCIÓN DIARIA (Dashboard) — tendencia semanal/acumulada ──
function graficosProduccionDiaria(hallazgos: any[], granjas: any[]): string {
  const { mortSemana, bultosSemana, feedKgSemana, avesMort, avesBultos } = consolidarProduccionDiaria(hallazgos);
  if (!mortSemana.length && !bultosSemana.length) return "";
  const lbl = (i: number) => `Sem ${i + 1}`;
  const mortSemPts = mortSemana.map((v, i) => ({ label: lbl(i), value: v }));
  let acc = 0; const mortAcumPts = mortSemana.map((v, i) => ({ label: lbl(i), value: (acc += v) }));
  acc = 0; const pctAcumPts = mortSemana.map((v, i) => { acc += v; return { label: lbl(i), value: avesMort > 0 ? (acc / avesMort) * 100 : 0 }; });
  const bulSemPts = bultosSemana.map((v, i) => ({ label: lbl(i), value: v }));
  let ab = 0; const bulAcumPts = bultosSemana.map((v, i) => ({ label: lbl(i), value: (ab += v) }));
  let af = 0; const consAvePts = feedKgSemana.map((v, i) => { af += v; return { label: lbl(i), value: avesBultos > 0 ? af / avesBultos : 0 }; });
  return `<div class="section"><div class="section-title">Producción Diaria · Tendencias</div>
    ${mortSemana.length ? `<div style="font-size:12px;font-weight:700;color:#EF4444;margin:2px 0 8px">Registro Mortalidad Diaria</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px">
        ${chartCard(1, "Mortalidad Semanal", lineTrendSVG(mortSemPts, "#EF4444"), "aves por semana")}
        ${chartCard(2, "Mortalidad Acumulada", lineTrendSVG(mortAcumPts, "#F97316"), "aves acumuladas")}
      </div>
      ${chartCard(3, "% Mortalidad Acumulada", lineTrendSVG(pctAcumPts, "#EF4444", "%"), `sobre ${_fmtAnx(avesMort)} aves iniciales`)}` : ""}
    ${bultosSemana.length ? `<div style="font-size:12px;font-weight:700;color:#4A7AFF;margin:16px 0 8px">Bultos Consumidos por Día</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px">
        ${chartCard(4, "Consumo Semanal", lineTrendSVG(bulSemPts, "#4A7AFF"), "bultos por semana")}
        ${chartCard(5, "Consumo Acumulado", lineTrendSVG(bulAcumPts, "#0EA5E9"), "bultos acumulados")}
      </div>
      ${chartCard(6, "Consumo por Ave (kg acumulado)", lineTrendSVG(consAvePts, "#8B5CF6", " kg"), `sobre ${_fmtAnx(avesBultos)} aves`)}` : ""}
  </div>`;
}

// ─── GRÁFICOS DE TENDENCIA POR BLOQUE (Informe General) ───────────────────────
// Reutilizan consolidarProduccionDiaria + lineTrendSVG + chartCard para integrar el
// gráfico de línea de tendencia dentro de los bloques "Indicadores de Mortalidad" y
// "Inventario de Alimento" (sin envoltorio de sección, sin cálculo nuevo).
function graficosMortalidadTendencia(hallazgos: any[]): string {
  const { mortSemana, avesMort } = consolidarProduccionDiaria(hallazgos);
  if (!mortSemana.length) return "";
  const lbl = (i: number) => `Sem ${i + 1}`;
  const mortSemPts = mortSemana.map((v, i) => ({ label: lbl(i), value: v }));
  let acc = 0; const mortAcumPts = mortSemana.map((v, i) => ({ label: lbl(i), value: (acc += v) }));
  acc = 0; const pctAcumPts = mortSemana.map((v, i) => { acc += v; return { label: lbl(i), value: avesMort > 0 ? (acc / avesMort) * 100 : 0 }; });
  return `<div style="page-break-inside:avoid;margin-top:10px">
    <div style="font-size:12px;font-weight:700;color:#EF4444;margin:2px 0 8px">Gráfico de Tendencia · Mortalidad</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px">
      ${chartCard(1, "Mortalidad Semanal", lineTrendSVG(mortSemPts, "#EF4444"), "aves por semana")}
      ${chartCard(2, "Mortalidad Acumulada", lineTrendSVG(mortAcumPts, "#F97316"), "aves acumuladas")}
    </div>
    ${chartCard(3, "% Mortalidad Acumulada", lineTrendSVG(pctAcumPts, "#EF4444", "%"), `sobre ${_fmtAnx(avesMort)} aves iniciales`)}
  </div>`;
}

function graficosConsumoTendencia(hallazgos: any[]): string {
  const { bultosSemana, feedKgSemana, avesBultos } = consolidarProduccionDiaria(hallazgos);
  if (!bultosSemana.length) return "";
  const lbl = (i: number) => `Sem ${i + 1}`;
  const bulSemPts = bultosSemana.map((v, i) => ({ label: lbl(i), value: v }));
  let ab = 0; const bulAcumPts = bultosSemana.map((v, i) => ({ label: lbl(i), value: (ab += v) }));
  let af = 0; const consAvePts = feedKgSemana.map((v, i) => { af += v; return { label: lbl(i), value: avesBultos > 0 ? af / avesBultos : 0 }; });
  return `<div style="page-break-inside:avoid;margin-top:10px">
    <div style="font-size:12px;font-weight:700;color:#4A7AFF;margin:2px 0 8px">Gráfico de Tendencia · Consumo de Alimento</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:10px">
      ${chartCard(4, "Consumo Semanal", lineTrendSVG(bulSemPts, "#4A7AFF"), "bultos por semana")}
      ${chartCard(5, "Consumo Acumulado", lineTrendSVG(bulAcumPts, "#0EA5E9"), "bultos acumulados")}
    </div>
    ${chartCard(6, "Consumo por Ave (kg acumulado)", lineTrendSVG(consAvePts, "#8B5CF6", " kg"), `sobre ${_fmtAnx(avesBultos)} aves`)}
  </div>`;
}

// ─── SECCIÓN REGISTRO MORTALIDAD DIARIA (resumen / detalle) ───────────────────
function seccionMortalidadDiaria(hallazgos: any[], granjas: any[], modo: "resumen" | "detalle"): string {
  const con = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) })).filter(x => registroMortalidadTieneDatos(x.a.registroMortalidadDiaria));
  if (!con.length) return "";
  const R = (v: number) => `<td style="text-align:right">${_fmtAnx(v)}</td>`;
  const pctTxt = (p: number | null) => p === null ? "—" : p.toFixed(2) + "%";
  if (modo === "resumen") {
    const filas = con.map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      const c = calcMortalidadDiaria(a.registroMortalidadDiaria);
      return `<tr><td>${h.titulo?.slice(0, 45) || "Hallazgo"}</td><td>${g?.nombre || "—"}</td>${R(c.aves)}${R(c.totalGeneral)}<td style="text-align:right;font-weight:700">${pctTxt(c.pctAcumuladoFinal)}</td>${R(c.saldoFinal)}</tr>`;
    }).join("");
    return `<div class="section"><div class="section-title">Registro Mortalidad Diaria (resumen)</div>
      <table><thead><tr><th>Hallazgo</th><th>Granja</th><th>Aves inic.</th><th>Mort. total</th><th>% acum.</th><th>Saldo</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  const bloques = con.map(({ h, a }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const c = calcMortalidadDiaria(a.registroMortalidadDiaria);
    const meta = a.registroMortalidadDiaria;
    const metaTxt = [meta.loteCodigo ? `lote ${meta.loteCodigo}` : "", meta.fechaEncasetamiento ? `encas. ${meta.fechaEncasetamiento}` : ""].filter(Boolean).join(" · ");
    // Desglose por galpón (trazabilidad): solo si hay más de un galpón registrado.
    const porGalpon = mortalidadPorGalpon(meta);
    const galponTabla = porGalpon.length > 1 ? `<div style="font-size:11px;font-weight:700;color:#0D1526;margin:8px 0 3px">Mortalidad por Galpón</div>
      <table><thead><tr><th>Galpón</th><th>Aves ing.</th><th>Mortalidad</th><th>% Acum.</th><th>Saldo</th></tr></thead>
      <tbody>${porGalpon.map(pg => `<tr><td>Galpón ${pg.galpon}</td>${R(pg.aves)}${R(pg.total)}<td style="text-align:right;font-weight:700">${pctTxt(pg.pct)}</td>${R(pg.saldo)}</tr>`).join("")}</tbody></table>` : "";
    const tablas = c.semanas.map(s => `<div style="font-size:11px;font-weight:700;color:#EF4444;margin:8px 0 3px">Semana ${s.semana} · total ${_fmtAnx(s.totalSemanal)} · % semanal ${pctTxt(s.pctSemanal)}</div>
      <table><thead><tr><th>Día</th><th>Mortalidad</th><th>Acumulado</th><th>% Acum.</th><th>Saldo aves</th></tr></thead>
      <tbody>${s.dias.map(d => `<tr><td>Día ${d.diaGlobal}</td>${R(d.mortalidad)}${R(d.totalAcumulado)}<td style="text-align:right">${pctTxt(d.pctAcumulado)}</td>${R(d.saldo)}</tr>`).join("")}</tbody></table>`).join("");
    const nivel = c.pctAcumuladoFinal === null ? "" : c.pctAcumuladoFinal >= 8 ? "crítica" : c.pctAcumuladoFinal >= 4 ? "elevada" : "dentro de parámetros aceptables";
    const interp = c.pctAcumuladoFinal === null ? "" : `<p style="font-size:11px;margin-top:6px"><strong>Interpretación:</strong> mortalidad acumulada de <strong>${pctTxt(c.pctAcumuladoFinal)}</strong> sobre ${_fmtAnx(c.aves)} aves iniciales (${nivel}); saldo estimado de <strong>${_fmtAnx(c.saldoFinal)}</strong> aves.</p>`;
    return `<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:6px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"} · ${_fmtAnx(c.aves)} aves iniciales${metaTxt ? " · " + metaTxt : ""}</span></div>
      ${galponTabla}${tablas}${interp}</div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Registro Mortalidad Diaria</div>${bloques}</div>`;
}

// ─── SECCIÓN BULTOS CONSUMIDOS POR DÍA (resumen / detalle) ────────────────────
function seccionBultosConsumidos(hallazgos: any[], granjas: any[], modo: "resumen" | "detalle"): string {
  const con = hallazgos.map(h => ({ h, a: parseAnexos(h.anexosTecnicos) })).filter(x => x.a.registroBultosConsumidos.semanas.some((w: any[]) => w.length));
  if (!con.length) return "";
  const R = (v: number) => `<td style="text-align:right">${_fmtAnx(v)}</td>`;
  const kg = (v: number | null) => v === null ? "—" : _fmtAnx(v) + " kg";
  const calcOf = (a: any) => calcBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a));
  if (modo === "resumen") {
    const filas = con.map(({ h, a }) => {
      const g = granjas.find(gr => gr.id === h.granjaId);
      const c = calcOf(a);
      return `<tr><td>${h.titulo?.slice(0, 45) || "Hallazgo"}</td><td>${g?.nombre || "—"}</td>${R(c.totalBultos)}${R(c.totalKg)}<td style="text-align:right;font-weight:700">${kg(c.consumoAcumuladoAveFinal)}</td></tr>`;
    }).join("");
    return `<div class="section"><div class="section-title">Bultos Consumidos por Día (resumen)</div>
      <table><thead><tr><th>Hallazgo</th><th>Granja</th><th>Total bultos</th><th>Total kg</th><th>Consumo/ave</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  const bloques = con.map(({ h, a }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const c = calcOf(a);
    const tablas = c.semanas.map(s => `<div style="font-size:11px;font-weight:700;color:#4A7AFF;margin:8px 0 3px">Semana ${s.semana} · ${_fmtAnx(s.totalBultos)} bultos · sem/ave ${kg(s.consumoSemanalAve)} · acum/ave ${kg(s.consumoAcumuladoAve)}</div>
      <table><thead><tr><th>Día</th><th>Bultos</th><th>Acumulado</th><th>Saldo aves</th><th>Consumo/ave (kg)</th></tr></thead>
      <tbody>${s.dias.map(d => `<tr><td>Día ${d.diaGlobal}</td>${R(d.bultos)}${R(d.totalAcumulado)}${R(d.saldoVivo)}<td style="text-align:right">${kg(d.consumoAveDia)}</td></tr>`).join("")}</tbody></table>`).join("");
    const interp = `<p style="font-size:11px;margin-top:6px"><strong>Interpretación:</strong> consumo acumulado de <strong>${_fmtAnx(c.totalKg)} kg</strong> (${_fmtAnx(c.totalBultos)} bultos × ${_fmtAnx(c.kgPorBulto)} kg), equivalente a <strong>${kg(c.consumoAcumuladoAveFinal)}</strong> por ave sobre el saldo de aves vivas.</p>`;
    return `<div style="page-break-inside:avoid;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;padding:12px">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:6px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"} · ${_fmtAnx(c.kgPorBulto)} kg/bulto</span></div>
      ${tablas}${interp}</div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Bultos Consumidos por Día</div>${bloques}</div>`;
}

// ─── RESÚMENES EJECUTIVOS AUTOMÁTICOS (síntesis / completo) ───────────────────
// Renderiza un ResumenEjecutivo (generado en lib) como HTML para el PDF. En modo
// "sintesis" solo muestra métricas + la conclusión; en "completo", todas las secciones.
function resumenEjecutivoHTML(r: ResumenEjecutivo, modo: "sintesis" | "completo"): string {
  const metricas = `<div style="display:grid;grid-template-columns:repeat(${r.metricas.length},1fr);gap:8px;margin:6px 0">
    ${r.metricas.map(m => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center">
      <div style="font-size:15px;font-weight:800;color:${m.color || "#0D1526"}">${m.valor}</div>
      <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.3px">${m.label}</div></div>`).join("")}
  </div>`;
  const secs = modo === "completo" ? r.secciones : r.secciones.filter(s => /Conclusi/i.test(s.titulo));
  const secHtml = secs.map(s => `<div style="margin-top:6px"><div style="font-size:11px;font-weight:700;color:#4A7AFF">${s.titulo}</div>
    ${s.lineas.map(l => `<div style="font-size:11px;color:#334155;margin-top:2px">• ${l}</div>`).join("")}</div>`).join("");
  return `${metricas}${secHtml}`;
}

// Reúne los 4 resúmenes por hallazgo (los que tengan datos) y los integra al informe.
function seccionResumenesEjecutivos(hallazgos: any[], granjas: any[], modo: "sintesis" | "completo"): string {
  const items = hallazgos.map(h => {
    const a = parseAnexos(h.anexosTecnicos);
    const resumenes = [
      safeResumen(() => resumenMortalidadDiaria(a.registroMortalidadDiaria)),
      safeResumen(() => resumenBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a))),
      safeResumen(() => resumenRecepcionAves(a)),
      safeResumen(() => resumenIngresoBultos(a)),
    ].filter(Boolean) as ResumenEjecutivo[];
    return { h, resumenes };
  }).filter(x => x.resumenes.length > 0);
  if (!items.length) return "";
  const bloques = items.map(({ h, resumenes }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const cuerpo = resumenes.map(r => `<div style="margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:#0D1526;border-left:3px solid #4A7AFF;padding-left:8px;margin-bottom:4px">${r.titulo}</div>
      ${resumenEjecutivoHTML(r, modo)}</div>`).join("");
    return `<div style="page-break-inside:avoid;margin-bottom:14px;${modo === "completo" ? "border:1px solid #e2e8f0;border-radius:8px;padding:12px" : ""}">
      <div style="font-size:12px;font-weight:700;color:#0D1526;margin-bottom:6px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
      ${cuerpo}</div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Análisis Técnico · Resúmenes Ejecutivos${modo === "sintesis" ? " (síntesis)" : ""}</div>${bloques}</div>`;
}

// Indicadores derivados de los resúmenes (Dashboard: sin texto completo).
function indicadoresResumenes(hallazgos: any[]): string {
  let critica = 0, elevada = 0, conFaltante = 0, sumConsAve = 0, nConsAve = 0;
  hallazgos.forEach(h => {
    const a = parseAnexos(h.anexosTecnicos);
    if (registroMortalidadTieneDatos(a.registroMortalidadDiaria)) {
      const c = calcMortalidadDiaria(a.registroMortalidadDiaria);
      if (c.pctAcumuladoFinal !== null) { if (c.pctAcumuladoFinal >= 8) critica++; else if (c.pctAcumuladoFinal >= 4) elevada++; }
    }
    if (faltanteConciliacion(a) > 0) conFaltante++;
    if (a.registroBultosConsumidos.semanas.some((w: any[]) => w.length)) {
      const cb = calcBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a));
      if (cb.consumoAcumuladoAveFinal !== null) { sumConsAve += cb.consumoAcumuladoAveFinal; nConsAve++; }
    }
  });
  if (!critica && !elevada && !conFaltante && !nConsAve) return "";
  const cards = [
    { l: "Mort. crítica (≥8%)", v: String(critica), c: "#EF4444" },
    { l: "Mort. elevada (4-8%)", v: String(elevada), c: "#F97316" },
    { l: "Con faltante de aves", v: String(conFaltante), c: conFaltante ? "#EF4444" : "#22C55E" },
    { l: "Consumo/ave prom. (kg)", v: nConsAve ? _fmtAnx(sumConsAve / nConsAve) : "—", c: "#8B5CF6" },
  ];
  return `<div class="section"><div class="section-title">Indicadores de Análisis (Resúmenes)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
      ${cards.map(k => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid ${k.c};border-radius:8px;padding:12px 8px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:${k.c}">${k.v}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;text-transform:uppercase;letter-spacing:.3px">${k.l}</div></div>`).join("")}
    </div></div>`;
}

// ─── SECCIÓN DETALLE DE HALLAZGOS (ficha completa por hallazgo + evidencias) ──
function seccionHallazgosDetalle(hallazgos: any[], granjas: any[], evidenciasPorHallazgo?: Record<string, any[]>): string {
  if (!hallazgos.length) {
    return `<div class="section"><div class="section-title">Detalle de Hallazgos</div>
      <p style="font-size:13px;color:#94a3b8"><em>No hay hallazgos reportados para el alcance seleccionado.</em></p></div>`;
  }
  const fichas = hallazgos.slice(0, 25).map((h, idx) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    const evs = (evidenciasPorHallazgo?.[h.id]) || [];
    const galeria = evs.length > 0
      ? `<div style="font-size:11px;font-weight:700;color:#4A7AFF;text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px">Evidencias fotográficas (${evs.length})</div>
         ${evidenciasGridHTML(evs.map((ev: any) => ({ src: ev.url, titulo: ev.nombre || undefined, pie: ev.categoria || undefined })))}`
      : `<div style="margin-top:8px;font-size:11px;color:#94a3b8">Sin evidencias fotográficas asociadas.</div>`;
    const riesgos = Array.isArray(h.tiposRiesgo) && h.tiposRiesgo.length ? h.tiposRiesgo.join(", ") : "—";
    return `<div class="section" style="page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0D1526;padding-bottom:8px;margin-bottom:12px">
        <div style="font-size:14px;font-weight:800;color:#0D1526">Hallazgo #${idx + 1}${h.criticidad ? ` · Criticidad ${h.criticidad}` : ""}</div>
        <span class="badge ${clsBadge(h.estado)}">${displayEstado(h.estado)}</span>
      </div>
      <div style="font-size:13px;font-weight:700;color:#0D1526;margin-bottom:8px">${h.titulo || "—"}</div>
      <table style="width:100%;font-size:12px;margin-bottom:10px">
        <tr><td style="color:#64748b;width:30%">Granja</td><td style="font-weight:600">${g?.nombre || h.granjaNombre || "—"}</td></tr>
        <tr><td style="color:#64748b">Auditor</td><td>${h.auditorNombre || "—"}</td></tr>
        <tr><td style="color:#64748b">Fecha de visita</td><td>${fmtFechaCorta(h.fechaVisita)}</td></tr>
        <tr><td style="color:#64748b">Categoría</td><td>${h.categoria || "—"}</td></tr>
        <tr><td style="color:#64748b">Criticidad</td><td>${h.criticidad || "—"}</td></tr>
        <tr><td style="color:#64748b">Tipos de riesgo</td><td>${riesgos}</td></tr>
        <tr><td style="color:#64748b">Tipo de granja / operación</td><td>${[h.tipoGranja, h.tipoOperativo].filter(Boolean).join(" · ") || "—"}</td></tr>
      </table>
      <div style="background:#f8fafc;border-radius:6px;padding:10px 12px;font-size:12px;color:#475569;line-height:1.6">
        <strong style="color:#0D1526">Descripción:</strong><br>${h.descripcion || "Sin descripción registrada."}
      </div>
      ${h.recomendacionesIA ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 12px;font-size:12px;color:#1e40af;line-height:1.6;margin-top:8px"><strong>Recomendaciones:</strong><br>${h.recomendacionesIA}</div>` : ""}
      ${galeria}
    </div>`;
  }).join("");
  return `<div class="section"><div class="section-title">Detalle de Hallazgos (${hallazgos.length})</div>${fichas}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIONES ESTRUCTURALES — Informe reestructurado (formato corporativo Gerencia)
// Texto profesional determinista parametrizado con los datos REALES del alcance.
// No se inventan cifras, leyes ni datos: el marco legal proviene del formulario y
// la mortalidad/alimento del consolidado se marcan "sin datos" cuando no existen.
// ═══════════════════════════════════════════════════════════════════════════════
type MortalidadResumen = {
  lotes: number; totalIngreso: number; totalActuales: number; totalMuertes: number; pctGlobal: number;
  porGranja: Record<string, { ingreso: number; actuales: number; muertes: number; pct: number }>;
};

function _rangoFechas(items: any[]): string {
  const fechas = items.map(x => x?.fechaVisita || x?.fechaCompromiso).filter(Boolean).sort();
  if (!fechas.length) return "el periodo auditado";
  const ini = fmtFechaCorta(fechas[0]); const fin = fmtFechaCorta(fechas[fechas.length - 1]);
  return ini === fin ? ini : `${ini} – ${fin}`;
}

// Tabla de contenido
function seccionTOC(): string {
  const items = [
    "1. Marco metodológico (introducción, objetivos, alcance, enfoque, métodos, procedimientos, técnicas)",
    "2. Marco legal aplicable",
    "3. Resumen ejecutivo",
    "4. Tablero de indicadores",
    "5. Hallazgos críticos prioritarios",
    "6. Evaluación de riesgos (observaciones, causas, efectos y controles)",
    "7. Ficha técnica de las granjas auditadas",
    "8. Consolidado de resultados (alimento, mortalidad, cumplimiento KPI)",
    "9. Fortalezas identificadas",
    "10. Conclusiones ejecutivas",
    "11. Recomendaciones",
    "12. Trazabilidad detallada por KPI",
    "13. Firma y certificación",
  ];
  return `<div class="section"><div class="section-title">Tabla de Contenido</div>
    <table style="width:100%;font-size:11px"><tbody>${items.map(t => `<tr><td style="padding:5px 0;color:#334155;border-bottom:1px solid #f1f5f9">${t}</td></tr>`).join("")}</tbody></table></div>`;
}

// Marco metodológico (introducción → técnicas)
function seccionMetodologia(kpis: any[], hallazgos: any[], granjas: any[]): string {
  const nG = granjas.length, nH = hallazgos.length, nK = kpis.length;
  const rango = _rangoFechas([...hallazgos, ...kpis]);
  const bloque = (t: string, c: string) =>
    `<div style="margin-bottom:11px;page-break-inside:avoid"><div style="font-size:14px;font-weight:800;color:#0D1526;margin-bottom:4px">${t}</div><div style="font-size:14px;line-height:1.7;color:#475569;text-align:justify">${c}</div></div>`;
  return `<div class="section"><div class="section-title">Marco Metodológico de la Auditoría</div>
    ${bloque("1. Introducción", `El presente informe consolida los resultados de la auditoría interna de cumplimiento KPI ejecutada por el área de ${EMPRESA.area} de ${EMPRESA.nombre} (NIT ${EMPRESA.nit}). El ejercicio se orientó a verificar el estado de los planes de acción derivados de los hallazgos de auditoría en las granjas avícolas evaluadas y a valorar el nivel de exposición al riesgo asociado.`)}
    ${bloque("2. Objetivos", `Verificar el grado de avance y cierre de los ${nK} plan(es) de acción registrados; evaluar la severidad y el estado de los ${nH} hallazgo(s) identificados; y entregar a la Gerencia una visión objetiva del nivel de cumplimiento y de los riesgos residuales que requieren atención prioritaria.`)}
    ${bloque("3. Alcance", `La revisión comprende ${nG} granja(s) avícola(s), ${nH} hallazgo(s) y ${nK} plan(es) de acción KPI, correspondientes a ${rango}. Se incluyen exclusivamente los registros filtrados en el sistema de auditoría al momento de generar este documento.`)}
    ${bloque("4. Enfoque", `El enfoque es basado en riesgos: se prioriza el análisis de los hallazgos según su criticidad y tipo de riesgo (Operativo, Reputacional, Financiero, Legal y de Contagio), concentrando el esfuerzo de verificación en las áreas de mayor exposición.`)}
    ${bloque("5. Métodos", `Revisión documental de los registros, verificación de las evidencias fotográficas cargadas por los responsables, seguimiento del porcentaje de avance de cada plan y contraste con las fechas de compromiso y cumplimiento registradas.`)}
    ${bloque("6. Procedimientos", `Recolección de los registros del sistema; validación del estado de cada hallazgo y plan; revisión de las evidencias asociadas; cálculo de los indicadores de cumplimiento; y consolidación de resultados para su presentación a la Gerencia.`)}
    ${bloque("7. Técnicas", `Inspección de evidencias, análisis comparativo de indicadores, revisión de la trazabilidad hallazgo–plan–evidencia y evaluación cualitativa del riesgo residual conforme a la clasificación institucional.`)}
  </div>`;
}

// Marco legal aplicable — normatividad FIJA por defecto. Si el formulario trae un texto
// propio (campo "Marco legal aplicable"), éste reemplaza la lista fija.
const MARCO_LEGAL_ITEMS = [
  "Resolución 3651 de 2014 (ICA) — Normas de bioseguridad para establecimientos avícolas.",
  "Decreto 1500 de 2007 (Ministerio de Salud) — Sistema de inspección y control para productos cárnicos.",
  "Resolución 2674 de 2013 (ICA) — Buenas prácticas de manufactura (BPM y POES).",
  "Resolución 1515 de 2015 (RSPA) — Registro sanitario avícola.",
  "Resolución 3642 de 2013, art. 10 numeral 10.2.15 — Identificación de áreas y separación física elaborada en materiales resistentes a la corrosión, no absorbentes, de fácil limpieza y desinfección.",
  "Resolución 3650 de 2014 — Certificación de bioseguridad.",
  "Resolución 240 de 2013 (ICA) — Medidas sanitarias para producción avícola.",
  "Políticas internas de calidad, inocuidad y control interno de la empresa.",
];
function seccionMarcoLegal(marcoLegal?: string): string {
  const cuerpo = (marcoLegal && marcoLegal.trim())
    ? marcoLegal.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")
    : `<ul style="margin:0;padding-left:18px;line-height:1.75">${MARCO_LEGAL_ITEMS.map(i => `<li>${i}</li>`).join("")}</ul>`;
  return `<div class="section"><div class="section-title">Marco Legal Aplicable</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #4A7AFF;border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.7;color:#334155;text-align:justify">${cuerpo}</div></div>`;
}

// Evaluación de riesgos + observaciones/causas/efectos/controles
function seccionRiesgos(hallazgos: any[]): string {
  const conteo: Record<string, number> = {};
  TIPO_RIESGO.forEach(t => { conteo[t] = 0; });
  hallazgos.forEach(h => (Array.isArray(h?.tiposRiesgo) ? h.tiposRiesgo : []).forEach((t: string) => { if (conteo[t] !== undefined) conteo[t]++; }));
  const abiertos = hallazgos.filter(h => h.estado === "ABIERTO").length;
  const criticos = hallazgos.filter(h => h.criticidad === "Crítica" || h.criticidad === "Alta").length;
  const filas = TIPO_RIESGO.map(t => {
    const n = conteo[t];
    const nivel = n === 0 ? "Bajo" : n <= 2 ? "Medio" : "Alto";
    const color = nivel === "Alto" ? "#EF4444" : nivel === "Medio" ? "#F97316" : "#22C55E";
    return `<tr><td style="font-weight:600">${t}</td><td style="text-align:center">${n}</td>
      <td style="text-align:center"><span class="badge" style="background:${color}1f;color:${color};border-color:${color}55">${nivel}</span></td></tr>`;
  }).join("");
  const bloque = (t: string, c: string) =>
    `<div style="margin-bottom:9px"><div style="font-size:12px;font-weight:800;color:#0D1526;margin-bottom:2px">${t}</div><div style="font-size:13px;line-height:1.6;color:#475569;text-align:justify">${c}</div></div>`;
  return `<div class="section"><div class="section-title">Evaluación de Riesgos</div>
    <table style="margin-bottom:12px"><thead><tr><th>Tipo de riesgo</th><th style="text-align:center">Hallazgos asociados</th><th style="text-align:center">Nivel de exposición</th></tr></thead>
    <tbody>${filas}</tbody></table>
    ${bloque("Observaciones", `Del total de ${hallazgos.length} hallazgo(s) evaluados, ${abiertos} permanece(n) abierto(s) y ${criticos} presenta(n) criticidad alta o crítica. La distribución por tipo de riesgo se refleja en la matriz anterior.`)}
    ${bloque("Análisis de causas", `Las causas raíz predominantes se asocian a desviaciones en los procedimientos operativos y de bioseguridad detectadas durante las visitas de auditoría, así como a demoras en la ejecución de los planes de acción comprometidos.`)}
    ${bloque("Efectos potenciales", `De no cerrarse los hallazgos abiertos, la organización queda expuesta a afectaciones sanitarias, operativas y reputacionales, con posible impacto sobre los indicadores productivos y el cumplimiento normativo.`)}
    ${bloque("Controles recomendados", `Reforzar los controles preventivos en las granjas de mayor exposición, mantener el seguimiento periódico de los planes de acción y documentar las evidencias de cierre para asegurar la trazabilidad del control interno.`)}
  </div>`;
}

// Ficha técnica de las granjas auditadas
function seccionFichaTecnica(granjas: any[]): string {
  if (!granjas.length) return "";
  return `<div class="section"><div class="section-title">Ficha Técnica de las Granjas Auditadas</div>
    <table><thead><tr><th>Granja</th><th>Tipo</th><th style="text-align:right">Capacidad (aves)</th><th>Nivel de riesgo</th><th>Estado sanitario</th></tr></thead>
    <tbody>${granjas.slice(0, 25).map(g => `<tr>
      <td><strong>${g.nombre || "—"}</strong></td>
      <td>${g.tipoGranja || g.tipoOperativo || "—"}</td>
      <td style="text-align:right">${(Number(g.capacidadAves) || 0).toLocaleString("es-CO")}</td>
      <td>${g.nivelRiesgo || "—"}</td>
      <td>${g.estadoSanitario || "—"}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

// Consolidado de resultados (alimento / mortalidad / KPI)
function seccionConsolidado(kpis: any[], granjas: any[], mortalidad?: MortalidadResumen): string {
  const pct = porcentaje(kpis);
  const comp = kpis.filter(k => k.estado === "COMPLETADO").length;
  const pctColor = pct >= 70 ? "#22C55E" : pct >= 40 ? "#F97316" : "#EF4444";
  // Fila "Mortalidad avícola" (Trazabilidad) RETIRADA por solicitud (no relevante).
  return `<div class="section"><div class="section-title">Consolidado de Resultados</div>
    <table><tbody>
      <tr><td style="width:32%;font-weight:600;color:#0D1526">Inventario de alimento</td><td style="color:#94a3b8"><em>Sin datos disponibles — la plataforma no registra actualmente inventario de alimento.</em></td></tr>
      <tr><td style="font-weight:600;color:#0D1526">Cumplimiento KPI</td><td><strong style="color:${pctColor};font-size:13px">${pct}%</strong> &nbsp;·&nbsp; ${comp} de ${kpis.length} plan(es) completado(s)</td></tr>
    </tbody></table></div>`;
}

// Fortalezas identificadas
function seccionFortalezas(kpis: any[], hallazgos: any[]): string {
  const comp = kpis.filter(k => k.estado === "COMPLETADO").length;
  const cerrados = hallazgos.filter(h => h.estado === "CERRADO").length;
  const items: string[] = [];
  if (comp > 0) items.push(`Se completaron <strong>${comp}</strong> plan(es) de acción, evidenciando capacidad de cierre de hallazgos.`);
  if (cerrados > 0) items.push(`<strong>${cerrados}</strong> hallazgo(s) fueron cerrados con la gestión correspondiente.`);
  items.push(`El sistema de auditoría mantiene trazabilidad completa: hallazgo → plan de acción → evidencia → seguimiento.`);
  items.push(`La verificación se soporta en evidencias fotográficas cargadas por los responsables de cada granja.`);
  return `<div class="section"><div class="section-title">Fortalezas Identificadas</div>
    <ul style="font-size:13px;line-height:1.8;color:#334155;padding-left:18px;margin:0">${items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
}

// Fortalezas Identificadas (MANUAL · sólo Informe Ejecutivo) — se muestra únicamente si hay datos.
function seccionFortalezasManual(fortalezas?: { fortaleza: string; observacion: string; foto?: string }[]): string {
  const items = (fortalezas || []).filter(f => (f.fortaleza || "").trim() || (f.observacion || "").trim() || (f.foto || "").trim());
  if (!items.length) return "";
  const bloques = items.map((f, i) => `<div style="margin-bottom:14px;page-break-inside:avoid">
    <div style="font-size:14px;font-weight:700;color:#0D1526">${i + 1}. ${f.fortaleza?.trim() || "Fortaleza"}</div>
    ${f.observacion?.trim() ? `<div style="font-size:14px;color:#475569;margin-top:3px;text-align:justify"><strong>Observación:</strong> ${f.observacion.trim()}</div>` : ""}
    ${f.foto ? evidenciasGridHTML([{ src: f.foto }], { maxHUna: 420 }) : ""}
  </div>`).join("");
  return `<div class="section"><div class="section-title">Fortalezas Identificadas</div>${bloques}</div>`;
}

// Conclusiones ejecutivas (auto, prosa) — Informe Ejecutivo.
function seccionConclusionesEjec(kpis: any[], hallazgos: any[]): string {
  const total = hallazgos.length;
  const eLow = (h: any) => (h.estado || "").toString().toLowerCase();
  const abiertos = hallazgos.filter(h => eLow(h).includes("abierto")).length;
  const cerrados = hallazgos.filter(h => eLow(h).includes("cerrad")).length;
  const avance = kpis.length ? Math.round(kpis.reduce((s, k) => s + (Number(k.porcentajeAvance) || 0), 0) / kpis.length) : 0;
  const granjasN = new Set(hallazgos.map(h => h.granjaId).filter(Boolean)).size;
  return `<div class="section"><div class="section-title">Conclusiones</div>
    <div style="font-size:14px;line-height:1.8;color:#475569;text-align:justify">
      <p>La auditoría evaluó <strong>${total}</strong> hallazgo(s) en <strong>${granjasN}</strong> granja(s), de los cuales <strong>${abiertos}</strong> permanece(n) abierto(s) y <strong>${cerrados}</strong> cerrado(s). Los planes de acción KPI registran un avance global del <strong>${avance}%</strong>. Se recomienda dar continuidad al seguimiento de los hallazgos abiertos y a la ejecución de los planes comprometidos para consolidar el control interno en las granjas del alcance.</p>
    </div></div>`;
}

// Recomendaciones
function seccionRecomendaciones(kpis: any[], hallazgos: any[]): string {
  const noIni = kpis.filter(k => k.estado === "NO_INICIADO").length;
  const abiertos = hallazgos.filter(h => h.estado === "ABIERTO").length;
  const recs: string[] = [];
  if (noIni > 0) recs.push(`Priorizar el inicio de <strong>${noIni}</strong> plan(es) de acción en estado "No Iniciado", asignando responsable y fecha de compromiso.`);
  if (abiertos > 0) recs.push(`Establecer seguimiento inmediato a los <strong>${abiertos}</strong> hallazgo(s) que permanecen abiertos.`);
  recs.push(`Mantener el cargue oportuno de evidencias fotográficas como soporte del cierre de cada plan.`);
  recs.push(`Programar auditorías de seguimiento sobre las granjas con mayor nivel de riesgo.`);
  return `<div class="section"><div class="section-title">Recomendaciones</div>
    <ol style="font-size:13px;line-height:1.8;color:#334155;padding-left:18px;margin:0">${recs.map(r => `<li>${r}</li>`).join("")}</ol></div>`;
}

// Párrafo ejecutivo (prosa) que resume la auditoría — va al inicio de Hallazgos Identificados.
function resumenCorporativoParrafo(kpis: any[], hallazgos: any[]): string {
  const total = hallazgos.length;
  const cLow = (h: any) => (h.criticidad || "").toString().toLowerCase();
  const criticos = hallazgos.filter(h => cLow(h).startsWith("crít") || cLow(h).startsWith("crit")).length;
  const altos = hallazgos.filter(h => cLow(h).startsWith("alt")).length;
  const eLow = (h: any) => (h.estado || "").toString().toLowerCase();
  const abiertos = hallazgos.filter(h => eLow(h).includes("abierto")).length;
  const cerrados = hallazgos.filter(h => eLow(h).includes("cerrad")).length;
  const enPlan = hallazgos.filter(h => eLow(h).includes("plan")).length;
  const granjasN = new Set(hallazgos.map(h => h.granjaId).filter(Boolean)).size;
  const avance = kpis.length ? Math.round(kpis.reduce((s, k) => s + (Number(k.porcentajeAvance) || 0), 0) / kpis.length) : 0;
  const compl = kpis.filter(k => /complet/i.test(k.estado || "")).length;
  return `<div style="font-size:14px;line-height:1.7;color:#334155;text-align:justify;margin-bottom:10px;page-break-inside:avoid">
    <strong>Resumen corporativo.</strong> La presente auditoría identificó <strong>${total}</strong> hallazgo(s) en <strong>${granjasN}</strong> granja(s)${criticos || altos ? ` (${criticos} crítico(s), ${altos} alto(s))` : ""}. Al corte, ${abiertos} permanece(n) abierto(s), ${enPlan} en plan de acción y ${cerrados} cerrado(s). Los ${kpis.length} plan(es) de acción KPI registran un avance global del <strong>${avance}%</strong> (${compl} completado(s)). ${criticos > 0 ? "Se requiere atención prioritaria sobre los hallazgos críticos identificados." : "No se registran hallazgos de criticidad máxima pendientes."}</div>`;
}

// Sección de PANELES de Resumen Ejecutivo (completo) por hallazgo, para un generador dado.
// Reutiliza resumenEjecutivoHTML. Va inmediatamente después de la tabla correspondiente.
function seccionPaneles(hallazgos: any[], granjas: any[], titulo: string, gen: (a: any) => ResumenEjecutivo | null): string {
  const items = hallazgos.map(h => ({ h, r: safeResumen(() => gen(parseAnexos(h.anexosTecnicos))) })).filter(x => x.r) as { h: any; r: ResumenEjecutivo }[];
  if (!items.length) return "";
  const bloques = items.map(({ h, r }) => {
    const g = granjas.find(gr => gr.id === h.granjaId);
    return `<div style="page-break-inside:avoid;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:#0D1526;margin-bottom:4px">${h.titulo?.slice(0, 70) || "Hallazgo"} <span style="font-weight:400;color:#64748b">· ${g?.nombre || "—"}</span></div>
      ${resumenEjecutivoHTML(r, "completo")}</div>`;
  }).join("");
  return `<div class="section"><div class="section-title">${titulo}</div>${bloques}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 1 — EJECUTIVO CORPORATIVO (reestructurado: tablas completas + paneles ejecutivos)
// Sin la tarjeta "Resumen Ejecutivo"; el resumen corporativo va como párrafo en Hallazgos.
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo1(
  kpis: any[], hallazgos: any[], granjas: any[], auditor: string,
  evidenciasPorHallazgo?: Record<string, any[]>, marcoLegal?: string,
  mortalidad?: MortalidadResumen, datos?: DatosGenerales
): string {
  const year   = new Date().getFullYear();
  const num    = datos?.numeroInforme || `AU-EJE-${year}-${String(Date.now()).slice(-4)}`;
  const codigo = `IEA-AUD-${year}-${datos?.numeroInforme?.match(/\d+/)?.[0] ?? String(Date.now()).slice(-4)}`;

  // Diferencia general de bultos del alcance (Cap. IV, sin tabla extensa).
  let dIng = 0, dSal = 0, dFis = 0, dKg = 0, dKgN = 0;
  hallazgos.forEach(h => {
    const a = parseAnexos(h.anexosTecnicos);
    dIng += totalIngresoUnidades(a); dFis += totalInventarioBultos(a);
    dSal += (a.totalBultos?.bloques?.[0]?.filas ?? []).reduce((s: number, f: any) => s + anexNum(f.cantidad), 0);
    dKg += anexNum(a.registroBultosConsumidos?.kgPorBulto) || 40; dKgN++;
  });
  const difBultos   = (dSal + dFis) - dIng;
  const difBultosKg = difBultos * (dKgN ? dKg / dKgN : 40);
  const hayInv = dIng > 0 || dSal > 0 || dFis > 0;

  // Resumen semanal de mortalidad (semana 1..6): cantidad y % sobre aves recibidas.
  const { mortSemana, avesMort } = consolidarProduccionDiaria(hallazgos);
  const semRows = mortSemana.slice(0, 6).map((v, i) => `<tr><td>Semana ${i + 1}</td><td style="text-align:right">${_fmtAnx(v)}</td><td style="text-align:right">${avesMort > 0 ? ((v / avesMort) * 100).toFixed(2) : "0.00"}%</td></tr>`).join("");
  const semTotal = mortSemana.slice(0, 6).reduce((s, v) => s + v, 0);
  const semanalTabla = mortSemana.length ? `<div class="section"><div class="section-title">Resumen Semanal de Mortalidad</div>
    <table><thead><tr><th>Semana</th><th style="text-align:right">Cantidad</th><th style="text-align:right">% Mortalidad</th></tr></thead>
    <tbody>${semRows}<tr style="font-weight:700;background:#f8fafc"><td>Total</td><td style="text-align:right">${_fmtAnx(semTotal)}</td><td style="text-align:right">${avesMort > 0 ? ((semTotal / avesMort) * 100).toFixed(2) : "0.00"}%</td></tr></tbody></table></div>` : "";

  const extraMeta = [
    { label: "Técnico Veterinario", value: datos?.tecnicoVeterinario || "" },
    { label: "Administrador de Granja", value: datos?.administrador || "" },
    { label: "Lote", value: datos?.lote || "" },
    { label: "Edad del Lote", value: datos?.edadLote || "" },
    { label: "Código Documental", value: `${codigo} · Versión 1.0` },
  ];

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Ejecutivo de Auditoría — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
.divider{text-align:center;padding:12px;margin-top:6px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);
  font-size:11px;color:#475569;font-weight:700;letter-spacing:.08em;text-transform:uppercase;page-break-inside:avoid;page-break-after:avoid}
/* Legibilidad: contenido principal a 14px y mayor separación título/contenido. Las TABLAS
   mantienen su tamaño para no aumentar el número de páginas. */
.page p, .page li{font-size:14px !important}
.page .section-title{font-size:16px !important;margin-bottom:14px}
.page .kpi-item-title{font-size:15px !important}
.page .kpi-meta{font-size:13px !important}
.page .hallazgo-desc{font-size:14px !important;color:#334155;line-height:1.55;text-align:justify;margin:4px 0 6px}
.page .plan-box-title{font-size:12px !important}
.page .plan-box-text{font-size:15px !important;line-height:1.6}
</style></head><body><div class="page">
${portada(`Informe Ejecutivo de Auditoría N° ${num}`, "Control Interno y Cumplimiento KPI", kpis, hallazgos, auditor, granjas[0]?.nombre, datos, false, extraMeta)}

<div class="divider">Capítulo I — Aspectos Preliminares</div>
${seccionMetodologia(kpis, hallazgos, granjas)}

<div class="divider">Capítulo II — Características Generales</div>
${seccionMarcoLegal(marcoLegal)}
${seccionHallazgos(hallazgos, granjas, 20, resumenCorporativoParrafo(kpis, hallazgos))}
${seccionKPIs(kpis, granjas, hallazgos, evidenciasPorHallazgo)}

<div class="divider">Capítulo III — Consideraciones</div>
${seccionFortalezasManual(datos?.fortalezas)}
${seccionRecomendaciones(kpis, hallazgos)}
${seccionConclusionesEjec(kpis, hallazgos)}

<div class="divider">Capítulo IV — Soportes y Seguimiento</div>
${seccionMortalidad(mortalidad, granjas, hallazgos, true, true)}
${semanalTabla}
${seccionPaneles(hallazgos, granjas, "Mortalidad · Resumen Ejecutivo", (a) => resumenMortalidadDiaria(a.registroMortalidadDiaria))}
${graficosMortalidadTendencia(hallazgos)}
<div class="section">
  <div class="section-title">Inventario de Alimento</div>
  ${hayInv ? `<table><tbody>
    <tr><td style="width:40%;font-weight:600;color:#0D1526">Diferencia general</td><td><strong style="color:${difBultos !== 0 ? "#F97316" : "#22C55E"};font-size:14px">${_fmtAnx(difBultos)} bultos</strong> &nbsp;·&nbsp; ${_fmtAnx(difBultosKg)} Kg</td></tr>
    <tr><td style="color:#64748b;font-size:11px" colspan="2">(Salida + Conteo físico) − Ingreso</td></tr>
  </tbody></table>` : `<p style="font-size:11px;color:#94a3b8">Sin registros de inventario de alimento en el alcance.</p>`}
</div>
${seccionPaneles(hallazgos, granjas, "Consumo de Alimento · Resumen Ejecutivo", (a) => resumenBultosConsumidos(a.registroBultosConsumidos, a.registroMortalidadDiaria, avesRecibidasTotal(a)))}
${graficosConsumoTendencia(hallazgos)}
${seccionBitacora(hallazgos, granjas, "compacto")}
${seccionColaboradores(hallazgos, granjas, "compacto")}
${seccionFirma(auditor, "Auditor Interno", datos, false, true)}
<div class="section" style="page-break-inside:avoid">
  <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:11px;color:#0c4a6e;text-align:justify">
    <strong>Certificación.</strong> Se certifica que el presente Informe Ejecutivo de Auditoría (${codigo} · Versión 1.0) fue generado por el Sistema de Auditoría Interna de ${EMPRESA.nombre} (NIT ${EMPRESA.nit}) a partir de los registros filtrados vigentes al momento de su emisión, garantizando la trazabilidad completa hallazgo → plan de acción → evidencia → seguimiento. Documento confidencial de uso interno.
  </div>
</div>
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARTS BI ADICIONALES (Fase 3) — para completar 10 tipos de gráfico en el Dashboard
// SVG/HTML inline, sin dependencias, con datos REALES filtrados.
// ═══════════════════════════════════════════════════════════════════════════════

// Envoltorio de tarjeta de gráfico numerada
function chartCard(num: number, titulo: string, contenido: string, subtitulo = ""): string {
  return `<div class="chart-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;page-break-inside:avoid">
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">
      <span style="background:#4A7AFF;color:#fff;font-size:9px;font-weight:800;min-width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${num}</span>
      <div><div style="font-size:13px;font-weight:700;color:#0D1526">${titulo}</div>${subtitulo ? `<div style="font-size:10px;color:#94a3b8">${subtitulo}</div>` : ""}</div>
    </div>
    ${contenido}
  </div>`;
}

// Barras verticales — Hallazgos por criticidad
function biColumnasCriticidad(hallazgos: any[]): string {
  const niveles = [
    { k: "Baja", c: "#22C55E" }, { k: "Media", c: "#FBBF24" },
    { k: "Alta", c: "#F97316" }, { k: "Crítica", c: "#EF4444" },
  ];
  const conteo = niveles.map(n => ({ ...n, v: hallazgos.filter(h => h.criticidad === n.k).length }));
  const sinClas = hallazgos.filter(h => !niveles.some(n => n.k === h.criticidad)).length;
  const data = sinClas > 0 ? [...conteo, { k: "Sin clasif.", c: "#94A3B8", v: sinClas }] : conteo;
  const max = Math.max(1, ...data.map(d => d.v));
  const W = 260, H = 150, padB = 24, padT = 14, padL = 8, padR = 8;
  const plotH = H - padB - padT;
  const bw = (W - padL - padR) / data.length;
  const bars = data.map((b, i) => {
    const h = (b.v / max) * plotH;
    const w = bw * 0.62, x = padL + i * bw + (bw - w) / 2, y = padT + plotH - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${b.c}"/>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#0D1526">${b.v}</text>
      <text x="${(x + w / 2).toFixed(1)}" y="${H - padB + 13}" text-anchor="middle" font-size="8" fill="#64748b">${b.k}</text>`;
  }).join("");
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#e2e8f0" stroke-width="1"/>${bars}</svg>`;
}

// Barras apiladas 100% — Estado KPI por granja
function biBarrasApiladas(kpis: any[], granjas: any[]): string {
  const conActividad = granjas
    .map(g => ({ g, ks: kpis.filter(k => k.granjaId === g.id) }))
    .filter(x => x.ks.length > 0).slice(0, 8);
  if (!conActividad.length) return `<p style="font-size:10px;color:#94a3b8;text-align:center;padding:16px">Sin KPIs por granja.</p>`;
  const rows = conActividad.map(({ g, ks }) => {
    const c = conteoEstadosBI(ks); const tot = ks.length;
    const segs = BI_ORDEN.map(e => c[e] > 0 ? `<div style="width:${(c[e] / tot * 100).toFixed(1)}%;background:${BI_COLORS[e]}"></div>` : "").join("");
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:9.5px;margin-bottom:2px"><span style="color:#334155;font-weight:600">${(g.nombre || "—").slice(0, 24)}</span><span style="color:#94a3b8">${tot} KPI</span></div>
      <div style="display:flex;height:14px;border-radius:4px;overflow:hidden;background:#f1f5f9">${segs}</div>
    </div>`;
  }).join("");
  const leyenda = BI_ORDEN.map(e => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#475569"><span style="width:9px;height:9px;border-radius:2px;background:${BI_COLORS[e]}"></span>${e}</span>`).join("");
  return `${rows}<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9">${leyenda}</div>`;
}

// Radar — Perfil de hallazgos por tipo de riesgo
function biRadarRiesgos(hallazgos: any[]): string {
  const ejes = TIPO_RIESGO as readonly string[];
  const conteo = ejes.map(t => hallazgos.filter(h => Array.isArray(h.tiposRiesgo) && h.tiposRiesgo.includes(t)).length);
  const max = Math.max(1, ...conteo);
  const W = 240, H = 210, cx = W / 2, cy = H / 2 + 4, R = 74, n = ejes.length;
  const ang = (i: number) => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i: number, frac: number) => [cx + R * frac * Math.cos(ang(i)), cy + R * frac * Math.sin(ang(i))];
  const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${ejes.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`).join("");
  const spokes = ejes.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`; }).join("");
  const dataPoly = ejes.map((_, i) => pt(i, conteo[i] / max).map(v => v.toFixed(1)).join(",")).join(" ");
  const dots = ejes.map((_, i) => { const [x, y] = pt(i, conteo[i] / max); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#4A7AFF"/>`; }).join("");
  const labels = ejes.map((t, i) => { const [x, y] = pt(i, 1.18); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="8" font-weight="600" fill="#475569">${t} (${conteo[i]})</text>`; }).join("");
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    ${rings}${spokes}<polygon points="${dataPoly}" fill="#4A7AFF33" stroke="#4A7AFF" stroke-width="2"/>${dots}${labels}</svg>`;
}

// Embudo — Pipeline de cierre de planes KPI
function biEmbudo(kpis: any[]): string {
  const c = conteoEstadosBI(kpis);
  const etapas = [
    { k: "No Iniciado", v: c["No Iniciado"] }, { k: "En Espera", v: c["En Espera"] },
    { k: "En Curso", v: c["En Curso"] }, { k: "Completado", v: c["Completado"] },
  ];
  const max = Math.max(1, ...etapas.map(e => e.v));
  return etapas.map(e => {
    const w = 28 + (e.v / max) * 72;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="width:66px;font-size:9px;color:#475569;text-align:right;flex-shrink:0">${e.k}</span>
      <div style="flex:1;display:flex;justify-content:center">
        <div style="width:${w.toFixed(0)}%;background:${BI_COLORS[e.k as EstadoBI]};color:#fff;font-size:10px;font-weight:700;text-align:center;padding:5px 0;border-radius:4px">${e.v}</div>
      </div>
    </div>`;
  }).join("");
}

// ── Tablero Visual completo (10 tipos de gráfico) — reutilizable en Modelos 3 y 5 ──
function seccionDashboardCompleto(kpis: any[], hallazgos: any[], granjas: any[]): string {
  if (!kpis.length) return "";
  const granjasConAvance = granjas.map(g => ({
    nombre: g.nombre,
    kpis: kpis.filter(k=>k.granjaId===g.id),
    avance: porcentaje(kpis.filter(k=>k.granjaId===g.id)),
  })).filter(g=>g.kpis.length>0).slice(0,8);
  return `
<div class="section">
  <div class="section-title">Tablero Visual · Cumplimiento KPI <span style="font-size:11px;font-weight:400;color:#94a3b8">(10 visualizaciones · datos filtrados)</span></div>

  ${chartCard(1, "Indicadores de Cumplimiento", biResumenEjecutivo(kpis), "Tarjetas de indicadores")}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
    ${chartCard(2, "Distribución por Estado", biDistribucionEstados(kpis), "Gráfico de dona")}
    ${chartCard(3, "Avance de Cumplimiento", biGaugeCumplimiento(kpis), "Indicador radial (gauge)")}
    ${chartCard(4, "Hallazgos por Criticidad", biColumnasCriticidad(hallazgos), "Barras verticales")}
    ${chartCard(5, "Perfil de Riesgos", biRadarRiesgos(hallazgos), "Radar por tipo de riesgo")}
    ${chartCard(6, "Avance por Granja", granjasConAvance.length
        ? granjasConAvance.map(g=>barraHorizontal(g.nombre.slice(0,18), g.avance, 100, g.avance>=70?"#22C55E":g.avance>=40?"#F97316":"#EF4444")).join("")
        : "<p style='font-size:10px;color:#94a3b8;text-align:center;padding:16px'>Sin datos por granja</p>", "Barras horizontales")}
    ${chartCard(7, "Embudo de Cierre", biEmbudo(kpis), "Pipeline No Iniciado → Completado")}
  </div>

  <div style="margin-top:14px">
    ${chartCard(8, "Estado KPI por Granja", biBarrasApiladas(kpis, granjas), "Barras apiladas 100%")}
  </div>

  <div style="margin-top:14px">
    ${chartCard(9, "Tendencia Cronológica", biTendenciaCumplimiento(kpis, hallazgos), "Serie temporal por mes")}
  </div>

  <div style="margin-top:14px">
    ${chartCard(10, "Matriz Riesgos vs Estado KPI", biRiesgosVsEstado(kpis, hallazgos), "Mapa de calor")}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 3 — DASHBOARD VISUAL (reestructurado · 10 tipos de gráfico)
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo3(kpis: any[], hallazgos: any[], granjas: any[], auditor: string, evidenciasPorHallazgo?: Record<string, any[]>, datos?: DatosGenerales): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Dashboard Auditoría — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
.dash-header{background:linear-gradient(90deg,#0D1526,#1a2d4a);padding:16px 20px;
  display:flex;justify-content:space-between;align-items:center;margin-bottom:0}
.metric-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:16px 50px;
  background:#f1f5f9;border-bottom:1px solid #e2e8f0}
.metric{background:white;border-radius:8px;padding:10px;text-align:center;
  border:1px solid #e2e8f0}
.metric-n{font-size:22px;font-weight:800}
.metric-l{font-size:11px;color:#64748b}
</style></head><body><div class="page">
${portada("Dashboard de Auditoría", "Visualización Ejecutiva de KPIs · Pollos Savicol S.A.S.", kpis, hallazgos, auditor, undefined, datos)}

<div class="metric-grid">
  ${[
    {n:kpis.length,            l:"KPIs Total",         c:"#4A7AFF"},
    {n:hallazgos.length,       l:"Hallazgos",          c:"#F97316"},
    {n:granjas.length,         l:"Granjas",            c:"#8B5CF6"},
    {n:porcentaje(kpis)+"%",   l:"Avance Global",      c:"#22C55E"},
    {n:hallazgos.filter(h=>h.estado==="ABIERTO").length, l:"Abiertos",  c:"#EF4444"},
    {n:hallazgos.filter(h=>h.estado==="CERRADO").length, l:"Cerrados",  c:"#22C55E"},
  ].map(m=>`<div class="metric"><div class="metric-n" style="color:${m.c}">${m.n}</div><div class="metric-l">${m.l}</div></div>`).join("")}
</div>

${seccionDashboardCompleto(kpis, hallazgos, granjas)}

${indicadoresAnexos(hallazgos)}

${graficosMortalidad(hallazgos, granjas)}

${graficosProduccionDiaria(hallazgos, granjas)}

${indicadoresResumenes(hallazgos)}

${seccionFirma(auditor, "Auditor Interno", datos)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 5 — INFORME GENERAL COMPLETO (documento unificado de Gerencia)
// Combina el marco metodológico/legal (Fase 2), el tablero de 10 gráficos (Fase 3),
// evaluación de riesgos, ficha técnica y consolidado (mortalidad real + KPI).
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo5(
  kpis: any[], hallazgos: any[], granjas: any[], auditor: string,
  evidenciasPorHallazgo?: Record<string, any[]>, marcoLegal?: string,
  mortalidad?: MortalidadResumen, datos?: DatosGenerales
): string {
  const total = kpis.length;
  const pct   = porcentaje(kpis);

  const num = datos?.numeroInforme || `AU-GEN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe General Combinado — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
.divider{text-align:center;padding:12px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);
  font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
</style></head><body><div class="page">

${portada(`Informe General de Auditoría N° ${num}`, "Evaluación Integral · Ejecutivo + Dashboard", kpis, hallazgos, auditor, undefined, datos)}

<!-- ÍNDICE -->
<div class="section">
  <div class="section-title">Estructura del Informe</div>
  ${[
    "I.    Ficha Técnica de la Granja",
    "II.   Marco Legal",
    "III.  Avance de la Granja Evaluada",
    "IV.   Gestión de Planes de Acción KPI",
    "V.    Indicadores de Mortalidad",
    "VI.   Inventario de Alimento",
    "VII.  Análisis Técnico",
    "VIII. Bitácora y Registro de Colaboradores",
    "IX.   Conclusiones y Recomendaciones",
    "X.    Firmas y Certificación",
  ].map(s=>`<div style="padding:5px 0;font-size:12px;color:#475569;border-bottom:1px dotted #e2e8f0">${s}</div>`).join("")}
</div>

<!-- I. FICHA TÉCNICA DE LA GRANJA -->
<div class="divider">I — Ficha Técnica de la Granja</div>
${seccionFichaTecnica(granjas)}

<!-- II. MARCO LEGAL -->
<div class="divider">II — Marco Legal</div>
${seccionMarcoLegal(marcoLegal)}

<!-- III. AVANCE DE LA GRANJA EVALUADA -->
<div class="divider">III — Avance de la Granja Evaluada</div>
<div class="section">
  <div class="section-title">Avance de la Granja Evaluada</div>
  ${granjas.filter(g=>kpis.some(k=>k.granjaId===g.id)).slice(0,10).map(g=>{
    const kg   = kpis.filter(k=>k.granjaId===g.id);
    const hg   = hallazgos.filter(h=>h.granjaId===g.id);
    const av   = porcentaje(kg);
    const col  = av>=70?"#22C55E":av>=40?"#F97316":"#EF4444";
    return `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div><strong style="font-size:12px">${g.nombre}</strong>
          <span style="font-size:10px;color:#64748b;margin-left:8px">${g.tipoOperativo||""} · ${g.region||""}</span>
        </div>
        <span style="font-size:12px;font-weight:700;color:${col}">${av}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${av}%;background:${col}"></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:10px;color:#64748b">
        <span>KPIs: <strong>${kg.length}</strong></span>
        <span>Hallazgos: <strong>${hg.length}</strong></span>
        <span>Abiertos: <strong style="color:#EF4444">${hg.filter(h=>h.estado==="ABIERTO").length}</strong></span>
      </div>
    </div>`;
  }).join("")}
</div>

<!-- IV. GESTIÓN DE PLANES DE ACCIÓN KPI (hallazgo · descripción · categoría · auditor · seguimiento · observación · plan · fotos) -->
<div class="divider">IV — Gestión de Planes de Acción KPI</div>
${seccionKPIs(kpis, granjas, hallazgos, evidenciasPorHallazgo, true)}

<!-- V. INDICADORES DE MORTALIDAD (bloque técnico único: indicadores + registro diario + resumen + gráfico + %) -->
<div class="divider">V — Indicadores de Mortalidad</div>
${seccionMortalidad(mortalidad, granjas, hallazgos)}
${seccionMortalidadDiaria(hallazgos, granjas, "detalle")}
${graficosMortalidadTendencia(hallazgos)}

<!-- VI. INVENTARIO DE ALIMENTO (bloque técnico único: inventario + consumo diario + indicadores + gráfico) -->
<div class="divider">VI — Inventario de Alimento</div>
${seccionAnexosTecnicos(hallazgos, granjas, "detalle")}
${seccionBultosConsumidos(hallazgos, granjas, "detalle")}
${graficosConsumoTendencia(hallazgos)}

<!-- VII. ANÁLISIS TÉCNICO -->
<div class="divider">VII — Análisis Técnico</div>
${seccionResumenesEjecutivos(hallazgos, granjas, "completo")}

<!-- VIII. BITÁCORA Y REGISTRO DE COLABORADORES -->
<div class="divider">VIII — Bitácora y Registro de Colaboradores</div>
${seccionBitacora(hallazgos, granjas, "detalle")}
${seccionColaboradores(hallazgos, granjas, "detalle")}

<!-- IX. CONCLUSIONES Y RECOMENDACIONES -->
<div class="divider">IX — Conclusiones y Recomendaciones</div>
<div class="section">
  <div class="section-title">Conclusiones Generales</div>
  <div style="font-size:13px;line-height:1.8;color:#475569">
    <p>El Sistema de Gestión de Auditoría Interna de <strong>${EMPRESA.nombre}</strong> registra
    un avance global del <strong style="color:${pct>=70?"#22C55E":pct>=40?"#F97316":"#EF4444"}">${pct}%</strong>
    en sus planes de acción KPI, con <strong>${kpis.filter(k=>k.estado==="COMPLETADO").length}</strong>
    planes completados de un total de <strong>${total}</strong>.</p>

    <p style="margin-top:8px"><strong>Hallazgos:</strong> Se identificaron
    <strong>${hallazgos.length}</strong> hallazgos en <strong>${granjas.filter(g=>hallazgos.some(h=>h.granjaId===g.id)).length}</strong>
    granjas evaluadas. El <strong>${hallazgos.length ? Math.round(hallazgos.filter(h=>h.estado==="ABIERTO").length/hallazgos.length*100) : 0}%</strong>
    permanece en estado abierto, requiriendo atención prioritaria.</p>

    <div style="margin-top:12px;padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:6px">
      <div style="font-weight:700;margin-bottom:8px">Recomendaciones prioritarias:</div>
      <ol style="padding-left:16px">
        <li>Activar inmediatamente los <strong>${kpis.filter(k=>k.estado==="NO_INICIADO").length}</strong> planes KPI en estado "No Iniciado".</li>
        <li>Establecer seguimiento semanal a los <strong>${hallazgos.filter(h=>h.estado==="ABIERTO").length}</strong> hallazgos abiertos.</li>
        <li>Implementar los planes de acción en las granjas con mayor índice de riesgo.</li>
        <li>Incrementar la frecuencia de auditorías en granjas con avance inferior al 40%.</li>
        <li>Capacitar al personal operativo en protocolos de bioseguridad y manejo de registros.</li>
      </ol>
    </div>
  </div>
</div>

<!-- X. FIRMAS -->
<div class="divider">X — Firmas y Certificación</div>
${seccionFirma(auditor, "Auditor Interno", datos, true)}
${footer()}
</div></body></html>`;
}

// ─── Cargar evidencias fotográficas de los hallazgos (para el informe) ─────────
// Devuelve un mapa { hallazgoId: [evidencias Foto] } solo de los hallazgos dados.
async function cargarEvidenciasInforme(
  hallazgoIds: string[], accessToken: string | null
): Promise<Record<string, any[]>> {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const mapa: Record<string, any[]> = {};
  if (!accessToken || hallazgoIds.length === 0) return mapa;
  await Promise.all(hallazgoIds.map(async (hid) => {
    try {
      const r = await fetch(`${API}/api/v1/evidencias/hallazgo?hallazgoId=${hid}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const data = await r.json();
        mapa[hid] = Array.isArray(data) ? data.filter((e: any) => e.tipo === "Foto") : [];
      }
    } catch { /* silencioso — el informe se genera sin esas evidencias */ }
  }));
  return mapa;
}

// ─── Mortalidad REAL desde Trazabilidad (lotes) para las granjas del alcance ──────
// Reutiliza el endpoint /documentos (misma fuente que useLotes): filtra los lotes
// [LOTE-TRZ], parsea el JSON embebido y calcula la mortalidad como avesIngreso −
// avesActuales (campos de nivel superior del lote). Sin datos inventados: si no hay
// lotes para las granjas, devuelve lotes:0 y el consolidado marca "sin datos".
async function cargarMortalidadInforme(
  granjaIds: string[], accessToken: string | null
): Promise<MortalidadResumen> {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const acc: MortalidadResumen = { lotes: 0, totalIngreso: 0, totalActuales: 0, totalMuertes: 0, pctGlobal: 0, porGranja: {} };
  if (!accessToken) return acc;
  try {
    const r = await fetch(`${API}/api/v1/documentos`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return acc;
    const docs = await r.json();
    if (!Array.isArray(docs)) return acc;
    const setG = granjaIds.length ? new Set(granjaIds) : null;
    for (const d of docs) {
      if (!((d?.nombre as string) || "").includes("[LOTE-TRZ]")) continue;
      const m = ((d?.ocrTexto as string) || "").match(/\[LOTE\]([\s\S]*?)\[\/LOTE\]/);
      if (!m) continue;
      let data: any;
      try { data = JSON.parse(m[1]); } catch { continue; }
      if (setG && !setG.has(data?.granjaId)) continue;
      const ingreso = Number(data?.avesIngreso) || 0;
      if (ingreso <= 0) continue;
      const actuales = Number(data?.avesActuales) || 0;
      const muertes = Math.max(0, ingreso - actuales);
      acc.lotes++; acc.totalIngreso += ingreso; acc.totalActuales += actuales; acc.totalMuertes += muertes;
      const gid = data?.granjaId || "—";
      const prev = acc.porGranja[gid] || { ingreso: 0, actuales: 0, muertes: 0, pct: 0 };
      prev.ingreso += ingreso; prev.actuales += actuales; prev.muertes += muertes;
      prev.pct = prev.ingreso > 0 ? (prev.muertes / prev.ingreso) * 100 : 0;
      acc.porGranja[gid] = prev;
    }
    acc.pctGlobal = acc.totalIngreso > 0 ? (acc.totalMuertes / acc.totalIngreso) * 100 : 0;
    return acc;
  } catch { return acc; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 6 — INFORME HALLAZGOS (solo hallazgos + evidencias + mortalidad + inventarios)
// Sin planes de acción ni cumplimiento KPI.
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo6(
  hallazgos: any[], granjas: any[], auditor: string,
  evidenciasPorHallazgo?: Record<string, any[]>, mortalidad?: MortalidadResumen,
  datos?: DatosGenerales
): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe de Hallazgos — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}</style></head><body><div class="page">
${portada("Informe de Hallazgos", "Hallazgos con Detalle, Evidencias Fotográficas y Mortalidad", [], hallazgos, auditor, undefined, datos, true)}

${seccionHallazgos(hallazgos, granjas, 30)}

${seccionHallazgosDetalle(hallazgos, granjas, evidenciasPorHallazgo)}

${seccionMortalidad(mortalidad, granjas, hallazgos)}

${seccionAnexosTecnicos(hallazgos, granjas, "detalle")}

${seccionBitacora(hallazgos, granjas, "detalle")}

${seccionColaboradores(hallazgos, granjas, "detalle")}

${seccionMortalidadDiaria(hallazgos, granjas, "detalle")}

${seccionBultosConsumidos(hallazgos, granjas, "detalle")}

${seccionResumenesEjecutivos(hallazgos, granjas, "completo")}

${seccionFirma(auditor, "Auditor Interno", datos)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 2 — INFORME RESUMEN (ejecutivo, comparativo y compacto para Gerencia)
// Consolida varias granjas en un único documento a partir de los registros filtrados.
// Reutiliza portada, gráficos SVG (BI), evidencias y firmas existentes. Sin datos ficticios.
// ═══════════════════════════════════════════════════════════════════════════════
function generarResumen(
  kpis: any[], hallazgos: any[], granjas: any[], auditor: string,
  _evid?: Record<string, any[]>, _mortalidad?: MortalidadResumen, datos?: DatosGenerales
): string {
  const year   = new Date().getFullYear();
  const num    = datos?.numeroInforme || `AU-RES-${year}-${String(Date.now()).slice(-4)}`;
  const codigo = `IR-AUD-${year}-${datos?.numeroInforme?.match(/\d+/)?.[0] ?? String(Date.now()).slice(-4)}`;

  const critRank = (h: any) => { const c = (h.criticidad || "").toString().toLowerCase(); return c.startsWith("crít") || c.startsWith("crit") ? 4 : c.startsWith("alt") ? 3 : c.startsWith("med") ? 2 : c.startsWith("baj") ? 1 : 0; };
  const kgBulto  = (a: any) => anexNum(a.registroBultosConsumidos?.kgPorBulto) || 40;
  const planDe = (h: any) => {
    const t = kpis.filter(k => k.hallazgoId === h.id)
      .map(k => (k.planAccionVeterinario && k.planAccionVeterinario !== "—") ? k.planAccionVeterinario : k.accion)
      .filter(Boolean).join("  |  ");
    return t || "—";
  };

  // Una tabla por GRANJA (sólo granjas con hallazgos en el alcance), ordenadas por nombre.
  const bloquesGranja = granjas
    .map(g => ({ g, hs: hallazgos.filter(h => h.granjaId === g.id) }))
    .filter(x => x.hs.length > 0)
    .sort((a, b) => (a.g.nombre || "").localeCompare(b.g.nombre || ""))
    .map(({ g, hs }) => {
      // Agregados de la granja (sin inventar): % mortalidad general y diferencia general de bultos.
      let muertes = 0, recib = 0, ing = 0, sal = 0, fis = 0, kgAcum = 0;
      hs.forEach(h => {
        const a = parseAnexos(h.anexosTecnicos);
        muertes += totalMortalidadAves(a); recib += avesRecibidasTotal(a);
        ing += totalIngresoUnidades(a); fis += totalInventarioBultos(a);
        sal += (a.totalBultos?.bloques?.[0]?.filas ?? []).reduce((s: number, f: any) => s + anexNum(f.cantidad), 0);
        kgAcum += kgBulto(a);
      });
      const pctGen   = recib > 0 ? (muertes / recib) * 100 : null;
      const difGen   = (sal + fis) - ing;
      const difGenKg = difGen * (hs.length ? kgAcum / hs.length : 40);
      const caption  = `${g.nombre || "—"} &nbsp;·&nbsp; % Mortalidad general: <strong style="color:#EF4444">${pctGen === null ? "—" : pctGen.toFixed(2) + "%"}</strong> &nbsp;·&nbsp; Diferencia general de Bultos: <strong style="color:#0EA5E9">${_fmtAnx(difGen)} bultos</strong> (${_fmtAnx(difGenKg)} Kg)`;

      const colHeaders = `<tr><th style="width:8%">Fecha visita</th><th style="width:9%">Granja</th><th style="width:22%">Hallazgo</th><th style="width:10%">Categoría</th><th style="width:12%">Tipo de Riesgo</th><th style="width:31%">Planes de acción</th><th style="width:8%">Criticidad</th></tr>`;
      const filas = [...hs].sort((a, b) => critRank(b) - critRank(a)).map(h => `<tr>
        <td>${fmtFechaCorta(h.fechaVisita)}</td>
        <td>${g.nombre || "—"}</td>
        <td><strong>${h.titulo || "—"}</strong>${h.descripcion ? `<div style="font-weight:400;color:#475569;margin-top:3px;line-height:1.35">${h.descripcion}</div>` : ""}</td>
        <td>${h.categoria || "—"}</td>
        <td>${Array.isArray(h.tiposRiesgo) ? h.tiposRiesgo.join(", ") : "—"}</td>
        <td>${planDe(h)}</td>
        <td>${h.criticidad || "—"}</td>
      </tr>`).join("");
      // UNA sola tabla por granja: el caption (banda de la granja) y los encabezados van en el
      // thead y se REPITEN en cada hoja; el motor pagina la tabla por límite de fila, sin cortar
      // información ni crear tablas por hoja/por hallazgo.
      const capRow = `<tr><th colspan="7" style="background:#0D1526;color:#fff;text-align:left;font-size:11px;padding:6px 10px;font-weight:700">${caption}</th></tr>`;
      return `<table style="margin-bottom:10px"><thead>${capRow}${colHeaders}</thead><tbody>${filas}</tbody></table>`;
    }).join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Resumen — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
/* Informe Resumen: tipografía uniforme Times New Roman tamaño 10 en toda la estructura */
.page,.page td,.page th,.page div,.page p,.page span,.page strong{font-family:'Times New Roman',Times,serif}
.page td,.page th{font-size:10px}
.page .section-title{font-size:12px}
</style></head><body><div class="page">
${portada(`Informe Resumen Ejecutivo N° ${num}`, `Comparativo por Granja · ${codigo} · Versión 1.0`, kpis, hallazgos, auditor, undefined, datos, true)}

<div class="section">
  <div class="section-title">Comparativo de Hallazgos por Granja</div>
  ${bloquesGranja || `<p style="font-size:11px;color:#94a3b8">Sin hallazgos en el alcance filtrado.</p>`}
</div>

${seccionFirma(auditor, "Auditor Interno", datos, true)}
${footer()}
</div></body></html>`;
}

// Construye el HTML de un modelo (mismo que se descarga y se adjunta al correo).
function htmlDeModelo(
  modelo: ModeloInforme, kpis: any[], hallazgos: any[], granjas: any[], auditor: string,
  evidenciasMap?: Record<string, any[]>, marcoLegal?: string, mortalidad?: MortalidadResumen,
  datos?: DatosGenerales
): string {
  switch (modelo) {
    case "1-ejecutivo": return generarModelo1(kpis, hallazgos, granjas, auditor, evidenciasMap, marcoLegal, mortalidad, datos);
    case "2-resumen":   return generarResumen(kpis, hallazgos, granjas, auditor, evidenciasMap, mortalidad, datos);
    case "3-dashboard": return generarModelo3(kpis, hallazgos, granjas, auditor, evidenciasMap, datos);
    case "6-hallazgos": return generarModelo6(hallazgos, granjas, auditor, evidenciasMap, mortalidad, datos);
    default:            return generarModelo5(kpis, hallazgos, granjas, auditor, evidenciasMap, marcoLegal, mortalidad, datos);
  }
}

// Descarga un PDF (base64) como archivo, vía Blob (robusto para archivos grandes).
function descargarPDFBase64(b64: string, filename: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — GENERA Y ABRE EL INFORME SELECCIONADO
// ═══════════════════════════════════════════════════════════════════════════════
export function generarInforme(
  modelo: ModeloInforme,
  kpis: any[], hallazgos: any[], granjas: any[],
  auditor: string, granjaFiltroId?: string,
  evidenciasPorHallazgo?: Record<string, any[]>,
  marcoLegal?: string, mortalidad?: MortalidadResumen, datos?: DatosGenerales
): void {
  let html = "";
  switch(modelo) {
    case "1-ejecutivo": html = generarModelo1(kpis, hallazgos, granjas, auditor, evidenciasPorHallazgo, marcoLegal, mortalidad, datos); break;
    case "2-resumen":   html = generarResumen(kpis, hallazgos, granjas, auditor, evidenciasPorHallazgo, mortalidad, datos); break;
    case "3-dashboard": html = generarModelo3(kpis, hallazgos, granjas, auditor, evidenciasPorHallazgo, datos); break;
    case "5-general":
    default:            html = generarModelo5(kpis, hallazgos, granjas, auditor, evidenciasPorHallazgo, marcoLegal, mortalidad, datos); break;
  }
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 700);
  }
}

// ─── Convertir HTML del informe a PDF real usando html2canvas + jsPDF ───────────
// Renderiza el HTML en el browser → captura con html2canvas → genera PDF con jsPDF
// El PDF resultante es IDÉNTICO al informe visible en la plataforma
async function htmlToPDFBase64(html: string, orientation: "portrait" | "landscape" = "portrait"): Promise<{ b64: string; filename: string }> {
  const fecha    = new Date().toISOString().slice(0, 10);
  const filename = `Informe-Auditoria-Savicol-${fecha}.pdf`;

  let container: HTMLDivElement | null = null;

  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    // Extraer el contenido del <body> y los estilos del <style> del HTML completo
    const bodyMatch  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyContent  = bodyMatch ? bodyMatch[1] : html;
    let   styleContent = styleMatch ? styleMatch[1] : "";
    // Reasignar reglas de `body {...}` a un wrapper, ya que el contenido irá en un div
    styleContent = styleContent.replace(/(^|\})\s*body\s*\{/g, "$1 .pdf-root{");

    // Contenedor FUERA de pantalla pero OPACO. Con opacity:0 html2canvas captura
    // todo transparente → el PDF sale en blanco. El patrón correcto (usado en el
    // resto de generadores) es posicionarlo a la izquierda (-10000px) sin opacity.
    container = document.createElement("div");
    container.style.cssText = "position:absolute;top:0;left:-10000px;width:900px;background:#ffffff;z-index:-1;";

    const styleEl = document.createElement("style");
    styleEl.textContent = styleContent;
    container.appendChild(styleEl);

    const root = document.createElement("div");
    root.className = "pdf-root";
    root.style.cssText = "width:900px;background:#ffffff;color:#1a202c;font-family:'Times New Roman', Times, serif;";
    root.innerHTML = bodyContent;
    container.appendChild(root);
    document.body.appendChild(container);

    // Esperar render + carga de imágenes (data URI / remotas)
    await new Promise(r => setTimeout(r, 700));
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); setTimeout(res, 2000); });
    }));

    // ── Paginación por BLOQUES (formato corporativo, sin cortar secciones) ──
    // Cada hijo de .page (portada, divisores, secciones) es una unidad de salto de
    // página: si no cabe en lo que resta, salta a la siguiente. Si un bloque es más
    // alto que una página, se recurre a sus hijos (p. ej. tarjetas KPI, charts); solo
    // si un elemento atómico sigue sin caber (tabla enorme) se corta como último recurso.
    const pageEl = root.querySelector(".page") as HTMLElement | null;
    const pdf    = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
    const pageW  = pdf.internal.pageSize.getWidth();   // 210mm (portrait) · 297mm (landscape)
    const pageH  = pdf.internal.pageSize.getHeight();  // 297mm (portrait) · 210mm (landscape)
    const mTop = 8, mBottom = 11;                        // márgenes (footer = nº de página)
    const usableH = pageH - mTop - mBottom;
    const mmPerPx = pageW / 900;                         // el layout mide 900px de ancho
    let y = mTop;
    let pageVacia = true;

    const capturar = (el: HTMLElement) =>
      html2canvas(el, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false, windowWidth: 900,
        // Seguro anti-recorte: añade un colchón superior/inferior al clon capturado
        // para que html2canvas no corte la primera/última línea (títulos incluidos).
        onclone: (_doc: Document, clone: HTMLElement) => {
          try {
            clone.style.paddingTop = (parseFloat(getComputedStyle(el).paddingTop || "0") + 6) + "px";
            clone.style.paddingBottom = (parseFloat(getComputedStyle(el).paddingBottom || "0") + 4) + "px";
          } catch { /* noop */ }
        },
      });
    // Captura SIN colchón de padding: para paginar tablas por fila con alineación exacta.
    const capturarPlano = (el: HTMLElement) =>
      html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false, windowWidth: 900 });
    const nuevaPagina = () => { pdf.addPage(); y = mTop; pageVacia = true; };

    // Coloca un canvas preservando su proporción (centrado según el ancho real del
    // elemento); salta de página o corta en tiras si es más alto que una página.
    const colocarCanvas = (canvas: HTMLCanvasElement, elWidthPx: number) => {
      if (!canvas.width || !canvas.height) return;
      const wmm = Math.min(pageW, (elWidthPx / 900) * pageW);
      const x   = (pageW - wmm) / 2;
      const hmm = (canvas.height / canvas.width) * wmm;
      if (hmm <= usableH) {
        if (hmm > (pageH - mBottom - y) + 0.5 && !pageVacia) nuevaPagina();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", x, y, wmm, hmm, undefined, "FAST");
        y += hmm; pageVacia = false;
      } else {
        if (!pageVacia) nuevaPagina();
        const pxPorPagina = Math.floor((usableH / hmm) * canvas.height);
        let rendered = 0;
        while (rendered < canvas.height) {
          if (!pageVacia) nuevaPagina();
          const sh = Math.min(pxPorPagina, canvas.height - rendered);
          const pc = document.createElement("canvas");
          pc.width = canvas.width; pc.height = sh;
          const ctx = pc.getContext("2d");
          if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, pc.width, pc.height); ctx.drawImage(canvas, 0, rendered, canvas.width, sh, 0, 0, canvas.width, sh); }
          const shmm = (sh / canvas.width) * wmm;
          pdf.addImage(pc.toDataURL("image/jpeg", 0.9), "JPEG", x, mTop, wmm, shmm, undefined, "FAST");
          rendered += sh; y = mTop + shmm; pageVacia = false;
        }
      }
    };

    // Pagina una <table> cortando SÓLO en límites de fila (nunca a mitad de texto) y repitiendo
    // el encabezado (thead) en cada hoja. Empaca las filas que caben para minimizar hojas: la
    // tabla es UNA sola en el HTML; el corte entre páginas lo hace el motor sin perder información.
    const colocarTabla = async (table: HTMLElement) => {
      const canvas = await capturarPlano(table);
      const rows = Array.from(table.querySelectorAll("tbody > tr")).filter((r): r is HTMLElement => r instanceof HTMLElement);
      const domH = table.getBoundingClientRect().height;
      if (!canvas.width || !canvas.height || !rows.length || domH <= 0) { colocarCanvas(canvas, table.offsetWidth); return; }
      const wmm = Math.min(pageW, (table.offsetWidth / 900) * pageW);
      const x = (pageW - wmm) / 2;
      const mmPorCanvasPx = wmm / canvas.width;                     // mm por px del canvas
      const sc = canvas.height / domH;                              // px de canvas por px del DOM
      const tTop = table.getBoundingClientRect().top;
      const thead = table.querySelector("thead") as HTMLElement | null;
      const theadPx = thead ? Math.round(thead.getBoundingClientRect().height * sc) : 0;
      const bounds = rows.map(r => { const rr = r.getBoundingClientRect(); return { top: Math.round((rr.top - tTop) * sc), bot: Math.round((rr.bottom - tTop) * sc) }; });
      // El encabezado (banda de granja + títulos de columna) se dibuja SÓLO en la primera hoja de
      // la tabla; si continúa en otra hoja, se muestran únicamente las filas → una sola tabla por granja.
      const dibujar = (top: number, bot: number, conHead: boolean) => {
        const headPx = conHead ? theadPx : 0;
        const bodyH = bot - top, totalH = headPx + bodyH;
        const pc = document.createElement("canvas");
        pc.width = canvas.width; pc.height = totalH;
        const ctx = pc.getContext("2d");
        if (!ctx) return 0;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, pc.width, pc.height);
        if (headPx > 0) ctx.drawImage(canvas, 0, 0, canvas.width, theadPx, 0, 0, canvas.width, theadPx);
        ctx.drawImage(canvas, 0, top, canvas.width, bodyH, 0, headPx, canvas.width, bodyH);
        const hmm = totalH * mmPorCanvasPx;
        pdf.addImage(pc.toDataURL("image/jpeg", 0.9), "JPEG", x, y, wmm, hmm, undefined, "FAST");
        return hmm;
      };
      let i = 0, primera = true;
      while (i < rows.length) {
        const headPx = primera ? theadPx : 0;
        const filaH0mm = (bounds[i].bot - bounds[i].top) * mmPorCanvasPx;
        if (!pageVacia && (headPx * mmPorCanvasPx + filaH0mm) > (pageH - mBottom - y) + 0.5) nuevaPagina();
        const budgetPx = ((pageH - mBottom - y) / mmPorCanvasPx) - headPx; // cuerpo disponible en px de canvas
        let j = i, usado = 0;
        while (j < rows.length) {
          const fH = bounds[j].bot - bounds[j].top;
          if (j > i && usado + fH > budgetPx) break;
          usado += fH; j++;
        }
        const hmm = dibujar(bounds[i].top, bounds[j - 1].bot, primera);
        y += hmm; pageVacia = false;
        i = j; primera = false;
        if (i < rows.length) nuevaPagina();
      }
    };

    // Un elemento es "hoja" (se coloca ENTERO, nunca se parte en hijos): tablas, filas,
    // imágenes, gráficos SVG/canvas, tarjetas KPI/chart/firma/metric y cualquier contenedor
    // flex/grid (partirlo rompería su maquetación en columnas). El resto (secciones y
    // bloques por hallazgo) sí se recorre para rellenar la hoja.
    const esHoja = (el: HTMLElement): boolean => {
      const tag = el.tagName;
      if (tag === "TABLE" || tag === "TR" || tag === "IMG" || tag === "SVG" || tag === "CANVAS") return true;
      const cls = typeof el.className === "string" ? el.className : "";
      if (/\b(kpi-item|kpi-card|chart-box|firma-box|firma-section|metric)\b/.test(cls)) return true;
      const disp = getComputedStyle(el).display;
      if (disp.includes("flex") || disp.includes("grid")) return true;
      return false;
    };

    // Coloca un elemento. Si NO es hoja y no cabe entero en lo que queda de la hoja (o es más
    // alto que una página completa), se recorre a sus hijos: los primeros rellenan el hueco
    // actual y sólo lo que no cupo pasa a la siguiente hoja — así se reducen los espacios en
    // blanco SIN partir tablas, gráficos ni fotos (que se colocan enteros). Hasta 4 niveles:
    // página → sección → bloque por hallazgo → sub-bloque → tabla.
    const colocarElemento = async (el: HTMLElement, prof: number): Promise<void> => {
      const hmmAprox = el.offsetHeight * mmPerPx;
      const restante = pageH - mBottom - y;
      // Tabla que no cabe entera en lo que resta: paginar por FILAS (sin cortar filas, thead repetido).
      if (el.tagName === "TABLE" && el.querySelector("tbody > tr") && (hmmAprox > usableH || (hmmAprox > restante && !pageVacia))) {
        await colocarTabla(el);
        return;
      }
      const hijos = Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.offsetHeight > 0);
      if (!esHoja(el) && hijos.length > 1 && prof < 4 && (hmmAprox > usableH || (hmmAprox > restante && !pageVacia))) {
        for (const hijo of hijos) await colocarElemento(hijo, prof + 1);
        return;
      }
      colocarCanvas(await capturar(el), el.offsetWidth);
    };

    const bloques = pageEl
      ? Array.from(pageEl.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.offsetHeight > 0)
      : [root];
    for (const bloque of bloques) {
      const esDivider = typeof bloque.className === "string" && bloque.className.includes("divider");
      // Evita divisores huérfanos: si queda poco espacio (menos que divisor + título), empújalo con su sección
      if (esDivider && !pageVacia && (pageH - mBottom - y) < 36) nuevaPagina();
      await colocarElemento(bloque, 0);
    }

    document.body.removeChild(container);
    container = null;

    // Numeración de páginas + pie corporativo (en el margen inferior)
    const totalPaginas = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Pollos Savicol S.A.S. · Auditoría Interna", 8, pageH - 4);
      pdf.text(`Página ${i} de ${totalPaginas}`, pageW - 8, pageH - 4, { align: "right" });
    }

    const b64 = pdf.output("datauristring").split(",")[1];
    if (!b64 || b64.length < 1000) {
      throw new Error("El PDF generado está vacío");
    }
    return { b64, filename };

  } catch (err) {
    console.error("[htmlToPDFBase64]", err);
    if (container && container.parentNode) {
      try { document.body.removeChild(container); } catch { /* noop */ }
    }
    // Re-lanzar el error para que el llamador NO envíe un HTML como si fuera PDF
    throw new Error("No se pudo generar el PDF del informe: " + ((err as any)?.message ?? "error de renderizado"));
  }
}

// ─── Modal selector de modelos de informe ─────────────────────────────────────
function SelectorInformeModal({ granjas, filtrosActivos, granjasList, auditorsList, resultadosCount, onClose, onGenerar, onEnviar }: {
  granjas:    any[];
  filtrosActivos?: { fEstado: string; fGranjas: string[]; fAuditor: string; fTipoRiesgo: string; fDesde: string; fHasta: string };
  granjasList?:    any[];
  auditorsList?:   any[];
  resultadosCount?: number;
  onClose:    () => void;
  onGenerar:  (modelos: ModeloInforme[], datos: DatosGenerales, marcoLegal?: string) => void | Promise<void>;
  onEnviar:   (modelos: ModeloInforme[], datos: DatosGenerales, descripcion?: string, marcoLegal?: string) => void | Promise<void>;
}) {
  const auditorStoreEmail = useAuthStore((s) => s.user?.email ?? "");
  const auditorStoreName  = useAuthStore((s) => s.user?.name  ?? "Auditor");

  const [modelosSel, setModelosSel] = useState<Set<ModeloInforme>>(new Set<ModeloInforme>(["5-general"]));
  const [enviarEmail,    setEnviarEmail]    = useState(false);
  const [enviando,       setEnviando]       = useState(false);
  const [generando,      setGenerando]      = useState(false);
  const [enviado,          setEnviado]          = useState<string|null>(null);
  const [descripcionCorreo,setDescripcionCorreo] = useState("");
  const [marcoLegal,       setMarcoLegal]        = useState("");
  const [datos, setDatos] = useState<DatosGenerales>({
    numeroInforme: "", auditor1: auditorStoreName || "", auditor2: "",
    fechaVisita: "", fechaGeneracion: new Date().toISOString().slice(0, 10),
    gerenteGeneral: "", administrador: "", oficialCumplimiento: "", tituloActividad: "",
  });
  const setD = (k: keyof DatosGenerales, v: string) => setDatos(p => ({ ...p, [k]: v }));

  // Fortalezas Identificadas (manuales, sólo Informe Ejecutivo · efímeras, sólo para el PDF).
  type Fortaleza = { fortaleza: string; observacion: string; foto?: string };
  const [fortalezas, setFortalezas] = useState<Fortaleza[]>([]);
  const addFortaleza  = () => setFortalezas(p => [...p, { fortaleza: "", observacion: "" }]);
  const editFortaleza = (i: number, patch: Partial<Fortaleza>) => setFortalezas(p => p.map((f, j) => j === i ? { ...f, ...patch } : f));
  const delFortaleza  = (i: number) => setFortalezas(p => p.filter((_, j) => j !== i));
  const fotoFortaleza = (i: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => editFortaleza(i, { foto: String(reader.result || "") });
    reader.readAsDataURL(file);
  };
  const fortalezasLimpias = () => fortalezas.filter(f => f.fortaleza.trim() || f.observacion.trim() || f.foto);

  const INP_STYLE = "w-full px-3 py-2 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#4A7AFF] transition-colors";
  const FLD = "text-[10px] text-[#94A3B8] mb-1 block";

  const modelos = Object.entries(MODELOS_INFO) as [ModeloInforme, typeof MODELOS_INFO[ModeloInforme]][];
  const modelosOrdenados = modelos.filter(([k]) => modelosSel.has(k)).map(([k]) => k);
  const incluyeGeneral = modelosSel.has("5-general");
  const incluyeEjecutivo = modelosSel.has("1-ejecutivo");
  const toggleModelo = (key: ModeloInforme) => setModelosSel(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  // Filtros detectados (legibles) — para validación previa antes de generar
  const filtrosDetectados: { label: string; valor: string }[] = (() => {
    const f = filtrosActivos;
    if (!f) return [];
    const arr: { label: string; valor: string }[] = [];
    if (f.fGranjas.length) {
      const nombres = f.fGranjas.map((id) => (granjasList ?? []).find((x:any) => x.id === id)?.nombre ?? id);
      arr.push({ label: f.fGranjas.length > 1 ? "Granjas" : "Granja", valor: nombres.join(", ") });
    }
    if (f.fAuditor) {
      const a = (auditorsList ?? []).find((x:any) => x.id === f.fAuditor);
      arr.push({ label: "Auditor", valor: a?.name ?? f.fAuditor });
    }
    if (f.fTipoRiesgo)    arr.push({ label: "Tipo de Riesgo", valor: f.fTipoRiesgo });
    if (f.fEstado)        arr.push({ label: "Estado", valor: f.fEstado });
    if (f.fDesde) arr.push({ label: "Fecha desde", valor: f.fDesde });
    if (f.fHasta) arr.push({ label: "Fecha hasta", valor: f.fHasta });
    return arr;
  })();

  async function handleGenerar() {
    if (!modelosSel.size) { setEnviado("Selecciona al menos un modelo de informe."); return; }
    setGenerando(true); setEnviado(null);
    try {
      await onGenerar(modelosOrdenados, { ...datos, fortalezas: fortalezasLimpias() }, marcoLegal || undefined);
      onClose();
    } catch(e: any) {
      setEnviado("✗ No se pudo generar el informe: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  async function handleEnviar() {
    if (!modelosSel.size) { setEnviado("Selecciona al menos un modelo de informe."); return; }
    setEnviando(true); setEnviado(null);
    try {
      await onEnviar(modelosOrdenados, { ...datos, fortalezas: fortalezasLimpias() }, descripcionCorreo, marcoLegal || undefined);
      onClose();
    } catch(e: any) {
      setEnviado("✗ No se pudo generar el informe: " + (e?.message ?? "desconocido"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4A7AFF]"/>
              Informe de Auditoría
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Pollos Savicol S.A.S. · Selecciona uno o varios modelos</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white p-1"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Filtros Detectados — validación previa */}
          <div className="rounded-xl border border-[#4A7AFF]/30 bg-[#4A7AFF]/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3.5 h-3.5 text-[#4A7AFF]"/>
              <span className="text-[11px] font-semibold text-[#4A7AFF] uppercase tracking-wider">Filtros Detectados</span>
              <span className="ml-auto text-[10px] text-[#94A3B8]">
                {typeof resultadosCount === "number" ? `${resultadosCount} registro(s)` : ""}
              </span>
            </div>
            {filtrosDetectados.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8]">
                Sin filtros activos — el informe incluirá <strong className="text-white">todos los registros</strong> visibles.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filtrosDetectados.map(f => (
                  <span key={f.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A111F] border border-[#1E2D4A] text-[10px]">
                    <span className="text-[#64748B]">{f.label}:</span>
                    <strong className="text-white">{f.valor}</strong>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[9px] text-[#64748B] mt-2">
              Los informes se generan exclusivamente con los registros que cumplen estos filtros. No se incluye información externa.
            </p>
          </div>

          {/* Datos generales del informe (formulario único, se incorpora en portada y firmas) */}
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold mb-2 block uppercase tracking-wider">Datos Generales del Informe</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <span className={FLD}>Título de la actividad de auditoría</span>
                <input value={datos.tituloActividad} onChange={e=>setD("tituloActividad", e.target.value)} className={INP_STYLE} placeholder="Ej. Auditoría de cumplimiento KPI — Granjas avícolas"/>
              </div>
              <div>
                <span className={FLD}>N° de Informe</span>
                <input value={datos.numeroInforme} onChange={e=>setD("numeroInforme", e.target.value)} className={INP_STYLE} placeholder="Ej. AU-2026-014"/>
              </div>
              <div>
                <span className={FLD}>Título / cargo</span>
                <input value={datos.oficialCumplimiento} onChange={e=>setD("oficialCumplimiento", e.target.value)} className={INP_STYLE} placeholder="Oficial de Cumplimiento"/>
              </div>
              <div>
                <span className={FLD}>Auditor 1</span>
                <input value={datos.auditor1} onChange={e=>setD("auditor1", e.target.value)} className={INP_STYLE} placeholder="Nombre del auditor principal"/>
              </div>
              <div>
                <span className={FLD}>Auditor 2</span>
                <input value={datos.auditor2} onChange={e=>setD("auditor2", e.target.value)} className={INP_STYLE} placeholder="Nombre del auditor de apoyo"/>
              </div>
              <div>
                <span className={FLD}>Fecha de visita</span>
                <input type="date" value={datos.fechaVisita} onChange={e=>setD("fechaVisita", e.target.value)} className={INP_STYLE}/>
              </div>
              <div>
                <span className={FLD}>Fecha de generación</span>
                <input type="date" value={datos.fechaGeneracion} onChange={e=>setD("fechaGeneracion", e.target.value)} className={INP_STYLE}/>
              </div>
              <div>
                <span className={FLD}>Gerente General</span>
                <input value={datos.gerenteGeneral} onChange={e=>setD("gerenteGeneral", e.target.value)} className={INP_STYLE} placeholder="Nombre del Gerente General"/>
              </div>
              <div>
                <span className={FLD}>Administrador</span>
                <input value={datos.administrador} onChange={e=>setD("administrador", e.target.value)} className={INP_STYLE} placeholder="Nombre del Administrador"/>
              </div>
              <div>
                <span className={FLD}>Técnico Veterinario <span className="text-[#475569] font-normal normal-case">(Ejecutivo)</span></span>
                <input value={datos.tecnicoVeterinario ?? ""} onChange={e=>setD("tecnicoVeterinario", e.target.value)} className={INP_STYLE} placeholder="Nombre del Técnico Veterinario"/>
              </div>
              <div>
                <span className={FLD}>Lote <span className="text-[#475569] font-normal normal-case">(Ejecutivo)</span></span>
                <input value={datos.lote ?? ""} onChange={e=>setD("lote", e.target.value)} className={INP_STYLE} placeholder="Identificación del lote"/>
              </div>
              <div>
                <span className={FLD}>Edad del Lote <span className="text-[#475569] font-normal normal-case">(Ejecutivo)</span></span>
                <input value={datos.edadLote ?? ""} onChange={e=>setD("edadLote", e.target.value)} className={INP_STYLE} placeholder="p.ej. 35 días"/>
              </div>
            </div>
            <p className="text-[9px] text-[#475569] mt-1.5 px-1">Se incorporan automáticamente en la portada y las firmas de todos los modelos seleccionados. Los campos marcados (Ejecutivo) sólo aparecen en el Informe Ejecutivo.</p>
          </div>

          {/* Selección múltiple de modelos */}
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold mb-2 block uppercase tracking-wider">Modelos de Informe <span className="text-[#475569] font-normal normal-case">(uno o varios)</span></span>
            <div className="grid grid-cols-1 gap-2">
              {modelos.map(([key, info]) => {
                const sel = modelosSel.has(key);
                return (
                  <button key={key} onClick={() => toggleModelo(key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      sel ? "border-[#4A7AFF] bg-[#4A7AFF]/10" : "border-[#1E2D4A] bg-[#0A111F] hover:border-[#2A3F6A]"
                    }`}>
                    <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-[#4A7AFF] border-[#4A7AFF]" : "border-[#2A3F6A]"}`}>
                      {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white"/>}
                    </span>
                    <span className="text-xl shrink-0">{info.icon}</span>
                    <div>
                      <div className={`text-sm font-semibold ${sel?"text-[#4A7AFF]":"text-white"}`}>{info.titulo}</div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">{info.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-[#64748B] mt-1.5 px-1">{modelosSel.size} modelo(s) seleccionado(s) · se genera/envía un PDF por cada uno.</p>
          </div>

          {/* Marco legal aplicable — solo aplica al Informe General */}
          {incluyeGeneral && (
            <div>
              <span className="text-xs text-[#94A3B8] font-semibold mb-2 block">
                Marco legal aplicable <span className="text-[#475569] font-normal">(opcional · Informe General)</span>
              </span>
              <textarea value={marcoLegal} onChange={e=>setMarcoLegal(e.target.value)}
                rows={3} className={INP_STYLE + " resize-none"}
                placeholder="Normatividad sanitaria, ambiental y de bioseguridad aplicable al alcance (ej. resoluciones ICA, decretos, normas internas)…"/>
              <p className="text-[9px] text-[#475569] mt-1 px-1">
                Se incluye textualmente en la sección "Marco Legal Aplicable" del Informe General. Si se deja vacío, el informe lo indica.
              </p>
            </div>
          )}

          {/* Fortalezas Identificadas — manual, sólo Informe Ejecutivo */}
          {incluyeEjecutivo && (
            <div>
              <span className="text-xs text-[#94A3B8] font-semibold mb-2 block">
                Fortalezas Identificadas <span className="text-[#475569] font-normal">(opcional · Informe Ejecutivo)</span>
              </span>
              <div className="space-y-2">
                {fortalezas.map((f, i) => (
                  <div key={i} className="border border-[#1E2D4A] rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B]">Fortaleza {i + 1}</span>
                      <button type="button" onClick={() => delFortaleza(i)} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <input value={f.fortaleza} onChange={e => editFortaleza(i, { fortaleza: e.target.value })} className={INP_STYLE} placeholder="Fortaleza identificada" />
                    <textarea value={f.observacion} onChange={e => editFortaleza(i, { observacion: e.target.value })} rows={2} className={INP_STYLE + " resize-none"} placeholder="Observación" />
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-[#4A7AFF] cursor-pointer hover:underline flex items-center gap-1">
                        <ImagePlus className="w-3.5 h-3.5" /> {f.foto ? "Cambiar foto" : "Agregar foto (opcional)"}
                        <input type="file" accept="image/*" className="hidden" onChange={e => fotoFortaleza(i, e.target.files?.[0])} />
                      </label>
                      {f.foto && <img src={f.foto} alt="" className="h-8 w-8 object-cover rounded border border-[#1E2D4A]" />}
                      {f.foto && <button type="button" onClick={() => editFortaleza(i, { foto: undefined })} className="text-[9px] text-[#94A3B8] hover:text-red-400">Quitar</button>}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addFortaleza} className="mt-2 px-3 py-1.5 rounded text-[11px] bg-[#1A2540] text-white flex items-center gap-1 hover:bg-[#22304d]"><Plus className="w-3 h-3" /> Agregar fortaleza</button>
              <p className="text-[9px] text-[#475569] mt-1 px-1">Aparecen en "Fortalezas Identificadas" del Informe Ejecutivo (antes de Conclusiones). Sólo si registras al menos una.</p>
            </div>
          )}

          {/* Enviar por correo */}
          <div className="border border-[#1E2D4A] rounded-xl overflow-hidden">
            <button onClick={()=>setEnviarEmail(!enviarEmail)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0A111F] transition-colors">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-400"/>
                Enviar por correo electrónico
              </span>
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${enviarEmail?"rotate-180":""}`}/>
            </button>
            {enviarEmail && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#1E2D4A] pt-3">
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Remitente (tu correo)</span>
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#0A111F] border border-[#2A3F6A] rounded-lg">
                    <span className="text-[10px] text-[#22C55E]">●</span>
                    <span className="text-xs text-white flex-1">{auditorStoreName}</span>
                    <span className="text-[10px] text-[#64748B]">{auditorStoreEmail}</span>
                  </div>
                  <p className="text-[9px] text-[#475569] mt-1 px-1">Las respuestas llegarán a este correo automáticamente</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Mensaje del correo (opcional)</span>
                  <textarea value={descripcionCorreo} onChange={e=>setDescripcionCorreo(e.target.value)}
                    rows={3} className={INP_STYLE + " resize-none"}
                    placeholder="Mensaje que acompañará los informes (podrás editarlo y agregar destinatarios, CC y CCO en el siguiente paso)…"/>
                </div>
                {enviado && (
                  <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{enviado}</div>
                )}
                <button onClick={handleEnviar} disabled={enviando || !modelosSel.size}
                  className="w-full btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center justify-center gap-2 py-2 disabled:opacity-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Bell className="w-3.5 h-3.5"/>}
                  {enviando ? "Generando informes…" : `Continuar al envío (${modelosSel.size}) →`}
                </button>
              </div>
            )}
          </div>

        </div>

        <footer className="flex items-center gap-2 px-6 py-4 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="btn-ghost text-xs flex-1">Cancelar</button>
          <button onClick={handleGenerar} disabled={generando || !modelosSel.size}
            className="btn-primary text-sm bg-[#4A7AFF] hover:bg-[#3D6AE8] flex items-center gap-2 flex-1 justify-center py-2 font-semibold disabled:opacity-50">
            {generando ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
            {generando ? "Generando…" : `Descargar PDF (${modelosSel.size})`}
          </button>
        </footer>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function KPIPage() {
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos = useGranjasStore(useShallow((s) => s.hallazgos));
  const addKPI    = useGranjasStore((s) => s.addKPI);
  const usuarios    = useGranjasStore(useShallow((s: any) => s.users ?? []));
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateKPI = useGranjasStore((s) => s.updateKPI);
  const removeKPI = useGranjasStore((s) => s.removeKPI);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingKpi, setEditingKpi]   = useState<KPI | null>(null);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen]   = useState(false);
  const [informeOpen,  setInformeOpen]  = useState(false);
  const [envioKPI, setEnvioKPI] = useState<{ b64: string; filename: string; tipo: string; asunto: string; mensaje: string; adjuntos: Array<{ name: string; content: string; type: string; size: number }> } | null>(null);

  // ── Filtros superiores ────────────────────────────────────────────────────
  const [fEstado,        setFEstado]        = useState("");
  const [fGranjas,       setFGranjas]       = useState<string[]>([]);   // multi-selección de granjas
  const [granjaMenuOpen, setGranjaMenuOpen] = useState(false);
  const [fAuditor,       setFAuditor]       = useState("");
  const [fTipoRiesgo,    setFTipoRiesgo]    = useState("");
  const [fDesde,         setFDesde]         = useState("");   // rango de Fecha Hallazgo — vacío = sin filtrar
  const [fHasta,         setFHasta]         = useState("");

  const alertsQ      = useKpiAlerts();
  const sendReminders = useSendKpiReminders();
  const totalAlerts   = alertsQ.data?.length ?? 0;

  // ── Filtrado en tiempo real ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = kpis;
    if (fEstado) list = list.filter(k => {
      const d = displayEstado(k.estado);
      return d === fEstado || k.estado === fEstado;
    });
    if (fGranjas.length) list = list.filter(k => fGranjas.includes(k.granjaId));
    if (fAuditor)  list = list.filter(k => {
      const h = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
      return h?.auditorId === fAuditor;
    });
    if (fTipoRiesgo) list = list.filter(k => {
      const h = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
      if (!h) return false;
      const riesgos: string[] = Array.isArray(h.tiposRiesgo) ? h.tiposRiesgo : [];
      return riesgos.includes(fTipoRiesgo);
    });
    if (fDesde || fHasta) list = list.filter(k => {
      const h = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
      const f = (h?.fechaVisita || "").slice(0, 10);
      if (!f) return false;
      if (fDesde && f < fDesde) return false;
      if (fHasta && f > fHasta) return false;
      return true;
    });
    return list;
  }, [kpis, hallazgos, fEstado, fGranjas, fAuditor, fTipoRiesgo, fDesde, fHasta]);

  const hayFiltros = !!(fEstado || fGranjas.length || fAuditor || fTipoRiesgo || fDesde || fHasta);

  // ── Indicadores ───────────────────────────────────────────────────────────
  const total       = kpis.length;
  const completados = kpis.filter(k => k.estado==="Completado"||k.estado==="COMPLETADO").length;
  const enCurso     = kpis.filter(k => k.estado==="En Curso"  ||k.estado==="EN_CURSO").length;
  const enEspera    = kpis.filter(k => k.estado==="En Espera" ||k.estado==="EN_ESPERA").length;
  const noIniciado  = kpis.filter(k => k.estado==="No Iniciado"||k.estado==="NO_INICIADO").length;
  const avgAvance   = total > 0 ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/total) : 0;

  const SEL = "px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none hover:border-[#2A3F6A] transition-colors cursor-pointer";

  const filtrosActivos = { fEstado, fGranjas, fAuditor, fTipoRiesgo, fDesde, fHasta };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cumplimiento KPI"
        subtitle={`${total} planes de acción · ${avgAvance}% avance promedio`}
      />

      <div className="flex-1 p-6 space-y-5">

        {/* ── Barra de acciones ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Chip Informe Auditoría — abre selector de modelos */}
            <button
              onClick={() => setInformeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4A7AFF]/15 border border-[#4A7AFF]/30 text-xs text-[#4A7AFF] hover:bg-[#4A7AFF]/25 transition-colors font-semibold"
            >
              <FileText className="w-3.5 h-3.5"/>Informe Auditoría
            </button>
            {/* Alertas */}
            <button
              onClick={() => setAlertsOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs text-[#94A3B8] hover:text-white hover:border-amber-500 transition-colors"
            >
              <Bell className="w-3.5 h-3.5"/>Alertas
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {totalAlerts}
                </span>
              )}
            </button>
          </div>
          {/* Botón principal visible */}
          <button
            onClick={() => { setEditingKpi(null); setSaveError(null); setModalOpen(true); }}
            className="btn-primary text-sm bg-amber-500 hover:bg-amber-600 flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4"/>Agregar Plan KPI
          </button>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label:"Total",        value:total,       color:"#4A7AFF" },
            { label:"Completados",  value:completados, color:"#22C55E" },
            { label:"En Curso",     value:enCurso,     color:"#F97316" },
            { label:"En Espera",    value:enEspera,    color:"#FBBF24" },
            { label:"No Iniciados", value:noIniciado,  color:"#EF4444" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-base p-4 text-center">
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs text-[#64748B] mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Barra de avance global */}
        <div className="card-base p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5"/>Avance Global
            </span>
            <span className="text-sm font-bold text-white">{avgAvance}%</span>
          </div>
          <div className="h-2 bg-[#1E2D4A] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#4A7AFF] to-[#22C55E] transition-all duration-700"
                 style={{ width:`${avgAvance}%` }}/>
          </div>
        </div>

        {/* Filtros superiores */}
        <div className="card-base p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-[#94A3B8]"/>
            <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Filtros</span>
            {hayFiltros && (
              <button
                onClick={() => { setFEstado(""); setFGranjas([]); setFAuditor(""); setFTipoRiesgo(""); setFDesde(""); setFHasta(""); }}
                className="ml-auto flex items-center gap-1 text-[10px] text-[#64748B] hover:text-white px-2 py-0.5 rounded border border-[#1E2D4A] hover:border-[#4A7AFF] transition-colors"
              >
                <X className="w-3 h-3"/>Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Estado</span>
              <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className={SEL}>
                <option value="">Todos los estados</option>
                {ESTADO_KPI.map(e=><option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5 relative">
              <span className="text-[10px] text-[#64748B] px-1">Granja</span>
              <button type="button" onClick={()=>setGranjaMenuOpen(o=>!o)} className={SEL + " flex items-center justify-between gap-2 min-w-[150px]"}>
                <span className="truncate">{fGranjas.length === 0 ? "Todas las granjas" : fGranjas.length === 1 ? (granjas.find(g=>g.id===fGranjas[0])?.nombre ?? "1 granja") : `${fGranjas.length} granjas`}</span>
                <ChevronDown className="w-3 h-3 shrink-0 text-[#64748B]"/>
              </button>
              {granjaMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={()=>setGranjaMenuOpen(false)}/>
                  <div className="absolute z-30 top-full mt-1 left-0 w-56 max-h-64 overflow-y-auto rounded-lg border border-[#1E2D4A] bg-[#0D1526] shadow-xl p-1">
                    <button type="button" onClick={()=>setFGranjas([])} className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#1A2540] flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${fGranjas.length===0 ? "bg-[#4A7AFF] border-[#4A7AFF]" : "border-[#334155]"}`}>{fGranjas.length===0 && <Check className="w-2.5 h-2.5 text-white"/>}</span>
                      <span className={fGranjas.length===0 ? "text-white" : "text-[#94A3B8]"}>Todas las granjas</span>
                    </button>
                    {granjas.map(g=>{
                      const on = fGranjas.includes(g.id);
                      return (
                        <button key={g.id} type="button" onClick={()=>setFGranjas(on ? fGranjas.filter(x=>x!==g.id) : [...fGranjas, g.id])}
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#1A2540] flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? "bg-[#4A7AFF] border-[#4A7AFF]" : "border-[#334155]"}`}>{on && <Check className="w-2.5 h-2.5 text-white"/>}</span>
                          <span className={`truncate ${on ? "text-white" : "text-[#94A3B8]"}`}>{g.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Auditor</span>
              <select value={fAuditor} onChange={e=>setFAuditor(e.target.value)} className={SEL}>
                <option value="">Todos los auditores</option>
                {AUDITORS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Tipo de Riesgo</span>
              <select value={fTipoRiesgo} onChange={e=>setFTipoRiesgo(e.target.value)} className={SEL}>
                <option value="">Todos los riesgos</option>
                {TIPO_RIESGO.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Fecha Hallazgo · Desde</span>
              <input type="date" value={fDesde} onChange={e=>setFDesde(e.target.value)}
                className={SEL + " w-36"} style={{colorScheme:"dark"}}/>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Fecha Hallazgo · Hasta</span>
              <input type="date" value={fHasta} onChange={e=>setFHasta(e.target.value)}
                className={SEL + " w-36"} style={{colorScheme:"dark"}}/>
            </div>
            <div className="flex flex-col gap-0.5 ml-auto">
              <span className="text-[10px] text-[#64748B] px-1">Resultados</span>
              <div className="px-3 py-1.5 text-xs text-[#94A3B8]">
                <span className="font-bold text-white">{filtered.length}</span> de {total}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de KPIs */}
        {filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Target className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {hayFiltros ? "Sin resultados" : "Sin planes KPI"}
            </p>
            <p className="text-[#475569] text-sm">
              {hayFiltros ? "Ajusta los filtros" : 'Clic en "Agregar Plan KPI" para crear el primero'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(k => {
              const granja   = granjas.find(g => g.id === k.granjaId);
              const hallazgo = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
              const ec = estadoColor(k.estado);

              // Parsear seguimiento compuesto (RESP:...||AUD:...||AUDNOM:...)
              const seguParts = (k.seguimiento ?? "").split("||");
              const seguResp = seguParts.find(p => p.startsWith("RESP:"))?.slice(5) ?? "";
              const seguAud  = seguParts.find(p => p.startsWith("AUD:"))?.slice(4) ?? "";
              const seguAudNombre = seguParts.find(p => p.startsWith("AUDNOM:"))?.slice(7) ?? "";

              return (
                <div key={k.id} className="card-base card-hover">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background:ec.bg, color:ec.text, border:`1px solid ${ec.border}` }}>
                          {estadoEmoji(k.estado)} {displayEstado(k.estado)}
                        </span>
                        {granja && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">
                            {granja.nombre}
                          </span>
                        )}
                        {hallazgo?.auditorNombre && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {hallazgo.auditorNombre}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-white text-sm">{k.accion}</h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Responsable: {k.responsable}
                        {k.fechaCompromiso && ` · Compromiso: ${new Date(k.fechaCompromiso).toLocaleDateString("es-CO")}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingKpi(k); setSaveError(null); setModalOpen(true); }}
                        className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white">
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`¿Eliminar KPI "${k.accion}"?`)) return;
                        try { await removeKPI(k.id); }
                        catch (e: any) { alert(formatErr(e,"Error al eliminar")); }
                      }} className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#64748B]">Avance</span>
                      <span className="text-[10px] font-bold text-white">{k.porcentajeAvance ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width:`${k.porcentajeAvance ?? 0}%`, background:ec.text }}/>
                    </div>
                  </div>

                  {/* Seguimientos */}
                  {seguResp && (
                    <p className="text-xs text-[#94A3B8] mb-1.5 leading-relaxed">
                      <span className="text-[#64748B] font-medium">Seguimiento: </span>{seguResp}
                    </p>
                  )}
                  {seguAudNombre && (
                    <p className="text-xs text-[#94A3B8] mb-1.5 leading-relaxed">
                      <span className="text-[#64748B] font-medium">Auditor de seguimiento: </span>{seguAudNombre}
                    </p>
                  )}
                  {seguAud && (
                    <p className="text-xs text-[#94A3B8] mb-1.5 leading-relaxed">
                      <span className="text-[#64748B] font-medium">Seguimiento auditor: </span>{seguAud}
                    </p>
                  )}

                  {/* Plan IA */}
                  {k.planAccionVeterinario && k.planAccionVeterinario !== "—" && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                        Plan de Acción
                      </p>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{k.planAccionVeterinario}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal selector de modelos de informe */}
      {informeOpen && (
        <SelectorInformeModal
          granjas={granjas}
          filtrosActivos={filtrosActivos}
          granjasList={granjas}
          auditorsList={AUDITORS}
          resultadosCount={filtered.length}
          onClose={() => setInformeOpen(false)}
          onGenerar={async (modelosSel, datos, marcoLegal) => {
            const auditorNombre = datos.auditor1 || usuarios?.find((u:any)=>u.role==="AUDITOR")?.name || "Auditor Interno";
            // Alcance KPI (modelos 1/3/5): hallazgos/granjas derivados de los KPIs filtrados.
            const hIds = new Set(filtered.map(k => k.hallazgoId).filter(Boolean));
            const gIds = new Set(filtered.map(k => k.granjaId).filter(Boolean));
            const hallazgosFiltrados = hallazgos.filter(h => hIds.has(h.id));
            const granjasFiltradas   = granjas.filter(g => gIds.has(g.id));
            // Alcance Hallazgos (modelo 6): TODOS los hallazgos reportados según los filtros
            // del módulo (con o sin plan KPI).
            const necesitaHallazgos = modelosSel.includes("6-hallazgos");
            const hallazgosRep = necesitaHallazgos ? hallazgos.filter(h =>
              (!fGranjas.length || fGranjas.includes(h.granjaId)) &&
              (!fAuditor    || h.auditorId === fAuditor) &&
              (!fTipoRiesgo || (Array.isArray(h.tiposRiesgo) && (h.tiposRiesgo as string[]).includes(fTipoRiesgo))) &&
              ((!fDesde || (h.fechaVisita || "").slice(0,10) >= fDesde) && (!fHasta || (h.fechaVisita || "").slice(0,10) <= fHasta))
            ) : [];
            const granjasRep = granjas.filter(g => hallazgosRep.some(h => h.granjaId === g.id));
            const allHIds = new Set<string>([...(hIds as Set<string>), ...hallazgosRep.map(h => h.id as string)]);
            const [evidenciasMap, mortalidadKPI] = await Promise.all([
              cargarEvidenciasInforme(Array.from(allHIds), accessToken),
              cargarMortalidadInforme(Array.from(gIds) as string[], accessToken),
            ]);
            const mortalidadRep = necesitaHallazgos
              ? await cargarMortalidadInforme(Array.from(new Set(hallazgosRep.map(h => h.granjaId).filter(Boolean))) as string[], accessToken)
              : mortalidadKPI;
            const fecha = new Date().toISOString().slice(0, 10);
            // Un PDF por cada modelo seleccionado.
            for (const modelo of modelosSel) {
              if (modelo === "1-ejecutivo") {
                // Informe Ejecutivo: un PDF por granja/lote del alcance (portada y lote propios).
                const lista = granjasFiltradas.length ? granjasFiltradas : [null as any];
                for (const g of lista) {
                  const kG = g ? filtered.filter((k: any) => k.granjaId === g.id) : filtered;
                  const hG = g ? hallazgosFiltrados.filter((h: any) => h.granjaId === g.id) : hallazgosFiltrados;
                  const html = htmlDeModelo(modelo, kG, hG, g ? [g] : granjasFiltradas, auditorNombre, evidenciasMap, marcoLegal, mortalidadKPI, datos);
                  const { b64 } = await htmlToPDFBase64(html, "portrait");
                  descargarPDFBase64(b64, `Informe-Ejecutivo-${(g?.nombre || "General").replace(/\s+/g, "-")}-${fecha}.pdf`);
                }
                continue;
              }
              const esH = modelo === "6-hallazgos";
              const html = htmlDeModelo(modelo, filtered, esH ? hallazgosRep : hallazgosFiltrados, esH ? granjasRep : granjasFiltradas, auditorNombre, evidenciasMap, marcoLegal, esH ? mortalidadRep : mortalidadKPI, datos);
              const { b64 } = await htmlToPDFBase64(html, modelo === "2-resumen" ? "landscape" : "portrait");
              descargarPDFBase64(b64, `Informe-${MODELOS_INFO[modelo].titulo.replace(/\s+/g, "-")}-${fecha}.pdf`);
            }
          }}
          onEnviar={async (modelosSel, datos, descripcion, marcoLegal) => {
            const auditorNombre = datos.auditor1 || usuarios?.find((u:any)=>u.role==="AUDITOR")?.name || "Auditor Interno";
            // Alcance KPI (modelos 1/3/5) y alcance Hallazgos (modelo 6, todos los reportados).
            const hIds = new Set(filtered.map(k => k.hallazgoId).filter(Boolean));
            const gIds = new Set(filtered.map(k => k.granjaId).filter(Boolean));
            const hallazgosFiltrados = hallazgos.filter(h => hIds.has(h.id));
            const granjasFiltradas   = granjas.filter(g => gIds.has(g.id));
            const necesitaHallazgos = modelosSel.includes("6-hallazgos");
            const hallazgosRep = necesitaHallazgos ? hallazgos.filter(h =>
              (!fGranjas.length || fGranjas.includes(h.granjaId)) &&
              (!fAuditor    || h.auditorId === fAuditor) &&
              (!fTipoRiesgo || (Array.isArray(h.tiposRiesgo) && (h.tiposRiesgo as string[]).includes(fTipoRiesgo))) &&
              ((!fDesde || (h.fechaVisita || "").slice(0,10) >= fDesde) && (!fHasta || (h.fechaVisita || "").slice(0,10) <= fHasta))
            ) : [];
            const granjasRep = granjas.filter(g => hallazgosRep.some(h => h.granjaId === g.id));
            const allHIds = new Set<string>([...(hIds as Set<string>), ...hallazgosRep.map(h => h.id as string)]);
            const [evidenciasMap, mortalidadKPI] = await Promise.all([
              cargarEvidenciasInforme(Array.from(allHIds), accessToken),
              cargarMortalidadInforme(Array.from(gIds) as string[], accessToken),
            ]);
            const mortalidadRep = necesitaHallazgos
              ? await cargarMortalidadInforme(Array.from(new Set(hallazgosRep.map(h => h.granjaId).filter(Boolean))) as string[], accessToken)
              : mortalidadKPI;
            const fecha = new Date().toISOString().slice(0, 10);
            // Genera el PDF de cada modelo seleccionado (mismo HTML que la descarga).
            const pdfs: { b64: string; filename: string; titulo: string }[] = [];
            for (const modelo of modelosSel) {
              if (modelo === "1-ejecutivo") {
                // Informe Ejecutivo: un PDF por granja/lote del alcance.
                const lista = granjasFiltradas.length ? granjasFiltradas : [null as any];
                for (const g of lista) {
                  const kG = g ? filtered.filter((k: any) => k.granjaId === g.id) : filtered;
                  const hG = g ? hallazgosFiltrados.filter((h: any) => h.granjaId === g.id) : hallazgosFiltrados;
                  const html = htmlDeModelo(modelo, kG, hG, g ? [g] : granjasFiltradas, auditorNombre, evidenciasMap, marcoLegal, mortalidadKPI, datos);
                  const { b64 } = await htmlToPDFBase64(html, "portrait");
                  pdfs.push({ b64, filename: `Informe-Ejecutivo-${(g?.nombre || "General").replace(/\s+/g, "-")}-${fecha}.pdf`, titulo: `Ejecutivo · ${g?.nombre || "General"}` });
                }
                continue;
              }
              const esH = modelo === "6-hallazgos";
              const html = htmlDeModelo(modelo, filtered, esH ? hallazgosRep : hallazgosFiltrados, esH ? granjasRep : granjasFiltradas, auditorNombre, evidenciasMap, marcoLegal, esH ? mortalidadRep : mortalidadKPI, datos);
              const { b64 } = await htmlToPDFBase64(html, modelo === "2-resumen" ? "landscape" : "portrait");
              pdfs.push({ b64, filename: `Informe-${MODELOS_INFO[modelo].titulo.replace(/\s+/g, "-")}-${fecha}.pdf`, titulo: MODELOS_INFO[modelo].titulo });
            }
            if (!pdfs.length) return;
            const [principal, ...resto] = pdfs;
            const titulos = pdfs.map(p => p.titulo).join(", ");
            setEnvioKPI({
              b64: principal.b64,
              filename: principal.filename,
              tipo: pdfs.length > 1 ? `KPI · ${pdfs.length} modelos` : `KPI · ${principal.titulo}`,
              asunto: `Informe de Auditoría — ${datos.tituloActividad || titulos} · Pollos Savicol S.A.S.`,
              mensaje: (descripcion?.trim() ? descripcion.trim() + "\n\n" : "") + `Cordial saludo,\n\n${pdfs.length > 1 ? `Adjunto los informes de auditoría seleccionados (${titulos})` : `Adjunto el Informe de Auditoría (${principal.titulo})`}, generado(s) con los filtros activos del módulo.\n\nQuedo atento(a) a sus comentarios.\n\n${auditorNombre}\nControl Interno y Auditoría · Pollos Savicol S.A.S.`,
              adjuntos: resto.map(p => ({ name: p.filename, content: p.b64, type: "application/pdf", size: Math.round(p.b64.length * 0.75) })),
            });
          }}
        />
      )}

      {/* Envío por correo del informe KPI (reutiliza la infra de /informes/enviar) */}
      {envioKPI && (
        <EnvioCorreoModal
          tipo={envioKPI.tipo} filename={envioKPI.filename} pdfBase64={envioKPI.b64}
          asuntoDefault={envioKPI.asunto} mensajeDefault={envioKPI.mensaje}
          adjuntosDefault={envioKPI.adjuntos}
          onClose={() => setEnvioKPI(null)}
        />
      )}

      {/* Modal KPI */}
      {modalOpen && (
        <KPIModal
          granjas={granjas}
          hallazgos={hallazgos}
          editing={editingKpi}
          error={saveError}
          accessToken={accessToken}
          onClose={() => { setModalOpen(false); setSaveError(null); }}
          onSave={async (payload) => {
            setSaveError(null);
            try {
              if (editingKpi) await updateKPI(editingKpi.id, payload);
              else            await addKPI(payload as any);
              setModalOpen(false);
            } catch (e: any) {
              setSaveError(formatErr(e, "Error al guardar el KPI"));
            }
          }}
        />
      )}

      {/* Alertas */}
      {alertsOpen && (
        <AlertsModal
          alerts={alertsQ.data ?? []}
          isLoading={alertsQ.isLoading}
          onClose={() => setAlertsOpen(false)}
          onSendReminders={async () => {
            const res = await sendReminders.mutateAsync();
            alert(`Recordatorios enviados: ${res.sent}/${res.total}`);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EvidenciasFotograficas — carga, compresión, preview y persistencia
// Reutiliza el módulo backend existente: /api/v1/evidencias/hallazgo
// ═══════════════════════════════════════════════════════════════════════════════
function EvidenciasFotograficas({ hallazgoId, accessToken, onEvidenciasChange, categoria, label }: {
  hallazgoId?: string;
  accessToken: string | null;
  onEvidenciasChange?: (evs: any[]) => void;
  categoria?: string;                 // "Seguimiento" → fotos del seguimiento; undefined → fotos del hallazgo
  label?: string;
}) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  // Separa las fotos del hallazgo de las del seguimiento (misma tabla, distinta categoría).
  const matchCat = (e: any) => categoria === "Seguimiento" ? e.categoria === "Seguimiento" : (e.categoria || "") !== "Seguimiento";
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [cargando,   setCargando]   = useState(false);
  const [subiendo,   setSubiendo]   = useState(false);
  const [errEv,      setErrEv]      = useState<string | null>(null);

  // Notificar al padre cada vez que cambian las evidencias (para el Plan IA)
  function syncEvidencias(nuevas: any[]) {
    setEvidencias(nuevas);
    onEvidenciasChange?.(nuevas);
  }

  // Cargar evidencias existentes del hallazgo (al abrir / cambiar hallazgo)
  useMemo(() => {
    if (!hallazgoId || !accessToken) { setEvidencias([]); onEvidenciasChange?.([]); return; }
    setCargando(true);
    fetch(`${API}/api/v1/evidencias/hallazgo?hallazgoId=${hallazgoId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const fotos = Array.isArray(data) ? data.filter(e => e.tipo === "Foto" && matchCat(e)) : [];
        setEvidencias(fotos);
        onEvidenciasChange?.(fotos);
      })
      .catch(() => { setEvidencias([]); onEvidenciasChange?.([]); })
      .finally(() => setCargando(false));
  }, [hallazgoId, accessToken, API]);

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!files.length) return;
    if (!hallazgoId) { setErrEv("Selecciona primero un hallazgo para asociar las fotos"); return; }
    if (!accessToken) { setErrEv("Sesión no válida"); return; }

    setSubiendo(true); setErrEv(null);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        // Compresión inteligente antes de almacenar
        const { dataUrl, sizeBytes } = await comprimirImagen(file, {
          maxDim: 1600, quality: 0.72, preferWebp: true,
        });
        const resp = await fetch(`${API}/api/v1/evidencias/hallazgo`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            hallazgoId,
            tipo:   "Foto",
            nombre: file.name.replace(/\.[^.]+$/, "") + (dataUrl.startsWith("data:image/webp") ? ".webp" : ".jpg"),
            url:    dataUrl,
            size:   sizeBytes,
            ...(categoria ? { categoria } : {}),
          }),
        });
        if (resp.ok) {
          const nueva = await resp.json();
          setEvidencias(prev => { const next = [nueva, ...prev]; onEvidenciasChange?.(next); return next; });
        } else {
          const err = await resp.json().catch(() => ({}));
          setErrEv(err?.message ?? "Error al subir una imagen");
        }
      }
    } catch (ex: any) {
      setErrEv(ex?.message ?? "Error al procesar las imágenes");
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminar(id: string) {
    if (!accessToken) return;
    const prev = evidencias;
    const optimista = evidencias.filter(x => x.id !== id);
    setEvidencias(optimista); onEvidenciasChange?.(optimista); // optimista
    try {
      const resp = await fetch(`${API}/api/v1/evidencias/hallazgo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) { setEvidencias(prev); onEvidenciasChange?.(prev); } // revertir si falla
    } catch {
      setEvidencias(prev); onEvidenciasChange?.(prev);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5"/> {label ?? "Evidencias Fotográficas Hallazgo"}
        </label>
        <label className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer
          ${hallazgoId ? "bg-[#4A7AFF]/15 text-[#4A7AFF] border-[#4A7AFF]/30 hover:bg-[#4A7AFF]/25" : "bg-[#1E2D4A]/40 text-[#475569] border-[#1E2D4A] cursor-not-allowed"}`}>
          {subiendo ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImagePlus className="w-3 h-3"/>}
          {subiendo ? "Subiendo…" : "Adjuntar fotos"}
          <input type="file" accept="image/*" multiple disabled={!hallazgoId || subiendo}
            onChange={onFilesSelected} className="hidden"/>
        </label>
      </div>

      {!hallazgoId && (
        <p className="text-[10px] text-[#475569] mb-2">Selecciona un hallazgo arriba para adjuntar evidencias fotográficas.</p>
      )}
      {errEv && <p className="text-[10px] text-red-400 mb-2">{errEv}</p>}
      {cargando && <p className="text-[10px] text-[#94A3B8] mb-2">Cargando evidencias…</p>}

      {evidencias.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {evidencias.map(ev => (
            <div key={ev.id} className="relative group rounded-lg overflow-hidden border border-[#1E2D4A] bg-[#0A111F] aspect-square">
              <img src={ev.url} alt={ev.nombre}
                className="w-full h-full object-cover"/>
              <button type="button" onClick={() => eliminar(ev.id)}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                title="Eliminar imagen">
                <Trash2 className="w-3 h-3"/>
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5">
                <p className="text-[8px] text-white/80 truncate">{(ev.size/1024).toFixed(0)} KB</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {!cargando && hallazgoId && evidencias.length === 0 && (
        <p className="text-[10px] text-[#475569]">Sin evidencias fotográficas aún.</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPIModal — formulario optimizado
// ═══════════════════════════════════════════════════════════════════════════════
function KPIModal({ granjas, hallazgos, editing, error, onClose, onSave, accessToken }: {
  granjas: any[]; hallazgos: any[];
  editing?: KPI | null; error: string | null;
  onClose: () => void; onSave: (k: Partial<KPI>) => Promise<void>;
  accessToken: string | null;
}) {
  // Normalizar estado al editar
  const normalState = (e: string) =>
    ({COMPLETADO:"Completado",EN_CURSO:"En Curso",EN_ESPERA:"En Espera",
      NO_INICIADO:"No Iniciado",ATRASADO:"Atrasado",PENDIENTE:"Pendiente"})[e] ?? e;

  // Parsear seguimiento guardado (RESP:...||AUD:...||AUDNOM:...)
  const [initSeguResp, initSeguAud, initSeguAudNombre] = (() => {
    const s = editing?.seguimiento ?? "";
    const [a, b, c] = s.split("||");
    return [a?.replace(/^RESP:/,"") ?? "", b?.replace(/^AUD:/,"") ?? "", c?.replace(/^AUDNOM:/,"") ?? ""];
  })();

  const [form, setForm] = useState<Partial<KPI>>(editing ? {
    granjaId:              editing.granjaId,
    hallazgoId:            editing.hallazgoId,
    accion:                editing.accion,
    fechaCompromiso:       editing.fechaCompromiso?.slice(0,10) ?? "",
    fechaProximaVisita:    editing.fechaProximaVisita?.slice(0,10),
    fechaCumplimiento:     editing.fechaCumplimiento?.slice(0,10),
    planAccionVeterinario: editing.planAccionVeterinario,
    estado:                normalState(editing.estado),
    responsable:           editing.responsable,
    porcentajeAvance:      editing.porcentajeAvance,
    fechaSeguimiento:      editing.fechaSeguimiento?.slice(0,10),
  } : {
    granjaId:              granjas[0]?.id ?? "",
    accion:                "",
    fechaCompromiso:       new Date(Date.now()+30*86400000).toISOString().slice(0,10),
    planAccionVeterinario: "",
    estado:                "No Iniciado",
    responsable:           "",
    porcentajeAvance:      0,
  });

  const [seguResp,  setSeguResp]   = useState(initSeguResp);
  const [seguAud,   setSeguAud]    = useState(initSeguAud);
  const [seguAudNombre, setSeguAudNombre] = useState(initSeguAudNombre);
  const [calAuditor, setCalAuditor] = useState(editing ? normalState(editing.estado) : "En Curso");
  const [generando,  setGenerando]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // Evidencias fotográficas actuales del hallazgo (para enviar a la IA)
  const [evidenciasActuales, setEvidenciasActuales] = useState<any[]>([]);

  // Hallazgos de la granja seleccionada
  const hallazgosGranja = hallazgos.filter(h => h.granjaId === form.granjaId);
  const hallazgoSel     = hallazgosGranja.find(h => h.id === form.hallazgoId);
  const granjaSel       = granjas.find(g => g.id === form.granjaId);

  // Auditor del hallazgo seleccionado
  const auditorNombre = hallazgoSel?.auditorNombre ?? "";

  function onGranjaChange(id: string) {
    setForm(f => ({ ...f, granjaId: id, hallazgoId: undefined }));
  }
  function onHallazgoChange(id: string) {
    const h = hallazgos.find(hh => hh.id === id);
    // Autocompletar "Hallazgo / Acción" con la descripción COMPLETA del hallazgo.
    // El título se mantiene como referencia visual (campo Hallazgo arriba).
    // La IA recibirá esta descripción real como contexto principal.
    let textoAccion = "";
    if (h) {
      const partes: string[] = [];
      if (h.titulo)      partes.push(h.titulo.trim());
      if (h.descripcion && h.descripcion.trim() && h.descripcion.trim() !== h.titulo?.trim())
        partes.push(h.descripcion.trim());
      // Observaciones / recomendaciones registradas en el hallazgo original
      if (h.recomendacionesIA && h.recomendacionesIA.trim())
        partes.push(`Observaciones: ${h.recomendacionesIA.trim()}`);
      textoAccion = partes.join(" — ");
    }
    setForm(f => ({
      ...f,
      hallazgoId: id || undefined,
      // Rellenar con la descripción completa del hallazgo (sobrescribe título previo)
      accion: textoAccion || f.accion || h?.titulo || "",
    }));
  }

  async function handleGenerarPlanIA() {
    if (!form.accion?.trim()) { setLocalError("Escribe primero el hallazgo/acción"); return; }
    setGenerando(true); setLocalError(null);
    try {
      const tipoRiesgo = hallazgoSel?.tiposRiesgo?.[0] ?? "Operativo";
      const estadoH    = hallazgoSel?.estado ?? "Abierto";

      // Convertir evidencias (data URI) al formato multimodal de Anthropic.
      // Máx 4 imágenes para controlar tokens. Solo formatos soportados.
      const evidenciasIA = (evidenciasActuales || [])
        .slice(0, 4)
        .map((ev: any) => {
          const url: string = ev?.url ?? "";
          const m = url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
          if (!m) return null;
          return { mediaType: m[1], data: m[2] };
        })
        .filter(Boolean) as { mediaType: string; data: string }[];

      const plan = await generarPlanIA(
        form.accion, tipoRiesgo, estadoH,
        granjaSel?.nombre ?? "Granja",
        hallazgoSel?.descripcion,
        {
          auditor:    hallazgoSel?.auditorNombre,
          categoria:  hallazgoSel?.categoria,
          criticidad: hallazgoSel?.criticidad,
          evidencias: evidenciasIA,
        }
      );
      setForm(f => ({ ...f, planAccionVeterinario: plan }));
    } catch (e: any) {
      setLocalError("Error: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLocalError(null);
    if (!form.granjaId)            { setLocalError("Selecciona una granja"); return; }
    if (!form.accion?.trim())      { setLocalError("La acción es obligatoria"); return; }
    if (!form.responsable?.trim()) { setLocalError("Asigna un responsable"); return; }
    if (!form.fechaCompromiso)     { setLocalError("Fecha compromiso es obligatoria"); return; }

    // Componer seguimiento compuesto: "RESP:...||AUD:...||AUDNOM:...".
    // RESP y AUD se emiten siempre (posiciones estables para los parsers de informe);
    // AUDNOM (nombre del auditor que hace el seguimiento) solo si tiene contenido.
    const seguAnyContent = !!(seguResp.trim() || seguAud.trim() || seguAudNombre.trim());
    const seguParts = [`RESP:${seguResp.trim()}`, `AUD:${seguAud.trim()}`];
    if (seguAudNombre.trim()) seguParts.push(`AUDNOM:${seguAudNombre.trim()}`);
    const seguimientoCompuesto = seguAnyContent ? seguParts.join("||") : "";

    const payload: Partial<KPI> = {
      ...form,
      accion:                form.accion!.trim(),
      seguimiento:           seguimientoCompuesto || "—",
      responsable:           form.responsable!.trim(),
      planAccionVeterinario: form.planAccionVeterinario?.trim() || "—",
      porcentajeAvance:      Math.max(0, Math.min(100, form.porcentajeAvance ?? 0)),
      // calificacionAuditor se refleja en el estado
      estado:                calAuditor as any,
    };

    setSubmitting(true);
    try { await onSave(payload); }
    catch { /* error en banner padre */ }
    finally { setSubmitting(false); }
  }

  const INP = "input-base";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">
              {editing ? "Editar Plan KPI" : "Agregar Plan KPI"}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Formulario inteligente · Genera el plan automáticamente · Semaforización automática
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── INFORMACIÓN BASE ── */}
          <Section label="Información Base"/>
          <div className="grid grid-cols-2 gap-3">
            <FF label="Granja *">
              <select value={form.granjaId} onChange={e=>onGranjaChange(e.target.value)} className={INP}>
                {granjas.length === 0
                  ? <option value="">(sin granjas)</option>
                  : granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)
                }
              </select>
            </FF>
            <FF label="Tipo de Producción">
              <input value={granjaSel?.tipoOperativo ?? "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
            <FF label="Responsable *">
              <input value={form.responsable ?? ""} onChange={e=>setForm({...form,responsable:e.target.value})}
                className={INP} placeholder="Nombre del responsable" required/>
            </FF>
            <FF label="Tipo de Granja">
              <input value={granjaSel?.tipoGranja ?? "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
          </div>

          {/* ── HALLAZGO ASOCIADO ── */}
          <Section label="Hallazgo Asociado"/>
          <div className="grid grid-cols-2 gap-3">
            <FF label="Hallazgo">
              <select value={form.hallazgoId ?? ""} onChange={e=>onHallazgoChange(e.target.value)} className={INP}>
                <option value="">(sin hallazgo)</option>
                {hallazgosGranja.map(h=>(
                  <option key={h.id} value={h.id}>{h.titulo?.slice(0,40)}</option>
                ))}
              </select>
            </FF>
            <FF label="Auditor">
              <input value={auditorNombre || "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
            <FF label="Estado Hallazgo">
              <input value={hallazgoSel?.estado ?? "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
            <FF label="Tipo de Riesgo">
              <input value={hallazgoSel?.tiposRiesgo?.join(", ") ?? "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
            <FF label="Fecha Hallazgo">
              <input value={hallazgoSel?.fechaVisita?.slice(0,10) ?? "—"} readOnly className={INP+" opacity-60"}/>
            </FF>
          </div>

          {/* ── EVIDENCIAS FOTOGRÁFICAS ── */}
          <EvidenciasFotograficas hallazgoId={form.hallazgoId} accessToken={accessToken}
            onEvidenciasChange={setEvidenciasActuales}/>

          {/* ── PLAN DE ACCIÓN ── */}
          <Section label="Plan de Acción"/>
          <FF label="Hallazgo / Acción *">
            <textarea value={form.accion ?? ""} onChange={e=>setForm({...form,accion:e.target.value})}
              rows={3} className={INP+" resize-y"}
              placeholder="Descripción completa del hallazgo a corregir (se autocompleta al seleccionar un hallazgo)" required/>
          </FF>

          <FF label="Plan de Acción">
            <div className="relative">
              <textarea value={form.planAccionVeterinario ?? ""}
                onChange={e=>setForm({...form,planAccionVeterinario:e.target.value})}
                rows={3} className={INP+" resize-none pb-10"}
                placeholder="Escribe el plan o genéralo automáticamente (máx. 80 palabras)…"/>
              <button type="button" onClick={handleGenerarPlanIA} disabled={generando}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50">
                {generando
                  ? <><Loader2 className="w-3 h-3 animate-spin"/>Generando…</>
                  : <><Sparkles className="w-3 h-3"/>Generar Plan{evidenciasActuales.length > 0 ? ` (${Math.min(evidenciasActuales.length,4)} fotos)` : ""}</>
                }
              </button>
            </div>
            {evidenciasActuales.length > 0 && (
              <p className="text-[10px] text-[#4A7AFF] mt-1">
                Se analizarán {Math.min(evidenciasActuales.length, 4)} evidencia(s) fotográfica(s) del hallazgo.
              </p>
            )}
          </FF>

          {/* ── SEGUIMIENTO ── */}
          <Section label="Seguimiento y Calificación"/>
          <FF label="Seguimiento Responsable">
            <textarea value={seguResp} onChange={e=>setSeguResp(e.target.value)}
              rows={2} className={INP+" resize-none"}
              placeholder="Observaciones del responsable sobre el avance…"/>
          </FF>
          {/* Evidencias fotográficas del seguimiento (trazabilidad del hallazgo) */}
          <EvidenciasFotograficas hallazgoId={form.hallazgoId} accessToken={accessToken}
            categoria="Seguimiento" label="Evidencias Fotográficas del Seguimiento"/>
          <FF label="Fecha de Seguimiento">
            <input type="date" value={form.fechaSeguimiento ?? ""}
              onChange={e=>setForm({...form,fechaSeguimiento:e.target.value})} className={INP} style={{colorScheme:"dark"}}/>
          </FF>
          <FF label="Auditor que realiza el seguimiento">
            <input value={seguAudNombre} onChange={e=>setSeguAudNombre(e.target.value)}
              list="auditores-seguimiento" className={INP}
              placeholder="Nombre del auditor que realiza el seguimiento del hallazgo…"/>
            <datalist id="auditores-seguimiento">
              {AUDITORS.map(a => <option key={a.id} value={a.name} />)}
            </datalist>
          </FF>
          <FF label="Seguimiento Auditor">
            <textarea value={seguAud} onChange={e=>setSeguAud(e.target.value)}
              rows={2} className={INP+" resize-none"}
              placeholder="Observaciones del auditor durante la validación…"/>
          </FF>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Calificación Auditor">
              <select value={calAuditor} onChange={e=>{ setCalAuditor(e.target.value); setForm(f=>({...f,estado:e.target.value as any})); }} className={INP}>
                {CALIFICACION_AUDITOR.map(c=><option key={c}>{c}</option>)}
              </select>
            </FF>
            <FF label="% Avance">
              <div className="space-y-1.5">
                <input type="range" min={0} max={100} value={form.porcentajeAvance ?? 0}
                  onChange={e=>setForm({...form,porcentajeAvance:parseInt(e.target.value)||0})}
                  className="w-full accent-amber-500"/>
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>0%</span><span className="font-bold text-white">{form.porcentajeAvance ?? 0}%</span><span>100%</span>
                </div>
              </div>
            </FF>
            <FF label="Fecha Compromiso *">
              <input type="date" value={form.fechaCompromiso ?? ""} required
                onChange={e=>setForm({...form,fechaCompromiso:e.target.value})} className={INP} style={{colorScheme:"dark"}}/>
            </FF>
            <FF label="Fecha Próxima Visita">
              <input type="date" value={form.fechaProximaVisita ?? ""}
                onChange={e=>setForm({...form,fechaProximaVisita:e.target.value})} className={INP} style={{colorScheme:"dark"}}/>
            </FF>
            {editing && (
              <FF label="Fecha Cumplimiento">
                <input type="date" value={form.fechaCumplimiento ?? ""}
                  onChange={e=>setForm({...form,fechaCumplimiento:e.target.value})} className={INP} style={{colorScheme:"dark"}}/>
              </FF>
            )}
          </div>

        </form>

        {(localError || error) && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
            <span>{localError ?? error}</span>
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={submitting}>Cancelar</button>
          <button type="submit" onClick={submit} disabled={submitting}
            className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50">
            {submitting && <Loader2 className="w-3 h-3 animate-spin"/>}
            {submitting ? "Guardando..." : editing ? "Actualizar KPI" : "Agregar Plan KPI"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#1E2D4A] pb-2">{label}</div>;
}
function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function AlertsModal({ alerts, isLoading, onClose, onSendReminders }: {
  alerts: any[]; isLoading: boolean;
  onClose: () => void; onSendReminders: () => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg flex flex-col shadow-card max-h-[80vh]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-bold text-white text-base">Alertas KPI</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#94A3B8]"/></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading && <p className="text-center text-[#94A3B8] text-sm py-8">Cargando alertas…</p>}
          {!isLoading && alerts.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2"/>
              <p className="text-sm text-[#94A3B8]">Sin alertas activas</p>
            </div>
          )}
          {alerts.map((a: any, idx: number) => (
            <div key={idx} className="p-3 rounded-lg bg-[#0A111F] border border-[#1E2D4A]">
              <p className="text-xs font-semibold text-white">{a.accion?.slice(0,50)}</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">{a.granjaNombre} · {a.responsable}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                {a.severity}
              </span>
            </div>
          ))}
        </div>
        <footer className="flex justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="btn-ghost text-xs">Cerrar</button>
          <button disabled={sending} onClick={async()=>{setSending(true);try{await onSendReminders();}finally{setSending(false);}}}
            className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 disabled:opacity-50">
            {sending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Bell className="w-3 h-3"/>}
            Enviar Recordatorios
          </button>
        </footer>
      </div>
    </div>
  );
}
