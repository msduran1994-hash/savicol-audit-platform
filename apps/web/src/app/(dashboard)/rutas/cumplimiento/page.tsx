"use client";
import { Header } from "@/components/layout/header";
import { useRutasStore } from "@/store/rutas.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_CUMPLIMIENTO } from "@/lib/rutas.constants";
import { CheckSquare, AlertCircle, Clock, RefreshCw, CheckCircle2, XCircle, Filter, Plus } from "lucide-react";

export default function CumplimientoPage() {
  const acciones = useRutasStore(useShallow((s) => s.cumplimiento));
  const acomp    = useRutasStore(useShallow((s) => s.acompanamientos));

  const stats = {
    pendiente:    acciones.filter(a => a.estado === "Pendiente").length,
    enProceso:    acciones.filter(a => a.estado === "En Proceso").length,
    verificacion: acciones.filter(a => a.estado === "Verificación").length,
    cerrado:      acciones.filter(a => a.estado === "Cerrado").length,
    reincidencia: acciones.filter(a => a.estado === "Cerrado con Reincidencia" || a.reincidencia).length,
  };
  const totalAvance = acciones.length > 0
    ? Math.round(acciones.reduce((s,a)=>s+a.porcentajeAvance,0) / acciones.length)
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
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_CUMPLIMIENTO.map(e => <option key={e}>{e}</option>)}
          </select>
          <button className="btn-primary text-xs ml-auto"><Plus className="w-3.5 h-3.5"/>Nuevo plan</button>
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
        {acciones.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin planes de acción registrados</p>
            <p className="text-[#475569] text-sm">Los planes se crean al asociar acciones correctivas a un acompañamiento con hallazgos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {acciones.map(a => {
              const acomp_ = acomp.find(x => x.id === a.acompanamientoId);
              const estColor =
                a.estado === "Cerrado"                       ? "#10B981" :
                a.estado === "Verificación"                  ? "#3B82F6" :
                a.estado === "En Proceso"                    ? "#F59E0B" :
                a.estado === "Cerrado con Reincidencia"      ? "#EF4444" : "#94A3B8";
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
                        {a.estado}
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
                    <Field label="Fecha Compromiso" value={a.fechaCompromiso} />
                    <Field label="Cumplimiento" value={a.fechaCumplimiento ?? "—"} />
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
    </div>
  );
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
