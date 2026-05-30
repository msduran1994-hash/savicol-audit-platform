"use client";
import { Header } from "@/components/layout/header";
import {
  FileText, Download, Sparkles, AlertTriangle, Activity, Target,
  TrendingUp, GitCompare, Award, BarChart3,
} from "lucide-react";

const REPORTES = [
  { id: "hallazgos",   label: "Reporte de Hallazgos",  desc: "Listado completo con criticidad y estado",            icon: AlertTriangle, formato: ["PDF","Excel"] },
  { id: "riesgos",     label: "Análisis de Riesgos",    desc: "Distribución por reputacional/financiero/operativo",   icon: Activity,      formato: ["PDF"] },
  { id: "incidencias", label: "Incidencias",            desc: "% de incidencia por CEDI, categoría y mes",             icon: Target,        formato: ["PDF","Power BI"] },
  { id: "comparativos",label: "Comparativos",           desc: "Benchmarking entre CEDIS por indicadores clave",       icon: GitCompare,    formato: ["Excel","Power BI"] },
  { id: "auditorias",  label: "Auditorías Realizadas",   desc: "Resumen ejecutivo de auditorías por auditor y mes",    icon: FileText,      formato: ["PDF"] },
  { id: "tendencias",  label: "Tendencias",              desc: "Evolución mensual de hallazgos, riesgos y cierre",     icon: TrendingUp,    formato: ["PDF","Power BI"] },
  { id: "cumplimiento",label: "Cumplimiento",            desc: "Estado de planes de acción y porcentajes de cierre",   icon: Award,         formato: ["PDF","Excel"] },
  { id: "criticos",    label: "Riesgos Críticos",        desc: "Solo hallazgos críticos abiertos requiriendo escalamiento", icon: AlertTriangle, formato: ["PDF"] },
  { id: "kpi",         label: "KPI Auditoría",           desc: "Métricas de cobertura, frecuencia y desempeño",        icon: BarChart3,     formato: ["PDF","Power BI"] },
];

export default function ReportesCedisPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header title="Reportes Ejecutivos · CEDIS" subtitle="9 reportes preconfigurados · PDF · Excel · Power BI · Resumen IA"/>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => (
            <div key={r.id} className="card-base card-hover">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <r.icon className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
                <div className="flex gap-1">
                  {r.formato.map(f => <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">{f}</span>)}
                </div>
                <button disabled className="btn-ghost text-xs opacity-50 cursor-not-allowed">
                  <Download className="w-3.5 h-3.5"/>Próximamente
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#0A2D1F] border-emerald-900/30">
          <h3 className="font-display font-semibold text-emerald-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> Resumen Ejecutivo IA + Cierre Inteligente
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Cada reporte incluirá resumen ejecutivo generado por IA con recomendaciones, alertas estratégicas
            y cierre inteligente de hallazgos. Disponibles dashboards interactivos exportables a Power BI.
          </p>
        </div>
      </div>
    </div>
  );
}
