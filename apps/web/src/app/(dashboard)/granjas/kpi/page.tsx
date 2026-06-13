"use client";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { KPI } from "@/lib/granjas.types";
import {
  Target, Plus, Filter, X, Trash2, Edit2, AlertCircle,
  Loader2, CheckCircle2, Sparkles, FileText, TrendingUp, Bell,
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

// ─── Generar Plan IA ─────────────────────────────────────────────────────────
async function generarPlanIA(
  accion: string, tipoRiesgo: string, estadoHallazgo: string,
  nombreGranja: string, descripcionHallazgo?: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Eres auditor de bioseguridad avícola. Genera un plan de acción correctivo en máximo 80 palabras, profesional, específico y accionable para este hallazgo:\n\nGranja: ${nombreGranja}\nHallazgo: ${accion}\n${descripcionHallazgo ? `Descripción: ${descripcionHallazgo}\n` : ""}Riesgo: ${tipoRiesgo}\nEstado: ${estadoHallazgo}\n\nEl plan debe indicar acciones concretas, responsables sugeridos y plazos. Sin introducciones ni listas — solo prosa fluida profesional.`
      }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text ?? "No se pudo generar el plan.";
}

// ─── Exportar Informe Auditoría PDF ──────────────────────────────────────────
function exportarInformeAuditoria(kpis: KPI[], granjas: any[], hallazgos: any[], filtros: Record<string,string>) {
  const fecha = new Date().toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" });
  const filtroDesc = [
    filtros.fEstado   && `Estado: ${filtros.fEstado}`,
    filtros.fGranja   && `Granja: ${granjas.find(g=>g.id===filtros.fGranja)?.nombre ?? filtros.fGranja}`,
    filtros.fAuditor  && `Auditor: ${AUDITORS.find(a=>a.id===filtros.fAuditor)?.name ?? filtros.fAuditor}`,
    filtros.fFechaHallazgo && `Fecha Hallazgo: ${filtros.fFechaHallazgo}`,
  ].filter(Boolean).join(" · ") || "Sin filtros (todos los KPIs)";

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Informe Auditoría KPI — Savicol</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1a202c;font-size:12px}
  .cover{background:#0D1526;color:white;padding:50px;min-height:180px}
  .brand-a{font-size:22px;font-weight:900;color:#4A7AFF}
  .brand-b{font-size:22px;font-weight:900;color:#C41230}
  .brand-s{font-size:10px;letter-spacing:.15em;color:#475569;display:block;margin-top:2px}
  .cover h1{font-size:22px;margin:18px 0 6px;color:#F8FAFC}
  .cover p{font-size:12px;color:#94A3B8;margin:2px 0}
  .filtro-tag{display:inline-block;background:rgba(74,122,255,.2);color:#93C5FD;
    border:1px solid rgba(74,122,255,.3);border-radius:20px;padding:3px 10px;font-size:11px;margin-top:8px}
  .sec{padding:24px 50px;border-bottom:1px solid #e2e8f0}
  .sec h2{font-size:15px;font-weight:700;color:#0D1526;margin:0 0 14px;
    border-left:4px solid #4A7AFF;padding-left:10px}
  table{width:100%;border-collapse:collapse}
  th{background:#0D1526;color:white;padding:7px 10px;text-align:left;font-size:11px}
  td{padding:7px 10px;border-bottom:1px solid #f0f4f8;font-size:11px;vertical-align:top}
  tr:nth-child(even) td{background:#f9fafb}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
  .verde{background:#dcfce7;color:#166534}
  .naranja{background:#ffedd5;color:#9a3412}
  .amarillo{background:#fef9c3;color:#713f12}
  .rojo{background:#fee2e2;color:#991b1b}
  .gris{background:#f1f5f9;color:#475569}
  .kpi-card{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:10px;page-break-inside:avoid}
  .kpi-title{font-weight:700;font-size:13px;margin-bottom:4px}
  .kpi-sub{font-size:11px;color:#64748B;margin-bottom:8px}
  .progress{background:#e2e8f0;height:7px;border-radius:4px;overflow:hidden;margin:8px 0 4px}
  .progress-bar{height:100%;border-radius:4px}
  .plan-box{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 12px;margin-top:8px;font-size:11px;color:#78350f}
  .footer{text-align:center;padding:16px;color:#94A3B8;font-size:10px;border-top:1px solid #e2e8f0;margin-top:20px}
  .resumen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:0}
  .resumen-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center}
  .resumen-num{font-size:22px;font-weight:700}
  .resumen-lbl{font-size:10px;color:#64748B;margin-top:2px}
  @media print{.no-print{display:none}}
</style>
</head><body>

<div class="cover">
  <span class="brand-a">AUDIT</span><span class="brand-b"> PLATFORM</span>
  <span class="brand-s">SOFTWARE · SAVICOL S.A.S.</span>
  <h1>Informe de Auditoría — Cumplimiento KPI</h1>
  <p>Fecha de generación: ${fecha}</p>
  <p>Área de Control Interno y Auditoría</p>
  <div class="filtro-tag">Filtros aplicados: ${filtroDesc}</div>
</div>

<div class="sec">
  <h2>Resumen Ejecutivo</h2>
  <div class="resumen-grid">
    <div class="resumen-item"><div class="resumen-num" style="color:#4A7AFF">${kpis.length}</div><div class="resumen-lbl">Total KPIs</div></div>
    <div class="resumen-item"><div class="resumen-num" style="color:#22C55E">${kpis.filter(k=>k.estado==="Completado"||k.estado==="COMPLETADO").length}</div><div class="resumen-lbl">Completados</div></div>
    <div class="resumen-item"><div class="resumen-num" style="color:#F97316">${kpis.filter(k=>k.estado==="En Curso"||k.estado==="EN_CURSO").length}</div><div class="resumen-lbl">En Curso</div></div>
    <div class="resumen-item"><div class="resumen-num" style="color:#FBBF24">${kpis.filter(k=>k.estado==="En Espera"||k.estado==="EN_ESPERA").length}</div><div class="resumen-lbl">En Espera</div></div>
    <div class="resumen-item"><div class="resumen-num" style="color:#EF4444">${kpis.filter(k=>k.estado==="No Iniciado"||k.estado==="NO_INICIADO").length}</div><div class="resumen-lbl">No Iniciados</div></div>
    <div class="resumen-item"><div class="resumen-num" style="color:#4A7AFF">${kpis.length>0?Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/kpis.length):0}%</div><div class="resumen-lbl">Avance Promedio</div></div>
  </div>
</div>

<div class="sec">
  <h2>Hallazgos y Gestión KPI</h2>
  ${kpis.map(k => {
    const granja   = granjas.find(g => g.id === k.granjaId);
    const hallazgo = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
    const ec = estadoColor(k.estado);
    const cls = (k.estado==="Completado"||k.estado==="COMPLETADO") ? "verde" :
                (k.estado==="En Curso"  ||k.estado==="EN_CURSO")   ? "naranja" :
                (k.estado==="En Espera" ||k.estado==="EN_ESPERA")  ? "amarillo" : "rojo";
    const pct = k.porcentajeAvance ?? 0;
    const barColor = pct >= 80 ? "#22C55E" : pct >= 40 ? "#F97316" : "#EF4444";

    // Parsear seguimiento: "RESPONSABLE||AUDITOR"
    const [seguRespFull, seguAudFull] = (k.seguimiento ?? "").split("||");
    const seguResp = seguRespFull?.replace(/^RESP:/,"") ?? "";
    const seguAud  = seguAudFull?.replace(/^AUD:/,"")  ?? "";

    return `<div class="kpi-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
        <div>
          <div class="kpi-title">${k.accion}</div>
          <div class="kpi-sub">
            Granja: <strong>${granja?.nombre ?? "—"}</strong> ·
            Responsable: <strong>${k.responsable}</strong>
            ${hallazgo ? ` · Hallazgo: ${hallazgo.titulo?.slice(0,40) ?? ""}` : ""}
            ${hallazgo?.auditorNombre ? ` · Auditor: ${hallazgo.auditorNombre}` : ""}
          </div>
        </div>
        <span class="badge ${cls}">${displayEstado(k.estado)}</span>
      </div>
      <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${barColor}"></div></div>
      <div style="font-size:10px;color:#64748B;margin-bottom:6px">Avance: <strong>${pct}%</strong>
        ${k.fechaCompromiso ? ` · Compromiso: ${new Date(k.fechaCompromiso).toLocaleDateString("es-CO")}` : ""}</div>
      ${seguResp ? `<div style="font-size:11px;color:#475569;margin-bottom:4px"><strong>Seguimiento Responsable:</strong> ${seguResp}</div>` : ""}
      ${seguAud  ? `<div style="font-size:11px;color:#475569;margin-bottom:4px"><strong>Seguimiento Auditor:</strong> ${seguAud}</div>` : ""}
      ${hallazgo?.tiposRiesgo?.length ? `<div style="font-size:10px;color:#94A3B8;margin-bottom:4px">Tipo de Riesgo: ${hallazgo.tiposRiesgo.join(", ")}</div>` : ""}
      ${k.planAccionVeterinario && k.planAccionVeterinario !== "—"
        ? `<div class="plan-box"><strong>Plan de Acción IA:</strong> ${k.planAccionVeterinario}</div>` : ""}
    </div>`;
  }).join("")}
</div>

<div class="sec">
  <h2>Evaluación y Conclusiones</h2>
  <table>
    <thead><tr><th>Acción KPI</th><th>Granja</th><th>Estado</th><th>Avance</th><th>Responsable</th><th>Fecha Compromiso</th></tr></thead>
    <tbody>
      ${kpis.map(k => {
        const g = granjas.find(x=>x.id===k.granjaId);
        const cls = (k.estado==="Completado"||k.estado==="COMPLETADO") ? "verde" :
                    (k.estado==="En Curso"  ||k.estado==="EN_CURSO")   ? "naranja" :
                    (k.estado==="En Espera" ||k.estado==="EN_ESPERA")  ? "amarillo" : "rojo";
        return `<tr><td>${k.accion}</td><td>${g?.nombre??""}</td>
                    <td><span class="badge ${cls}">${displayEstado(k.estado)}</span></td>
                    <td>${k.porcentajeAvance??0}%</td>
                    <td>${k.responsable}</td>
                    <td>${k.fechaCompromiso?new Date(k.fechaCompromiso).toLocaleDateString("es-CO"):"—"}</td></tr>`;
      }).join("")}
    </tbody>
  </table>
  <div style="margin-top:16px;padding:12px 14px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;font-size:12px;color:#0c4a6e">
    <strong>Recomendaciones generales:</strong> Se recomienda priorizar los KPIs con estado "Atrasado" o "No Iniciado" para activar seguimientos inmediatos.
    Los planes de acción generados por IA deben revisarse con el equipo técnico antes de su implementación.
  </div>
</div>

<div class="footer">Informe generado automáticamente por Audit Platform Software · Savicol S.A.S. · ${fecha}</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function KPIPage() {
  const kpis      = useGranjasStore(useShallow((s) => s.kpis));
  const granjas   = useGranjasStore(useShallow((s) => s.granjas));
  const hallazgos = useGranjasStore(useShallow((s) => s.hallazgos));
  const addKPI    = useGranjasStore((s) => s.addKPI);
  const updateKPI = useGranjasStore((s) => s.updateKPI);
  const removeKPI = useGranjasStore((s) => s.removeKPI);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingKpi, setEditingKpi]   = useState<KPI | null>(null);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen]   = useState(false);

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
            {/* Chip Informe Auditoría */}
            <button
              onClick={() => exportarInformeAuditoria(filtered, granjas, hallazgos, filtrosActivos)}
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

      {/* Modal */}
      {modalOpen && (
        <KPIModal
          granjas={granjas}
          hallazgos={hallazgos}
          editing={editingKpi}
          error={saveError}
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
// KPIModal — formulario optimizado
// ═══════════════════════════════════════════════════════════════════════════════
function KPIModal({ granjas, hallazgos, editing, error, onClose, onSave }: {
  granjas: any[]; hallazgos: any[];
  editing?: KPI | null; error: string | null;
  onClose: () => void; onSave: (k: Partial<KPI>) => Promise<void>;
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
    setForm(f => ({
      ...f,
      hallazgoId: id || undefined,
      accion: f.accion || h?.titulo || "",
    }));
  }

  async function handleGenerarPlanIA() {
    if (!form.accion?.trim()) { setLocalError("Escribe primero el hallazgo/acción"); return; }
    setGenerando(true); setLocalError(null);
    try {
      const tipoRiesgo = hallazgoSel?.tiposRiesgo?.[0] ?? "Operativo";
      const estadoH    = hallazgoSel?.estado ?? "Abierto";
      const plan = await generarPlanIA(
        form.accion, tipoRiesgo, estadoH,
        granjaSel?.nombre ?? "Granja", hallazgoSel?.descripcion
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

          {/* ── PLAN DE ACCIÓN ── */}
          <Section label="Plan de Acción"/>
          <FF label="Hallazgo / Acción *">
            <input value={form.accion ?? ""} onChange={e=>setForm({...form,accion:e.target.value})}
              className={INP} placeholder="Describe la acción o hallazgo a corregir" required/>
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
