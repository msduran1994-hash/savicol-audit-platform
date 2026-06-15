"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { useState, useMemo } from "react";
import { AUDITORS } from "@/lib/constants";
import { TIPO_RIESGO, CRITICIDAD } from "@/lib/granjas.constants";
import {
  FileText, Download, Sparkles, BarChart3, AlertTriangle, Target,
  ClipboardCheck, TrendingUp, GitCompare, Award, FileSpreadsheet,
  Filter, X, Loader2, ExternalLink,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════
   MÓDULO REPORTES EJECUTIVOS — Descargas reales PDF / XLSX / Dashboard BI
   Reutiliza datos del store (filtrados), genera PDF con jsPDF+html2canvas
   y XLSX con SheetJS (carga dinámica desde CDN). Sin datos ficticios.
   ════════════════════════════════════════════════════════════════════════ */

// ── Normalización (consistente con módulos KPI y Ranking) ───────────────────
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normCriticidad = (c: string): "Crítica"|"Alta"|"Media"|"Baja"|"—" => {
  const v = sinAcentos((c ?? "").toString().toUpperCase());
  if (v.startsWith("CRIT")) return "Crítica";
  if (v.startsWith("ALT"))  return "Alta";
  if (v.startsWith("MED"))  return "Media";
  if (v.startsWith("BAJ"))  return "Baja";
  return "—";
};
const normEstadoHallazgo = (e: string): string => {
  const v = sinAcentos((e ?? "").toString().toUpperCase()).replace(/ /g, "_");
  if (v === "ABIERTO")    return "Abierto";
  if (v === "EN_PLAN")    return "En Plan";
  if (v === "CERRADO")    return "Cerrado";
  if (v === "VERIFICADO") return "Verificado";
  return e || "—";
};
type EstadoKPIBI = "Completado"|"En Curso"|"En Espera"|"Atrasado"|"No Iniciado";
const normEstadoKPI = (k: any): EstadoKPIBI => {
  const raw = sinAcentos((k?.estado ?? "").toString().toUpperCase()).replace(/ /g, "_");
  if (raw === "COMPLETADO" || raw === "CERRADO") return "Completado";
  if (k?.fechaCompromiso) {
    const fc = new Date(k.fechaCompromiso).getTime();
    if (!isNaN(fc) && fc < Date.now()) return "Atrasado";
  }
  if (raw === "EN_CURSO")  return "En Curso";
  if (raw === "EN_ESPERA") return "En Espera";
  if (raw === "NO_INICIADO" || raw === "PENDIENTE") return "No Iniciado";
  return "En Curso";
};
const normTipoRiesgo = (tr: any): string[] => {
  if (Array.isArray(tr)) return tr.map(x => sinAcentos(String(x).toUpperCase()));
  if (typeof tr === "string") {
    try { const p = JSON.parse(tr); if (Array.isArray(p)) return p.map(x=>sinAcentos(String(x).toUpperCase())); } catch {}
    return [sinAcentos(tr.toUpperCase())];
  }
  return [];
};
const fmtFecha = (d?: string) => {
  if (!d) return "—";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day:"2-digit", month:"2-digit", year:"numeric" });
};

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-5", area: "Control Interno y Auditoría" };
const COLOR = { primary:"#0D1526", accent:"#4A7AFF", ok:"#22C55E", warn:"#F59E0B", danger:"#EF4444", purple:"#8B5CF6" };

// ── Carga dinámica de SheetJS (XLSX) desde CDN — sin agregar dependencias ──
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

