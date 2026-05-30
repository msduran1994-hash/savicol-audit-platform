"use client";
import { Header } from "@/components/layout/header";
import { useGranjasStore } from "@/store/granjas.store";
import { useShallow } from "zustand/react/shallow";
import {
  Activity, Tractor, ClipboardCheck, AlertTriangle, Target,
  Files, Settings as SettingsIcon, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ICONS: Record<string, any> = {
  "Auditoría": ClipboardCheck,
  "Hallazgo":  AlertTriangle,
  "KPI":       Target,
  "Granja":    Tractor,
  "Documento": Files,
  "Sistema":   SettingsIcon,
};

const COLORS: Record<string, string> = {
  "Auditoría": "#3B82F6",
  "Hallazgo":  "#F59E0B",
  "KPI":       "#10B981",
  "Granja":    "#8B5CF6",
  "Documento": "#06B6D4",
  "Sistema":   "#94A3B8",
};

export default function ActividadPage() {
  const actividad = useGranjasStore(useShallow((s) => s.actividad));

  // Agrupado por día
  const grouped = actividad.reduce((acc, a) => {
    const day = format(new Date(a.timestamp), "EEEE, d 'de' MMMM yyyy", { locale: es });
    (acc[day] ??= []).push(a);
    return acc;
  }, {} as Record<string, typeof actividad>);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Bitácora de Actividad"
        subtitle={`${actividad.length} eventos registrados · trazabilidad completa`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los tipos</option>
            {Object.keys(ICONS).map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todas las acciones</option>
            <option>Creado</option>
            <option>Actualizado</option>
            <option>Eliminado</option>
            <option>Aprobado</option>
            <option>Cargado</option>
            <option>Exportado</option>
          </select>
          <button className="btn-secondary text-xs ml-auto">Exportar bitácora</button>
        </div>

        {/* Timeline */}
        {Object.keys(grouped).length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <Activity className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">Sin actividad registrada</p>
            <p className="text-[#475569] text-sm">La bitácora se llena automáticamente con cada acción del sistema</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, events]) => (
              <div key={day}>
                <h3 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">{day}</h3>
                <div className="card-base p-0">
                  {events.map((e, i) => {
                    const Icon = ICONS[e.tipo] ?? Activity;
                    const color = COLORS[e.tipo] ?? "#94A3B8";
                    return (
                      <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i !== events.length - 1 ? "border-b border-[#1E2D4A]" : ""}`}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                          <Icon className="w-4 h-4"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-semibold">{e.usuarioNombre}</span>
                            <span className="text-[#94A3B8]"> {e.accion.toLowerCase()} </span>
                            <span className="text-amber-400">{e.tipo.toLowerCase()}</span>
                            <span className="text-[#94A3B8]">: </span>
                            <span className="text-white">{e.recursoNombre}</span>
                          </p>
                          {e.detalles && <p className="text-[10px] text-[#475569] mt-0.5">{e.detalles}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-[#94A3B8] font-mono">{format(new Date(e.timestamp), "HH:mm")}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                                style={{ background: `${color}18`, color }}>
                            {e.accion}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="text-blue-400 font-semibold mb-2 text-sm">Auditoría del sistema</h3>
          <p className="text-xs text-[#94A3B8]">
            Esta bitácora captura toda modificación realizada en el módulo Granjas: creación de granjas,
            auditorías, hallazgos, KPI, cargas de documentos y exportaciones.
            Cada evento queda registrado con usuario, recurso afectado, acción y timestamp.
          </p>
        </div>
      </div>
    </div>
  );
}
