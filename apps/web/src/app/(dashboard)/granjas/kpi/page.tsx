"use client";
import { useState, useMemo, useRef } from "react";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_KPI, TIPO_RIESGO, TIPO_OPERATIVO, TIPO_GRANJA } from "@/lib/granjas.constants";
import { AUDITORS } from "@/lib/constants";
import type { KPI, Hallazgo } from "@/lib/granjas.types";
import {
  Target, Plus, Filter, X, Trash2, Edit2, AlertCircle,
  Loader2, CheckCircle2, Clock, AlertTriangle, Sparkles,
  FileText, ChevronDown, TrendingUp, Bell,
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

// ─── Semaforización de estado ────────────────────────────────────────────────
function estadoColor(estado: string) {
  if (estado === "Completado" || estado === "COMPLETADO")
    return { bg: "rgba(34,197,94,0.15)", text: "#22C55E", border: "rgba(34,197,94,0.30)" };
  if (estado === "En Curso" || estado === "EN_CURSO")
    return { bg: "rgba(249,115,22,0.15)", text: "#F97316", border: "rgba(249,115,22,0.30)" };
  if (estado === "En Espera" || estado === "EN_ESPERA")
    return { bg: "rgba(249,115,22,0.12)", text: "#FBBF24", border: "rgba(249,115,22,0.25)" };
  if (estado === "No Iniciado" || estado === "NO_INICIADO")
    return { bg: "rgba(239,68,68,0.15)", text: "#EF4444", border: "rgba(239,68,68,0.30)" };
  return { bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.25)" };
}

function estadoEmoji(estado: string) {
  if (estado === "Completado" || estado === "COMPLETADO") return "🟢";
  if (estado === "En Curso" || estado === "EN_CURSO")    return "🟠";
  if (estado === "En Espera" || estado === "EN_ESPERA")  return "🟠";
  return "🔴";
}

function displayEstado(e: string) {
  const map: Record<string, string> = {
    COMPLETADO: "Completado", EN_CURSO: "En Curso",
    EN_ESPERA: "En Espera",  NO_INICIADO: "No Iniciado",
  };
  return map[e] ?? e;
}

// ─── Generar Plan IA via Anthropic API ───────────────────────────────────────
async function generarPlanIA(accion: string, tipoRiesgo: string, estadoHallazgo: string, nombreGranja: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Genera un plan de acción profesional y específico en máximo un párrafo (máximo 120 palabras) para corregir el siguiente hallazgo de auditoría en una empresa avícola colombiana:\n\nHallazgo: ${accion}\nTipo de riesgo: ${tipoRiesgo}\nEstado: ${estadoHallazgo}\nGranja: ${nombreGranja}\n\nEl plan debe ser concreto, humano, en español, con acciones específicas y medibles. No uses listas, solo prosa fluida.`
      }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text ?? "No se pudo generar el plan.";
}

// ─── Exportar PDF básico (HTML → print) ─────────────────────────────────────
function exportarPDF(kpis: KPI[], granjas: any[], hallazgos: any[]) {
  const fecha = new Date().toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" });
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Informe KPI Savicol</title>
<style>
body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1a202c}
.cover{background:#0D1526;color:white;padding:60px 50px;min-height:200px}
.cover h1{font-size:28px;margin:0 0 8px;color:#4A7AFF}
.cover p{color:#94A3B8;margin:4px 0;font-size:14px}
.section{padding:30px 50px;border-bottom:1px solid #e2e8f0}
.section h2{font-size:18px;color:#0D1526;margin:0 0 16px;border-left:4px solid #4A7AFF;padding-left:12px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#0D1526;color:white;padding:8px 12px;text-align:left}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even){background:#f7fafc}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.verde{background:#dcfce7;color:#166534}
.naranja{background:#ffedd5;color:#9a3412}
.rojo{background:#fee2e2;color:#991b1b}
.kpi-card{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px}
.progress{background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;margin-top:8px}
.progress-bar{height:100%;background:#4A7AFF;border-radius:4px}
.footer{text-align:center;padding:20px;color:#94A3B8;font-size:11px;border-top:1px solid #e2e8f0}
</style>
</head><body>
<div class="cover">
  <div style="font-size:22px;font-weight:900;margin-bottom:4px">
    <span style="color:#4A7AFF">AUDIT</span> <span style="color:#C41230">PLATFORM</span>
  </div>
  <div style="font-size:11px;color:#64748B;letter-spacing:0.15em;margin-bottom:24px">SOFTWARE · SAVICOL S.A.S.</div>
  <h1>Informe de Cumplimiento KPI</h1>
  <p>Fecha de generación: ${fecha}</p>
  <p>Control Interno y Auditoría · Savicol S.A.S.</p>
</div>

<div class="section">
  <h2>Resumen Ejecutivo</h2>
  <table>
    <tr><th>Indicador</th><th>Valor</th></tr>
    <tr><td>Total KPIs</td><td>${kpis.length}</td></tr>
    <tr><td>Completados</td><td>${kpis.filter(k => k.estado==="Completado"||k.estado==="COMPLETADO").length}</td></tr>
    <tr><td>En Curso</td><td>${kpis.filter(k => k.estado==="En Curso"||k.estado==="EN_CURSO").length}</td></tr>
    <tr><td>En Espera</td><td>${kpis.filter(k => k.estado==="En Espera"||k.estado==="EN_ESPERA").length}</td></tr>
    <tr><td>No Iniciados</td><td>${kpis.filter(k => k.estado==="No Iniciado"||k.estado==="NO_INICIADO").length}</td></tr>
    <tr><td>Avance promedio</td><td>${kpis.length > 0 ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/kpis.length) : 0}%</td></tr>
  </table>
</div>

<div class="section">
  <h2>Detalle de Planes de Acción KPI</h2>
  ${kpis.map(k => {
    const granja = granjas.find(g => g.id === k.granjaId);
    const ec = estadoColor(k.estado);
    const cls = (k.estado==="Completado"||k.estado==="COMPLETADO") ? "verde" :
                (k.estado==="No Iniciado"||k.estado==="NO_INICIADO") ? "rojo" : "naranja";
    return `<div class="kpi-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${k.accion}</div>
          <div style="font-size:12px;color:#64748B">Granja: ${granja?.nombre ?? k.granjaId} · Responsable: ${k.responsable}</div>
        </div>
        <span class="badge ${cls}">${displayEstado(k.estado)}</span>
      </div>
      <div style="font-size:12px;margin-top:8px;color:#475569">${k.planAccionVeterinario && k.planAccionVeterinario !== "—" ? k.planAccionVeterinario : "(Sin plan de acción)"}</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:6px">
        Compromiso: ${k.fechaCompromiso ? new Date(k.fechaCompromiso).toLocaleDateString("es-CO") : "—"} · 
        Avance: ${k.porcentajeAvance ?? 0}%
      </div>
      <div class="progress"><div class="progress-bar" style="width:${k.porcentajeAvance ?? 0}%"></div></div>
    </div>`;
  }).join("")}
</div>

<div class="footer">
  Generado por Audit Platform Software · Savicol S.A.S. · ${fecha}
</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
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

  // Filtros superiores
  const [fEstado,   setFEstado]   = useState("");
  const [fGranja,   setFGranja]   = useState("");
  const [fRiesgo,   setFRiesgo]   = useState("");
  const [fFecha,    setFFecha]    = useState("");

  const alertsQ       = useKpiAlerts();
  const sendReminders = useSendKpiReminders();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const totalAlerts = alertsQ.data?.length ?? 0;

  // Filtrado dinámico
  const filtered = useMemo(() => {
    let list = kpis;
    if (fEstado) list = list.filter(k => {
      const d = displayEstado(k.estado);
      return d === fEstado || k.estado === fEstado;
    });
    if (fGranja) list = list.filter(k => k.granjaId === fGranja);
    if (fFecha) list = list.filter(k => k.fechaCompromiso?.startsWith(fFecha));
    return list;
  }, [kpis, fEstado, fGranja, fFecha]);

  const hayFiltros = !!(fEstado || fGranja || fRiesgo || fFecha);

  // KPIs
  const total       = kpis.length;
  const completados = kpis.filter(k => k.estado==="Completado"||k.estado==="COMPLETADO").length;
  const enCurso     = kpis.filter(k => k.estado==="En Curso"||k.estado==="EN_CURSO").length;
  const enEspera    = kpis.filter(k => k.estado==="En Espera"||k.estado==="EN_ESPERA").length;
  const noIniciado  = kpis.filter(k => k.estado==="No Iniciado"||k.estado==="NO_INICIADO").length;
  const avgAvance   = total > 0 ? Math.round(kpis.reduce((a,k)=>a+(k.porcentajeAvance||0),0)/total) : 0;

  const SEL = "px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none hover:border-[#2A3F6A] transition-colors cursor-pointer";

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cumplimiento KPI"
        subtitle={`${total} planes de acción · ${avgAvance}% avance promedio`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportarPDF(filtered, granjas, hallazgos)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs text-[#94A3B8] hover:text-white hover:border-[#4A7AFF] transition-colors"
            >
              <FileText className="w-3.5 h-3.5"/>Informe PDF
            </button>
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
            <button
              onClick={() => { setEditingKpi(null); setSaveError(null); setModalOpen(true); }}
              className="btn-primary text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5"/>Nuevo KPI
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">

        {/* KPIs resumen */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label:"Total", value:total, color:"#4A7AFF" },
            { label:"Completados", value:completados, color:"#22C55E" },
            { label:"En Curso", value:enCurso, color:"#F97316" },
            { label:"En Espera", value:enEspera, color:"#FBBF24" },
            { label:"No Iniciados", value:noIniciado, color:"#EF4444" },
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
            <div className="h-full rounded-full bg-gradient-to-r from-[#4A7AFF] to-[#22C55E] transition-all duration-500"
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
                onClick={() => { setFEstado(""); setFGranja(""); setFRiesgo(""); setFFecha(""); }}
                className="ml-auto flex items-center gap-1 text-[10px] text-[#64748B] hover:text-white px-2 py-0.5 rounded border border-[#1E2D4A] hover:border-[#4A7AFF] transition-colors"
              >
                <X className="w-3 h-3"/>Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
              <span className="text-[10px] text-[#64748B] px-1">Fecha compromiso</span>
              <input type="month" value={fFecha} onChange={e=>setFFecha(e.target.value)}
                className={SEL + " w-36"} style={{colorScheme:"dark"}}/>
            </div>
            <div className="flex flex-col gap-0.5 ml-auto justify-end">
              <span className="text-[10px] text-[#64748B] px-1">Resultados</span>
              <div className="px-3 py-1.5 text-xs text-[#94A3B8]">
                <span className="font-semibold text-white">{filtered.length}</span> de {total}
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
              {hayFiltros ? "Ajusta los filtros para ver resultados" : 'Clic en "Nuevo KPI" para crear el primero'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(k => {
              const granja = granjas.find(g => g.id === k.granjaId);
              const hallazgo = k.hallazgoId ? hallazgos.find(h => h.id === k.hallazgoId) : null;
              const ec = estadoColor(k.estado);
              const dp = displayEstado(k.estado);

              return (
                <div key={k.id} className="card-base card-hover">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {/* Badge estado semaforización */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background:ec.bg, color:ec.text, border:`1px solid ${ec.border}` }}>
                          {estadoEmoji(k.estado)} {dp}
                        </span>
                        {/* Badge granja */}
                        {granja && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">
                            {granja.nombre}
                          </span>
                        )}
                        {/* Badge hallazgo */}
                        {hallazgo && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {hallazgo.titulo?.slice(0,30)}...
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
                        catch (e: any) { alert("Error: " + formatErr(e,"desconocido")); }
                      }} className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#64748B]">Avance</span>
                      <span className="text-[10px] font-semibold text-white">{k.porcentajeAvance ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width:`${k.porcentajeAvance ?? 0}%`, background: ec.text }}/>
                    </div>
                  </div>

                  {/* Campos de seguimiento */}
                  {k.seguimiento && k.seguimiento !== "—" && (
                    <p className="text-xs text-[#94A3B8] mb-2 leading-relaxed">{k.seguimiento}</p>
                  )}
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

      {/* Modal nuevo/editar KPI */}
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

      {/* Modal alertas */}
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
// KPIModal — formulario inteligente
// ═══════════════════════════════════════════════════════════════════════════════
function KPIModal({ granjas, hallazgos, editing, error, onClose, onSave }: {
  granjas: any[];
  hallazgos: any[];
  editing?: KPI | null;
  error: string | null;
  onClose: () => void;
  onSave: (k: Partial<KPI>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<KPI>>(editing ? {
    granjaId:              editing.granjaId,
    hallazgoId:            editing.hallazgoId,
    accion:                editing.accion,
    seguimiento:           editing.seguimiento,
    fechaCompromiso:       editing.fechaCompromiso?.slice(0,10) ?? "",
    fechaProximaVisita:    editing.fechaProximaVisita?.slice(0,10),
    fechaCumplimiento:     editing.fechaCumplimiento?.slice(0,10),
    planAccionVeterinario: editing.planAccionVeterinario,
    estado:                (() => { const m:Record<string,string>={COMPLETADO:"Completado",EN_CURSO:"En Curso",EN_ESPERA:"En Espera",NO_INICIADO:"No Iniciado"}; return m[editing.estado]??editing.estado; })(),
    responsable:           editing.responsable,
    porcentajeAvance:      editing.porcentajeAvance,
  } : {
    granjaId:              granjas[0]?.id ?? "",
    accion:                "",
    seguimiento:           "",
    fechaCompromiso:       new Date(Date.now()+30*86400000).toISOString().slice(0,10),
    planAccionVeterinario: "",
    estado:                "No Iniciado",
    responsable:           "",
    porcentajeAvance:      0,
  });

  const [submitting, setSubmitting]   = useState(false);
  const [generando, setGenerando]     = useState(false);
  const [localError, setLocalError]   = useState<string | null>(null);

  // Hallazgos filtrados por la granja seleccionada
  const hallazgosGranja = useMemo(() =>
    hallazgos.filter(h => h.granjaId === form.granjaId),
    [hallazgos, form.granjaId]
  );

  // Granja y hallazgo seleccionados
  const granjaSelected  = granjas.find(g => g.id === form.granjaId);
  const hallazgoSelected = hallazgosGranja.find(h => h.id === form.hallazgoId);

  // Al cambiar granja: limpiar hallazgo y autocompletar auditor
  function onGranjaChange(id: string) {
    const g = granjas.find(g => g.id === id);
    setForm(f => ({ ...f, granjaId: id, hallazgoId: undefined }));
  }

  // Al seleccionar hallazgo: autocompletar acción y tipo riesgo
  function onHallazgoChange(id: string) {
    const h = hallazgos.find(hh => hh.id === id);
    if (h) {
      setForm(f => ({
        ...f,
        hallazgoId: id,
        accion: f.accion || h.titulo || "",
      }));
    } else {
      setForm(f => ({ ...f, hallazgoId: undefined }));
    }
  }

  // Generar plan IA
  async function handleGenerarPlanIA() {
    if (!form.accion?.trim()) { setLocalError("Escribe primero la acción del hallazgo"); return; }
    setGenerando(true);
    setLocalError(null);
    try {
      const tipoRiesgo = hallazgoSelected?.tiposRiesgo?.[0] ?? "Operativo";
      const estadoH    = hallazgoSelected?.estado ?? "Abierto";
      const nombreG    = granjaSelected?.nombre ?? "Granja";
      const plan = await generarPlanIA(form.accion, tipoRiesgo, estadoH, nombreG);
      setForm(f => ({ ...f, planAccionVeterinario: plan }));
    } catch (e: any) {
      setLocalError("Error al generar plan IA: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (granjas.length === 0) { setLocalError("No hay granjas registradas"); return; }
    if (!form.granjaId)            { setLocalError("Selecciona una granja"); return; }
    if (!form.accion?.trim())      { setLocalError("La acción es obligatoria"); return; }
    if (!form.responsable?.trim()) { setLocalError("Asigna un responsable"); return; }
    if (!form.fechaCompromiso)     { setLocalError("Fecha compromiso es obligatoria"); return; }

    const payload: Partial<KPI> = {
      ...form,
      accion:                form.accion!.trim(),
      seguimiento:           form.seguimiento?.trim() || "—",
      responsable:           form.responsable!.trim(),
      planAccionVeterinario: form.planAccionVeterinario?.trim() || "—",
      porcentajeAvance:      Math.max(0, Math.min(100, form.porcentajeAvance ?? 0)),
    };

    setSubmitting(true);
    try { await onSave(payload); }
    catch { /* error en banner padre */ }
    finally { setSubmitting(false); }
  }

  const INP = "input-base";
  const SEL_MODAL = "input-base";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">
              {editing ? "Editar KPI" : "Nuevo KPI"}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {editing ? "Modifica el plan de acción" : "Formulario inteligente · relacional · con IA"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── INFORMACIÓN BASE ── */}
          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#1E2D4A] pb-2">
            Información Base
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Granja *">
              <select value={form.granjaId} onChange={e=>onGranjaChange(e.target.value)} className={SEL_MODAL}>
                {granjas.length === 0
                  ? <option value="">(sin granjas)</option>
                  : granjas.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)
                }
              </select>
            </FF>
            <FF label="Tipo de Producción">
              <input
                value={granjaSelected?.tipoOperativo ?? "—"}
                readOnly className={INP + " opacity-60 cursor-default"}
              />
            </FF>
            <FF label="Tipo de Granja">
              <input
                value={granjaSelected?.tipoGranja ?? "—"}
                readOnly className={INP + " opacity-60 cursor-default"}
              />
            </FF>
            <FF label="Responsable *">
              <input value={form.responsable ?? ""} onChange={e=>setForm({...form,responsable:e.target.value})}
                className={INP} placeholder="Nombre del responsable" required/>
            </FF>
          </div>

          {/* ── INFORMACIÓN DEL HALLAZGO ── */}
          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#1E2D4A] pb-2 mt-2">
            Información del Hallazgo (opcional)
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Hallazgo asociado">
              <select value={form.hallazgoId ?? ""} onChange={e=>onHallazgoChange(e.target.value)} className={SEL_MODAL}>
                <option value="">(sin hallazgo)</option>
                {hallazgosGranja.map(h=>(
                  <option key={h.id} value={h.id}>{h.titulo?.slice(0,40)}</option>
                ))}
              </select>
            </FF>
            <FF label="Estado del Hallazgo">
              <input
                value={hallazgoSelected?.estado ?? "—"}
                readOnly className={INP + " opacity-60 cursor-default"}
              />
            </FF>
            <FF label="Tipo de Riesgo">
              <input
                value={hallazgoSelected?.tiposRiesgo?.join(", ") ?? "—"}
                readOnly className={INP + " opacity-60 cursor-default"}
              />
            </FF>
            <FF label="Fecha del Hallazgo">
              <input
                value={hallazgoSelected?.fechaVisita?.slice(0,10) ?? "—"}
                readOnly className={INP + " opacity-60 cursor-default"}
              />
            </FF>
          </div>

          {/* ── PLAN DE ACCIÓN ── */}
          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider border-b border-[#1E2D4A] pb-2 mt-2">
            Plan de Acción
          </div>

          <FF label="Acción / Hallazgo *">
            <input value={form.accion ?? ""} onChange={e=>setForm({...form,accion:e.target.value})}
              className={INP} placeholder="Describe la acción o hallazgo a corregir" required/>
          </FF>

          <FF label="Plan de Acción Auditor (IA)">
            <div className="relative">
              <textarea
                value={form.planAccionVeterinario ?? ""}
                onChange={e=>setForm({...form,planAccionVeterinario:e.target.value})}
                rows={3} className={INP + " resize-none pr-32"}
                placeholder="Escribe el plan o genera uno con IA…"
              />
              <button
                type="button"
                onClick={handleGenerarPlanIA}
                disabled={generando}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-50"
              >
                {generando
                  ? <><Loader2 className="w-3 h-3 animate-spin"/>Generando…</>
                  : <><Sparkles className="w-3 h-3"/>Generar Plan IA</>
                }
              </button>
            </div>
          </FF>

          <FF label="Seguimiento Responsable">
            <textarea value={form.seguimiento ?? ""} onChange={e=>setForm({...form,seguimiento:e.target.value})}
              rows={2} className={INP + " resize-none"} placeholder="Periodicidad / metodología de seguimiento"/>
          </FF>

          <div className="grid grid-cols-2 gap-3">
            <FF label="Estado">
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as any})} className={SEL_MODAL}>
                {ESTADO_KPI.map(e=><option key={e}>{e}</option>)}
              </select>
            </FF>
            <FF label="% Avance">
              <div className="space-y-1">
                <input type="range" min={0} max={100} value={form.porcentajeAvance ?? 0}
                  onChange={e=>setForm({...form,porcentajeAvance:parseInt(e.target.value)||0})}
                  className="w-full accent-amber-500"/>
                <div className="flex justify-between text-[10px] text-[#64748B]">
                  <span>0%</span>
                  <span className="font-bold text-white">{form.porcentajeAvance ?? 0}%</span>
                  <span>100%</span>
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

        {/* Error banner */}
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
            {submitting ? "Guardando..." : editing ? "Actualizar KPI" : "Crear KPI"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── FormField helper ─────────────────────────────────────────────────────────
function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

// ─── AlertsModal ─────────────────────────────────────────────────────────────
function AlertsModal({ alerts, isLoading, onClose, onSendReminders }: {
  alerts: any[]; isLoading: boolean;
  onClose: () => void; onSendReminders: () => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg flex flex-col shadow-card max-h-[80vh]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-bold text-white">Alertas KPI</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#94A3B8]"/></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading && <p className="text-center text-[#94A3B8] text-sm">Cargando alertas…</p>}
          {!isLoading && alerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2"/>
              <p className="text-sm text-[#94A3B8]">Sin alertas activas</p>
            </div>
          )}
          {alerts.map((a: any) => (
            <div key={a.kpiId} className="p-3 rounded-lg bg-[#0A111F] border border-[#1E2D4A]">
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
