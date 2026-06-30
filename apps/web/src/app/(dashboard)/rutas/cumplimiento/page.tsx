"use client";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useRutasStore } from "@/store/rutas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_CUMPLIMIENTO, formatCOP, formatKg } from "@/lib/rutas.constants";
import { ESTADO_CUMPLIMIENTO_DB, ESTADO_CUMPLIMIENTO_TO_DB, toDB } from "@/lib/enum-labels";
import { useCreateAccion } from "@/hooks/useRutas";
import type { Acompanamiento } from "@/lib/rutas.types";
import {
  CheckSquare, AlertCircle, Clock, RefreshCw, CheckCircle2, XCircle, Filter,
  Plus, X, Sparkles, Loader2, AlertTriangle, MapPin,
} from "lucide-react";
import { GeneradorInformesRutas } from "./informe-rutas";

// Las acciones vienen de la API en forma DB ("PENDIENTE"); el demo usa display
// ("Pendiente"). Normalizamos siempre a display para KPIs, filtros y badges.
const estadoLabel = (e?: string) => (e && ESTADO_CUMPLIMIENTO_DB[e]) || e || "Pendiente";

const colorEstado = (est: string) =>
  est === "Cerrado"                   ? "#10B981" :
  est === "Verificación"              ? "#3B82F6" :
  est === "En Proceso"                ? "#F59E0B" :
  est === "Cerrado con Reincidencia"  ? "#EF4444" : "#94A3B8";

