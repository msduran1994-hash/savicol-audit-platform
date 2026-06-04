"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// /configuracion/importar · Bulk import desde CSV
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useImport, parseCSV, type ImportEntity, type ImportResult } from "@/hooks/useImports";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2,
  ArrowRight, ClipboardPaste, Trash2, Building2, FileText, ClipboardList, Calendar, MapPin,
} from "lucide-react";

interface EntityConfig {
  key:        ImportEntity;
  label:      string;
  icon:       any;
  color:      string;
  templates:  string[];
  example:    string;
}

const ENTITIES: EntityConfig[] = [
  {
    key: "granjas",
    label: "Granjas",
    icon: Building2,
    color: "#06B6D4",
    templates: ["codigo", "nombre", "region", "vereda", "administrador", "telefono", "tipoGranja", "tipoOperativo", "nivelRiesgo", "capacidadAves", "estadoSanitario", "notas"],
    example: "codigo,nombre,region,vereda,administrador,telefono,tipoGranja,tipoOperativo,nivelRiesgo,capacidadAves,estadoSanitario\nG-001,Granja San José,Cundinamarca,Vereda La Esmeralda,Juan Pérez,3001234567,PROPIA,ENGORDE,BAJO,15000,OPTIMO",
  },
  {
    key: "hallazgos-granja",
    label: "Hallazgos Granjas",
    icon: AlertCircle,
    color: "#F59E0B",
    templates: ["granjaCodigo", "titulo", "descripcion", "categoria", "criticidad", "tiposRiesgo", "fechaVisita", "auditorNombre", "estado", "tipoGranja", "tipoOperativo"],
    example: "granjaCodigo,titulo,descripcion,categoria,criticidad,tiposRiesgo,fechaVisita,auditorNombre,estado\nG-001,Falta registro vacunación,Lote 3 sin registro completo,SANITARIO,ALTA,SANITARIO|OPERATIVO,2026-06-01,María González,ABIERTO",
  },
  {
    key: "kpis",
    label: "KPIs Granjas",
    icon: ClipboardList,
    color: "#10B981",
    templates: ["granjaCodigo", "accion", "seguimiento", "fechaCompromiso", "planAccionVeterinario", "responsable", "estado", "porcentajeAvance"],
    example: "granjaCodigo,accion,seguimiento,fechaCompromiso,planAccionVeterinario,responsable,estado,porcentajeAvance\nG-001,Mejorar bioseguridad,Verificación mensual,2026-07-15,Auditoría externa + capacitación,Carlos Ramírez,EN_CURSO,35",
  },
  {
    key: "cronograma",
    label: "Cronograma · Actividades",
    icon: Calendar,
    color: "#8B5CF6",
    templates: ["item", "area", "auditorName", "activity", "activityType", "startDate", "endDate", "status", "year"],
    example: "item,area,auditorName,activity,activityType,startDate,endDate,status,year\n1,GRANJAS,Juan Pérez,Auditoría Q3 Granja San José,AUDITORIA,2026-07-01,2026-07-05,NOT_STARTED,2026",
  },
  {
    key: "hallazgos-cedi",
    label: "Hallazgos CEDIS",
    icon: MapPin,
    color: "#EC4899",
    templates: ["cediCodigo", "titulo", "descripcion", "categoria", "subtema", "tipoRiesgo", "criticidad", "estado", "responsable", "fechaCompromiso"],
    example: "cediCodigo,titulo,descripcion,categoria,subtema,tipoRiesgo,criticidad,estado,responsable,fechaCompromiso\nCEDI-TUNJA,Inventario incompleto,Faltó conteo cuarto frío 2,OPERATIVO,Inventario,OPERATIVO,MEDIA,EN_PLAN,Pedro Silva,2026-07-20",
  },
];

