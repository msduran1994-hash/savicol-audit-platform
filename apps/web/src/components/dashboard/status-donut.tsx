"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface Props { completed: number; inProgress: number; notStarted: number; overdue: number; }

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="#F8FAFC" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg p-2.5 text-xs shadow-card">
      <p className="flex items-center gap-2 text-white">
        <span className="w-2 h-2 rounded-full" style={{ background: payload[0].payload.color }} />
        {payload[0].name}: <span className="font-bold ml-1">{payload[0].value}</span>
      </p>
    </div>
  );
};

export function StatusDonut({ completed, inProgress, notStarted, overdue }: Props) {
  const data = [
    { name: "Completadas",   value: completed,  color: "#10B981" },
    { name: "En Curso",      value: inProgress, color: "#F59E0B" },
    { name: "No Iniciadas",  value: notStarted, color: "#475569" },
    { name: "Vencidas",      value: overdue,    color: "#EF4444" },
  ].filter(d => d.value > 0);

  const total = completed + inProgress + notStarted + overdue;

  return (
    <div className="card-base">
      <h3 className="font-display font-semibold text-white flex items-center gap-2 mb-4">
        <PieIcon className="w-4 h-4 text-blue-400" /> Distribución por Estado
      </h3>

      {total === 0 ? (
        <div className="flex items-center justify-center h-44 text-[#475569] text-sm">Sin actividades</div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                  dataKey="value" labelLine={false} label={renderCustomLabel}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display text-2xl font-bold text-white">{total}</p>
              <p className="text-[10px] text-[#475569]">Total</p>
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            {data.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
