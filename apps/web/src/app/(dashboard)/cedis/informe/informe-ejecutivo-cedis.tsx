"use client";
import { useState, useMemo } from "react";
import { X, FileText, Download, Loader2, Sparkles, Building2, Filter, Calendar } from "lucide-react";
import { LOGO_SAVICOL } from "../cumplimiento/savicol-logo";
import { evidenciasGridHTML } from "@/lib/pdf-evidencias";

/* ════════════════════════════════════════════════════════════════════════════
   INFORME EJECUTIVO CEDIS — Exportar PDF (17 secciones)
   Consolida Consolidado + Cumplimiento + Evidencias para un CEDI y fecha.
   Secciones narrativas generadas por IA en UNA sola llamada (/api/ai/informe-cedis).
   Gráficas con datos reales (Hallazgos y Cumplimiento). Sin datos ficticios.
   ════════════════════════════════════════════════════════════════════════════ */

const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-4", area: "Control Interno y Auditoría · CEDIS" };

const sinAcentos = (s: string) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  if (v === "ABIERTO")         return "Abierto";
  if (v === "EN_PLAN")         return "En Plan";
  if (v === "EN_VERIFICACION") return "En Verificación";
  if (v === "CERRADO")         return "Cerrado";
  if (v === "REINCIDENTE")     return "Reincidente";
  return e || "—";
};
const fmtFecha = (d?: string) => {
  if (!d) return "—";
  const t = new Date(d);
  return isNaN(t.getTime()) ? "—" : t.toLocaleDateString("es-CO", { day:"2-digit", month:"2-digit", year:"numeric" });
};

// ── Generación de PDF (jsPDF + html2canvas, multipágina) ────────────────────
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

// ── Cálculo de indicadores ──────────────────────────────────────────────────
function calcular(hallazgos: any[]) {
  const total = hallazgos.length;
  const criticos = hallazgos.filter(h => normCrit(h.criticidad)==="Crítica").length;
  const altos    = hallazgos.filter(h => normCrit(h.criticidad)==="Alta").length;
  const cerrados = hallazgos.filter(h => normEstado(h.estado)==="Cerrado").length;
  const abiertos = hallazgos.filter(h => normEstado(h.estado)==="Abierto").length;
  const cumplimiento = total>0 ? Math.round(cerrados/total*100) : 0;
  const critCount = { "Crítica":criticos, "Alta":altos,
    "Media": hallazgos.filter(h=>normCrit(h.criticidad)==="Media").length,
    "Baja":  hallazgos.filter(h=>normCrit(h.criticidad)==="Baja").length };
  const estadoCount: Record<string,number> = {};
  hallazgos.forEach(h => { const e = normEstado(h.estado); estadoCount[e] = (estadoCount[e]??0)+1; });
  const catCount: Record<string,number> = {};
  hallazgos.forEach(h => { const c = h.categoria || "—"; catCount[c] = (catCount[c]??0)+1; });
  return { total, criticos, altos, cerrados, abiertos, cumplimiento, critCount, estadoCount, catCount };
}

