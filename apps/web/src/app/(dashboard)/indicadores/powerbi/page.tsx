"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Power BI embed dinámico · lee URL desde Settings
// ═══════════════════════════════════════════════════════════════════════════════
import { Header } from "@/components/layout/header";
import { useSettingsPublic, getSetting } from "@/hooks/useSettings";
import { useDashboardEjecutivo } from "@/hooks/useDashboardEjecutivo";
import { AlertCircle, ExternalLink, Loader2, BarChart2 } from "lucide-react";

export default function PowerBiPage() {
  const settingsQ  = useSettingsPublic();
  const ejecutivoQ = useDashboardEjecutivo();
  const embedUrl   = getSetting(settingsQ.data, "integrations.powerBiEmbedUrl");

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard Power BI"
        subtitle="Visualización ejecutiva embebida · datos actualizados desde el backend"
      />

      <div className="flex-1 p-6 space-y-6">
        {settingsQ.isLoading && (
          <div className="card-base p-8 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-5 h-5 animate-spin"/>
            <span className="ml-2 text-sm">Cargando configuración...</span>
          </div>
        )}

        {!settingsQ.isLoading && !embedUrl && (
          <div className="card-base p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400"/>
              </div>
              <div className="flex-1">
                <h2 className="text-white font-bold text-lg">Configurar Power BI</h2>
                <p className="text-[#94A3B8] text-sm mt-1">
                  Para visualizar tu reporte Power BI aquí, configurá la URL de embed desde
                </p>
                <a href="/configuracion" className="inline-flex items-center gap-1 text-amber-400 text-sm font-semibold mt-2 hover:underline">
                  Configuración → API · Power BI · Google Analytics
                  <ExternalLink className="w-3 h-3"/>
                </a>

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Cómo obtener la URL de embed:</h3>
                  <ol className="text-xs text-[#94A3B8] space-y-1.5 list-decimal list-inside">
                    <li>Abrí tu reporte en <strong className="text-blue-300">Power BI Service</strong> (app.powerbi.com)</li>
                    <li>Menú <code className="text-amber-400">File → Embed Report → Publish to web (public)</code> · o · <code className="text-amber-400">Embed in app</code></li>
                    <li>Copiá la URL completa (formato: <code className="text-emerald-300">https://app.powerbi.com/view?r=...</code>)</li>
                    <li>Pegala en Configuración → "Power BI · URL de embed" y guardá</li>
                    <li>Volvé a esta página · el reporte aparecerá embebido</li>
                  </ol>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-300 font-semibold mb-1">💡 Alternativa: Power BI Desktop</p>
                    <p className="text-xs text-[#94A3B8]">
                      Si prefieres trabajar en Power BI Desktop, generá un <strong>API Token</strong> en Configuración
                      y conectá los 8 datasets desde <code className="text-amber-400">Get Data → Web</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {embedUrl && (
          <>
            {/* KPIs ejecutivos arriba del iframe */}
            {ejecutivoQ.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <MiniKpi label="Granjas"        value={ejecutivoQ.data.workspaces.granjas.total} color="#3B82F6"/>
                <MiniKpi label="Rutas"          value={ejecutivoQ.data.workspaces.rutas.total} color="#10B981"/>
                <MiniKpi label="CEDIS"          value={ejecutivoQ.data.workspaces.cedis.total} color="#F59E0B"/>
                <MiniKpi label="Hallazgos"      value={ejecutivoQ.data.hallazgos.total} color="#EF4444"/>
                <MiniKpi label="KPI %"          value={`${ejecutivoQ.data.kpi.cumplimiento}%`} color="#8B5CF6"/>
                <MiniKpi label="Cronograma %"   value={`${ejecutivoQ.data.cronograma.progreso}%`} color="#06B6D4"/>
              </div>
            )}

            {/* Iframe Power BI */}
            <div className="card-base p-0 overflow-hidden">
              <div className="aspect-video w-full" style={{ minHeight: 600 }}>
                <iframe
                  title="Power BI · Savicol"
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  allowFullScreen
                  className="border-0"
                />
              </div>
            </div>

            <div className="card-base p-3 bg-blue-500/5 border-blue-500/20 flex items-center gap-2 text-xs text-blue-300">
              <BarChart2 className="w-3.5 h-3.5"/>
              Reporte embebido desde Power BI Service · actualización según el schedule configurado en Power BI.
              <a href="/configuracion" className="ml-auto underline">Cambiar URL</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="card-base text-center p-3" style={{ borderColor: `${color}30` }}>
      <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{label}</p>
      <p className="font-display text-2xl font-bold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}
