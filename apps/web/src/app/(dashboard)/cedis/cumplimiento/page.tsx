"use client";
import { Header } from "@/components/layout/header";
import { useCedisStore } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import { ESTADO_HALLAZGO_CEDI } from "@/lib/cedis.constants";
import { CheckSquare, AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw, Filter } from "lucide-react";

export default function CumplimientoCedisPage() {
  const hallazgos = useCedisStore(useShallow((s) => s.hallazgos));

  const stats = {
    abierto:      hallazgos.filter(h => h.estado === "Abierto").length,
    enPlan:       hallazgos.filter(h => h.estado === "En Plan").length,
    verificacion: hallazgos.filter(h => h.estado === "En Verificación").length,
    cerrado:      hallazgos.filter(h => h.estado === "Cerrado").length,
    reincidente:  hallazgos.filter(h => h.reincidente || h.estado === "Reincidente").length,
  };
  const avancePromedio = hallazgos.length > 0
    ? Math.round(hallazgos.reduce((s,h)=>s+h.porcentajeAvance,0) / hallazgos.length)
    : 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Cumplimiento · Acciones Correctivas CEDIS" subtitle={`${hallazgos.length} hallazgos en seguimiento · ${avancePromedio}% avance promedio · ${stats.reincidente} reincidencia(s)`}/>

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_HALLAZGO_CEDI.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Abierto"       value={stats.abierto}       color="#EF4444" icon={<AlertCircle/>} />
          <Kpi label="En Plan"       value={stats.enPlan}        color="#F59E0B" icon={<Clock/>}/>
          <Kpi label="Verificación"  value={stats.verificacion} color="#3B82F6" icon={<RefreshCw/>}/>
          <Kpi label="Cerrados"      value={stats.cerrado}       color="#10B981" icon={<CheckCircle2/>}/>
          <Kpi label="Reincidencias" value={stats.reincidente}   color="#EF4444" icon={<XCircle/>} alert={stats.reincidente > 0}/>
        </div>

        {hallazgos.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin acciones correctivas en seguimiento</p>
            <p className="text-[#475569] text-sm">Los hallazgos del módulo Consolidado aparecen aquí para seguimiento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hallazgos.map(h => {
              const estColor =
                h.estado === "Cerrado"         ? "#10B981" :
                h.estado === "En Verificación" ? "#3B82F6" :
                h.estado === "En Plan"         ? "#F59E0B" : "#EF4444";
              return (
                <div key={h.id} className="card-base">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{h.titulo}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1">{h.cediNombre ?? "—"} · {h.categoria} · {h.subItem ?? "—"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {h.reincidente && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-500/15 text-red-300 border border-red-500/30">Reincidente</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${estColor}18`, color: estColor, border: `1px solid ${estColor}30` }}>
                        {h.estado}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#94A3B8]">Avance</span>
                      <span className="text-white font-bold">{h.porcentajeAvance}%</span>
                    </div>
                    <div className="h-2 bg-[#1A2540] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${h.porcentajeAvance}%`, background: estColor }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <Field label="Responsable" value={h.responsable ?? "—"}/>
                    <Field label="Fecha Compromiso" value={h.fechaCompromiso ?? "—"}/>
                    <Field label="Fecha Cierre" value={h.fechaCierre ?? "Pendiente"}/>
                  </div>

                  {h.recomendacionIA && (
                    <div className="mt-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Recomendación IA</p>
                      <p className="text-xs text-[#94A3B8]">{h.recomendacionIA}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="text-blue-400 font-semibold mb-2 text-sm">Repositorio Histórico Preparado</h3>
          <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
            <li>Trazabilidad completa de acciones correctivas por CEDI y categoría</li>
            <li>Detección automática de reincidencias en los últimos 90 días</li>
            <li>Validación dual: responsable cierra → auditor verifica → cierre confirmado</li>
            <li>Evidencias adjuntas vinculadas a cada plan correctivo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color, icon, alert }: { label: string; value: number; color: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`card-base flex items-center gap-3 ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>{icon}</div>
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
