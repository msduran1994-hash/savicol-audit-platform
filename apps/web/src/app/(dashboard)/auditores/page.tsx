"use client";
import { Header } from "@/components/layout/header";
import { useAuditStore } from "@/store/audit.store";
import { useShallow } from "zustand/react/shallow";
import { AUDITORS } from "@/lib/constants";
import { calculateCompletionRate, getStatusLabel } from "@/lib/utils";
import { Users, CheckCircle2, Clock, Circle, AlertTriangle } from "lucide-react";

export default function AuditoresPage() {
  const activities = useAuditStore(useShallow((s) => s.activities));

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Equipo de Auditoría" subtitle={`${AUDITORS.length} auditores registrados`} />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {AUDITORS.map(auditor => {
            const mine        = activities.filter(a => a.auditorId === auditor.id);
            const completed   = mine.filter(a => a.status === "COMPLETED").length;
            const inProgress  = mine.filter(a => a.status === "IN_PROGRESS").length;
            const notStarted  = mine.filter(a => a.status === "NOT_STARTED").length;
            const overdue     = mine.filter(a => a.status === "OVERDUE").length;
            const rate        = calculateCompletionRate(mine);

            return (
              <div key={auditor.id} className="card-base card-hover animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-card"
                    style={{ background: `linear-gradient(135deg, ${auditor.color}, ${auditor.color}99)` }}
                  >
                    {auditor.initials}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white">{auditor.name}</h3>
                    <p className="text-xs text-[#94A3B8]">Auditor Interno · Savicol</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: `${auditor.color}18`, color: auditor.color, border: `1px solid ${auditor.color}30` }}>
                      ID: {auditor.id}
                    </span>
                  </div>
                </div>

                {/* Completion rate */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#94A3B8]">Tasa de cumplimiento</span>
                    <span className="text-sm font-bold text-white">{rate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1A2540] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${rate}%`, background: auditor.color }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Completadas",  value: completed,  icon: <CheckCircle2 className="w-3 h-3" />, color: "#10B981" },
                    { label: "En Curso",     value: inProgress, icon: <Clock className="w-3 h-3" />,        color: "#F59E0B" },
                    { label: "No Iniciadas", value: notStarted, icon: <Circle className="w-3 h-3" />,       color: "#64748B" },
                    { label: "Vencidas",     value: overdue,    icon: <AlertTriangle className="w-3 h-3" />,color: "#EF4444" },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-[#1A2540] rounded-lg px-3 py-2 border border-[#1E2D4A]">
                      <div className="flex items-center gap-1.5 mb-0.5" style={{ color }}>
                        {icon}
                        <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>{label}</span>
                      </div>
                      <p className="font-display text-xl font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {mine.length === 0 && (
                  <p className="text-center text-xs text-[#475569] mt-3 py-2">
                    Sin actividades asignadas
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
