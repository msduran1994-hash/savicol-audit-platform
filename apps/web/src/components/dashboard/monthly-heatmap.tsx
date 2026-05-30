"use client";
import { MONTHS_2026, AUDITORS } from "@/lib/constants";
import type { AuditActivity } from "@/store/audit.store";
import { cn } from "@/lib/utils";

interface Props { activities: AuditActivity[]; }

export function MonthlyHeatmap({ activities }: Props) {
  // Build matrix: auditor × month → count
  const matrix = AUDITORS.map(a => ({
    ...a,
    counts: MONTHS_2026.map(m => ({
      month: m.short,
      count: activities.filter(act =>
        act.auditorId === a.id && new Date(act.startDate).getMonth() + 1 === m.value
      ).length,
    })),
  }));

  const maxCount = Math.max(1, ...matrix.flatMap(r => r.counts.map(c => c.count)));

  function getIntensity(count: number): string {
    if (count === 0) return "bg-[#1A2540]";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-blue-900/60";
    if (ratio <= 0.5)  return "bg-blue-700/70";
    if (ratio <= 0.75) return "bg-blue-500/80";
    return "bg-blue-400";
  }

  return (
    <div className="card-base overflow-x-auto">
      <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30 inline-block" />
        Heatmap — Carga de Trabajo por Mes
      </h3>

      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#475569] text-sm">
          Sin actividades para mostrar
        </div>
      ) : (
        <div className="min-w-[480px]">
          {/* Month headers */}
          <div className="flex items-center gap-1 mb-2 pl-24">
            {MONTHS_2026.map(m => (
              <div key={m.value} className="flex-1 text-center text-[10px] text-[#475569] font-medium">
                {m.short}
              </div>
            ))}
          </div>

          {/* Rows */}
          {matrix.map(row => (
            <div key={row.id} className="flex items-center gap-1 mb-1">
              <div className="w-24 text-xs text-[#94A3B8] truncate pr-2 shrink-0">
                {row.name.split(" ")[0]}
              </div>
              {row.counts.map(({ month, count }) => (
                <div
                  key={month}
                  title={`${row.name} · ${month}: ${count} actividad(es)`}
                  className={cn(
                    "flex-1 h-7 rounded cursor-default transition-colors",
                    getIntensity(count)
                  )}
                >
                  {count > 0 && (
                    <span className="flex h-full items-center justify-center text-[10px] font-bold text-white/80">
                      {count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1E2D4A]">
            <span className="text-[10px] text-[#475569]">Menos</span>
            {["bg-[#1A2540]","bg-blue-900/60","bg-blue-700/70","bg-blue-500/80","bg-blue-400"].map((c,i) => (
              <div key={i} className={cn("w-5 h-5 rounded", c)} />
            ))}
            <span className="text-[10px] text-[#475569]">Más</span>
          </div>
        </div>
      )}
    </div>
  );
}
