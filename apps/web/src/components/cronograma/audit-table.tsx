"use client";
import { AUDITORS, AUDIT_STATUS } from "@/lib/constants";
import { formatDate, getDaysRemaining, getEffectiveStatus, cn } from "@/lib/utils";
import { useAuditStore, type AuditActivity } from "@/store/audit.store";
import { Pencil, Trash2, AlertTriangle, Clock, CheckCircle2, Circle } from "lucide-react";
import { Can } from "@/components/system/can";

interface Props {
  activities: AuditActivity[];
  onEdit?: (a: AuditActivity) => void;
  canEditStatus?: boolean;
}

function StatusBadge({ status }: { status: AuditActivity["status"] }) {
  const s = AUDIT_STATUS[status];
  const icons = {
    COMPLETED: <CheckCircle2 className="w-3 h-3" />,
    IN_PROGRESS: <Clock className="w-3 h-3" />,
    NOT_STARTED: <Circle className="w-3 h-3" />,
    OVERDUE: <AlertTriangle className="w-3 h-3" />,
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: s?.bg ?? "#1E293B", color: s?.color ?? "#94A3B8", border: `1px solid ${s?.color ?? "#94A3B8"}22` }}
    >
      {icons[status]}
      {s?.label ?? status}
    </span>
  );
}

function DaysRemaining({ endDate, status }: { endDate: string; status: AuditActivity["status"] }) {
  if (status === "COMPLETED") return <span className="text-emerald-400 text-xs">✓ Finalizada</span>;
  const days = getDaysRemaining(endDate);
  if (days < 0)  return <span className="text-red-400 text-xs font-medium">{Math.abs(days)}d vencida</span>;
  if (days === 0) return <span className="text-amber-400 text-xs font-medium animate-pulse-soft">Hoy</span>;
  if (days <= 7)  return <span className="text-amber-400 text-xs font-medium">{days}d restantes</span>;
  return <span className="text-[#94A3B8] text-xs">{days}d</span>;
}

export function AuditTable({ activities, onEdit, canEditStatus = false }: Props) {
  const removeActivity = useAuditStore(s => s.removeActivity);

  if (activities.length === 0) {
    return (
      <div className="card-base flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1A2540] border border-[#1E2D4A] flex items-center justify-center mb-4">
          <Circle className="w-7 h-7 text-[#475569]" />
        </div>
        <p className="text-white font-semibold mb-2">Sin actividades registradas</p>
        <p className="text-[#475569] text-sm max-w-sm">
          Haz clic en "Nueva Actividad" para agregar entradas al cronograma, o usa
          "Importar" cuando esté disponible para cargar desde Excel.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base overflow-x-auto p-0">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-[#1E2D4A]">
            {["#", "Área / Proceso", "Responsable", "Actividad Planificada", "Inicio", "Fin", "Días Rest.", "Estado", ""].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#475569] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2D4A]">
          {activities.map(a => {
            const effective = getEffectiveStatus(a.status, a.endDate);
            const auditor   = AUDITORS.find(au => au.id === a.auditorId);
            return (
              <tr key={a.id} className="table-row-hover group">
                {/* Item */}
                <td className="px-4 py-3 text-[#475569] font-mono text-xs w-12">
                  {String(a.item).padStart(2, "0")}
                </td>
                {/* Area */}
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="text-[#94A3B8] text-xs truncate">{a.area}</p>
                  <p className="text-[#475569] text-[10px] truncate">{a.activityType}</p>
                </td>
                {/* Auditor */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: auditor?.color ?? "#475569" }}
                    >
                      {auditor?.initials ?? "??"}
                    </div>
                    <span className="text-xs text-[#94A3B8] truncate max-w-[100px]">
                      {a.auditorName.split(" ")[0]}
                    </span>
                  </div>
                </td>
                {/* Activity */}
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="text-white text-xs font-medium truncate">{a.activity}</p>
                  {a.notes && <p className="text-[#475569] text-[10px] truncate mt-0.5">{a.notes}</p>}
                </td>
                {/* Dates */}
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {formatDate(a.startDate)}
                </td>
                <td className="px-4 py-3 text-xs text-[#94A3B8] whitespace-nowrap">
                  {formatDate(a.endDate)}
                </td>
                {/* Days remaining */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <DaysRemaining endDate={a.endDate} status={effective} />
                </td>
                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={effective} />
                </td>
                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Editar/cambiar estado: solo Admin y Supervisor (Auditor no) */}
                    {canEditStatus && onEdit && (
                      <button
                        onClick={() => onEdit(a)}
                        className="w-7 h-7 rounded-lg bg-[#1A2540] flex items-center justify-center text-[#94A3B8] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Editar actividad y estado"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {/* Eliminar: solo Admin */}
                    <Can permiso="eliminar">
                      <button
                        onClick={() => {
                          if (confirm("¿Eliminar esta actividad?")) removeActivity(a.id);
                        }}
                        className="w-7 h-7 rounded-lg bg-[#1A2540] flex items-center justify-center text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar actividad"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Can>
                    {/* Sin permisos de acción: indicador de solo lectura */}
                    {!canEditStatus && (
                      <span className="text-[10px] text-[#475569] px-1">Solo lectura</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1E2D4A] flex items-center justify-between text-xs text-[#475569]">
        <span>{activities.length} actividad(es)</span>
        <span className="text-[#475569]">Historial de cambios disponible próximamente</span>
      </div>
    </div>
  );
}