export default function ImportarPage() {
  const [entity, setEntity] = useState<ImportEntity>("granjas");
  const cfg = ENTITIES.find(e => e.key === entity)!;
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<Array<Record<string, string>>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMut = useImport(entity);

  const onParse = () => {
    setParseError(null);
    setResult(null);
    try {
      const rows = parseCSV(csv);
      if (rows.length === 0) { setParseError("CSV vacío o sin datos"); setParsed([]); return; }
      setParsed(rows);
    } catch (e: any) {
      setParseError(e?.message ?? "Error parseando CSV");
      setParsed([]);
    }
  };

  const onImport = async () => {
    if (parsed.length === 0) return;
    setResult(null);
    try {
      const res = await importMut.mutateAsync(parsed);
      setResult(res);
    } catch (e: any) {
      alert("Error: " + (e?.response?.data?.message ?? e?.message ?? "—"));
    }
  };

  const loadExample = () => { setCsv(cfg.example); setParsed([]); setResult(null); setParseError(null); };
  const clearAll = () => { setCsv(""); setParsed([]); setResult(null); setParseError(null); };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Importación masiva"
        subtitle="Carga datos desde CSV · pega el contenido o exporta desde Excel · sin archivos en el servidor"
      />
      <div className="flex-1 p-6 space-y-6">
        {/* Selector entidad */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ENTITIES.map(e => {
            const Icon = e.icon;
            const active = e.key === entity;
            return (
              <button
                key={e.key}
                onClick={() => { setEntity(e.key); setParsed([]); setResult(null); setParseError(null); }}
                className={`card-base text-left transition-all ${active ? "border-cyan-500/50 bg-cyan-500/5" : "hover:border-[#334E7E]"}`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${e.color}18`, color: e.color }}>
                  <Icon className="w-5 h-5"/>
                </div>
                <p className="font-display font-bold text-white text-sm">{e.label}</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">{e.templates.length} columnas</p>
              </button>
            );
          })}
        </div>

        {/* Plantilla columnas */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" style={{ color: cfg.color }}/>
              Columnas esperadas · {cfg.label}
            </h3>
            <button onClick={loadExample} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <ArrowRight className="w-3 h-3"/>Cargar ejemplo
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cfg.templates.map(c => (
              <span key={c} className="px-2 py-0.5 rounded bg-[#0D1526] border border-[#1E2D4A] text-[10px] text-[#94A3B8] font-mono">
                {c}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[#475569] mt-3">
            Primera fila debe contener los nombres de columna. Acepta enums case-insensitive.
            Las filas inválidas se omiten y se reportan abajo.
          </p>
        </div>

        {/* Editor CSV */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-cyan-400"/>Pega tu CSV aquí
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className="btn-ghost text-[10px] flex items-center gap-1">
                <Trash2 className="w-3 h-3"/>Limpiar
              </button>
              <button onClick={onParse} disabled={!csv.trim()} className="btn-primary text-xs bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5"/>Analizar
              </button>
            </div>
          </div>
          <textarea
            value={csv}
            onChange={e => { setCsv(e.target.value); setParsed([]); setResult(null); }}
            placeholder={`Pega tu CSV aquí — la primera línea son los encabezados:\n\n${cfg.example.split("\n")[0]}\n...`}
            className="w-full min-h-[200px] px-3 py-2 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white placeholder:text-[#475569] focus:outline-none focus:border-cyan-500/40 font-mono"
          />
          {parseError && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Preview */}
        {parsed.length > 0 && (
          <div className="card-base">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-white text-sm">
                Preview · {parsed.length} fila(s) detectada(s)
              </h3>
              <button
                onClick={onImport}
                disabled={importMut.isPending}
                className="btn-primary text-xs bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 disabled:opacity-50"
              >
                {importMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}
                {importMut.isPending ? "Importando..." : `Importar ${parsed.length} fila(s)`}
              </button>
            </div>
            <div className="overflow-x-auto border border-[#1E2D4A] rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-[#1A2540]">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-[10px] text-[#94A3B8] uppercase tracking-wider">#</th>
                    {Object.keys(parsed[0]).map(k => (
                      <th key={k} className="text-left px-2 py-1.5 text-[10px] text-[#94A3B8] uppercase tracking-wider font-mono">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-[#1E2D4A]/30">
                      <td className="px-2 py-1.5 text-[#475569]">{i + 1}</td>
                      {Object.values(r).map((v, j) => (
                        <td key={j} className="px-2 py-1.5 text-white truncate max-w-[200px]" title={v}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.length > 10 && (
              <p className="text-[10px] text-[#475569] mt-2 text-center">… mostrando primeras 10 filas · total {parsed.length}</p>
            )}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="card-base">
            <h3 className="font-display font-bold text-white text-sm mb-3">Resultado de importación</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="Total" value={result.total} color="#94A3B8" icon={FileSpreadsheet}/>
              <Stat label="Creados" value={result.created} color="#10B981" icon={CheckCircle2}/>
              <Stat label="Actualizados" value={result.updated} color="#3B82F6" icon={ArrowRight}/>
              <Stat label="Omitidos" value={result.skipped} color="#EF4444" icon={XCircle}/>
            </div>

            {result.errors.length > 0 && (
              <div>
                <p className="text-xs text-[#EF4444] font-semibold mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5"/>{result.errors.length} error(es)
                </p>
                <div className="max-h-[300px] overflow-y-auto border border-red-500/20 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-red-500/10 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-[10px] text-red-300 uppercase">Fila</th>
                        <th className="text-left px-2 py-1.5 text-[10px] text-red-300 uppercase">Campo</th>
                        <th className="text-left px-2 py-1.5 text-[10px] text-red-300 uppercase">Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-t border-red-500/10">
                          <td className="px-2 py-1.5 text-red-200 font-mono">{e.row}</td>
                          <td className="px-2 py-1.5 text-red-200 font-mono">{e.field ?? "—"}</td>
                          <td className="px-2 py-1.5 text-red-100">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) {
  return (
    <div className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }}/>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
