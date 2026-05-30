"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number;
  total: number;
  icon: ReactNode;
  color: "green" | "amber" | "slate" | "red" | "blue" | "cyan";
  trend: string;
  alert?: boolean;
}

const colorMap = {
  green: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bar: "bg-emerald-500" },
  amber: { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   bar: "bg-amber-500"   },
  slate: { text: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   bar: "bg-slate-500"   },
  red:   { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     bar: "bg-red-500"     },
  blue:  { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    bar: "bg-blue-500"    },
  cyan:  { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    bar: "bg-cyan-500"    },
};

export function KpiCard({ label, value, total, icon, color, trend, alert }: KpiCardProps) {
  const c = colorMap[color];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={cn(
      "card-base card-hover animate-fade-in relative overflow-hidden",
      alert && "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
    )}>
      {alert && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-400 animate-pulse-soft" />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg, `border ${c.border}`)}>
          <span className={c.text}>{icon}</span>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", c.bg, c.text, `border ${c.border}`)}>
          {trend}
        </span>
      </div>

      <div className="mb-3">
        <p className="font-display text-3xl font-bold text-white leading-none">{value}</p>
        <p className="text-sm text-[#94A3B8] mt-1">{label}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[#1A2540] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", c.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-[#475569] mt-1.5">{pct}% del total ({total})</p>
    </div>
  );
}
