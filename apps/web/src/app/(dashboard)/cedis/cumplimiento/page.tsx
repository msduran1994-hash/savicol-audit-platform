"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Cumplimiento CEDIS · CRUD completo de planes correctivos
// ═══════════════════════════════════════════════════════════════════════════════
// CADA "plan de cumplimiento" se almacena como un HallazgoCedi con sus campos
// de seguimiento (responsable, fechaCompromiso, fechaCierre, % avance, estado).
// El botón "Nuevo Plan" lanza un modal de creación. Se puede editar, actualizar
// avance/estado inline y eliminar.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useCedisStore } from "@/store/cedis.store";
import { useShallow } from "zustand/react/shallow";
import {
  useCedis, useHallazgosCedi,
  useCreateHallazgoCedi, useUpdateHallazgoCedi, useDeleteHallazgoCedi,
  type HallazgoCediDto,
} from "@/hooks/useCedis";
import { AUDITORS } from "@/lib/constants";
import {
  CheckSquare, AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw, Filter,
  Plus, Edit2, Trash2, X, AlertTriangle, Loader2, Save, Sparkles, FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { InformeCedisModal } from "./informe-cedis";

const SUBTEMAS = [
  "Inventario", "Caja", "Cartera", "Logística",
  "Bioseguridad", "Infraestructura", "Procedimientos",
] as const;
const CATEGORIAS = [
  "INVENTARIO", "CAJA", "CARTERA", "LOGISTICA",
  "BIOSEGURIDAD", "INFRAESTRUCTURA", "PROCEDIMIENTOS",
] as const;
const TIPOS_RIESGO = ["REPUTACIONAL", "FINANCIERO", "CONTAGIO", "OPERATIVO", "LEGAL"] as const;
const CRITICIDADES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;
const ESTADOS     = ["ABIERTO", "EN_PLAN", "EN_VERIFICACION", "CERRADO", "REINCIDENTE"] as const;

const ESTADO_COLOR: Record<string, string> = {
  ABIERTO: "#EF4444",         Abierto: "#EF4444",
  EN_PLAN: "#F59E0B",         "En Plan": "#F59E0B",
  EN_VERIFICACION: "#06B6D4", "En Verificación": "#06B6D4",
  CERRADO: "#10B981",         Cerrado: "#10B981",
  REINCIDENTE: "#A855F7",     Reincidente: "#A855F7",
};
const CRIT_COLOR: Record<string, string> = {
  CRITICA: "#EF4444", Crítica: "#EF4444",
  ALTA: "#F97316",    Alta: "#F97316",
  MEDIA: "#F59E0B",   Media: "#F59E0B",
  BAJA: "#10B981",    Baja: "#10B981",
};

const STATUS_LABEL: Record<string, string> = {
  ABIERTO: "Abierto",
  EN_PLAN: "En Plan",
  EN_VERIFICACION: "En Verificación",
  CERRADO: "Cerrado",
  REINCIDENTE: "Reincidente",
};

interface PlanFilters {
  cediId: string;
  subtema: string;
  estado: string;
  criticidad: string;
  search: string;
}

const emptyFilters: PlanFilters = { cediId: "", subtema: "", estado: "", criticidad: "", search: "" };

export default function CumplimientoCedisPage() {
  // Catálogos del API (5 CEDIS oficiales)
  const cedisQ = useCedis();
  const cedis  = cedisQ.data ?? [];

  // Hallazgos / planes desde API (con react-query · data hydration sincroniza store)
  const hallazgosQ = useHallazgosCedi();
  const hallazgosApi = hallazgosQ.data ?? [];

  // Tambien podemos leer del store (ya hidratado) para mantener compat con UI legacy
  const hallazgosStore = useCedisStore(useShallow((s) => s.hallazgos));
  const auditoriasStore = useCedisStore(useShallow((s) => s.auditorias));

  // Preferimos API live (siempre actualizado tras mutación)
  const hallazgos = hallazgosApi.length > 0 ? hallazgosApi : hallazgosStore;

  // Mutaciones
  const createPlan = useCreateHallazgoCedi();
  const updatePlan = useUpdateHallazgoCedi();
  const deletePlan = useDeleteHallazgoCedi();

  // Filtros
  const [filters, setFilters] = useState<PlanFilters>(emptyFilters);
  const setF = (k: keyof PlanFilters, v: string) => setFilters({ ...filters, [k]: v });

  const filtered = useMemo(() => {
    return hallazgos.filter(h => {
      if (filters.cediId     && h.cediId     !== filters.cediId)     return false;
      if (filters.subtema    && h.subtema    !== filters.subtema)    return false;
      if (filters.estado     && h.estado     !== filters.estado && STATUS_LABEL[filters.estado] !== h.estado) return false;
      if (filters.criticidad && h.criticidad !== filters.criticidad) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [h.titulo, h.descripcion, h.responsable, h.cediNombre]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hallazgos, filters]);

  // KPIs
  const stats = {
    total:        filtered.length,
    abierto:      filtered.filter(h => h.estado === "ABIERTO" || h.estado === "Abierto").length,
    enPlan:       filtered.filter(h => h.estado === "EN_PLAN" || h.estado === "En Plan").length,
    verificacion: filtered.filter(h => h.estado === "EN_VERIFICACION" || h.estado === "En Verificación").length,
    cerrado:      filtered.filter(h => h.estado === "CERRADO" || h.estado === "Cerrado").length,
    reincidente:  filtered.filter(h => h.reincidente || h.estado === "REINCIDENTE" || h.estado === "Reincidente").length,
  };
  const avancePromedio = filtered.length > 0
    ? Math.round(filtered.reduce((s, h) => s + (h.porcentajeAvance ?? 0), 0) / filtered.length)
    : 0;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [informeOpen, setInformeOpen] = useState(false);
  const usuarioNombre = useAuthStore((s) => s.user?.name ?? "Auditor CEDIS");

  const openCreate = () => { setEditing(null); setErrorMsg(null); setModalOpen(true); };
  const openEdit   = (h: any) => { setEditing(h); setErrorMsg(null); setModalOpen(true); };

  const handleDelete = async (h: any) => {
    if (!confirm(`¿Eliminar plan "${h.titulo}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      await deletePlan.mutateAsync(h.id);
    } catch (e: any) {
      alert("Error al eliminar: " + (e?.response?.data?.message ?? e?.message ?? "desconocido"));
    }
  };

  // Quick inline updates (cambiar estado/avance sin abrir modal)
  const handleQuickUpdate = async (id: string, patch: Partial<HallazgoCediDto>) => {
    try {
      await updatePlan.mutateAsync({ id, patch });
    } catch (e: any) {
      alert("Error: " + (e?.response?.data?.message ?? e?.message ?? "desconocido"));
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cumplimiento · Acciones Correctivas CEDIS"
        subtitle={`${stats.total} planes en seguimiento · ${avancePromedio}% avance promedio · ${stats.reincidente} reincidencia(s)`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar con filtros + Nuevo Plan */}
        <div className="card-base p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#94A3B8] flex items-center gap-1.5 shrink-0"><Filter className="w-3.5 h-3.5"/>Filtros</span>

            <input
              value={filters.search}
              onChange={(e) => setF("search", e.target.value)}
              placeholder="Buscar por título, responsable, CEDI..."
              className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white placeholder:text-[#475569] focus:outline-none focus:border-emerald-500/40 flex-1 min-w-[200px]"
            />

            <Sel value={filters.cediId} onChange={v => setF("cediId", v)} placeholder="Todos los CEDIS"
                 options={cedis.map((c: any) => ({ value: c.id, label: c.nombre }))}/>

            <Sel value={filters.subtema} onChange={v => setF("subtema", v)} placeholder="Subtema"
                 options={SUBTEMAS.map(s => ({ value: s, label: s }))}/>

            <Sel value={filters.estado} onChange={v => setF("estado", v)} placeholder="Estado"
                 options={ESTADOS.map(e => ({ value: e, label: STATUS_LABEL[e] }))}/>

            <Sel value={filters.criticidad} onChange={v => setF("criticidad", v)} placeholder="Criticidad"
                 options={CRITICIDADES.map(c => ({ value: c, label: c }))}/>

            <button onClick={() => setFilters(emptyFilters)} className="px-2 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3 h-3"/> Limpiar
            </button>

            <button
              onClick={() => setInformeOpen(true)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-[#1A2540] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5"/> Informes
            </button>

            <button
              onClick={openCreate}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5"/> Nuevo Plan
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Abierto"       value={stats.abierto}      color="#EF4444" icon={<AlertCircle/>}/>
          <Kpi label="En Plan"       value={stats.enPlan}       color="#F59E0B" icon={<Clock/>}/>
          <Kpi label="Verificación"  value={stats.verificacion} color="#06B6D4" icon={<RefreshCw/>}/>
          <Kpi label="Cerrados"      value={stats.cerrado}      color="#10B981" icon={<CheckCircle2/>}/>
          <Kpi label="Reincidencias" value={stats.reincidente}  color="#A855F7" icon={<XCircle/>} alert={stats.reincidente > 0}/>
        </div>

        {/* Lista */}
        {hallazgosQ.isLoading ? (
          <div className="card-base p-12 flex items-center justify-center text-[#475569]">
            <Loader2 className="w-6 h-6 animate-spin"/>
            <span className="ml-3 text-sm">Cargando planes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-base flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="w-10 h-10 text-[#1E2D4A] mb-4"/>
            <p className="text-white font-semibold mb-2">
              {hallazgos.length === 0 ? "Sin planes de cumplimiento registrados" : "Sin resultados con los filtros actuales"}
            </p>
            <p className="text-[#475569] text-sm">
              {hallazgos.length === 0
                ? 'Click en "Nuevo Plan" para crear el primero'
                : "Ajusta los filtros o limpia para ver todos"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((h: any) => {
              const estLabel = STATUS_LABEL[h.estado] ?? h.estado;
              const estColor = ESTADO_COLOR[h.estado] ?? "#94A3B8";
              const critColor = CRIT_COLOR[h.criticidad] ?? "#94A3B8";
              return (
                <div key={h.id} className="card-base">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{h.titulo}</h3>
                      <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-emerald-300">{h.cediNombre ?? "—"}</span>
                        <span>·</span>
                        <span>{h.categoria}</span>
                        {h.subtema && (<><span>·</span><span className="text-cyan-300">{h.subtema}</span></>)}
                        {h.subItem && (<><span>·</span><span>{h.subItem}</span></>)}
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">{h.descripcion}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 items-start">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                            style={{ background: `${critColor}18`, color: critColor, border: `1px solid ${critColor}30` }}>
                        {h.criticidad}
                      </span>
                      {h.reincidente && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">🔁 Reincidente</span>
                      )}
                    </div>
                  </div>

                  {/* Avance + estado inline editable */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[#94A3B8]">Avance</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0} max={100}
                          defaultValue={h.porcentajeAvance ?? 0}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v !== (h.porcentajeAvance ?? 0)) {
                              handleQuickUpdate(h.id, { porcentajeAvance: Math.max(0, Math.min(100, v)) });
                            }
                          }}
                          className="w-16 px-2 py-0.5 bg-[#0D1526] border border-[#2A3F6A] rounded text-white text-xs text-right focus:outline-none focus:border-emerald-500/40"
                        />
                        <span className="text-white text-xs font-mono">%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#1A2540] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${h.porcentajeAvance ?? 0}%`, background: estColor }}/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">Responsable</p>
                      <p className="text-white">{h.responsable ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">Fecha Compromiso</p>
                      <p className="text-white">{h.fechaCompromiso ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">Fecha Cierre</p>
                      <p className="text-white">{h.fechaCierre ?? "Pendiente"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#475569] uppercase tracking-wider mb-0.5">Estado</p>
                      <select
                        value={h.estado}
                        onChange={(e) => handleQuickUpdate(h.id, { estado: e.target.value })}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-transparent w-full max-w-[160px]"
                        style={{ color: estColor, borderColor: `${estColor}40`, background: `${estColor}15` }}
                      >
                        {ESTADOS.map(s => (
                          <option key={s} value={s} className="bg-[#0D1526] text-white">{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {h.recomendacionIA && (
                    <div className="mt-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3"/> Recomendación IA
                      </p>
                      <p className="text-xs text-[#94A3B8]">{h.recomendacionIA}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-3 pt-3 border-t border-[#1E2D4A] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${estColor}18`, color: estColor, border: `1px solid ${estColor}30` }}>
                        {estLabel}
                      </span>
                      <span className="text-[#475569] text-[10px]">ID: {h.id.slice(0, 8)}…</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(h)}
                        disabled={updatePlan.isPending}
                        className="px-2 py-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit2 className="w-3 h-3"/> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(h)}
                        disabled={deletePlan.isPending}
                        className="px-2 py-1 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3"/> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card-base bg-blue-500/5 border-blue-500/20">
          <h3 className="text-blue-400 font-semibold mb-2 text-sm">Trazabilidad y persistencia</h3>
          <ul className="text-xs text-[#94A3B8] space-y-1 list-disc list-inside">
            <li>Cada cambio de avance, estado o edición se persiste de inmediato en Postgres.</li>
            <li>Los dashboards ejecutivos (/cedis/ejecutivo y /indicadores/gerencial) se refrescan automáticamente.</li>
            <li>El historial queda registrado (createdAt + updatedAt) por cada plan.</li>
            <li>Reincidencias marcadas en rojo permanecen para análisis posterior.</li>
          </ul>
        </div>
      </div>

      {informeOpen && (
        <InformeCedisModal
          hallazgos={hallazgos}
          cedis={cedis.map((c: any) => ({ id: c.id, nombre: c.nombre }))}
          auditorias={auditoriasStore}
          usuario={usuarioNombre}
          onClose={() => setInformeOpen(false)}
        />
      )}

      {modalOpen && (
        <PlanModal
          item={editing}
          cedis={cedis}
          onClose={() => setModalOpen(false)}
          onSave={async (dto) => {
            setErrorMsg(null);
            try {
              if (editing) {
                await updatePlan.mutateAsync({ id: editing.id, patch: dto });
              } else {
                await createPlan.mutateAsync(dto);
              }
              setModalOpen(false);
            } catch (e: any) {
              // Extracción robusta del error · cualquiera de estas estructuras
              const raw = e?.response?.data;
              let msg = "Error al guardar";
              if (raw) {
                if (typeof raw === "string") msg = raw;
                else if (raw.message) msg = Array.isArray(raw.message) ? raw.message.join(" · ") : String(raw.message);
                else if (raw.error)   msg = String(raw.error);
              } else if (e?.message) {
                msg = e.message;
              }
              // Detalle adicional para debugging
              if (e?.response?.status) msg = `HTTP ${e.response.status} · ${msg}`;
              setErrorMsg(msg);
              console.error("[CumplimientoCEDIS] error guardando plan:", e);
              throw e;
            }
          }}
          error={errorMsg}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
function Sel({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/40 min-w-[140px]"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Kpi({ label, value, color, icon, alert }: { label: string; value: number; color: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`card-base flex items-center gap-3 ${alert ? "ring-1 ring-red-500/40" : ""}`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <p className="font-display text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  MODAL · Crear / Editar plan de cumplimiento                              */
/* ────────────────────────────────────────────────────────────────────────── */
function PlanModal({ item, cedis, onClose, onSave, error }: {
  item: any | null;
  cedis: any[];
  onClose: () => void;
  onSave: (dto: Partial<HallazgoCediDto>) => Promise<void>;
  error: string | null;
}) {
  const isEdit = !!item;

  const safeCediId = item?.cediId ?? (cedis[0]?.id ?? "");

  // Normaliza valores legacy (Title Case con acentos) → UPPER_CASE del backend
  const normalize = (s: string | undefined, list: readonly string[]): string => {
    if (!s) return list[0] ?? "";
    const upper = s.toUpperCase().replace(/[ÉÍÓÚÁÑ]/g, m => ({ Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N" }[m] ?? m));
    return list.includes(upper as any) ? upper : (list[0] ?? "");
  };

  // Convierte cualquier formato de fecha (ISO datetime, Date, string) a YYYY-MM-DD para <input type="date">
  const toDateInput = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string" && v.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    } catch { return ""; }
  };

  const [form, setForm] = useState<Partial<HallazgoCediDto>>({
    cediId:           safeCediId,
    titulo:           item?.titulo ?? "",
    descripcion:      item?.descripcion ?? "",
    categoria:        normalize(item?.categoria, CATEGORIAS),
    subtema:          item?.subtema ?? "Inventario",
    subItem:          item?.subItem ?? "",
    tipoRiesgo:       normalize(item?.tipoRiesgo, TIPOS_RIESGO),
    criticidad:       normalize(item?.criticidad, CRITICIDADES),
    estado:           normalize(item?.estado,     ESTADOS),
    responsable:      item?.responsable ?? "",
    fechaCompromiso:  toDateInput(item?.fechaCompromiso),
    fechaCierre:      toDateInput(item?.fechaCierre),
    porcentajeAvance: item?.porcentajeAvance ?? 0,
    reincidente:      item?.reincidente ?? false,
    recomendacionIA:  item?.recomendacionIA ?? "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [generandoIA, setGenerandoIA] = useState<"" | "implementacion" | "recomendaciones">("");
  const [iaError, setIaError] = useState<string | null>(null);

  // Genera contenido IA (implementación o recomendaciones) usando el endpoint Anthropic existente.
  // Contexto principal: Descripción Detallada + categorización del formulario.
  async function generarIA(modo: "implementacion" | "recomendaciones") {
    if (!form.descripcion?.trim() && !form.titulo?.trim()) {
      setIaError("Escribe primero el título o la descripción detallada del hallazgo");
      return;
    }
    setGenerandoIA(modo); setIaError(null);
    try {
      const cediNombre = cedis.find((c: any) => c.id === form.cediId)?.nombre ?? "CEDI Savicol";
      const response = await fetch("/api/ai/generar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo,
          accion:              form.titulo || form.descripcion,
          descripcionHallazgo: form.descripcion,
          tipoRiesgo:          form.tipoRiesgo,
          criticidad:          form.criticidad,
          estadoHallazgo:      form.estado,
          categoria:           form.categoria,
          areaAuditada:        `CEDIS · ${form.subtema ?? ""} ${form.subItem ?? ""}`.trim(),
          nombreGranja:        cediNombre,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? `Error ${response.status}`);
      }
      const data = await response.json();
      const texto = (data.plan ?? "").trim();
      if (!texto) throw new Error("La IA no devolvió contenido");

      if (modo === "recomendaciones") {
        setForm(f => ({ ...f, recomendacionIA: texto }));
      } else {
        // Implementación: apendar al final de la descripción sin borrar lo existente
        setForm(f => {
          const base = (f.descripcion ?? "").trim();
          const marca = "\n\n— PLAN DE IMPLEMENTACIÓN (IA) —\n";
          // Si ya hay un plan IA previo, reemplazarlo en vez de duplicar
          const sinPlanPrevio = base.split("— PLAN DE IMPLEMENTACIÓN (IA) —")[0].trim();
          return { ...f, descripcion: sinPlanPrevio + marca + texto };
        });
      }
    } catch (e: any) {
      setIaError("Error IA: " + (e?.message ?? "desconocido"));
    } finally {
      setGenerandoIA("");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cediId)      { alert("CEDI es obligatorio · selecciona uno"); return; }
    if (!form.titulo?.trim())      { alert("Título es obligatorio"); return; }
    if (!form.descripcion?.trim()) { alert("Descripción es obligatoria"); return; }
    if (!form.categoria)   { alert("Categoría es obligatoria"); return; }
    if (!form.tipoRiesgo)  { alert("Tipo de riesgo es obligatorio"); return; }
    if (!form.criticidad)  { alert("Criticidad es obligatoria"); return; }

    // Construir payload limpio · eliminar strings vacíos para que backend los ignore
    const payload: any = { ...form };
    // Strip strings vacíos y trim los que tienen contenido
    for (const k of ["titulo", "descripcion", "subItem", "responsable", "recomendacionIA", "fechaCompromiso", "fechaCierre"]) {
      if (typeof payload[k] === "string") {
        payload[k] = payload[k].trim();
        if (payload[k] === "") delete payload[k];
      }
    }
    // Clamp porcentajeAvance
    if (typeof payload.porcentajeAvance === "number") {
      payload.porcentajeAvance = Math.max(0, Math.min(100, payload.porcentajeAvance));
    }

    setSubmitting(true);
    try {
      await onSave(payload);
    } catch {
      /* error mostrado en el banner por el padre */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400"/>
              {isEdit ? "Editar Plan de Cumplimiento" : "Nuevo Plan de Cumplimiento"}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {isEdit ? "Modificar datos · trazabilidad automática" : "Registrar hallazgo + plan de acción asociado"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* ── Identificación ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Identificación</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <F label="CEDI *">
                <select value={form.cediId} onChange={(e) => setForm({ ...form, cediId: e.target.value })} className="input-base" required>
                  {cedis.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </F>
              <F label="Subtema oficial *">
                <select value={form.subtema} onChange={(e) => setForm({ ...form, subtema: e.target.value })} className="input-base">
                  {SUBTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
              <F label="Título del plan *" cols={2}>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej. Pediluvio inoperante - reabastecer solución" className="input-base" required/>
              </F>
              <F label="Descripción detallada *" cols={2}>
                <div className="relative">
                  <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className="input-base resize-none" placeholder="Detalle del hallazgo y plan correctivo..." required/>
                  <button type="button" onClick={() => generarIA("implementacion")} disabled={!!generandoIA}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4A7AFF]/15 border border-[#4A7AFF]/40 text-[#4A7AFF] text-[10px] font-semibold hover:bg-[#4A7AFF]/25 disabled:opacity-50"
                    title="Generar plan de implementación con IA a partir de la descripción">
                    {generandoIA === "implementacion" ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                    Implementación IA
                  </button>
                </div>
              </F>
            </div>
          </fieldset>

          {/* ── Categorización ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Categorización</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Categoría *">
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-base" required>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Tipo de riesgo *">
                <select value={form.tipoRiesgo} onChange={(e) => setForm({ ...form, tipoRiesgo: e.target.value })} className="input-base" required>
                  {TIPOS_RIESGO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </F>
              <F label="Criticidad *">
                <select value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value })} className="input-base" required>
                  {CRITICIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
              <F label="Sub-ítem" cols={3}>
                <input type="text" value={form.subItem ?? ""} onChange={(e) => setForm({ ...form, subItem: e.target.value })} placeholder="Detalle específico (ej. Pediluvio principal)" className="input-base"/>
              </F>
            </div>
          </fieldset>

          {/* ── Plan de acción ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-2">Plan de acción y seguimiento</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <F label="Responsable">
                <input type="text" value={form.responsable ?? ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre del responsable de cierre" className="input-base"/>
              </F>
              <F label="Estado">
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input-base">
                  {ESTADOS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </F>
              <F label="Fecha compromiso">
                <input type="date" value={form.fechaCompromiso ?? ""} onChange={(e) => setForm({ ...form, fechaCompromiso: e.target.value })} className="input-base"/>
              </F>
              <F label="Fecha cierre">
                <input type="date" value={form.fechaCierre ?? ""} onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })} className="input-base"/>
              </F>
              <F label="% Avance">
                <input type="number" min={0} max={100} value={form.porcentajeAvance ?? 0} onChange={(e) => setForm({ ...form, porcentajeAvance: parseInt(e.target.value, 10) || 0 })} className="input-base"/>
              </F>
              <F label="¿Reincidente?">
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={!!form.reincidente} onChange={(e) => setForm({ ...form, reincidente: e.target.checked })}/>
                  <span className="text-xs text-white">Marcar como reincidente</span>
                </label>
              </F>
              <F label="Recomendación IA (opcional)" cols={2}>
                <div className="relative">
                  <textarea value={form.recomendacionIA ?? ""} onChange={(e) => setForm({ ...form, recomendacionIA: e.target.value })} rows={2} className="input-base resize-none" placeholder="Sugerencia automática para resolver este hallazgo..."/>
                  <button type="button" onClick={() => generarIA("recomendaciones")} disabled={!!generandoIA}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50"
                    title="Generar recomendaciones profesionales con IA">
                    {generandoIA === "recomendaciones" ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                    Recomendaciones IA
                  </button>
                </div>
              </F>
              {iaError && (
                <div className="col-span-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
                  <span>{iaError}</span>
                </div>
              )}
            </div>
          </fieldset>
        </form>

        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-xs text-[#475569]">{isEdit ? `ID: ${item.id}` : "Nuevo registro"}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-xs text-[#94A3B8]" disabled={submitting}>Cancelar</button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
              {submitting ? "Guardando..." : (isEdit ? "Guardar cambios" : "Crear plan")}
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        :global(.input-base) {
          width: 100%;
          background: #1A2540;
          border: 1px solid #2A3F6A;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: white;
        }
        :global(.input-base:focus) {
          outline: none;
          border-color: #10B98166;
        }
      `}</style>
    </div>
  );
}

function F({ label, children, cols }: { label: string; children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <label className={`block ${cols === 2 ? "md:col-span-2" : cols === 3 ? "md:col-span-3" : ""}`}>
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
