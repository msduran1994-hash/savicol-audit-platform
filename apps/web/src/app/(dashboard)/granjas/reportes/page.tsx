"use client";
import { Header } from "@/components/layout/header";
import {
  FileText, Download, Sparkles, BarChart3, AlertTriangle, Target,
  ClipboardCheck, TrendingUp, GitCompare, Award, FileSpreadsheet,
} from "lucide-react";

const REPORTES = [
  { id: "hallazgos",     label: "Reporte de Hallazgos",       desc: "Listado completo de hallazgos con criticidad y estado",            icon: AlertTriangle,  formato: ["PDF", "Excel"] },
  { id: "riesgos",       label: "Análisis de Riesgos",        desc: "Distribución por tipo de riesgo y exposición acumulada",          icon: BarChart3,      formato: ["PDF"] },
  { id: "kpi",           label: "Cumplimiento KPI",           desc: "Estado de KPIs, avance, vencimientos y responsables",             icon: Target,         formato: ["PDF", "Excel"] },
  { id: "auditorias",    label: "Resumen de Auditorías",       desc: "Auditorías ejecutadas, pendientes y resultados",                  icon: ClipboardCheck, formato: ["PDF"] },
  { id: "tendencias",    label: "Tendencias Mensuales",        desc: "Evolución de hallazgos, riesgos y mortalidad en el tiempo",       icon: TrendingUp,     formato: ["PDF", "Power BI"] },
  { id: "comparativos",  label: "Comparativo de Granjas",      desc: "Benchmarking entre granjas por indicadores clave",                icon: GitCompare,     formato: ["Excel", "Power BI"] },
  { id: "cumplimiento",  label: "Cumplimiento Normativo",      desc: "Estado de cumplimiento de regulaciones ICA y bioseguridad",       icon: Award,          formato: ["PDF"] },
  { id: "criticos",      label: "Riesgos Críticos",            desc: "Solo hallazgos críticos abiertos requiriendo atención inmediata", icon: AlertTriangle,  formato: ["PDF"] },
  { id: "diagnostico",   label: "Diagnóstico Ejecutivo IA",    desc: "Resumen ejecutivo con insights y recomendaciones automáticas",    icon: Sparkles,       formato: ["PDF", "Dashboard"] },
];

export default function ReportesPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Reportes Ejecutivos"
        subtitle="9 reportes preconfigurados · PDF · Excel · Power BI · Dashboard"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Grid de reportes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => (
            <div key={r.id} className="card-base card-hover">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <r.icon className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">{r.label}</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
                <div className="flex gap-1">
                  {r.formato.map(f => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A2540] border border-[#2A3F6A] text-[#94A3B8]">
                      {f}
                    </span>
                  ))}
                </div>
                <button disabled className="btn-ghost text-xs opacity-50 cursor-not-allowed">
                  <Download className="w-3.5 h-3.5"/> Próximamente
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Insights IA */}
        <div className="card-base bg-gradient-to-br from-[#0D1526] to-[#1A1208] border-amber-900/30">
          <h3 className="font-display font-semibold text-amber-400 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/> Insights Automáticos IA
          </h3>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Cuando esté disponible la conexión con la API, cada reporte incluirá un resumen ejecutivo
            generado automáticamente con insights, recomendaciones y comparativos contra benchmarks de la industria avícola.
            Los reportes pueden agendarse para envío automático por correo a directivos.
          </p>
        </div>

        {/* Exportación */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ExportOption icon={<FileText/>}        label="PDF Ejecutivo"  desc="Reporte formateado profesional" />
          <ExportOption icon={<FileSpreadsheet/>} label="Excel Completo" desc="Datos crudos para análisis"     />
          <ExportOption icon={<BarChart3/>}       label="Power BI"        desc="Dataset compatible"            />
          <ExportOption icon={<Sparkles/>}        label="Dashboard"       desc="Vista interactiva web"          />
        </div>
      </div>
    </div>
  );
}

function ExportOption({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="card-base text-center">
      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-[10px] text-[#94A3B8] mt-1">{desc}</p>
    </div>
  );
}
