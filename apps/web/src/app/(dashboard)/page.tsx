"use client";
import { Header } from "@/components/layout/header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AuditorsChart } from "@/components/dashboard/auditors-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { MonthlyHeatmap } from "@/components/dashboard/monthly-heatmap";
import { useAuditStore, selectFilteredActivities } from "@/store/audit.store";
import { useShallow } from "zustand/react/shallow";
import { AUDITORS, AUDIT_YEAR } from "@/lib/constants";
import { calculateCompletionRate, getDaysRemaining } from "@/lib/utils";
import {
  CheckCircle2, Clock, Circle, AlertTriangle,
  CalendarDays, TrendingUp, Users, Activity,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

export default function DashboardPage() {
  const activities = useAuditStore(useShallow(selectFilteredActivities));
  const all = useAuditStore(useShallow((s) => s.activities));

  const completed   = all.filter(a => a.status === "COMPLETED").length;
  const inProgress  = all.filter(a => a.status === "IN_PROGRESS").length;
  const notStarted  = all.filter(a => a.status === "NOT_STARTED").length;
  const overdue     = all.filter(a => a.status === "OVERDUE").length;
  const total       = all.length;
  const rate        = calculateCompletionRate(all);

  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const daysToYearEnd = getDaysRemaining(`${AUDIT_YEAR}-12-31`);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Ejecutivo"
        subtitle={`Audit Platform Savicol · ${today}`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Year banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0D1526] via-[#1A2540] to-[#0D1526] border border-[#1E2D4A] px-6 py-5">
          <div className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.06]"
               style={{ backgroundImage: "repeating-linear-gradient(45deg, #3B82F6 0, #3B82F6 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-blue-400 mb-1">
                Cronograma Anual
              </p>
              <h2 className="font-display text-3xl font-bold text-white">
                Plan de Auditoría {AUDIT_YEAR}
              </h2>
              <p className="text-[#94A3B8] text-sm mt-1">
                {total > 0
                  ? `${total} actividades planificadas · ${rate}% completado`
                  : "Sin actividades registradas — comience cargando el cronograma"}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-[#475569] uppercase tracking-wider">Días restantes {AUDIT_YEAR}</p>
                <p className="font-display text-3xl font-bold text-gradient-gold">{daysToYearEnd > 0 ? daysToYearEnd : 0}</p>
              </div>
              <Link href="/cronograma" className="btn-primary">
                <CalendarDays className="w-4 h-4" /> Ver Cronograma
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Completadas"
            value={completed}
            total={total}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
            trend={total > 0 ? `${Math.round((completed/total)*100)}%` : "0%"}
          />
          <KpiCard
            label="En Curso"
            value={inProgress}
            total={total}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
            trend={total > 0 ? `${Math.round((inProgress/total)*100)}%` : "0%"}
          />
          <KpiCard
            label="No Iniciadas"
            value={notStarted}
            total={total}
            icon={<Circle className="w-5 h-5" />}
            color="slate"
            trend={total > 0 ? `${Math.round((notStarted/total)*100)}%` : "0%"}
          />
          <KpiCard
            label="Vencidas"
            value={overdue}
            total={total}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            trend={total > 0 ? `${Math.round((overdue/total)*100)}%` : "0%"}
            alert={overdue > 0}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AuditorsChart activities={all} />
          </div>
          <StatusDonut completed={completed} inProgress={inProgress} notStarted={notStarted} overdue={overdue} />
        </div>

        {/* Heatmap + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyHeatmap activities={all} />

          {/* Auditors quick view */}
          <div className="card-base">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Equipo de Auditoría
              </h3>
              <Link href="/auditores" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Ver todos →</Link>
            </div>
            <div className="space-y-2">
              {AUDITORS.map(auditor => {
                const auditorActivities = all.filter(a => a.auditorId === auditor.id);
                const done = auditorActivities.filter(a => a.status === "COMPLETED").length;
                const pct  = auditorActivities.length > 0 ? Math.round((done / auditorActivities.length) * 100) : 0;
                return (
                  <div key={auditor.id} className="flex items-center gap-3 py-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: auditor.color }}
                    >
                      {auditor.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white truncate">{auditor.name}</p>
                        <span className="text-xs text-[#94A3B8] shrink-0 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1A2540] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: auditor.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-[#475569] shrink-0 w-16 text-right">
                      {done}/{auditorActivities.length}
                    </span>
                  </div>
                );
              })}
              {all.length === 0 && (
                <p className="text-center text-sm text-[#475569] py-4">
                  Sin actividades — cargue el cronograma para ver métricas
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