export default function CumplimientoPage() {
  const acciones = useRutasStore(useShallow((s) => s.cumplimiento));
  const acomp    = useRutasStore(useShallow((s) => s.acompanamientos));

  const [filtroEstado, setFiltroEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const visibles = filtroEstado
    ? acciones.filter(a => estadoLabel(a.estado) === filtroEstado)
    : acciones;

  const stats = {
    pendiente:    acciones.filter(a => estadoLabel(a.estado) === "Pendiente").length,
    enProceso:    acciones.filter(a => estadoLabel(a.estado) === "En Proceso").length,
    verificacion: acciones.filter(a => estadoLabel(a.estado) === "Verificación").length,
    cerrado:      acciones.filter(a => estadoLabel(a.estado) === "Cerrado").length,
    reincidencia: acciones.filter(a => estadoLabel(a.estado) === "Cerrado con Reincidencia" || a.reincidencia).length,
  };
  const totalAvance = acciones.length > 0
    ? Math.round(acciones.reduce((s,a)=>s+(a.porcentajeAvance ?? 0),0) / acciones.length)
    : 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cumplimiento · Acciones Correctivas"
        subtitle={`${acciones.length} planes · ${totalAvance}% avance promedio · ${stats.reincidencia} reincidencia(s)`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white"
          >
            <option value="">Todos los estados</option>
            {ESTADO_CUMPLIMIENTO.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <GeneradorInformesRutas />
            <button onClick={() => setModalOpen(true)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5"/>Nuevo plan</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Pendiente"     value={stats.pendiente}    color="#94A3B8" icon={<Clock/>} />
          <Kpi label="En Proceso"    value={stats.enProceso}    color="#F59E0B" icon={<AlertCircle/>} />
          <Kpi label="Verificación"  value={stats.verificacion} color="#3B82F6" icon={<RefreshCw/>} />
          <Kpi label="Cerrados"      value={stats.cerrado}      color="#10B981" icon={<CheckCircle2/>} />
          <Kpi label="Reincidencias" value={stats.reincidencia} color="#EF4444" icon={<XCircle/>} alert={stats.reincidencia>0} />
        </div>

        {/* Lista */}
        {visibles.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {acciones.length === 0 ? "Sin planes de acción registrados" : "Sin resultados con ese estado"}
            </p>
            <p className="text-[#475569] text-sm mb-4 max-w-md">
              {acciones.length === 0
                ? 'Crea uno con "Nuevo plan": traslada un registro del Consolidado y genera el plan de acción con el asistente.'
                : "Cambia el filtro de estado para ver otros planes."}
            </p>
            {acciones.length === 0 && (
              <button onClick={() => setModalOpen(true)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5"/>Nuevo plan</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibles.map(a => {
              const acomp_ = acomp.find(x => x.id === a.acompanamientoId);
              const est = estadoLabel(a.estado);
              const estColor = colorEstado(est);
              return (
                <div key={a.id} className="card-base">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{a.planAccion}</h3>
                      {acomp_ && (
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Cliente: <span className="text-white">{acomp_.clienteNombre}</span> · Ruta: {acomp_.rutaNombre} · {acomp_.fecha}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.reincidencia && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
                          Reincidencia
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${estColor}18`, color: estColor, border: `1px solid ${estColor}30` }}>
                        {est}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#94A3B8]">Avance</span>
                      <span className="text-white font-bold">{a.porcentajeAvance}%</span>
                    </div>
                    <div className="h-2 bg-[#1A2540] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{ width: `${a.porcentajeAvance}%`, background: estColor }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Field label="Responsable" value={a.responsable} />
                    <Field label="Fecha Compromiso" value={fmtFecha(a.fechaCompromiso)} />
                    <Field label="Cumplimiento" value={fmtFecha(a.fechaCumplimiento) || "—"} />
                    <Field label="Validado por" value={a.validadoPor ?? "Pendiente"} />
                  </div>

                  {a.evidenciaCorreccion && (
                    <p className="mt-3 text-xs text-cyan-300 flex items-center gap-1.5">
                      📎 {a.evidenciaCorreccion}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Repositorio histórico */}
        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="text-blue-400 font-semibold mb-2 text-sm">Repositorio Histórico Preparado</h3>
          <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
            <li>Trazabilidad completa de acciones correctivas por cliente, ruta y vehículo</li>
            <li>Detección automática de reincidencias en los últimos 90 días</li>
            <li>Validación dual: responsable cierra → auditor verifica → cierre confirmado</li>
            <li>Evidencias adjuntas vinculadas al plan (fotos, PDFs, registros)</li>
          </ul>
        </div>
      </div>

      {modalOpen && (
        <NuevoPlanModal
          acompanamientos={acomp}
          onClose={() => setModalOpen(false)}
          onCreated={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// Fecha ISO/DateTime → "YYYY-MM-DD" legible (las fechas de la API vienen con hora)
function fmtFecha(v?: string): string {
  if (!v) return "";
  return v.slice(0, 10);
}

function Kpi({ label, value, color, icon, alert }: { label: string; value: number; color: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`card-base flex items-center gap-3 ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="font-display text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Nuevo plan de acción
// Traslada un registro del Consolidado (Acompañamiento) y genera el plan de acción
// con el asistente (/api/ai/generar-plan). Se persiste vía POST /rutas/acciones.
// ═══════════════════════════════════════════════════════════════════════════════
function NuevoPlanModal({ acompanamientos, onClose, onCreated }: {
  acompanamientos: Acompanamiento[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const createAccion = useCreateAccion();

  // Por defecto, el más reciente del Consolidado (los acompañamientos vienen ordenados)
  const [acompId, setAcompId]     = useState(acompanamientos[0]?.id ?? "");
  const ac = acompanamientos.find(a => a.id === acompId);

  const [planAccion, setPlanAccion]           = useState("");
  const [responsable, setResponsable]         = useState("");
  const [estado, setEstado]                   = useState<string>("Pendiente");
  const [avance, setAvance]                   = useState(0);
  const [fechaCompromiso, setFechaCompromiso] = useState(new Date().toISOString().slice(0, 10));
  const [reincidencia, setReincidencia]       = useState(false);

  const [generando, setGenerando] = useState(false);
  const [iaError, setIaError]     = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sinRegistros = acompanamientos.length === 0;

  // Genera el plan de acción correctivo a partir del acompañamiento seleccionado.
  async function generarPlanIA() {
    if (!ac) { setIaError("Selecciona primero un registro del Consolidado"); return; }
    setGenerando(true); setIaError(null);
    try {
      const response = await fetch("/api/ai/generar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo: "plan",
          accion: `${ac.motivo} · ${ac.clienteNombre} (${ac.rutaNombre})`,
          descripcionHallazgo: ac.observacionAuditor,
          tipoRiesgo: (ac.riesgosAsociados || []).join(", "),
          criticidad: ac.criticidad,
          estadoHallazgo: ac.estado,
          areaAuditada: `Acompañamiento a Rutas · ${ac.rutaNombre} · Vehículo ${ac.vehiculoPlaca}`,
          nombreGranja: ac.clienteNombre,
          auditor: ac.auditorNombre,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? `Error ${response.status}`);
      }
      const data = await response.json();
      const texto = (data.plan ?? "").trim();
      if (!texto) throw new Error("No se obtuvo contenido");
      setPlanAccion(texto);
    } catch (e: any) {
      setIaError("Error: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerando(false);
    }
  }

  async function guardar() {
    if (!acompId)            { setSaveError("Selecciona un registro del Consolidado"); return; }
    if (!planAccion.trim())  { setSaveError("Genera o escribe el plan de acción"); return; }
    if (!responsable.trim()) { setSaveError("Indica el responsable del plan"); return; }
    if (!fechaCompromiso)    { setSaveError("Indica la fecha de compromiso"); return; }
    setGuardando(true); setSaveError(null);
    try {
      await createAccion.mutateAsync({
        acompanamientoId: acompId,
        planAccion: planAccion.trim(),
        responsable: responsable.trim(),
        estado: toDB(estado, ESTADO_CUMPLIMIENTO_TO_DB),
        porcentajeAvance: avance,
        fechaCompromiso,
        reincidencia,
      } as any);
      onCreated();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? e?.message ?? "Error al guardar el plan");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Nuevo Plan de Acción</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Traslada un registro del Consolidado y genera el plan con el asistente</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {sinRegistros ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-9 h-9 text-amber-400/70 mb-3"/>
              <p className="text-white font-semibold mb-1">No hay registros en el Consolidado</p>
              <p className="text-[#94A3B8] text-sm max-w-sm">Registra primero un acompañamiento en el módulo Consolidado para poder generar su plan de acción.</p>
            </div>
          ) : (
            <>
              {/* ── Registro del Consolidado ── */}
              <Section title="Registro del Consolidado">
                <F label="Acompañamiento *">
                  <select value={acompId} onChange={(e) => setAcompId(e.target.value)} className="input-base">
                    {acompanamientos.map(a => (
                      <option key={a.id} value={a.id}>
                        {fmtFecha(a.fecha)} · {a.clienteNombre} · {a.rutaNombre} · {a.motivo} [{a.criticidad}]
                      </option>
                    ))}
                  </select>
                </F>

                {ac && (
                  <div className="rounded-lg border border-[#1E2D4A] bg-[#0A1120] p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-white font-semibold flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-400"/>{ac.rutaNombre}</span>
                      <span className="text-[#94A3B8]">Vehículo {ac.vehiculoPlaca}</span>
                      <span className="text-[#94A3B8]">Conductor {ac.conductorNombre}</span>
                      <span className="text-[#94A3B8]">Auditor {ac.auditorNombre}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <Chip label={`Motivo: ${ac.motivo}`} />
                      <Chip label={`Criticidad: ${ac.criticidad}`} />
                      <Chip label={`Estado: ${ac.estado}`} />
                      {ac.valorDevueltoCOP > 0 && <Chip label={`Devuelto: ${formatCOP(ac.valorDevueltoCOP)}`} />}
                      {ac.cantidadKgDevueltos > 0 && <Chip label={formatKg(ac.cantidadKgDevueltos)} />}
                    </div>
                    {(ac.riesgosAsociados?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ac.riesgosAsociados.map(r => (
                          <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">{r}</span>
                        ))}
                      </div>
                    )}
                    {ac.observacionAuditor && (
                      <p className="text-xs text-[#94A3B8] leading-relaxed border-t border-[#1E2D4A] pt-2">
                        <span className="text-[#475569] uppercase text-[9px] tracking-wider block mb-0.5">Observación del auditor</span>
                        {ac.observacionAuditor}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              {/* ── Plan de acción ── */}
              <Section title="Plan de acción">
                <div className="relative">
                  <textarea
                    value={planAccion}
                    onChange={(e) => setPlanAccion(e.target.value)}
                    rows={5}
                    className="input-base resize-none pr-2"
                    placeholder="Genera el plan con el asistente a partir del registro, o escríbelo manualmente..."
                  />
                  <button
                    type="button"
                    onClick={generarPlanIA}
                    disabled={generando || !ac}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4A7AFF]/15 border border-[#4A7AFF]/40 text-[#4A7AFF] text-[10px] font-semibold hover:bg-[#4A7AFF]/25 disabled:opacity-50"
                    title="Generar plan de acción a partir del registro del Consolidado"
                  >
                    {generando ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                    {generando ? "Generando..." : "Generar con asistente"}
                  </button>
                </div>
                {iaError && (
                  <p className="text-[11px] text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/>{iaError}</p>
                )}
              </Section>

              {/* ── Seguimiento ── */}
              <Section title="Seguimiento">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <F label="Responsable *">
                    <input value={responsable} onChange={(e) => setResponsable(e.target.value)} className="input-base" placeholder="Nombre y cargo del responsable"/>
                  </F>
                  <F label="Estado">
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="input-base">
                      {ESTADO_CUMPLIMIENTO.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </F>
                  <F label="Fecha de compromiso *">
                    <input type="date" value={fechaCompromiso} onChange={(e) => setFechaCompromiso(e.target.value)} className="input-base"/>
                  </F>
                  <F label="% Avance">
                    <input type="number" min={0} max={100} value={avance} onChange={(e) => setAvance(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))} className="input-base"/>
                  </F>
                  <F label="¿Reincidente?">
                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={reincidencia} onChange={(e) => setReincidencia(e.target.checked)}/>
                      <span className="text-xs text-white">Marcar como reincidente</span>
                    </label>
                  </F>
                </div>
              </Section>
            </>
          )}
        </div>

        {saveError && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
            <span>{saveError}</span>
          </div>
        )}
        <footer className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[#1E2D4A]">
          <button type="button" onClick={onClose} className="btn-ghost text-xs" disabled={guardando}>Cancelar</button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || sinRegistros}
            className="btn-primary text-xs flex items-center gap-2"
          >
            {guardando && <Loader2 className="w-3 h-3 animate-spin"/>}
            {guardando ? "Guardando..." : "Crear plan"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Chip({ label }: { label: string }) {
  return <span className="px-1.5 py-0.5 rounded-full bg-[#1A2540] text-[#94A3B8] border border-[#2A3F6A]">{label}</span>;
}
