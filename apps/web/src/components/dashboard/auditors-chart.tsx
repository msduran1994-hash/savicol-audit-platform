"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AUDITORS } from "@/lib/constants";
import type { AuditActivity } from "@/store/audit.store";
import { BarChart3 } from "lucide-react";

interface Props { activities: AuditActivity[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-3 shadow-card text-xs">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          {p.name}: <span className="text-white font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function AuditorsChart({ activities }: Props) {
  const data = AUDITORS.map(a => {
    const mine = activities.filter(act => act.auditorId === a.id);
    return {
      name: a.name.split(" ")[0],
      Completadas:  mine.filter(x => x.status === "COMPLETED").length,
      "En Curso":   mine.filter(x => x.status === "IN_PROGRESS").length,
      "No Iniciadas": mine.filter(x => x.status === "NOT_STARTED").length,
      Vencidas:     mine.filter(x => x.status === "OVERDUE").length,
    };
  });

  return (
    <div className="card-base h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" /> Cumplimiento por Auditor
        </h3>
        <span className="text-xs text-[#475569]">Año {new Date().getFullYear()}</span>
      </div>

      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-52 text-[#475569] text-sm">
          Sin datos — cargue actividades en el cronograma
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={12} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.05)" }} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94A3B8", paddingTop: "12px" }} />
            <Bar dataKey="Completadas"   fill="#10B981" radius={[3,3,0,0]} />
            <Bar dataKey="En Curso"      fill="#F59E0B" radius={[3,3,0,0]} />
            <Bar dataKey="No Iniciadas"  fill="#475569" radius={[3,3,0,0]} />
            <Bar dataKey="Vencidas"      fill="#EF4444" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