// ── Generación de PDF (reutiliza el patrón jsPDF + html2canvas) ─────────────
async function generarPDFDesdeHTML(html: string, filename: string): Promise<void> {
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

// ── Plantilla HTML del PDF ejecutivo (portada + secciones) ──────────────────
function construirHTMLReporte(opts: {
  titulo: string; subtitulo: string;
  granjas: any[]; hallazgos: any[]; kpis: any[];
  filtrosTxt: string[];
}): string {
  const { titulo, subtitulo, granjas, hallazgos, kpis, filtrosTxt } = opts;
  const hoy = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" });

  // Indicadores
  const totalHall = hallazgos.length;
  const criticos = hallazgos.filter(h => normCriticidad(h.criticidad)==="Crítica").length;
  const abiertos = hallazgos.filter(h => normEstadoHallazgo(h.estado)==="Abierto").length;
  const totalKpi = kpis.length;
  const kpiComp = kpis.filter(k => normEstadoKPI(k)==="Completado").length;
  const cumpl = totalKpi>0 ? Math.round(kpiComp/totalKpi*100) : 0;

  // Conteos por criticidad
  const critCount = { "Crítica":0,"Alta":0,"Media":0,"Baja":0 };
  hallazgos.forEach(h => { const c = normCriticidad(h.criticidad); if (c in critCount) (critCount as any)[c]++; });
  // Conteos por tipo de riesgo
  const riesgoCount: Record<string,number> = { "Operativo":0,"Reputacional":0,"Financiero":0,"Legal":0,"Contagio":0 };
  hallazgos.forEach(h => normTipoRiesgo(h.tiposRiesgo).forEach(t => {
    const map: Record<string,string> = {OPERATIVO:"Operativo",REPUTACIONAL:"Reputacional",FINANCIERO:"Financiero",LEGAL:"Legal",CONTAGIO:"Contagio"};
    if (map[t]) riesgoCount[map[t]]++;
  }));
  // Conteos por estado KPI
  const kpiCount: Record<string,number> = { "Completado":0,"En Curso":0,"En Espera":0,"Atrasado":0,"No Iniciado":0 };
  kpis.forEach(k => { kpiCount[normEstadoKPI(k)]++; });

  // Ranking top 5 granjas por hallazgos
  const rankG = granjas.map(g => ({
    nombre: g.nombre,
    hall: hallazgos.filter(h => h.granjaId===g.id).length,
    crit: hallazgos.filter(h => h.granjaId===g.id && normCriticidad(h.criticidad)==="Crítica").length,
  })).filter(r=>r.hall>0).sort((a,b)=>b.hall-a.hall).slice(0,5);

  const barra = (label:string, val:number, max:number, color:string) => `
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:2px">
        <span>${label}</span><strong style="color:${color}">${val}</strong>
      </div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${max>0?Math.round(val/max*100):0}%;background:${color};border-radius:4px"></div>
      </div>
    </div>`;
  const maxCrit = Math.max(1, ...Object.values(critCount));
  const maxRiesgo = Math.max(1, ...Object.values(riesgoCount));
  const maxKpi = Math.max(1, ...Object.values(kpiCount));

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    <!-- PORTADA -->
    <div style="background:linear-gradient(135deg,#0D1526,#1a2847);color:#fff;padding:48px 40px">
      <div style="font-size:11px;letter-spacing:3px;color:#4A7AFF;text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
      <h1 style="font-size:30px;margin:14px 0 6px;font-weight:800">${titulo}</h1>
      <p style="font-size:14px;color:#94A3B8;margin:0">${subtitulo}</p>
      <div style="margin-top:28px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);font-size:12px;color:#cbd5e1">
        <strong style="color:#fff">${EMPRESA.nombre}</strong> · NIT ${EMPRESA.nit}<br>
        Fecha de generación: ${hoy}
      </div>
      ${filtrosTxt.length ? `<div style="margin-top:14px;font-size:11px;color:#94A3B8">
        <strong style="color:#4A7AFF">Filtros aplicados:</strong> ${filtrosTxt.join(" · ")}
      </div>` : `<div style="margin-top:14px;font-size:11px;color:#94A3B8">Reporte completo — sin filtros aplicados</div>`}
    </div>

    <div style="padding:32px 40px">
      <!-- RESUMEN EJECUTIVO -->
      <h2 style="font-size:16px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 16px">Resumen Ejecutivo</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
        ${[
          {l:"Granjas",v:granjas.length,c:"#4A7AFF"},
          {l:"Hallazgos",v:totalHall,c:"#F59E0B"},
          {l:"Críticos",v:criticos,c:"#EF4444"},
          {l:"Hallazgos Abiertos",v:abiertos,c:"#F97316"},
          {l:"KPIs",v:totalKpi,c:"#8B5CF6"},
          {l:"Cumplimiento",v:cumpl+"%",c:"#22C55E"},
        ].map(k=>`<div style="border:1px solid #e2e8f0;border-top:3px solid ${k.c};border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:800;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;margin-top:4px">${k.l}</div>
        </div>`).join("")}
      </div>

      <!-- DISTRIBUCIONES -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px">
          <h3 style="font-size:12px;margin:0 0 12px;color:#0D1526">Hallazgos por Criticidad</h3>
          ${barra("Crítica", critCount["Crítica"], maxCrit, "#EF4444")}
          ${barra("Alta", critCount["Alta"], maxCrit, "#F59E0B")}
          ${barra("Media", critCount["Media"], maxCrit, "#FBBF24")}
          ${barra("Baja", critCount["Baja"], maxCrit, "#22C55E")}
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px">
          <h3 style="font-size:12px;margin:0 0 12px;color:#0D1526">Riesgos por Tipo</h3>
          ${barra("Operativo", riesgoCount["Operativo"], maxRiesgo, "#4A7AFF")}
          ${barra("Financiero", riesgoCount["Financiero"], maxRiesgo, "#F59E0B")}
          ${barra("Legal", riesgoCount["Legal"], maxRiesgo, "#EF4444")}
          ${barra("Reputacional", riesgoCount["Reputacional"], maxRiesgo, "#8B5CF6")}
          ${barra("Contagio", riesgoCount["Contagio"], maxRiesgo, "#EC4899")}
        </div>
      </div>

      <!-- CUMPLIMIENTO KPI -->
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
        <h3 style="font-size:12px;margin:0 0 12px;color:#0D1526">Cumplimiento KPI por Estado</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            ${barra("Completado", kpiCount["Completado"], maxKpi, "#22C55E")}
            ${barra("En Curso", kpiCount["En Curso"], maxKpi, "#4A7AFF")}
            ${barra("En Espera", kpiCount["En Espera"], maxKpi, "#FBBF24")}
          </div>
          <div>
            ${barra("Atrasado", kpiCount["Atrasado"], maxKpi, "#EF4444")}
            ${barra("No Iniciado", kpiCount["No Iniciado"], maxKpi, "#94A3B8")}
          </div>
        </div>
      </div>

      <!-- RANKING -->
      <h2 style="font-size:16px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 16px">Ranking de Granjas (Top 5 por Hallazgos)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px">
        <thead><tr style="background:#f8fafc">
          <th style="text-align:left;padding:8px;border-bottom:2px solid #e2e8f0">#</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #e2e8f0">Granja</th>
          <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Hallazgos</th>
          <th style="text-align:center;padding:8px;border-bottom:2px solid #e2e8f0">Críticos</th>
        </tr></thead>
        <tbody>
          ${rankG.map((r,i)=>`<tr>
            <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;color:#94a3b8">${i+1}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-weight:600">${r.nombre}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center">${r.hall}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:#EF4444;font-weight:700">${r.crit}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <!-- HALLAZGOS DETALLE (primeros 25) -->
      <h2 style="font-size:16px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 16px">Detalle de Hallazgos${totalHall>25?` (primeros 25 de ${totalHall})`:""}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:24px">
        <thead><tr style="background:#f8fafc">
          <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">Hallazgo</th>
          <th style="text-align:left;padding:6px;border-bottom:2px solid #e2e8f0">Auditor</th>
          <th style="text-align:center;padding:6px;border-bottom:2px solid #e2e8f0">Criticidad</th>
          <th style="text-align:center;padding:6px;border-bottom:2px solid #e2e8f0">Estado</th>
          <th style="text-align:center;padding:6px;border-bottom:2px solid #e2e8f0">Fecha</th>
        </tr></thead>
        <tbody>
          ${hallazgos.slice(0,25).map(h=>`<tr>
            <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${(h.titulo||"—").slice(0,40)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">${h.auditorNombre||"—"}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${normCriticidad(h.criticidad)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${normEstadoHallazgo(h.estado)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${fmtFecha(h.fechaVisita)}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <!-- CONCLUSIONES -->
      <h2 style="font-size:16px;border-left:4px solid #4A7AFF;padding-left:10px;margin:0 0 16px">Conclusiones y Recomendaciones</h2>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:11px;line-height:1.7;color:#475569">
        <p style="margin:0 0 8px"><strong>Estado general:</strong> Se identificaron ${totalHall} hallazgos, de los cuales ${criticos} son de criticidad Crítica (${totalHall>0?Math.round(criticos/totalHall*100):0}%) y ${abiertos} permanecen abiertos.</p>
        <p style="margin:0 0 8px"><strong>Cumplimiento:</strong> El cumplimiento global de KPIs es del ${cumpl}% (${kpiComp} de ${totalKpi} completados). ${kpiCount["Atrasado"]>0?`Existen ${kpiCount["Atrasado"]} KPIs atrasados que requieren atención inmediata.`:"No hay KPIs atrasados."}</p>
        <p style="margin:0 0 8px"><strong>Riesgo predominante:</strong> ${Object.entries(riesgoCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—"} es el tipo de riesgo más frecuente.</p>
        <p style="margin:0"><strong>Recomendación:</strong> Priorizar el cierre de hallazgos críticos abiertos y el seguimiento de los KPIs atrasados. ${rankG[0]?`La granja "${rankG[0].nombre}" concentra la mayor cantidad de hallazgos (${rankG[0].hall}) y requiere atención prioritaria.`:""}</p>
      </div>

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
        ${EMPRESA.nombre} · ${EMPRESA.area} · Documento generado automáticamente por la Plataforma de Auditoría · ${hoy}
      </div>
    </div>
  </div>`;
}

// ── Generación de XLSX ejecutivo (hojas por categoría + resumen) ────────────
async function generarXLSX(opts: {
  granjas: any[]; hallazgos: any[]; kpis: any[]; filename: string;
}): Promise<void> {
  const { granjas, hallazgos, kpis, filename } = opts;
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen Ejecutivo
  const totalHall = hallazgos.length;
  const criticos = hallazgos.filter(h => normCriticidad(h.criticidad)==="Crítica").length;
  const totalKpi = kpis.length;
  const kpiComp = kpis.filter(k => normEstadoKPI(k)==="Completado").length;
  const cumpl = totalKpi>0 ? Math.round(kpiComp/totalKpi*100) : 0;
  const resumen = [
    ["POLLOS SAVICOL S.A.S. — REPORTE EJECUTIVO DE AUDITORÍA"],
    ["NIT", "860.403.972-5"],
    ["Fecha de generación", new Date().toLocaleDateString("es-CO")],
    [],
    ["INDICADOR", "VALOR"],
    ["Total Granjas", granjas.length],
    ["Total Hallazgos", totalHall],
    ["Hallazgos Críticos", criticos],
    ["Hallazgos Abiertos", hallazgos.filter(h=>normEstadoHallazgo(h.estado)==="Abierto").length],
    ["Total KPIs", totalKpi],
    ["KPIs Completados", kpiComp],
    ["Cumplimiento Global (%)", cumpl],
    [],
    ["DISTRIBUCIÓN POR CRITICIDAD", ""],
    ["Crítica", hallazgos.filter(h=>normCriticidad(h.criticidad)==="Crítica").length],
    ["Alta", hallazgos.filter(h=>normCriticidad(h.criticidad)==="Alta").length],
    ["Media", hallazgos.filter(h=>normCriticidad(h.criticidad)==="Media").length],
    ["Baja", hallazgos.filter(h=>normCriticidad(h.criticidad)==="Baja").length],
    [],
    ["DISTRIBUCIÓN POR TIPO DE RIESGO", ""],
    ...["Operativo","Reputacional","Financiero","Legal","Contagio"].map(tipo => {
      const map: Record<string,string> = {Operativo:"OPERATIVO",Reputacional:"REPUTACIONAL",Financiero:"FINANCIERO",Legal:"LEGAL",Contagio:"CONTAGIO"};
      return [tipo, hallazgos.filter(h=>normTipoRiesgo(h.tiposRiesgo).includes(map[tipo])).length];
    }),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen["!cols"] = [{wch:32},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

  // Hoja 2: Hallazgos (datos estructurados)
  const hallData = hallazgos.map(h => ({
    "Granja": granjas.find(g=>g.id===h.granjaId)?.nombre || "—",
    "Hallazgo": h.titulo || "—",
    "Descripción": (h.descripcion || "").slice(0,200),
    "Auditor": h.auditorNombre || "—",
    "Criticidad": normCriticidad(h.criticidad),
    "Estado": normEstadoHallazgo(h.estado),
    "Tipos de Riesgo": normTipoRiesgo(h.tiposRiesgo).join(", "),
    "Categoría": h.categoria || "—",
    "Fecha Visita": fmtFecha(h.fechaVisita),
  }));
  const wsHall = XLSX.utils.json_to_sheet(hallData);
  wsHall["!cols"] = [{wch:22},{wch:30},{wch:40},{wch:18},{wch:12},{wch:12},{wch:24},{wch:16},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsHall, "Hallazgos");

  // Hoja 3: KPIs
  const kpiData = kpis.map(k => ({
    "Granja": granjas.find(g=>g.id===k.granjaId)?.nombre || "—",
    "Acción": k.accion || "—",
    "Estado": normEstadoKPI(k),
    "Avance (%)": k.porcentajeAvance ?? 0,
    "Responsable": k.responsable || "—",
    "Fecha Compromiso": fmtFecha(k.fechaCompromiso),
    "Fecha Cumplimiento": fmtFecha(k.fechaCumplimiento),
  }));
  const wsKpi = XLSX.utils.json_to_sheet(kpiData);
  wsKpi["!cols"] = [{wch:22},{wch:36},{wch:14},{wch:11},{wch:20},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsKpi, "Cumplimiento KPI");

  // Hoja 4: Ranking de Granjas
  const rankData = granjas.map(g => {
    const gh = hallazgos.filter(h=>h.granjaId===g.id);
    const gk = kpis.filter(k=>k.granjaId===g.id);
    const comp = gk.filter(k=>normEstadoKPI(k)==="Completado").length;
    return {
      "Granja": g.nombre,
      "Código": g.codigo || "—",
      "Región": g.region || "—",
      "Total Hallazgos": gh.length,
      "Críticos": gh.filter(h=>normCriticidad(h.criticidad)==="Crítica").length,
      "Total KPIs": gk.length,
      "Cumplimiento (%)": gk.length>0 ? Math.round(comp/gk.length*100) : 0,
    };
  }).sort((a,b)=>b["Total Hallazgos"]-a["Total Hallazgos"]);
  const wsRank = XLSX.utils.json_to_sheet(rankData);
  wsRank["!cols"] = [{wch:24},{wch:12},{wch:16},{wch:14},{wch:10},{wch:11},{wch:15}];
  XLSX.utils.book_append_sheet(wb, wsRank, "Ranking Granjas");

  XLSX.writeFile(wb, filename);
}

// ── Definición de reportes ───────────────────────────────────────────────────
const REPORTES = [
  { id:"ejecutivo",   label:"Reporte Ejecutivo Integral", desc:"Resumen completo: KPIs, hallazgos, riesgos, rankings y conclusiones", icon:Award,          formatos:["PDF","Excel"] },
  { id:"hallazgos",   label:"Reporte de Hallazgos",        desc:"Listado completo de hallazgos con criticidad y estado",             icon:AlertTriangle,  formatos:["PDF","Excel"] },
  { id:"kpi",         label:"Cumplimiento KPI",            desc:"Estado de KPIs, avance, vencimientos y responsables",               icon:Target,         formatos:["PDF","Excel"] },
  { id:"riesgos",     label:"Análisis de Riesgos",         desc:"Distribución por tipo de riesgo y exposición acumulada",            icon:BarChart3,      formatos:["PDF","Excel"] },
  { id:"ranking",     label:"Ranking de Granjas",          desc:"Benchmarking entre granjas por indicadores clave",                  icon:GitCompare,     formatos:["Excel","PDF"] },
  { id:"criticos",    label:"Riesgos Críticos",            desc:"Solo hallazgos críticos requiriendo atención inmediata",            icon:AlertTriangle,  formatos:["PDF","Excel"] },
];

const SEL = "bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#4A7AFF] outline-none";

export default function ReportesPage() {
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos = useGranjasStore(useShallow((s) => s.hallazgos));
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));

  const [fGranja, setFGranja]         = useState("");
  const [fAuditor, setFAuditor]       = useState("");
  const [fCriticidad, setFCriticidad] = useState("");
  const [fRiesgo, setFRiesgo]         = useState("");
  const [generando, setGenerando]     = useState<string>("");

  const hayFiltros = !!(fGranja||fAuditor||fCriticidad||fRiesgo);
  const limpiar = () => { setFGranja("");setFAuditor("");setFCriticidad("");setFRiesgo(""); };

  // Datos filtrados (compartidos por todos los reportes)
  const { hallF, kpiF, granjaF, filtrosTxt } = useMemo(() => {
    let hF = hallazgos;
    if (fGranja)     hF = hF.filter(h => h.granjaId === fGranja);
    if (fAuditor)    hF = hF.filter(h => h.auditorId === fAuditor || h.auditorNombre === AUDITORS.find(a=>a.id===fAuditor)?.name);
    if (fCriticidad) hF = hF.filter(h => normCriticidad(h.criticidad) === fCriticidad);
    if (fRiesgo)     hF = hF.filter(h => normTipoRiesgo(h.tiposRiesgo).includes(sinAcentos(fRiesgo.toUpperCase())));
    const hIds = new Set(hF.map(h=>h.id));
    let kF = kpis;
    if (fGranja)  kF = kF.filter(k => k.granjaId === fGranja);
    if (fAuditor||fCriticidad||fRiesgo) kF = kF.filter(k => hIds.has(k.hallazgoId));
    const gIds = new Set([...hF.map(h=>h.granjaId), ...kF.map(k=>k.granjaId)]);
    const gF = fGranja ? granjas.filter(g=>g.id===fGranja) : granjas;
    const txt: string[] = [];
    if (fGranja)     txt.push(`Granja: ${granjas.find(g=>g.id===fGranja)?.nombre||fGranja}`);
    if (fAuditor)    txt.push(`Auditor: ${AUDITORS.find(a=>a.id===fAuditor)?.name||fAuditor}`);
    if (fCriticidad) txt.push(`Criticidad: ${fCriticidad}`);
    if (fRiesgo)     txt.push(`Riesgo: ${fRiesgo}`);
    return { hallF: hF, kpiF: kF, granjaF: gF, filtrosTxt: txt };
  }, [hallazgos, kpis, granjas, fGranja, fAuditor, fCriticidad, fRiesgo]);

  // Filtrar datos por tipo de reporte
  function datosPorReporte(id: string) {
    let h = hallF, k = kpiF;
    if (id === "criticos") h = hallF.filter(x => normCriticidad(x.criticidad)==="Crítica");
    return { granjas: granjaF, hallazgos: h, kpis: k };
  }

  async function descargarPDF(rep: typeof REPORTES[number]) {
    setGenerando(rep.id+"-pdf");
    try {
      const d = datosPorReporte(rep.id);
      const html = construirHTMLReporte({
        titulo: rep.label, subtitulo: rep.desc,
        granjas: d.granjas, hallazgos: d.hallazgos, kpis: d.kpis, filtrosTxt,
      });
      await generarPDFDesdeHTML(html, `${rep.label.replace(/ /g,"-")}-Savicol-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e:any) {
      alert("Error al generar el PDF: " + (e?.message||"desconocido"));
    } finally { setGenerando(""); }
  }

  async function descargarExcel(rep: typeof REPORTES[number]) {
    setGenerando(rep.id+"-excel");
    try {
      const d = datosPorReporte(rep.id);
      await generarXLSX({
        granjas: d.granjas, hallazgos: d.hallazgos, kpis: d.kpis,
        filename: `${rep.label.replace(/ /g,"-")}-Savicol-${new Date().toISOString().slice(0,10)}.xlsx`,
      });
    } catch (e:any) {
      alert("Error al generar el Excel: " + (e?.message||"desconocido"));
    } finally { setGenerando(""); }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Reportes Ejecutivos"
        subtitle={`Exportación PDF · Excel · Dashboard BI · ${hallF.length} hallazgos · ${kpiF.length} KPIs en alcance`}
      />

      <div className="flex-1 p-6 space-y-6">

        {/* FILTROS */}
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[#4A7AFF]"/>
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Filtros de Exportación</span>
            {hayFiltros && (
              <button onClick={limpiar} className="ml-auto flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-white">
                <X className="w-3 h-3"/> Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Granja</span>
              <select value={fGranja} onChange={e=>setFGranja(e.target.value)} className={SEL}>
                <option value="">Todas</option>
                {granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Auditor</span>
              <select value={fAuditor} onChange={e=>setFAuditor(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {AUDITORS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Criticidad</span>
              <select value={fCriticidad} onChange={e=>setFCriticidad(e.target.value)} className={SEL}>
                <option value="">Todas</option>
                {CRITICIDAD.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#64748B] px-1">Tipo de Riesgo</span>
              <select value={fRiesgo} onChange={e=>setFRiesgo(e.target.value)} className={SEL}>
                <option value="">Todos</option>
                {TIPO_RIESGO.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {hayFiltros && (
            <p className="text-[10px] text-[#4A7AFF] mt-2">
              Los reportes se generarán únicamente con los registros que cumplen estos filtros.
            </p>
          )}
        </div>

        {/* GRID DE REPORTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => {
            const cargandoPdf = generando === r.id+"-pdf";
            const cargandoXls = generando === r.id+"-excel";
            return (
              <div key={r.id} className="card-base flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <r.icon className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-[#1E2D4A] mt-auto">
                  {r.formatos.includes("PDF") && (
                    <button onClick={()=>descargarPDF(r)} disabled={!!generando}
                      className="btn-ghost text-xs flex items-center gap-1.5 flex-1 justify-center py-1.5 hover:bg-[#1A2540] disabled:opacity-40">
                      {cargandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>}
                      PDF
                    </button>
                  )}
                  {r.formatos.includes("Excel") && (
                    <button onClick={()=>descargarExcel(r)} disabled={!!generando}
                      className="btn-ghost text-xs flex items-center gap-1.5 flex-1 justify-center py-1.5 hover:bg-[#1A2540] disabled:opacity-40">
                      {cargandoXls ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5"/>}
                      Excel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* DASHBOARD BI */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#16213e] border-[#4A7AFF]/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#4A7AFF]/15 border border-[#4A7AFF]/30 flex items-center justify-center text-[#4A7AFF]">
                <BarChart3 className="w-6 h-6"/>
              </div>
              <div>
                <h3 className="font-display font-semibold text-white">Dashboard BI Interactivo</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Visualizaciones ejecutivas dinámicas: cumplimiento, hallazgos, riesgos y rankings.</p>
              </div>
            </div>
            <a href="/granjas/ranking"
              className="btn-primary text-sm bg-[#4A7AFF] hover:bg-[#3D6AE8] flex items-center gap-2 px-4 py-2 font-semibold rounded-lg">
              <BarChart3 className="w-4 h-4"/> Abrir Dashboard BI
            </a>
          </div>
        </div>

        {/* NOTA */}
        <p className="text-xs text-[#475569] text-center">
          Los reportes PDF y Excel se generan en tu navegador con los datos reales filtrados. Sin datos ficticios.
          El Dashboard BI ofrece visualización interactiva en tiempo real dentro de la plataforma.
        </p>
      </div>
    </div>
  );
}