// ── Gráficas SVG ejecutivas ─────────────────────────────────────────────────
function svgBarras(titulo: string, datos: { label: string; val: number; color: string }[]): string {
  const max = Math.max(1, ...datos.map(d => d.val));
  return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px">
    <h4 style="font-size:11px;margin:0 0 10px;color:#0D1526">${titulo}</h4>
    ${datos.map(d => `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#475569;margin-bottom:2px"><span>${d.label}</span><strong style="color:${d.color}">${d.val}</strong></div>
      <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(d.val/max*100)}%;background:${d.color};border-radius:3px"></div></div>
    </div>`).join("")}
  </div>`;
}

function svgDona(datos: { label: string; val: number; color: string }[], titulo: string): string {
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

// Estado de planes de cumplimiento: Completado/En curso/Pendiente/Atrasado
function clasificarPlan(h: any): "Completado"|"En curso"|"Pendiente"|"Atrasado" {
  const est = normEstado(h.estado);
  if (est === "Cerrado") return "Completado";
  if (est === "En Plan" || est === "En Verificación") {
    if (h.fechaCompromiso) {
      const fc = new Date(h.fechaCompromiso);
      if (!isNaN(fc.getTime()) && fc < new Date()) return "Atrasado";
    }
    return "En curso";
  }
  return "Pendiente";
}

// ── Evidencias fotográficas desde Consolidado (bloques [FOTOS] por cediId) ──
function extraerEvidencias(auditorias: any[], cediId: string): { area: string; d: string; f: string }[] {
  const campos = ["observacionInventario","observacionCaja","observacionCartera","observacionLogistica","observacionBioseguridad","observacionInfraestructura","observacionProcedimientos","observacionRiesgo"];
  const fotos: { area: string; d: string; f: string }[] = [];
  auditorias.filter(a => a.cediId === cediId).forEach(a => {
    campos.forEach(campo => {
      const txt = a[campo] ?? "";
      const m = txt.match(/\[FOTOS\]([\s\S]*?)\[\/FOTOS\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[1]);
          if (Array.isArray(arr)) arr.forEach((ff: any) => fotos.push({ area: campo.replace("observacion",""), d: ff.d, f: ff.f }));
        } catch { /* ignore */ }
      }
    });
  });
  return fotos;
}

// ── Construcción del HTML del informe (17 secciones) ────────────────────────
function seccionTexto(num: number, titulo: string, contenido: string, generadaIA = false): string {
  return `<div style="margin-bottom:20px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 8px">
      ${num}. ${titulo}
    </h2>
    <p style="font-size:11px;line-height:1.7;color:#334155;margin:0;text-align:justify">${(contenido || "—").replace(/\n/g, "<br>")}</p>
  </div>`;
}

function construirInformeEjecutivo(opts: {
  cediNombre: string; fechaVisita: string; auditor: string; administrador: string;
  hallazgos: any[]; planes: any[]; evidencias: { area: string; d: string; f: string }[];
  secciones: Record<string, string>; usuario: string;
}): string {
  const { cediNombre, fechaVisita, auditor, administrador, hallazgos, planes, evidencias, secciones, usuario } = opts;
  const k = calcular(hallazgos);
  const hoy = new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" });
  const S = (key: string) => secciones[key] || "Sección no disponible.";

  // Portada corporativa
  const portada = `<div style="background:linear-gradient(135deg,#0D1526,#0A2D1F);color:#fff;padding:40px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;gap:22px">
      <img src="${LOGO_SAVICOL}" alt="Pollos Savicol S.A.S." style="width:80px;height:auto;border-radius:6px;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-size:11px;letter-spacing:3px;color:#10B981;text-transform:uppercase;font-weight:700">${EMPRESA.area}</div>
        <h1 style="font-size:26px;margin:10px 0 4px;font-weight:800">Informe Ejecutivo de Auditoría</h1>
        <p style="font-size:15px;color:#94A3B8;margin:0">CEDI ${cediNombre}</p>
      </div>
    </div>
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.15);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#cbd5e1">
      <div><strong style="color:#fff">Empresa:</strong> ${EMPRESA.nombre}</div>
      <div><strong style="color:#fff">NIT:</strong> ${EMPRESA.nit}</div>
      <div><strong style="color:#fff">CEDI evaluado:</strong> ${cediNombre}</div>
      <div><strong style="color:#fff">Fecha de visita:</strong> ${fmtFecha(fechaVisita)}</div>
      <div><strong style="color:#fff">Auditor responsable:</strong> ${auditor || "—"}</div>
      <div><strong style="color:#fff">Líder del proceso:</strong> ${administrador || "—"}</div>
      <div><strong style="color:#fff">Fecha de generación:</strong> ${hoy}</div>
      <div><strong style="color:#fff">Generado por:</strong> ${usuario}</div>
    </div>
  </div>`;

  // Sección 8: Condiciones y Hallazgos (tabla, datos reales de Consolidado)
  const tablaHallazgos = `<div style="margin-bottom:20px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 8px">8. Condiciones y Hallazgos</h2>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead><tr style="background:#f8fafc">
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Categoría</th>
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Subtema</th>
        <th style="text-align:left;padding:5px;border-bottom:2px solid #e2e8f0">Hallazgo</th>
        <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Criticidad</th>
        <th style="text-align:center;padding:5px;border-bottom:2px solid #e2e8f0">Estado</th>
      </tr></thead><tbody>
      ${hallazgos.map(h => `<tr>
        <td style="padding:5px;border-bottom:1px solid #f1f5f9">${h.categoria || "—"}</td>
        <td style="padding:5px;border-bottom:1px solid #f1f5f9">${h.subtema || "—"}</td>
        <td style="padding:5px;border-bottom:1px solid #f1f5f9">${(h.titulo || "—")}<br><span style="color:#94a3b8;font-size:8px">${(h.descripcion || "").slice(0,90)}</span></td>
        <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${normCrit(h.criticidad)}</td>
        <td style="padding:5px;border-bottom:1px solid #f1f5f9;text-align:center">${normEstado(h.estado)}</td>
      </tr>`).join("")}
      </tbody></table>
  </div>`;

  // Sección 12: Planes de Acción (datos reales de Cumplimiento)
  const tablaPlanes = `<div style="margin-bottom:20px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 8px">12. Planes de Acción</h2>
    ${planes.length === 0 ? '<p style="font-size:11px;color:#94a3b8">Sin planes de acción registrados.</p>' :
      planes.map(p => `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:#0D1526">${p.titulo || "—"}</div>
        <div style="font-size:9px;color:#94a3b8;margin:3px 0">Responsable: ${p.responsable || "—"} · Estado: ${normEstado(p.estado)} · Compromiso: ${fmtFecha(p.fechaCompromiso)}</div>
        ${p.recomendacionIA ? `<div style="font-size:9.5px;color:#166534;background:#f0fdf4;border-radius:5px;padding:7px;margin-top:4px"><strong>Recomendación:</strong> ${p.recomendacionIA.replace(/[#*]/g,"").slice(0,260)}</div>` : ""}
      </div>`).join("")}
  </div>`;

  // Sección 13: Gráficas ejecutivas (datos reales: hallazgos + cumplimiento)
  const planesClasif = { "Completado":0, "En curso":0, "Pendiente":0, "Atrasado":0 };
  hallazgos.forEach(h => { planesClasif[clasificarPlan(h)]++; });
  const graficas = `<div style="margin-bottom:20px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 12px">13. Gráficas Ejecutivas</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${svgDona(Object.entries(k.critCount).map(([l,v])=>({label:l,val:v as number,color:l==="Crítica"?"#EF4444":l==="Alta"?"#F59E0B":l==="Media"?"#FBBF24":"#22C55E"})), "Hallazgos por Criticidad")}
      ${svgBarras("Hallazgos por Categoría", Object.entries(k.catCount).map(([l,v])=>({label:l,val:v as number,color:"#4A7AFF"})))}
      ${svgBarras("Hallazgos por Estado", Object.entries(k.estadoCount).map(([l,v])=>({label:l,val:v as number,color:"#8B5CF6"})))}
      ${svgBarras("Estado de Planes de Acción", Object.entries(planesClasif).map(([l,v])=>({label:l,val:v as number,color:l==="Completado"?"#22C55E":l==="En curso"?"#4A7AFF":l==="Atrasado"?"#EF4444":"#94A3B8"})))}
    </div>
    <p style="font-size:8px;color:#cbd5e1;margin-top:6px;font-style:italic">Nota: las gráficas de mortalidad e inventario no se incluyen por no existir registros estructurados en el módulo Consolidado.</p>
  </div>`;

  // Sección 16: Evidencias fotográficas (de Consolidado)
  const evidenciasHtml = evidencias.length === 0 ? "" : `<div style="margin-bottom:20px">
    <h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 8px">16. Evidencias Fotográficas</h2>
    ${evidenciasGridHTML(evidencias.map(ev => ({ src: ev.d, titulo: ev.area, pie: fmtFecha(ev.f) })), { max: 12 })}
  </div>`;

  const pie = `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center">
    ${EMPRESA.nombre} · ${EMPRESA.area} · Informe generado automáticamente · ${hoy}
  </div>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0D1526;width:794px">
    ${portada}
    <div style="padding:0 40px 30px">
      ${seccionTexto(1, "Resumen Ejecutivo", S("resumenEjecutivo"), true)}
      ${seccionTexto(2, "Objetivo de la Auditoría", S("objetivo"), true)}
      ${seccionTexto(3, "Alcance de la Auditoría", S("alcance"), true)}
      ${seccionTexto(4, "Enfoque de la Auditoría", S("enfoque"), true)}
      ${seccionTexto(5, "Métodos y Procedimientos Técnicos", S("metodos"), true)}
      ${seccionTexto(6, "Marco Legal y Normativo", S("marcoLegal"), true)}
      ${seccionTexto(7, "", "", false).replace(/<h2[\s\S]*?<\/h2>/, '<h2 style="font-size:15px;color:#0D1526;border-left:4px solid #10B981;padding-left:10px;margin:0 0 8px">7. Síntesis de Hallazgos</h2>').replace("—", `Se identificaron ${k.total} hallazgos: ${k.criticos} críticos, ${k.altos} altos. Cumplimiento global del ${k.cumplimiento}%.`)}
      ${tablaHallazgos}
      ${seccionTexto(9, "Efectos y Consecuencias", S("efectos"), true)}
      ${seccionTexto(10, "Controles Existentes", S("controles"), true)}
      ${seccionTexto(11, "Fortalezas Identificadas", S("fortalezas"), true)}
      ${tablaPlanes}
      ${graficas}
      ${seccionTexto(14, "Conclusiones", S("conclusiones"), true)}
      ${seccionTexto(15, "Recomendaciones", S("recomendaciones"), true)}
      ${evidenciasHtml}
      ${pie}
    </div>
  </div>`;
}

// ── Modal generador del informe ejecutivo ───────────────────────────────────
export function InformeEjecutivoModal({ cedis, hallazgos, auditorias, usuario, onClose }: {
  cedis: { id: string; nombre: string }[];
  hallazgos: any[];
  auditorias: any[];
  usuario: string;
  onClose: () => void;
}) {
  const [cediId, setCediId]   = useState("");
  const [fecha, setFecha]     = useState("");   // YYYY-MM (mes de visita) opcional
  const [fase, setFase]       = useState<"idle"|"ia"|"pdf">("idle");
  const [error, setError]     = useState<string | null>(null);

  const cedisMap = useMemo(() => Object.fromEntries(cedis.map(c => [c.id, c.nombre])), [cedis]);

  // Auditoría del CEDI seleccionado (para auditor, administrador, fecha real, observaciones)
  const auditoriaSel = useMemo(() => {
    const delCedi = auditorias.filter(a => a.cediId === cediId);
    if (fecha) {
      const match = delCedi.find(a => (a.fechaVisita ?? "").slice(0,7) === fecha);
      if (match) return match;
    }
    return delCedi[0] ?? null;
  }, [auditorias, cediId, fecha]);

  // Hallazgos del CEDI (de Cumplimiento)
  const hallazgosCedi = useMemo(() => hallazgos.filter(h => h.cediId === cediId), [hallazgos, cediId]);

  async function exportar() {
    if (!cediId) { setError("Selecciona un CEDI"); return; }
    if (hallazgosCedi.length === 0 && !auditoriaSel) { setError("Este CEDI no tiene datos de auditoría ni hallazgos"); return; }
    setError(null);

    try {
      // 1) Generar secciones narrativas con IA (una sola llamada)
      setFase("ia");
      const k = calcular(hallazgosCedi);
      const observaciones = auditoriaSel
        ? ["observacionInventario","observacionCaja","observacionCartera","observacionLogistica","observacionBioseguridad","observacionInfraestructura","observacionProcedimientos","observacionRiesgo"]
            .map(c => auditoriaSel[c]).filter(Boolean).join(" | ").replace(/\[FOTOS\][\s\S]*?\[\/FOTOS\]/g, "").slice(0, 1500)
        : "";
      const resp = await fetch("/api/ai/informe-cedis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedi: cedisMap[cediId],
          fechaVisita: auditoriaSel?.fechaVisita ?? "",
          auditor: auditoriaSel?.auditorNombre ?? "",
          administrador: auditoriaSel?.administrador ?? "",
          hallazgos: hallazgosCedi.map(h => ({ categoria:h.categoria, subtema:h.subtema, titulo:h.titulo, descripcion:h.descripcion, criticidad:normCrit(h.criticidad), estado:normEstado(h.estado), tipoRiesgo:h.tipoRiesgo })),
          planes: hallazgosCedi.map(h => ({ titulo:h.titulo, responsable:h.responsable, estado:normEstado(h.estado), fechaCompromiso:h.fechaCompromiso, recomendacionIA:h.recomendacionIA })),
          indicadores: { total:k.total, criticos:k.criticos, altos:k.altos, abiertos:k.abiertos, cerrados:k.cerrados, cumplimiento:k.cumplimiento },
          observaciones,
        }),
      });
      let secciones: Record<string,string> = {};
      if (resp.ok) {
        const data = await resp.json();
        secciones = data.secciones ?? {};
      } else {
        // Si la IA falla, continuar con secciones vacías (el informe se genera igual con datos reales)
        secciones = {};
      }

      // 2) Construir HTML y generar PDF
      setFase("pdf");
      const evidencias = extraerEvidencias(auditorias, cediId);
      const html = construirInformeEjecutivo({
        cediNombre: cedisMap[cediId], fechaVisita: auditoriaSel?.fechaVisita ?? "",
        auditor: auditoriaSel?.auditorNombre ?? "", administrador: auditoriaSel?.administrador ?? "",
        hallazgos: hallazgosCedi, planes: hallazgosCedi, evidencias, secciones, usuario,
      });
      await generarPDF(html, `Informe-Ejecutivo-${cedisMap[cediId].replace(/ /g,"-")}-${new Date().toISOString().slice(0,10)}.pdf`);
      onClose();
    } catch (e: any) {
      setError("Error al generar el informe: " + (e?.message ?? "desconocido"));
    } finally {
      setFase("idle");
    }
  }

  const generando = fase !== "idle";
  const SEL = "bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none w-full";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D4A]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400"/>
            <h3 className="font-display font-semibold text-white text-sm">Exportar Informe Ejecutivo · PDF</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Building2 className="w-3 h-3"/> CEDI (obligatorio)</label>
            <select value={cediId} onChange={e => { setCediId(e.target.value); setError(null); }} className={SEL}>
              <option value="">Selecciona un CEDI…</option>
              {cedis.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Calendar className="w-3 h-3"/> Mes de visita (opcional)</label>
            <input type="month" value={fecha} onChange={e => setFecha(e.target.value)} className={SEL}/>
          </div>

          {cediId && (
            <div className="px-3 py-2.5 rounded-lg bg-[#0A111F] border border-[#1E2D4A] text-xs text-[#94A3B8] space-y-1">
              <div>Hallazgos en alcance: <strong className="text-white">{hallazgosCedi.length}</strong></div>
              {auditoriaSel && <div>Auditor: <strong className="text-white">{auditoriaSel.auditorNombre || "—"}</strong> · Líder: <strong className="text-white">{auditoriaSel.administrador || "—"}</strong></div>}
              {auditoriaSel?.fechaVisita && <div>Visita: <strong className="text-white">{fmtFecha(auditoriaSel.fechaVisita)}</strong></div>}
            </div>
          )}

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{error}</div>}

          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5 text-[10px] text-[#94A3B8] leading-relaxed">
            El informe consolida <strong className="text-emerald-400">Consolidado + Cumplimiento + Evidencias</strong> en 17 secciones, con análisis generado al momento. La generación puede tardar ~20-40 s.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={generando}>Cancelar</button>
            <button onClick={exportar} disabled={generando || !cediId}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
              {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
              {fase === "ia" ? "Generando análisis…" : fase === "pdf" ? "Construyendo PDF…" : "Exportar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
