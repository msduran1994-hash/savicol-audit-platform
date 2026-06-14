"use client";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useAuthStore } from "@/store/auth.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { KPI } from "@/lib/granjas.types";
import {
  Target, Plus, Filter, X, Trash2, Edit2, AlertCircle,
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
  nombreGranja: string, descripcionHallazgo?: string
): Promise<string> {
  // Usa la API Route de Next.js como proxy seguro (sin CORS, sin exponer API key)
  const response = await fetch("/api/ai/generar-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion, tipoRiesgo, estadoHallazgo, nombreGranja, descripcionHallazgo,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error ?? `Error ${response.status} al generar el plan IA`);
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
  nit:       "901.XXX.XXX-X",
  ciudad:    "Bogotá D.C., Colombia",
  telefono:  "+57 (1) XXX XXXX",
  email:     "auditoria@savicol.com.co",
  web:       "www.savicol.com.co",
  area:      "Control Interno y Auditoría",
  color1:    "#C41230",  // rojo Savicol
  color2:    "#0D1526",  // azul oscuro
  color3:    "#F59E0B",  // amber
};

export type ModeloInforme = "1-ejecutivo" | "2-tecnico" | "3-dashboard" | "4-granja" | "5-general";

export const MODELOS_INFO: Record<ModeloInforme, { titulo: string; desc: string; icon: string }> = {
  "1-ejecutivo": { titulo: "Ejecutivo Corporativo",    desc: "Resumen conciso para Gerencia General",         icon: "🔷" },
  "2-tecnico":   { titulo: "Técnico Detallado",        desc: "Tablas y evidencias para Comité de Auditoría",  icon: "🔶" },
  "3-dashboard": { titulo: "Dashboard Visual",          desc: "Gráficos dinámicos para Junta Directiva",       icon: "🔵" },
  "4-granja":    { titulo: "Informe por Granja",        desc: "Ficha técnica individual por granja evaluada",  icon: "🟢" },
  "5-general":   { titulo: "Informe General Completo",  desc: "Combinación de los 4 modelos — versión máxima", icon: "⭐" },
};

// ─── Utilidades ───────────────────────────────────────────────────────────────
function fmtFecha(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" });
}
function fmtFechaCorta(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO");
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
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a202c;font-size:12px;background:#fff}
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
.section-title{font-size:14px;font-weight:700;color:#0D1526;margin:0 0 16px;
  display:flex;align-items:center;gap:8px}
.section-title::before{content:'';display:block;width:4px;height:18px;
  background:linear-gradient(#C41230,#F59E0B);border-radius:2px}

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
table{width:100%;border-collapse:collapse;font-size:11px}
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
.plan-box-text{font-size:11px;color:#78350f;line-height:1.6}

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

@media print{
  .no-print{display:none}
  .page{max-width:100%}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
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

// ─── PORTADA COMPARTIDA ───────────────────────────────────────────────────────
function portada(titulo: string, subtitulo: string, kpis: any[], hallazgos: any[], auditor: string, granjaFiltro?: string): string {
  const fecha = fmtFecha(new Date().toISOString());
  const pct   = porcentaje(kpis);
  return `
  <div class="cover">
    <div class="logo-box">
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABUCAIAAABROcMSAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAc4klEQVR42s17aZgWxdX2Oaeqt2ebmWdWhoEREBgWFxQFNQKixIUIUYOKCS4kuUzyJa9LQOPu9+mbGLeocYnLiyZEFuOCGkVc4oIYJEQdRBgXFgeYYfaZZ+/uqjrfjwcIGgUJyXtZV/+Yqe6uvvv0OXedOnU/CACIyMyLFi2aOHGi53lCCPg6NaVUOp1evHjx3LlzicgYI3edGzJkSC6XmzdvnpTSGLOfT0LEoi2YeX8GYWat9Zw5c+rq6oo9/zgHAI2NjYsXL4avZWtubl60aBEAFL1A7v5anudJKYUQWusdnQC8j8YhxCAI6urqYrHY1q1bM5mMFFLIf4y5r5YGAMuydu+Xu//DzEqp4hfZHTICEMBenokADBZRYMycSy+56pprPS+yadPGhQsevf2uOzJ9GSmk0hqB+bOWIEADAMjIAJ+10S7QX+BjRfdYs2bN008/vesTFE84QAIBCSQgIAF86SFQ2CgFQFVNbTqfZWbNO9r76xuPOmo8AFhSCgQg3P1GiSgAAYEAkADw88AAoKWlZXf3oD0Zj5nRMBCAMEXI+KWHQGDJDOBFbDagAz+zvino6/YBRjcc/PILyyZNnhgq5ZAUBne/0UgWCARgAxF8JeKiPboUBAQM5Bk0ZAwYw196BEaHho1lfbp587uNa4S0C/n0pktv6Hvo96HKuInE008+fdihY3NaaYLP3BvKkNEA+GTQ8FeJIbmHc4KBNTKwT7qS5EBph2wAEBB2eiYigmaO2G7VwYe8/87qmryfkdZrv5834ajxFYcdkfh5vHnGbP/FpRV33pzoN3D+o/NnTTiWUunAFsBcDASDLJgJxTouFEJGs3fYewKtCImBwCiECdGSu6qHBEGfBdpWFJI0AMQMCEgUprLxM76l7vxV+vYF6u3X1KNLUtNmxE+ZYo9s6P/o3W0TvtN19oWVC+4dObJhyRVX6xtvt5MxDBkBNDIDIFIBnTNamxpNAQH3au09+zSJopdotFmXdWyrSWcjRhJDTPlR7Ud0GFFhJAxiQncufqpy1Jj6R3878Kn5yZ//uPW++3LvvQPGRA49NHL+GfbyFS2/uEb7Qc2MbztVZV4h67GKqjCiw4hWURVGTNYwA/BX4dg9gzaG2SAAcMFy09On95T383v6tG0ABDBpBI2ggMFzIhu3pd54XbGxDjq05vr/W3/fXfm81oUQtLHGHu7Fo96zr7c99HtrYL05Yixnw0CiLxgZDIJG0Luzxn6BRjYINhAA4PhDqh6+J7r4ATVzmkrloZABCxERd7A4uTmV+3ujg9T1l9WF1m1uXV3ZUUeQ1CgkpnryoCNxK7zjvrCrPXLMWK0YEQAZARkAYV8g74U9GIBBIwHAEROOA2adKMMTTnLuuLHv8LFBbxZ8HwkB0QBry9gfNgOAXeNt+tllqWUvqHTG2JHsmjWF+Y+Rl/AdJ9ryaXreYzh4YE6iMCAZDJEWtG+Q98IeAIbIGAaE478xERBj9XXh23/v/PPLyemn4rjDCy++6nyyGS2Nrm2znwsLmrl05KhMZbJzxkxnzNgwkXTXrXHTGXajSocxz0k9+RwMPt+LxiwTKoUUBkIYRNARzyDBVzP5nkAbAEAyOhwyZHDDwaOVUchcNfN0mXDbfnKJO2qEc9zRZvSQ4P0PIttTfZBwDjuCEDWAO368++hT4qNNKvxQOA45UdsXYKEf8ZxNn8Aba/ORRK5nk105IKgoZ7btMBPf2i4ZAIF5f0ELAWgA+lf1i8diCoDIBCqfnHqKeMBKz7zQXflefki9U1IdlJfbB49JzvxmGOa5N+2/uFzalmXZthS+RAStBbO2hVHG0ebPj+nKyuhVtyQmHY/9a9CSfff/rve6m7UACPfbPQDAGE0CV/7tb3dfefUPZl9AtUkrUmYASk6coud+37/tLtn6qdi0TUcBt7R1vvZ61ovIVNpq22J7VkHkBaCbAh3mAwykjEPUgrzJDq+r/uM9Xn0DAORat4lsunDnYo+sYgjhfoM2jCxZBNo88+ubznz8WV1erfrXiob6iov/K3rOrOCBxV7QHUQ9gMDu7MaOgmsI0WbX1iS8bJA2JtcwPHLQqIgb79u43np/jcEwee21bn1DbuNH2265J3bCCeLtN5xPm0xVBRTJ9Stkw7S3dFMAaQBTlihL+LnYxqbIkqfyjz+njC+MLbQMSAhN0hBYRLbLXsQ4NqOEbCFfU+nce1vtiheSv7st/OZYkYjITAFGNMSnTOz50+OtJ55kvftR2YD6/JN/tkpjinUxiPbfPZh2ZAIsjZbGaw8y/skT6+/8rV1Vu+WyK71Mq4hHISQWxEwArKRBDCOpbGpIQ/KR+9wRDdnlyzuuv8VZvdKybNZMFf3aH17kX3ZVWV+vuOZ76b+vtLZ3ckUF8M65kPd7ciEAMISIKgi6RWD9/KIhS56SddUtP7/SmrdAJDxmAqnYDmwRMCiZzVr5sLuituR/7nJGNPQ9+GjXmee6696Jl5bZkQjEMPLOX/Haa0tkvufAId43xmffeF04NjDvE1Xv0dIMGsgiUEbpwQfG591rjzs61/RJ5w/Psxs/irvl+YJCFYLKKlBoMJ2sjB3cAH/bVPKLy6OjD+p94gn/8isSnpXWoifEGIBybOOTcUGnCpHTjpO1dbF1m4TjGgQAJKJ/A2gEACLFqrqq8sannvCGDfGNyW7epDLaHjKgWwtL2Fgey9dWewOG04GD+x13TGbZc53yzeHfPd1v+qjz6usqXQq08H52bnzGrO5f/nfimWX5uGsFnPNKS8/7NluyYKHdlZalUSDIFHL/BtAMIAmVMsccc0zDsCGhHziOVX3SlKpJE4NcGlAIECIijOMJQADoXb2q/cbb6/7nAbBk5y13xlt7VIXLfUqUlxfefNO88XYQFYihyuVo2jR73NEIUPG72/rufaSjuZnD8KgD6lref7eQze4vT4MOEXHlO+9s62qrLa/2VShISMd23PLilGkMCAAG6FiwKPjZ1WXjDklMmZRd9Te99KVYPBGEyrKILr+ZMYh5bsGxLC0tKybWNvZNPoHj1ZnxR8rzZ9UfOhItq3zO1frdVUSozf7k0wiKjUDR8mnz1eedb9JpR1qCiBkMgwIgAEGQX79uy48v0Rdf7YVt9uyZgNj98Hy70GMxOoGlJHOJUKVR3/Iivm1AhQ5mWjvybT1hVVlixOCqg8e4jrv9oquevPfOIAzA8H5amgiZ0RDKzhdf3XLOT0p+dIF9zKF2NCpDE/Z2ZNd9nH72JfX8Mq+rw3Os3uHD+33zpEJrM/7lddeNZoRSklxlFFoisAQyk7EDv2/kiNg1c0snn1A0mN/R2vzDK8TLy6qjkS05H8HslfbknhmPgBmNYVMSiVb+bXnH239xBg6SiRKfjOnskdva7LDgRV2rJOF39znHHmclYuknFlttbVySJKMirMhAIEAL3zY6EEDkuh99Gv7yzo7VjaaqCrd0Bk8/kfi4OVuZ9LemgA3vfbW1l0BUCqTQCGAKjOhFS0Ift2w1qtlDEFKCa3HEZmOU1qFtJU45DgD6Xl6RIGDWxMyAioCYAVChJAMMLFHzu+8Fq1aBIDQm4kWgNAKhBjZfWJbZ90D8bCZiGNG2wUEEMMzADJoBEQu+HjLQPXpCoWO7/fd3HJkIipWhL65DAUQ9B6PIwMia2RgDX5mk95p7fJH1mcEYMGZX5otEyve98eNEJJZ+83XZ3hq4Nu/t/VlrYzRrDfteVt1X0F/k+oYDW4rjJyKAeW0lGNQixP2o8P5HQTMxAQKEBd2/f+SYo8JCQb3TyJ5naYXw9QPNAIyskViACgpizGF2sly//wFs3CRsGw3+ByH/y6ARgBEMMQH4bMcnfAMB0m+8JTMFh+ErL0H+xSb/9Ts1EoMBpatqrEkTgE24YrklpUKjCYWBr6NPGwQjMSgU6NjDvEF1+abNZk2jazsKtTCE/0lL/8ugUSMzcCi8xFmnAkD65RdlR8Z3yQlRMPPXMBARAFHqXFocNiY6cbIpFArPPR8lW4MhRv8/vKf3L7OHscHxjXJnTCM7knrtDXv1eyohnNAoAkb8OoJGJC7kgkFDot86CQznFz8udZCzUCMCoDTm60h5QOT7PfbUk6ya6uwH69Srr4toPJ4TBgR+tsa8i7EZ/m2xSfvix2jIIKClLWNUkCxLnPltAOhd8CenJ0MkGBUA+CSJgcmEUjOiNGiIDRKjICNCEsU1/v8GaATQCAwYkgltg+ksf+PY2OiD/M1bzLNPyZgXoCESDiMyChCWEgCWNFiQaAQ4oBwT+E7oYEio/zctzZYWCMAUaOHGv3s2AnY9/Ah9vI4I0Zh8KhcWsjFVKIS+EcbNhgYKDoTYF6g+36C0stpP58HsLx3uSxbLBljYLDlTyI8Zk5g8Kbv54/wrf41Mm5mPl7GyxemnZI46pACWHjrYB20GDwpK4pnAwHHfMNNO6GarMLheTj3Od539zAHl3skNARiIgRFyNnuIoTLR751GttP9/25NHDMm/63ptG510JPyKgeUlsvuASsqDz+k+7JfuhfPlg8/TqOr9MxvUb4Qrz1QHH9YoWmzWv6+DYaxuCvHXEwIkfHfYmkCIZCRiomGRkO2Qd/Ph6MOKp15Rt/qt9KPL3PiZRAEqU8280EH9d18k//uh3r4GJXLZnQOUPjpHho3qu9Pj/fN+6N1WF3Xwmfs4cNEbZkO2aAwIAwIYGGHBAyACEBfBfteijXEgJoBNAEZgZ7JFNJA/+dHQtq5y35dHqSFyOSXPJa8+48RL57/9c12vjv841Pezy6Mn/9dTAXehefkVm6oOWs6GxE895KbKEO3VJZEhQkRJBQ3OlloIQQLhQSIX2Ufcc+gWSGQBNBMRvaKSCbfRceMGTrzjI3X3hC8tzpRVbb10acwb1RtWfMjvw/efo862kq3bd1wYycgpV5azrWJ6EctW9euYrSdD9ebg+pzb63ElmYrGmVmIEEMwhhfUkAaWe1V6rB30FIgIToMeeRlfk/TtnxXwf/rnb9ZuGjxFTdcLx1psmBvB2NMSGgQvS0bSDhMGK741Ahpsw7XMUlBzeuYhOs4+de2KWPIssGwEIIQASEEAM0Oq43GFmgjarM3ZYjcg0BEaQ0AAQAApCynsZD77W/vfn/jlnNmng0kINRgdo6uCYBAEGgfNAII0AoAAB0osrLRkN9ZXwwDIIQg/FwAEQhjgt1lHvsWiETEzLNnz160aNE999wzatQoU/AvufjiZFnJrbfddN1117lSEJuaqurrrrmmJJEgBEGGDF82Z+6QwYNiUfcXl18ei8UIAgjVoEEH3HXnHYsXLbryyisqKyqkEGD4uEmTHnn44UULF954ww3lySQxMgdHjR//4x//uAhgr9nPZ0Qqtm0DwHnnndfa2jp79uybb775/PPPP/PMM2+88UYAePXVV5l5woQJABCNRnt6es4+++ziOIccckg2m00mk/X19X19fTU1NQDQ0NDQ1tY2b9682Rdc8MILL8ydOxcAZs+e3dvbe9VVV82aNWv58uXr1q0rKSkBgDlz5jStb9oF+stEKl8A2nVdAJg3b96SJUuKF5x22mknnngiAIwbN+7NN9988MEHFyxYUDx1xx13PPvss8VBfvWrXz355JMAMHTo0E2bNlXXVAPAs88+W3xescWiUdu2W1tbZ82atauztbX1Jz/5CQBcdNFFK1eu3Cvoz3yFoicFQQAADzzwwMknn/z888/PmDHjueeeW7ZsGSLOmjXr7bffvummm0488cTS0lIAWLBgwbhx45LJJDNPnTp14cKFxSdJKVWoAGDMmDHz588XQjiOI6XMZLNDhw4VQixdulRKWTTQK6+8cvTRRxexfhVVIO2OWErpeV5VVVVNTU1TU9PEiROVUvfff//ZZ58thLAsa9KkSUuWLNmwYcP27dtPPfVURFy9enV3d/eUKVPq6+vj8fjSpUv/odva2QqFQrETEYUQsVjM931jjNaamYUQuVzOcZzd3RX3uIz4DGhEJKJMJtPd3d3b27ty5cpp06ZdeeWVv/nNb7TW48aNGz58+LXXXvv8888nk8nTTz+dmY0xTz/99NSpU88444y33nork8kAgDGmOBoAKKXq6+uL6sQwDLXWLS0tiUSitLS0+CZa61GjRjU1Ne3cbjX//NpfGoiNjY1FJxZCIOL06dOHDRsmpbzooos2b94MAAsXLpw/f/6gQYMGDx48ZcqUVCo1cOBAABg9evSWLVuam5uPP/744oCDBg1qaWkpBuL111/f0dExYsQI13WPP/74GTNmIOKqVaueeeaZkpISKeWsWbMKhcKwYcMA4NJLL127dm08Hi8rK3Nddx8Csajcu+GGGz7++ONVq1Z9/PHHkydPtm173bp1Rc8rthUrVlx44YXFv1988cX169cLIYoBNHDgwDVr1lRUVBS56KGHHtq8efNbb721du3a008/HRGHDh26YsWKtWvXrl69+sMPP5w+fXpxnO985ztbt2594403Vq9ePWfOnF0o9wT6mWeeEULYtl3EPWDAgCOPPDIejwOA53m1tbW2bTuO4ziObdvl5eVVVVWWZVmWlUwmKyoqijcWR+jXr5/rusXri0ONHj3a8zwA2OW+I0eOHDt2bDEWPc+zLMt13YqKitra2v79+yeTSSllUZH5paAbGxsfe+wx+Fq2LVu2fLHWNAzDSZMm/eEPf5BSFrnvc8rcz82uxVfddQo+W8X/54v/WeRb9KXPde7OG8V+Y0xtbe3uQuN/gN60adOAAQOmT59ORF8rMyul2tvbW1tbP7MrW3y/aDRKREqp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" alt="Pollos Savicol" style="width:52px;height:72px;object-fit:contain;border-radius:4px"/>
      <div>
        <div class="company-name">Pollos Savicol S.A.S.</div>
        <div class="company-sub">NIT: 860.403.972 · Control Interno y Auditoria</div>
      </div>
    </div>
    <h1>${titulo}</h1>
    <h2>${subtitulo}</h2>
    ${granjaFiltro ? `<p style="color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:4px">Granja: <strong style="color:white">${granjaFiltro}</strong></p>` : ""}
    <div><span class="confidencial">CONFIDENCIAL</span></div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Fecha de Generación</div>
        <div class="cover-meta-value">${fecha}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Auditor Responsable</div>
        <div class="cover-meta-value">${auditor || "Equipo de Auditoría"}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Avance Global KPI</div>
        <div class="cover-meta-value">${pct}% · ${kpis.length} planes</div>
      </div>
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

// ─── SECCIÓN HALLAZGOS TABLA ──────────────────────────────────────────────────
function seccionHallazgos(hallazgos: any[], granjas: any[], limite=15): string {
  const lista = hallazgos.slice(0, limite);
  return `
  <div class="section">
    <div class="section-title">Hallazgos Identificados${hallazgos.length > limite ? ` (mostrando ${limite} de ${hallazgos.length})` : ""}</div>
    <table>
      <thead><tr>
        <th>Hallazgo</th><th>Granja</th><th>Auditor</th><th>Fecha</th><th>Riesgo</th><th>Estado</th>
      </tr></thead>
      <tbody>${lista.map(h => {
        const g = granjas.find(gr=>gr.id===h.granjaId);
        return `<tr>
          <td>${h.titulo?.slice(0,35) || "—"}</td>
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
function seccionKPIs(kpis: any[], granjas: any[], hallazgos: any[]): string {
  return `
  <div class="section">
    <div class="section-title">Gestión de Planes de Acción KPI</div>
    ${kpis.slice(0,12).map(k => {
      const g = granjas.find(gr=>gr.id===k.granjaId);
      const h = k.hallazgoId ? hallazgos.find(hh=>hh.id===k.hallazgoId) : null;
      const pct = k.porcentajeAvance ?? 0;
      const fillColor = pct>=80?"#22C55E":pct>=40?"#F97316":"#EF4444";
      const [seguRespPart, seguAudPart] = (k.seguimiento || "").split("||");
      const seguResp = seguRespPart?.replace(/^RESP:/,"") || "";
      const seguAud  = seguAudPart?.replace(/^AUD:/,"") || "";
      return `<div class="kpi-item">
        <div class="kpi-item-header">
          <div class="kpi-item-title">${k.accion}</div>
          <span class="badge ${clsBadge(k.estado)}">${displayEstado(k.estado)}</span>
        </div>
        <div class="kpi-meta">
          Granja: <strong>${g?.nombre||"—"}</strong> ·
          Responsable: <strong>${k.responsable||"—"}</strong>
          ${h ? ` · Hallazgo: ${h.titulo?.slice(0,30)}` : ""}
          ${k.fechaCompromiso ? ` · Compromiso: ${fmtFechaCorta(k.fechaCompromiso)}` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div class="progress-bar-bg" style="flex:1">
            <div class="progress-bar-fill" style="width:${pct}%;background:${fillColor}"></div>
          </div>
          <span style="font-size:10px;font-weight:700">${pct}%</span>
        </div>
        ${seguResp ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Seguimiento:</strong> ${seguResp}</div>` : ""}
        ${seguAud  ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><strong>Auditor:</strong> ${seguAud}</div>` : ""}
        ${k.planAccionVeterinario && k.planAccionVeterinario !== "—" ? `
        <div class="plan-box">
          <div class="plan-box-title">✨ Plan de Acción IA</div>
          <div class="plan-box-text">${k.planAccionVeterinario}</div>
        </div>` : ""}
      </div>`;
    }).join("")}
  </div>`;
}

// ─── SECCIÓN FIRMA DIGITAL ────────────────────────────────────────────────────
function seccionFirma(auditor: string, cargo="Auditor Interno"): string {
  const fecha = fmtFechaCorta(new Date().toISOString());
  const hash  = `SHA-${Date.now().toString(36).toUpperCase()}`;
  return `
  <div class="section">
    <div class="section-title">Firma y Certificación</div>
    <div class="firma-section">
      <div class="firma-box">
        <div style="margin-bottom:16px">
          <div class="sello">POLLOS<br>SAVICOL<br>S.A.S.</div>
        </div>
        <div class="firma-line"></div>
        <div class="firma-name">${auditor || "Auditor Interno"}</div>
        <div class="firma-cargo">${cargo}</div>
        <div class="firma-cargo">${EMPRESA.area}</div>
        <div class="firma-digital">Firma digital: ${hash}</div>
        <div class="firma-digital">Fecha: ${fecha}</div>
      </div>
      <div class="firma-box">
        <div style="margin-bottom:16px">
          <div class="sello" style="border-color:#0D1526;color:#0D1526">V°B°<br>GERENCIA</div>
        </div>
        <div class="firma-line"></div>
        <div class="firma-name">Gerencia General</div>
        <div class="firma-cargo">Pollos Savicol S.A.S.</div>
        <div class="firma-digital">Pendiente de aprobación</div>
      </div>
    </div>
    <div style="margin-top:16px;padding:10px 14px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;font-size:10px;color:#0c4a6e">
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

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 1 — EJECUTIVO CORPORATIVO
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo1(kpis: any[], hallazgos: any[], granjas: any[], auditor: string): string {
  const pct  = porcentaje(kpis);
  const comp = kpis.filter(k=>k.estado==="COMPLETADO").length;
  const total= kpis.length;
  const dona = donaChart([
    {v:kpis.filter(k=>k.estado==="COMPLETADO").length, c:"#22C55E", label:"Completado"},
    {v:kpis.filter(k=>k.estado==="EN_CURSO").length,   c:"#F97316", label:"En Curso"},
    {v:kpis.filter(k=>k.estado==="EN_ESPERA").length,  c:"#FBBF24", label:"En Espera"},
    {v:kpis.filter(k=>k.estado==="NO_INICIADO").length,c:"#EF4444", label:"No Iniciado"},
  ], 140);

  // Top 3 hallazgos más críticos
  const top3 = hallazgos.slice(0,3);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Ejecutivo — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}</style></head><body><div class="page">
${portada("Informe Ejecutivo de Auditoría", "Control Interno y Cumplimiento KPI", kpis, hallazgos, auditor)}

${seccionResumen(kpis, hallazgos)}

<div class="section">
  <div class="section-title">Análisis Visual de Cumplimiento</div>
  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Estado de Planes KPI</div>
      <div style="display:flex;align-items:center;gap:16px">
        ${dona}
        <div style="flex:1">
          ${[
            {label:"Completado",c:"#22C55E",k:kpis.filter(k=>k.estado==="COMPLETADO").length},
            {label:"En Curso",  c:"#F97316",k:kpis.filter(k=>k.estado==="EN_CURSO").length},
            {label:"En Espera", c:"#FBBF24",k:kpis.filter(k=>k.estado==="EN_ESPERA").length},
            {label:"No Iniciado",c:"#EF4444",k:kpis.filter(k=>k.estado==="NO_INICIADO").length},
          ].map(d=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:10px">
            <div style="width:10px;height:10px;border-radius:50%;background:${d.c};flex-shrink:0"></div>
            <span style="flex:1;color:#475569">${d.label}</span>
            <strong>${d.k}</strong>
          </div>`).join("")}
        </div>
      </div>
    </div>
    <div class="chart-box">
      <div class="chart-title">Avance por Estado</div>
      ${barraHorizontal("Completado",   kpis.filter(k=>k.estado==="COMPLETADO").length,   total, "#22C55E")}
      ${barraHorizontal("En Curso",     kpis.filter(k=>k.estado==="EN_CURSO").length,     total, "#F97316")}
      ${barraHorizontal("En Espera",    kpis.filter(k=>k.estado==="EN_ESPERA").length,    total, "#FBBF24")}
      ${barraHorizontal("No Iniciado",  kpis.filter(k=>k.estado==="NO_INICIADO").length,  total, "#EF4444")}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Hallazgos Críticos Prioritarios</div>
  <table><thead><tr><th>Hallazgo</th><th>Granja</th><th>Auditor</th><th>Fecha</th><th>Estado</th></tr></thead>
  <tbody>${top3.map(h=>{
    const g=granjas.find(gr=>gr.id===h.granjaId);
    return `<tr>
      <td><strong>${h.titulo?.slice(0,40)||"—"}</strong></td>
      <td>${g?.nombre||"—"}</td>
      <td>${h.auditorNombre||"—"}</td>
      <td>${fmtFechaCorta(h.fechaVisita)}</td>
      <td><span class="badge ${clsBadge(h.estado)}">${displayEstado(h.estado)}</span></td>
    </tr>`;}).join("")}
  </tbody></table>
</div>

<div class="section">
  <div class="section-title">Conclusiones Ejecutivas</div>
  <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:11px;line-height:1.7;color:#475569">
    El análisis de cumplimiento KPI de <strong>${EMPRESA.nombre}</strong> registra un avance global del
    <strong style="color:${pct>=70?"#22C55E":pct>=40?"#F97316":"#EF4444"}">${pct}%</strong>
    con <strong>${comp}</strong> de <strong>${total}</strong> planes completados.
    Se identificaron <strong>${hallazgos.length}</strong> hallazgos en total,
    de los cuales <strong style="color:#EF4444">${hallazgos.filter(h=>h.estado==="ABIERTO").length}</strong> permanecen abiertos.
    Se recomienda priorizar los planes en estado "No Iniciado" y establecer fechas de seguimiento inmediato.
  </div>
</div>

${seccionFirma(auditor)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 2 — TÉCNICO DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo2(kpis: any[], hallazgos: any[], granjas: any[], auditor: string): string {
  const num = `AU-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Técnico — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
.toc-item{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;color:#475569}
.toc-dots{flex:1;border-bottom:1px dotted #cbd5e0}
.toc-num{font-weight:600;color:#1a202c}
</style></head><body><div class="page">
${portada(`Informe Técnico de Auditoría N° ${num}`, "Evaluación Integral de Cumplimiento KPI y Hallazgos", kpis, hallazgos, auditor)}

<div class="section">
  <div class="section-title">Tabla de Contenido</div>
  ${[
    ["1.","Objeto y Alcance"],["2.","Resumen Ejecutivo"],["3.","Metodología"],
    ["4.","Hallazgos Identificados"],["5.","Gestión de Planes KPI"],
    ["6.","Planes de Acción IA"],["7.","Conclusiones y Recomendaciones"],
    ["8.","Firma y Aprobación"],
  ].map(([n,t])=>`<div class="toc-item"><span style="font-weight:600;color:#C41230">${n}</span> ${t} <span class="toc-dots"></span> <span class="toc-num">p.${n}</span></div>`).join("")}
</div>

<div class="section">
  <div class="section-title">1. Objeto y Alcance</div>
  <div style="font-size:11px;line-height:1.8;color:#475569">
    <p><strong>Objeto:</strong> El presente informe tiene como propósito evaluar el nivel de cumplimiento
    de los Indicadores Clave de Desempeño (KPI) establecidos para el control interno de
    ${EMPRESA.nombre}, identificar hallazgos de auditoría y proponer planes de acción correctivos.</p>
    <p style="margin-top:8px"><strong>Alcance:</strong> La evaluación comprende <strong>${granjas.length} granjas</strong> operativas,
    <strong>${hallazgos.length} hallazgos</strong> registrados y <strong>${kpis.length} planes de acción KPI</strong>
    en el período evaluado.</p>
    <p style="margin-top:8px"><strong>Número de informe:</strong> ${num} · <strong>Clasificación:</strong> CONFIDENCIAL</p>
  </div>
</div>

${seccionResumen(kpis, hallazgos)}

<div class="section">
  <div class="section-title">3. Metodología</div>
  <div style="font-size:11px;line-height:1.8;color:#475569">
    La auditoría fue realizada aplicando los siguientes métodos: visita de campo, revisión documental,
    entrevistas con responsables de granja, análisis de registros de bioseguridad y evaluación de
    protocolos operativos. Los hallazgos fueron clasificados por criticidad y tipo de riesgo.
    Los planes de acción fueron generados con apoyo de Inteligencia Artificial especializada en
    bioseguridad avícola colombiana.
  </div>
</div>

${seccionHallazgos(hallazgos, granjas)}
${seccionKPIs(kpis, granjas, hallazgos)}

<div class="section">
  <div class="section-title">7. Conclusiones y Recomendaciones</div>
  <div style="font-size:11px;line-height:1.8;color:#475569">
    <ol style="padding-left:16px">
      <li>Priorizar el cierre de los <strong>${hallazgos.filter(h=>h.estado==="ABIERTO").length}</strong> hallazgos en estado abierto mediante la activación inmediata de los planes de acción.</li>
      <li>Los <strong>${kpis.filter(k=>k.estado==="NO_INICIADO").length}</strong> planes KPI en estado "No Iniciado" requieren asignación inmediata de responsable y fecha de inicio.</li>
      <li>Se recomienda incrementar la frecuencia de visitas de seguimiento a granjas con riesgo alto.</li>
      <li>Implementar capacitación al personal operativo en bioseguridad y protocolos de granja.</li>
      <li>Verificar el cumplimiento de los planes de acción generados por IA en la próxima auditoría.</li>
    </ol>
  </div>
</div>

${seccionFirma(auditor)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 3 — DASHBOARD VISUAL
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo3(kpis: any[], hallazgos: any[], granjas: any[], auditor: string): string {
  const total = kpis.length;
  const dona  = donaChart([
    {v:kpis.filter(k=>k.estado==="COMPLETADO").length, c:"#22C55E", label:"Completado"},
    {v:kpis.filter(k=>k.estado==="EN_CURSO").length,   c:"#F97316", label:"En Curso"},
    {v:kpis.filter(k=>k.estado==="EN_ESPERA").length,  c:"#FBBF24", label:"En Espera"},
    {v:kpis.filter(k=>k.estado==="NO_INICIADO").length,c:"#EF4444", label:"No Iniciado"},
  ], 160);

  // Avance por granja (top 6)
  const granjasConAvance = granjas.slice(0,6).map(g => ({
    nombre: g.nombre,
    kpis: kpis.filter(k=>k.granjaId===g.id),
    avance: porcentaje(kpis.filter(k=>k.granjaId===g.id)),
  })).filter(g=>g.kpis.length>0);

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
.metric-l{font-size:9px;color:#64748b}
</style></head><body><div class="page">
${portada("Dashboard de Auditoría", "Visualización Ejecutiva de KPIs · Pollos Savicol S.A.S.", kpis, hallazgos, auditor)}

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

<div class="section">
  <div class="section-title">Análisis de Cumplimiento KPI</div>
  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Distribución por Estado</div>
      <div style="display:flex;justify-content:center;margin-bottom:12px">${dona}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${[
          {label:"Completado",c:"#22C55E",k:kpis.filter(k=>k.estado==="COMPLETADO").length},
          {label:"En Curso",  c:"#F97316",k:kpis.filter(k=>k.estado==="EN_CURSO").length},
          {label:"En Espera", c:"#FBBF24",k:kpis.filter(k=>k.estado==="EN_ESPERA").length},
          {label:"No Iniciado",c:"#EF4444",k:kpis.filter(k=>k.estado==="NO_INICIADO").length},
        ].map(d=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${d.c};flex-shrink:0"></div>
          <span style="color:#475569;flex:1">${d.label}</span><strong>${d.k}</strong>
        </div>`).join("")}
      </div>
    </div>
    <div class="chart-box">
      <div class="chart-title">Avance por Granja</div>
      ${granjasConAvance.length > 0
        ? granjasConAvance.map(g=>barraHorizontal(g.nombre.slice(0,18), g.avance, 100, g.avance>=70?"#22C55E":g.avance>=40?"#F97316":"#EF4444")).join("")
        : "<p style='font-size:11px;color:#64748b;text-align:center'>Sin datos por granja</p>"
      }
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Estado de Hallazgos</div>
  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Por Estado</div>
      ${barraHorizontal("Abiertos",  hallazgos.filter(h=>h.estado==="ABIERTO").length,  hallazgos.length, "#EF4444")}
      ${barraHorizontal("En Plan",   hallazgos.filter(h=>h.estado==="EN_PLAN").length,   hallazgos.length, "#F97316")}
      ${barraHorizontal("Cerrados",  hallazgos.filter(h=>h.estado==="CERRADO").length,  hallazgos.length, "#22C55E")}
    </div>
    <div class="chart-box">
      <div class="chart-title">Top KPIs Completados</div>
      ${kpis.filter(k=>k.estado==="COMPLETADO").slice(0,4).map(k=>`
      <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:10px">
        <div style="font-weight:600;color:#1a202c">${k.accion?.slice(0,40)||"—"}</div>
        <div style="color:#64748b">${k.responsable||"—"}</div>
      </div>`).join("") || "<p style='font-size:11px;color:#64748b'>Sin completados aún</p>"}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Hallazgos Prioritarios</div>
  <table><thead><tr><th>#</th><th>Hallazgo</th><th>Granja</th><th>Auditor</th><th>Fecha</th><th>Estado</th></tr></thead>
  <tbody>${hallazgos.slice(0,8).map((h,i)=>{
    const g=granjas.find(gr=>gr.id===h.granjaId);
    return `<tr>
      <td><strong>${i+1}</strong></td>
      <td>${h.titulo?.slice(0,35)||"—"}</td>
      <td>${g?.nombre||"—"}</td>
      <td>${h.auditorNombre||"—"}</td>
      <td>${fmtFechaCorta(h.fechaVisita)}</td>
      <td><span class="badge ${clsBadge(h.estado)}">${displayEstado(h.estado)}</span></td>
    </tr>`;}).join("")}
  </tbody></table>
</div>

${seccionFirma(auditor)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 4 — POR GRANJA INDIVIDUAL
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo4(kpis: any[], hallazgos: any[], granjas: any[], auditor: string, granjaFiltroId?: string): string {
  const granja = granjaFiltroId ? granjas.find(g=>g.id===granjaFiltroId) : granjas[0];
  if (!granja) return "<html><body><p>Selecciona una granja para este modelo.</p></body></html>";

  const kpisGranja     = kpis.filter(k=>k.granjaId===granja.id);
  const hallazgosGranja= hallazgos.filter(h=>h.granjaId===granja.id);
  const pct            = porcentaje(kpisGranja);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Granja ${granja.nombre} — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}</style></head><body><div class="page">
${portada(`Informe de Auditoría — ${granja.nombre}`, "Evaluación Individual de Granja", kpisGranja, hallazgosGranja, auditor, granja.nombre)}

<div class="section">
  <div class="section-title">Ficha Técnica de la Granja</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    ${[
      ["Nombre",          granja.nombre],
      ["Código",          granja.codigo],
      ["Región",          granja.region||"—"],
      ["Vereda",          granja.vereda||"—"],
      ["Tipo de Granja",  granja.tipoGranja||"—"],
      ["Tipo Operativo",  granja.tipoOperativo||"—"],
      ["Nivel de Riesgo", granja.nivelRiesgo||"—"],
      ["Capacidad",       granja.capacidadAves ? `${granja.capacidadAves.toLocaleString("es-CO")} aves` : "—"],
      ["Administrador",   granja.administrador||"—"],
      ["Estado Sanitario",granja.estadoSanitario||"—"],
      ["Estado",          granja.estado||"—"],
      ["Auditor",         auditor||"—"],
    ].map(([l,v])=>`<div style="background:#f8fafc;border-radius:6px;padding:8px 12px">
      <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">${l}</div>
      <div style="font-size:12px;font-weight:600;color:#1a202c;margin-top:2px">${v}</div>
    </div>`).join("")}
  </div>
</div>

${seccionResumen(kpisGranja, hallazgosGranja)}

<div class="section">
  <div class="section-title">Hallazgos de la Granja (${hallazgosGranja.length})</div>
  ${hallazgosGranja.length > 0
    ? `<table><thead><tr><th>Hallazgo</th><th>Auditor</th><th>Fecha Visita</th><th>Tipo Riesgo</th><th>Estado</th></tr></thead>
      <tbody>${hallazgosGranja.map(h=>`<tr>
        <td><strong>${h.titulo?.slice(0,40)||"—"}</strong></td>
        <td>${h.auditorNombre||"—"}</td>
        <td>${fmtFechaCorta(h.fechaVisita)}</td>
        <td>${h.tiposRiesgo?.join(", ")||"—"}</td>
        <td><span class="badge ${clsBadge(h.estado)}">${displayEstado(h.estado)}</span></td>
      </tr>`).join("")}</tbody></table>`
    : `<p style="font-size:11px;color:#64748b">Sin hallazgos registrados para esta granja.</p>`
  }
</div>

${seccionKPIs(kpisGranja, granjas, hallazgos)}

<div class="section">
  <div class="section-title">Conclusión Individual</div>
  <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:11px;line-height:1.7;color:#475569">
    La granja <strong>${granja.nombre}</strong> registra un avance del <strong>${pct}%</strong>
    en sus planes de acción KPI. Se identificaron <strong>${hallazgosGranja.filter(h=>h.estado==="ABIERTO").length}</strong>
    hallazgos abiertos que requieren atención inmediata. El nivel de riesgo general es
    <strong>${granja.nivelRiesgo||"No definido"}</strong>.
  </div>
</div>

${seccionFirma(auditor)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 5 — INFORME GENERAL COMBINADO
// ═══════════════════════════════════════════════════════════════════════════════
function generarModelo5(kpis: any[], hallazgos: any[], granjas: any[], auditor: string): string {
  const total = kpis.length;
  const pct   = porcentaje(kpis);
  const dona  = donaChart([
    {v:kpis.filter(k=>k.estado==="COMPLETADO").length, c:"#22C55E", label:"Completado"},
    {v:kpis.filter(k=>k.estado==="EN_CURSO").length,   c:"#F97316", label:"En Curso"},
    {v:kpis.filter(k=>k.estado==="EN_ESPERA").length,  c:"#FBBF24", label:"En Espera"},
    {v:kpis.filter(k=>k.estado==="NO_INICIADO").length,c:"#EF4444", label:"No Iniciado"},
  ], 160);

  const num = `AU-GEN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe General Combinado — Pollos Savicol S.A.S.</title>
<style>${CSS_BASE}
.divider{text-align:center;padding:12px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);
  font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
</style></head><body><div class="page">

${portada(`Informe General de Auditoría N° ${num}`, "Evaluación Integral · Todos los Modelos Combinados", kpis, hallazgos, auditor)}

<!-- ÍNDICE -->
<div class="section">
  <div class="section-title">Estructura del Informe</div>
  ${[
    "I.   Resumen Ejecutivo (Modelo 1)",
    "II.  Análisis Visual Dashboard (Modelo 3)",
    "III. Hallazgos Completos — Tabla Técnica (Modelo 2)",
    "IV.  Gestión KPI Detallada — Planes de Acción IA (Modelo 2)",
    "V.   Análisis por Granja (Modelo 4)",
    "VI.  Conclusiones y Recomendaciones",
    "VII. Firma y Certificación",
  ].map(s=>`<div style="padding:4px 0;font-size:11px;color:#475569;border-bottom:1px dotted #e2e8f0">${s}</div>`).join("")}
</div>

<!-- I. RESUMEN EJECUTIVO -->
<div class="divider">I — Resumen Ejecutivo</div>
${seccionResumen(kpis, hallazgos)}

<!-- CHARTS -->
<div class="section">
  <div class="section-title">Análisis Visual de Cumplimiento</div>
  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Estado de Planes KPI</div>
      <div style="display:flex;justify-content:center;margin-bottom:12px">${dona}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${[
          {label:"Completado", c:"#22C55E", k:kpis.filter(k=>k.estado==="COMPLETADO").length},
          {label:"En Curso",   c:"#F97316", k:kpis.filter(k=>k.estado==="EN_CURSO").length},
          {label:"En Espera",  c:"#FBBF24", k:kpis.filter(k=>k.estado==="EN_ESPERA").length},
          {label:"No Iniciado",c:"#EF4444", k:kpis.filter(k=>k.estado==="NO_INICIADO").length},
        ].map(d=>`<div style="display:flex;align-items:center;gap:4px;font-size:10px">
          <div style="width:8px;height:8px;background:${d.c};border-radius:50%;flex-shrink:0"></div>
          <span style="flex:1;color:#475569">${d.label}</span><strong>${d.k}</strong>
        </div>`).join("")}
      </div>
    </div>
    <div class="chart-box">
      <div class="chart-title">Hallazgos por Estado</div>
      ${barraHorizontal("Abiertos", hallazgos.filter(h=>h.estado==="ABIERTO").length, hallazgos.length, "#EF4444")}
      ${barraHorizontal("En Plan",  hallazgos.filter(h=>h.estado==="EN_PLAN").length,  hallazgos.length, "#F97316")}
      ${barraHorizontal("Cerrados", hallazgos.filter(h=>h.estado==="CERRADO").length, hallazgos.length, "#22C55E")}
    </div>
  </div>
</div>

<!-- II. HALLAZGOS COMPLETOS -->
<div class="divider">II — Hallazgos Identificados</div>
${seccionHallazgos(hallazgos, granjas, 20)}

<!-- III. KPIs DETALLADOS -->
<div class="divider">III — Gestión KPI · Planes de Acción IA</div>
${seccionKPIs(kpis, granjas, hallazgos)}

<!-- IV. ANÁLISIS POR GRANJA -->
<div class="divider">IV — Análisis por Granja</div>
<div class="section">
  <div class="section-title">Avance por Granja Evaluada</div>
  ${granjas.filter(g=>kpis.some(k=>k.granjaId===g.id)).slice(0,10).map(g=>{
    const kg   = kpis.filter(k=>k.granjaId===g.id);
    const hg   = hallazgos.filter(h=>h.granjaId===g.id);
    const av   = porcentaje(kg);
    const col  = av>=70?"#22C55E":av>=40?"#F97316":"#EF4444";
    return `<div style="margin-bottom:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
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

<!-- V. CONCLUSIONES -->
<div class="divider">V — Conclusiones y Recomendaciones</div>
<div class="section">
  <div class="section-title">Conclusiones Generales</div>
  <div style="font-size:11px;line-height:1.8;color:#475569">
    <p>El Sistema de Gestión de Auditoría Interna de <strong>${EMPRESA.nombre}</strong> registra
    un avance global del <strong style="color:${pct>=70?"#22C55E":pct>=40?"#F97316":"#EF4444"}">${pct}%</strong>
    en sus planes de acción KPI, con <strong>${kpis.filter(k=>k.estado==="COMPLETADO").length}</strong>
    planes completados de un total de <strong>${total}</strong>.</p>

    <p style="margin-top:8px"><strong>Hallazgos:</strong> Se identificaron
    <strong>${hallazgos.length}</strong> hallazgos en <strong>${granjas.filter(g=>hallazgos.some(h=>h.granjaId===g.id)).length}</strong>
    granjas evaluadas. El <strong>${Math.round(hallazgos.filter(h=>h.estado==="ABIERTO").length/hallazgos.length*100)}%</strong>
    permanece en estado abierto, requiriendo atención prioritaria.</p>

    <div style="margin-top:12px;padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:6px">
      <div style="font-weight:700;margin-bottom:8px">Recomendaciones prioritarias:</div>
      <ol style="padding-left:16px">
        <li>Activar inmediatamente los <strong>${kpis.filter(k=>k.estado==="NO_INICIADO").length}</strong> planes KPI en estado "No Iniciado".</li>
        <li>Establecer seguimiento semanal a los <strong>${hallazgos.filter(h=>h.estado==="ABIERTO").length}</strong> hallazgos abiertos.</li>
        <li>Implementar los planes de acción generados por IA en las granjas con mayor índice de riesgo.</li>
        <li>Incrementar la frecuencia de auditorías en granjas con avance inferior al 40%.</li>
        <li>Capacitar al personal operativo en protocolos de bioseguridad y manejo de registros.</li>
      </ol>
    </div>
  </div>
</div>

${seccionFirma(auditor)}
${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — GENERA Y ABRE EL INFORME SELECCIONADO
// ═══════════════════════════════════════════════════════════════════════════════
export function generarInforme(
  modelo: ModeloInforme,
  kpis: any[], hallazgos: any[], granjas: any[],
  auditor: string, granjaFiltroId?: string
): void {
  let html = "";
  switch(modelo) {
    case "1-ejecutivo": html = generarModelo1(kpis, hallazgos, granjas, auditor); break;
    case "2-tecnico":   html = generarModelo2(kpis, hallazgos, granjas, auditor); break;
    case "3-dashboard": html = generarModelo3(kpis, hallazgos, granjas, auditor); break;
    case "4-granja":    html = generarModelo4(kpis, hallazgos, granjas, auditor, granjaFiltroId); break;
    case "5-general":
    default:            html = generarModelo5(kpis, hallazgos, granjas, auditor); break;
  }
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 700);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN ENVIAR POR CORREO — USA EL EMAILSERVICE DEL BACKEND
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Convertir HTML del informe a PDF real usando html2canvas + jsPDF ───────────
// Renderiza el HTML en el browser → captura con html2canvas → genera PDF con jsPDF
// El PDF resultante es IDÉNTICO al informe visible en la plataforma
async function htmlToPDFBase64(html: string): Promise<{ b64: string; filename: string }> {
  const fecha    = new Date().toISOString().slice(0, 10);
  const filename = `Informe-Auditoria-Savicol-${fecha}.pdf`;

  try {
    // Importar librerías dinamicamente (solo se cargan cuando se necesitan)
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    // Crear un iframe invisible para renderizar el HTML correctamente
    // (usar iframe evita que los estilos del modal interfieran)
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      } else {
        resolve();
      }
    });

    // Esperar a que los estilos y fuentes carguen
    await new Promise(r => setTimeout(r, 800));

    const iframeDoc   = iframe.contentDocument || iframe.contentWindow?.document;
    const targetEl    = iframeDoc?.body || document.body;

    // Capturar el HTML renderizado como imagen de alta resolución
    const canvas = await html2canvas(targetEl, {
      scale:            1.2,         // escala optimizada para límite de backend (~400KB resultado)
      useCORS:          true,
      allowTaint:       true,
      backgroundColor:  "#ffffff",
      logging:          false,
      width:            794,         // ancho A4 en px a 96dpi
      windowWidth:      794,
    });

    document.body.removeChild(iframe);

    // Crear el PDF A4
    const pdf      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW    = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH    = pdf.internal.pageSize.getHeight();  // 297mm

    const imgData  = canvas.toDataURL("image/jpeg", 0.65); // 0.65 = calidad/tamaño óptimo para envío
    const imgH     = (canvas.height * pageW) / canvas.width; // altura proporcional

    // Si el contenido es más largo que una página, dividir en múltiples páginas
    let yPos = 0;
    while (yPos < imgH) {
      if (yPos > 0) pdf.addPage();
      pdf.addImage(
        imgData, "JPEG",
        0, -yPos,       // desplazar hacia arriba para mostrar la sección correcta
        pageW, imgH,
        undefined, "FAST"
      );
      yPos += pageH;
    }

    const b64 = pdf.output("datauristring").split(",")[1];
    // Verificar tamaño: si supera 4MB base64 (≈3MB binario), recomprimir
    if (b64.length > 600 * 1024) { // recomprimir si > 600KB base64
      const canvasSmall = await html2canvas(targetEl, {
        scale: 1, useCORS: true, allowTaint: true,
        backgroundColor: "#ffffff", logging: false,
        width: 794, windowWidth: 794,
      });
      const pdf2    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgD2   = canvasSmall.toDataURL("image/jpeg", 0.65);
      const imgH2   = (canvasSmall.height * pageW) / canvasSmall.width;
      let yP2 = 0;
      while (yP2 < imgH2) {
        if (yP2 > 0) pdf2.addPage();
        pdf2.addImage(imgD2, "JPEG", 0, -yP2, pageW, imgH2, undefined, "FAST");
        yP2 += pageH;
      }
      const b64small = pdf2.output("datauristring").split(",")[1];
      return { b64: b64small, filename };
    }
    return { b64, filename };

  } catch (err) {
    console.error("[htmlToPDFBase64]", err);
    // Fallback: retornar el HTML como base64 si falla jsPDF
    const b64 = btoa(unescape(encodeURIComponent(html)));
    return { b64, filename: filename.replace(".pdf", ".html") };
  }
}

// Wrapper sync para compatibilidad con código antiguo
function htmlToBase64(html: string): string {
  return btoa(unescape(encodeURIComponent(html)));
}

export async function enviarInformePorCorreo(
  modelo: ModeloInforme,
  destinatario: string,
  asunto: string,
  kpis: any[], hallazgos: any[], granjas: any[],
  auditor: string,
  apiToken: string,
  auditorEmail: string,
  granjaFiltroId?: string,
  descripcion?: string,
  pdfBase64Externo?: string,
  pdfFilenameExterno?: string
): Promise<{ok:boolean; message:string}> {
  try {
    // Generar el HTML completo del informe seleccionado
    const htmlInforme = (() => {
      switch(modelo) {
        case "1-ejecutivo": return generarModelo1(kpis, hallazgos, granjas, auditor);
        case "2-tecnico":   return generarModelo2(kpis, hallazgos, granjas, auditor);
        case "3-dashboard": return generarModelo3(kpis, hallazgos, granjas, auditor);
        case "4-granja":    return generarModelo4(kpis, hallazgos, granjas, auditor, granjaFiltroId);
        default:            return generarModelo5(kpis, hallazgos, granjas, auditor);
      }
    })();

    // Convertir HTML a base64 para adjunto descargable
    const pdfBase64   = htmlToBase64(htmlInforme);
    const pdfFilename = `Informe-Auditoria-Savicol-${modelo}-${new Date().toISOString().slice(0,10)}.html`;

    // Generar HTML del correo (resumen ejecutivo)
    const pct  = kpis.length ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/kpis.length) : 0;
    const comp = kpis.filter(k=>k.estado==="COMPLETADO").length;
    const granja = granjaFiltroId ? granjas.find(g=>g.id===granjaFiltroId) : null;

    const htmlEmail = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#0D1526,#C41230);padding:30px;text-align:center;border-radius:8px 8px 0 0">
    <div style="color:white;font-size:22px;font-weight:800">Pollos Savicol S.A.S.</div>
    <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Auditoría Interna · Control Interno</div>
  </div>
  <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0">
    <h2 style="color:#1a202c;font-size:16px;margin-bottom:16px">${asunto}</h2>
    <p style="color:#475569;font-size:13px;line-height:1.7">
      Se adjunta el informe de auditoría <strong>${MODELOS_INFO[modelo].titulo}</strong>
      ${granja ? `para la granja <strong>${granja.nombre}</strong>` : "de cumplimiento global KPI"}.
    </p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0">
      ${[
        {n:kpis.length,       l:"Planes KPI",    c:"#4A7AFF"},
        {n:pct+"%",           l:"Avance Global", c:pct>=70?"#22C55E":pct>=40?"#F97316":"#EF4444"},
        {n:comp,              l:"Completados",   c:"#22C55E"},
      ].map(m=>`<div style="background:white;border-radius:8px;padding:12px;text-align:center;border:1px solid #e2e8f0">
        <div style="font-size:20px;font-weight:800;color:${m.c}">${m.n}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${m.l}</div>
      </div>`).join("")}
    </div>
    <p style="color:#64748b;font-size:11px;margin-top:12px">
      Este informe fue generado automáticamente por el Sistema de Auditoría Interna de Pollos Savicol S.A.S.
      Para acceder al informe completo con gráficos, inicie sesión en la plataforma.
    </p>
    <p style="color:#64748b;font-size:11px;margin-top:8px">
      Auditor: <strong>${auditor}</strong> · Fecha: <strong>${new Date().toLocaleDateString("es-CO")}</strong>
    </p>
  </div>
  <div style="background:#0D1526;padding:12px;text-align:center;border-radius:0 0 8px 8px">
    <p style="color:rgba(255,255,255,0.5);font-size:10px;margin:0">
      Pollos Savicol S.A.S. · Auditoría Interna · auditoria@savicol.com.co
    </p>
  </div>
</div>`;

    // Usar el PDF real si fue generado externamente, sino el HTML base64
    const finalPdfBase64   = pdfBase64Externo && pdfBase64Externo.length > 100 ? pdfBase64Externo : pdfBase64;
    const finalPdfFilename = pdfFilenameExterno ?? pdfFilename;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        to:           destinatario,
        subject:      asunto,
        html:         htmlEmail,
        pdfBase64:    finalPdfBase64,
        pdfFilename:  finalPdfFilename,
      }),
    });

    if (response.ok) {
      return { ok: true, message: `Informe enviado correctamente a ${destinatario}` };
    } else {
      const err = await response.json().catch(()=>({}));
      return { ok: false, message: err?.message || `Error HTTP ${response.status}` };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Error al enviar el correo" };
  }
}


// ─── Modal selector de modelos de informe ─────────────────────────────────────
function SelectorInformeModal({ granjas, onClose, onGenerar, onEnviar }: {
  granjas:    any[];
  onClose:    () => void;
  onGenerar:  (modelo: ModeloInforme, granjaId?: string) => void;
  onEnviar:   (modelo: ModeloInforme, email: string, asunto: string, granjaId?: string, descripcion?: string) => Promise<void>;
}) {
  const [modeloSel,   setModeloSel]   = useState<ModeloInforme>("5-general");
  const [granjaFiltro,setGranjaFiltro]= useState("");
  const [enviarEmail,    setEnviarEmail]    = useState(false);
  const [emailDest,      setEmailDest]      = useState("");
  const [asunto,         setAsunto]         = useState("Informe de Auditoría — Pollos Savicol S.A.S.");
  const [enviando,       setEnviando]       = useState(false);
  const [enviado,          setEnviado]          = useState<string|null>(null);
  const [descripcionCorreo,setDescripcionCorreo] = useState("");
  const auditorStoreEmail = useAuthStore((s) => s.user?.email ?? "");
  const auditorStoreName  = useAuthStore((s) => s.user?.name  ?? "Auditor");

  const SEL_STYLE = "w-full px-3 py-2 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none focus:border-[#4A7AFF] transition-colors";
  const INP_STYLE = "w-full px-3 py-2 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#4A7AFF] transition-colors";

  const modelos = Object.entries(MODELOS_INFO) as [ModeloInforme, typeof MODELOS_INFO[ModeloInforme]][];

  async function handleEnviar() {
    if (!emailDest.trim()) return;
    setEnviando(true); setEnviado(null);
    try {
      await onEnviar(modeloSel, emailDest.trim(), asunto, granjaFiltro || undefined, descripcionCorreo);
      setEnviado(`✅ Informe enviado a ${emailDest.trim()} · Respuestas → ${auditorStoreEmail}`);
    } catch(e: any) {
      setEnviado("✗ Error al enviar: " + (e?.message ?? "desconocido"));
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
            <p className="text-xs text-[#94A3B8] mt-0.5">Pollos Savicol S.A.S. · Selecciona el modelo y descarga</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white p-1"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Selector de modelo */}
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold mb-2 block uppercase tracking-wider">Modelo de Informe</span>
            <div className="grid grid-cols-1 gap-2">
              {modelos.map(([key, info]) => (
                <button key={key} onClick={() => setModeloSel(key)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    modeloSel === key
                      ? "border-[#4A7AFF] bg-[#4A7AFF]/10"
                      : "border-[#1E2D4A] bg-[#0A111F] hover:border-[#2A3F6A]"
                  }`}>
                  <span className="text-xl shrink-0">{info.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${modeloSel===key?"text-[#4A7AFF]":"text-white"}`}>
                      {info.titulo}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{info.desc}</div>
                  </div>
                  {modeloSel === key && (
                    <CheckCircle2 className="w-4 h-4 text-[#4A7AFF] ml-auto shrink-0 mt-0.5"/>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de granja (solo para Modelo 4) */}
          {modeloSel === "4-granja" && (
            <div>
              <span className="text-xs text-[#94A3B8] font-semibold mb-2 block">Granja a evaluar</span>
              <select value={granjaFiltro} onChange={e=>setGranjaFiltro(e.target.value)} className={SEL_STYLE}>
                <option value="">(primera disponible)</option>
                {granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
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
                {/* Remitente — autocompletado del auditor logueado */}
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Remitente (tu correo)</span>
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#0A111F] border border-[#2A3F6A] rounded-lg">
                    <span className="text-[10px] text-[#22C55E]">●</span>
                    <span className="text-xs text-white flex-1">{auditorStoreName}</span>
                    <span className="text-[10px] text-[#64748B]">{auditorStoreEmail}</span>
                  </div>
                  <p className="text-[9px] text-[#475569] mt-1 px-1">
                    Las respuestas llegarán a este correo automáticamente
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Destinatario *</span>
                  <input value={emailDest} onChange={e=>setEmailDest(e.target.value)}
                    className={INP_STYLE} placeholder="gerencia@empresa.com · dirección evaluada" type="email"/>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Asunto</span>
                  <input value={asunto} onChange={e=>setAsunto(e.target.value)}
                    className={INP_STYLE} placeholder="Asunto del correo"/>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] mb-1 block">Descripción del correo (opcional)</span>
                  <textarea value={descripcionCorreo} onChange={e=>setDescripcionCorreo(e.target.value)}
                    rows={3} className={INP_STYLE + " resize-none"}
                    placeholder="Observaciones, instrucciones o comentarios que deseas incluir en el correo y el informe…"/>
                </div>
                {enviado && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${enviado.startsWith("✅")?"bg-green-500/10 text-green-400 border border-green-500/20":"bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {enviado}
                  </div>
                )}
                <button onClick={handleEnviar} disabled={enviando || !emailDest.trim()}
                  className="w-full btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center justify-center gap-2 py-2 disabled:opacity-50">
                  {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Bell className="w-3.5 h-3.5"/>}
                  {enviando ? "Enviando..." : "Enviar Informe"}
                </button>
              </div>
            )}
          </div>

        </div>

        <footer className="flex items-center gap-2 px-6 py-4 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="btn-ghost text-xs flex-1">Cancelar</button>
          <button
            onClick={() => { onGenerar(modeloSel, granjaFiltro||undefined); onClose(); }}
            className="btn-primary text-sm bg-[#4A7AFF] hover:bg-[#3D6AE8] flex items-center gap-2 flex-1 justify-center py-2 font-semibold"
          >
            <FileText className="w-4 h-4"/>
            Descargar PDF
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

  // ── Filtros superiores ────────────────────────────────────────────────────
  const [fEstado,        setFEstado]        = useState("");
  const [fGranja,        setFGranja]        = useState("");
  const [fAuditor,       setFAuditor]       = useState("");
  const [fFechaHallazgo, setFFechaHallazgo] = useState("");

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
    if (fGranja)   list = list.filter(k => k.granjaId === fGranja);
    if (fAuditor)  list = list.filter(k => {
      const h = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
      return h?.auditorId === fAuditor;
    });
    if (fFechaHallazgo) list = list.filter(k => {
      const h = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
      return h?.fechaVisita?.startsWith(fFechaHallazgo);
    });
    return list;
  }, [kpis, hallazgos, fEstado, fGranja, fAuditor, fFechaHallazgo]);

  const hayFiltros = !!(fEstado || fGranja || fAuditor || fFechaHallazgo);

  // ── Indicadores ───────────────────────────────────────────────────────────
  const total       = kpis.length;
  const completados = kpis.filter(k => k.estado==="Completado"||k.estado==="COMPLETADO").length;
  const enCurso     = kpis.filter(k => k.estado==="En Curso"  ||k.estado==="EN_CURSO").length;
  const enEspera    = kpis.filter(k => k.estado==="En Espera" ||k.estado==="EN_ESPERA").length;
  const noIniciado  = kpis.filter(k => k.estado==="No Iniciado"||k.estado==="NO_INICIADO").length;
  const avgAvance   = total > 0 ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/total) : 0;

  const SEL = "px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none hover:border-[#2A3F6A] transition-colors cursor-pointer";

  const filtrosActivos = { fEstado, fGranja, fAuditor, fFechaHallazgo };

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
                onClick={() => { setFEstado(""); setFGranja(""); setFAuditor(""); setFFechaHallazgo(""); }}
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
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Granja</span>
              <select value={fGranja} onChange={e=>setFGranja(e.target.value)} className={SEL}>
                <option value="">Todas las granjas</option>
                {granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Auditor</span>
              <select value={fAuditor} onChange={e=>setFAuditor(e.target.value)} className={SEL}>
                <option value="">Todos los auditores</option>
                {AUDITORS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Fecha Hallazgo</span>
              <input type="month" value={fFechaHallazgo} onChange={e=>setFFechaHallazgo(e.target.value)}
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

              // Parsear seguimiento compuesto
              const [seguRespPart, seguAudPart] = (k.seguimiento ?? "").split("||");
              const seguResp = seguRespPart?.replace(/^RESP:/,"") ?? "";
              const seguAud  = seguAudPart?.replace(/^AUD:/,"")  ?? "";

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
                  {seguAud && (
                    <p className="text-xs text-[#94A3B8] mb-1.5 leading-relaxed">
                      <span className="text-[#64748B] font-medium">Auditor: </span>{seguAud}
                    </p>
                  )}

                  {/* Plan IA */}
                  {k.planAccionVeterinario && k.planAccionVeterinario !== "—" && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3"/>Plan de Acción IA
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
          onClose={() => setInformeOpen(false)}
          onGenerar={(modelo, granjaId) => {
            const auditorNombre = usuarios?.find((u:any)=>u.role==="AUDITOR")?.name ?? "Auditor Interno";
            generarInforme(modelo, filtered, hallazgos, granjas, auditorNombre, granjaId);
          }}
          onEnviar={async (modelo, email, asunto, granjaId, descripcion) => {
            const auditorNombre = usuarios?.find((u:any)=>u.role==="AUDITOR")?.name ?? "Auditor Interno";
            const auditorEmail  = accessToken ? (JSON.parse(atob(accessToken.split(".")[1]||"e30=")).email ?? "") : "";

            // 1. Generar el HTML exacto del modelo seleccionado
            //    El mismo HTML que se ve en la plataforma al descargar
            const htmlInforme = (() => {
              switch (modelo) {
                case "1-ejecutivo": return generarModelo1(filtered, hallazgos, granjas, auditorNombre);
                case "2-tecnico":   return generarModelo2(filtered, hallazgos, granjas, auditorNombre);
                case "3-dashboard": return generarModelo3(filtered, hallazgos, granjas, auditorNombre);
                case "4-granja":    return generarModelo4(filtered, hallazgos, granjas, auditorNombre, granjaId);
                default:            return generarModelo5(filtered, hallazgos, granjas, auditorNombre);
              }
            })();

            // 2. Agregar descripción del auditor al HTML si viene
            const htmlConDesc = descripcion?.trim()
              ? htmlInforme.replace(
                  "</body>",
                  `<div style="padding:20px 50px;background:#fff;border-top:1px solid #e2e8f0">
                    <p style="font-size:11px;color:#64748b;font-family:Arial,sans-serif;line-height:1.6">
                      <strong>Observaciones del Auditor:</strong><br>${descripcion.trim()}
                    </p>
                  </div></body>`
                )
              : htmlInforme;

            // 3. Convertir HTML a PDF REAL en el browser (html2canvas + jsPDF)
            //    El PDF generado es idéntico al informe visible en la plataforma
            let pdfBase64 = "";
            let pdfFilename = `Informe-Auditoria-Savicol-${modelo}-${new Date().toISOString().slice(0,10)}.pdf`;
            try {
              const { b64, filename: fn } = await htmlToPDFBase64(htmlConDesc);
              pdfBase64  = b64;
              pdfFilename = fn;
            } catch (pdfErr) {
              console.error("[PDF]", pdfErr);
              // Fallback: adjuntar como HTML si jsPDF falla
              pdfBase64   = htmlToBase64(htmlConDesc);
              pdfFilename  = pdfFilename.replace(".pdf", ".html");
            }

            // 2. Enviar correo con PDF adjunto
            const r = await enviarInformePorCorreo(modelo, email, asunto, filtered, hallazgos, granjas, auditorNombre, accessToken||"", auditorEmail, granjaId, descripcion, pdfBase64, pdfFilename);
            if (!r.ok) throw new Error(r.message);
          }}
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
function EvidenciasFotograficas({ hallazgoId, accessToken }: {
  hallazgoId?: string;
  accessToken: string | null;
}) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [cargando,   setCargando]   = useState(false);
  const [subiendo,   setSubiendo]   = useState(false);
  const [errEv,      setErrEv]      = useState<string | null>(null);

  // Cargar evidencias existentes del hallazgo (al abrir / cambiar hallazgo)
  useMemo(() => {
    if (!hallazgoId || !accessToken) { setEvidencias([]); return; }
    setCargando(true);
    fetch(`${API}/api/v1/evidencias/hallazgo?hallazgoId=${hallazgoId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setEvidencias(Array.isArray(data) ? data.filter(e => e.tipo === "Foto") : []))
      .catch(() => setEvidencias([]))
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
          }),
        });
        if (resp.ok) {
          const nueva = await resp.json();
          setEvidencias(prev => [nueva, ...prev]);
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
    setEvidencias(e => e.filter(x => x.id !== id)); // optimista
    try {
      const resp = await fetch(`${API}/api/v1/evidencias/hallazgo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) setEvidencias(prev); // revertir si falla
    } catch {
      setEvidencias(prev);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5"/> Evidencias Fotográficas Hallazgo
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

  // Parsear seguimiento guardado
  const [initSeguResp, initSeguAud] = (() => {
    const s = editing?.seguimiento ?? "";
    const [a, b] = s.split("||");
    return [a?.replace(/^RESP:/,"") ?? "", b?.replace(/^AUD:/,"") ?? ""];
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
  const [calAuditor, setCalAuditor] = useState(editing ? normalState(editing.estado) : "En Curso");
  const [generando,  setGenerando]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
      // Contexto enriquecido: descripción real + criticidad + categoría del hallazgo
      const descripcionContexto = [
        hallazgoSel?.descripcion?.trim() || form.accion,
        hallazgoSel?.criticidad ? `Criticidad: ${hallazgoSel.criticidad}` : "",
        hallazgoSel?.categoria  ? `Categoría: ${hallazgoSel.categoria}`   : "",
      ].filter(Boolean).join(". ");
      const plan = await generarPlanIA(
        form.accion, tipoRiesgo, estadoH,
        granjaSel?.nombre ?? "Granja", descripcionContexto
      );
      setForm(f => ({ ...f, planAccionVeterinario: plan }));
    } catch (e: any) {
      setLocalError("Error IA: " + (e?.message ?? "desconocido"));
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

    // Componer seguimiento compuesto: "RESP:...|AUD:..."
    const seguimientoCompuesto = [
      seguResp.trim() ? `RESP:${seguResp.trim()}` : "",
      seguAud.trim()  ? `AUD:${seguAud.trim()}`   : "",
    ].filter(Boolean).join("||");

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
              Formulario inteligente · Genera plan con IA · Semaforización automática
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
          <EvidenciasFotograficas hallazgoId={form.hallazgoId} accessToken={accessToken}/>

          {/* ── PLAN DE ACCIÓN ── */}
          <Section label="Plan de Acción"/>
          <FF label="Hallazgo / Acción *">
            <textarea value={form.accion ?? ""} onChange={e=>setForm({...form,accion:e.target.value})}
              rows={3} className={INP+" resize-y"}
              placeholder="Descripción completa del hallazgo a corregir (se autocompleta al seleccionar un hallazgo)" required/>
          </FF>

          <FF label="Plan de Acción IA">
            <div className="relative">
              <textarea value={form.planAccionVeterinario ?? ""}
                onChange={e=>setForm({...form,planAccionVeterinario:e.target.value})}
                rows={3} className={INP+" resize-none pb-10"}
                placeholder="Escribe el plan o genera uno con IA (máx. 80 palabras)…"/>
              <button type="button" onClick={handleGenerarPlanIA} disabled={generando}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50">
                {generando
                  ? <><Loader2 className="w-3 h-3 animate-spin"/>Generando…</>
                  : <><Sparkles className="w-3 h-3"/>Generar Plan IA</>
                }
              </button>
            </div>
          </FF>

          {/* ── SEGUIMIENTO ── */}
          <Section label="Seguimiento y Calificación"/>
          <FF label="Seguimiento Responsable">
            <textarea value={seguResp} onChange={e=>setSeguResp(e.target.value)}
              rows={2} className={INP+" resize-none"}
              placeholder="Observaciones del responsable sobre el avance…"/>
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
