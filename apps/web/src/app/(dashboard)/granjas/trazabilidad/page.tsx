"use client";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuthStore } from "@/store/auth.store";
import {
  useLotes, useCreateLote, useUpdateLote, useDeleteLote,
  loteVacio, avanceGlobal, GALPONES,
  PRELIMINARES_BASE, RECEPCION_BASE,
  SEGUIMIENTO_INDICADORES, SEG_SELECT_OPCIONES, DIAS,
  type LoteData, type LoteItem, type EstadoLote,
  type FilaPreliminar, type FilaRecepcion, type SeguimientoDia,
} from "@/hooks/useLotes";
import {
  Egg, Plus, Search, Trash2, X, Loader2, Pencil, AlertTriangle,
  CheckCircle2, Circle, TrendingUp, Bird, Calendar, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Trazabilidad Avícola · Fase 1 (Datos Generales + persistencia + avance) ───
// Las pestañas Preliminares, Recepción, Seguimiento y Descargue se completan en
// fases siguientes; aquí queda su estructura y navegación.

const ESTADO_INFO: Record<EstadoLote, { label: string; color: string; bg: string }> = {
  alistamiento: { label: "Alistamiento", color: "#F59E0B", bg: "#F59E0B22" },
  activo:       { label: "Activo",        color: "#22C55E", bg: "#22C55E22" },
  finalizado:   { label: "Finalizado",    color: "#3B82F6", bg: "#3B82F622" },
  cerrado:      { label: "Cerrado",       color: "#64748B", bg: "#64748B22" },
};

const TABS = [
  { id: "generales",   label: "Datos Generales" },
  { id: "preliminares",label: "Preliminares" },
  { id: "recepcion",   label: "Recepción" },
  { id: "seguimiento", label: "Seg. D1–D7" },
  { id: "descargue",   label: "Descargue" },
];

const fNum = (n: number) => (n ?? 0).toLocaleString("es-CO");
const fFecha = (d?: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—";

// ═══════════════════════════════════════════════════════════════════════════════
export default function TrazabilidadPage() {
  const lotesQ = useLotes();
  const granjasQ = useGranjas();
  const usuario = useAuthStore((s) => s.user?.name ?? "Auditor");
  const createLote = useCreateLote();
  const updateLote = useUpdateLote();
  const deleteLote = useDeleteLote();

  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LoteItem | null>(null);

  const lotes = lotesQ.data ?? [];
  const granjas = granjasQ.data ?? [];

  const filtrados = useMemo(() => lotes.filter(l => {
    if (filterEstado && l.data.estado !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      const g = (l.data.granjaNombre ?? "").toLowerCase();
      if (!l.data.codigo.toLowerCase().includes(q) && !g.includes(q) && !(l.data.raza ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [lotes, search, filterEstado]);

  // Indicadores
  const totalLotes = lotes.length;
  const activos = lotes.filter(l => l.data.estado === "activo").length;
  const avesTotal = lotes.reduce((a, l) => a + (l.data.avesActuales || l.data.avesIngreso || 0), 0);
  const enAlistamiento = lotes.filter(l => l.data.estado === "alistamiento").length;

  async function handleDelete(l: LoteItem) {
    if (!confirm(`¿Eliminar el lote "${l.data.codigo}"? Esta acción no se puede deshacer.`)) return;
    await deleteLote.mutateAsync(l.id);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Trazabilidad Avícola"
        subtitle={`${totalLotes} lote(s) · recepción, encasetamiento y desempeño 0–7 días`}
      />
      <div className="flex-1 p-6 space-y-5">
        {/* Indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Lotes",      value: fNum(totalLotes),    icon: Egg,        color: "#4A7AFF" },
            { label: "Lotes Activos",    value: fNum(activos),       icon: TrendingUp, color: "#22C55E" },
            { label: "En Alistamiento",  value: fNum(enAlistamiento),icon: Calendar,   color: "#F59E0B" },
            { label: "Aves en Proceso",  value: fNum(avesTotal),     icon: Bird,       color: "#A855F7" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}1A`, color: kpi.color }}>
                    <Icon className="w-5 h-5"/>
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, granja o raza…"
              className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"/>
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold whitespace-nowrap">
            <Plus className="w-4 h-4"/> Nuevo Lote
          </button>
        </div>

        {/* Lista de lotes */}
        {lotesQ.isLoading ? (
          <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/> Cargando lotes…</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-[#64748B] bg-[#0D1526] border border-[#1E2D4A] rounded-2xl">
            <Egg className="w-12 h-12 mx-auto mb-3 opacity-40"/>
            <p className="text-sm font-semibold text-white mb-1">No hay lotes registrados</p>
            <p className="text-xs">Clic en "Nuevo Lote" para iniciar el registro técnico de recepción y encasetamiento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map(l => {
              const est = ESTADO_INFO[l.data.estado] ?? ESTADO_INFO.alistamiento;
              const pct = avanceGlobal(l.data);
              return (
                <div key={l.id} className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4 hover:border-[#2A3F6A] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{l.data.codigo || "Sin código"}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{l.data.granjaNombre || "Sin granja"} · {l.data.raza || "—"}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(l); setModalOpen(true); }} title="Editar" className="p-1.5 text-[#64748B] hover:text-emerald-400"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(l)} title="Eliminar" className="p-1.5 text-[#64748B] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="bg-[#0A111F] rounded-lg py-2">
                      <p className="text-sm font-bold text-white">{fNum(l.data.avesIngreso)}</p>
                      <p className="text-[9px] text-[#64748B]">Aves ingreso</p>
                    </div>
                    <div className="bg-[#0A111F] rounded-lg py-2">
                      <p className="text-sm font-bold text-white">{fNum(l.data.avesActuales)}</p>
                      <p className="text-[9px] text-[#64748B]">Aves actuales</p>
                    </div>
                    <div className="bg-[#0A111F] rounded-lg py-2">
                      <p className="text-sm font-bold text-white">{l.data.edadDias || 0}d</p>
                      <p className="text-[9px] text-[#64748B]">Edad</p>
                    </div>
                  </div>

                  {/* Barra de avance por etapas */}
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-[#94A3B8]">Avance del registro</span>
                    <span className="text-[10px] font-bold" style={{ color: pct === 100 ? "#22C55E" : "#F59E0B" }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#F59E0B" }}/>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { k: "datosGenerales", lbl: "Generales" },
                      { k: "preliminares",   lbl: "Prelim." },
                      { k: "recepcion",      lbl: "Recep." },
                      { k: "seguimiento",    lbl: "Seg." },
                      { k: "descargue",      lbl: "Descg." },
                    ].map(et => {
                      const done = (l.data.avance as any)[et.k];
                      return (
                        <span key={et.k} className="flex items-center gap-0.5 text-[9px]" style={{ color: done ? "#22C55E" : "#475569" }}>
                          {done ? <CheckCircle2 className="w-3 h-3"/> : <Circle className="w-3 h-3"/>} {et.lbl}
                        </span>
                      );
                    })}
                  </div>

                  <button onClick={() => { setEditing(l); setModalOpen(true); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-emerald-300 text-xs font-semibold">
                    Abrir registro <ChevronRight className="w-3.5 h-3.5"/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <LoteModal
          item={editing}
          granjas={granjas}
          usuario={usuario}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onCreate={async (data) => { await createLote.mutateAsync(data); setModalOpen(false); setEditing(null); }}
          onUpdate={async (id, data) => { await updateLote.mutateAsync({ id, data }); setModalOpen(false); setEditing(null); }}
          saving={createLote.isPending || updateLote.isPending}
        />
      )}
    </div>
  );
}

// ─── Modal: registro técnico completo del lote (5 pestañas) ────────────────────
function LoteModal({ item, granjas, usuario, onClose, onCreate, onUpdate, saving }: {
  item: LoteItem | null;
  granjas: any[];
  usuario: string;
  onClose: () => void;
  onCreate: (data: LoteData) => Promise<void>;
  onUpdate: (id: string, data: LoteData) => Promise<void>;
  saving: boolean;
}) {
  const esEdicion = !!item;
  const [tab, setTab] = useState("generales");
  const [data, setData] = useState<LoteData>(() => item ? { ...item.data } : loteVacio(""));
  const [error, setError] = useState<string | null>(null);

  // Filas de Preliminares y Recepción: parten del modelo base y se completan con lo guardado
  const [prelim, setPrelimState] = useState<FilaPreliminar[]>(() => {
    const guardado = item?.data.preliminares ?? [];
    return PRELIMINARES_BASE.map((base, i) => ({
      concepto: base.concepto, objetivo: base.objetivo,
      valor: guardado[i]?.valor ?? "", cumple: guardado[i]?.cumple ?? "",
    }));
  });
  const [recep, setRecepState] = useState<FilaRecepcion[]>(() => {
    const guardado = item?.data.recepcion ?? [];
    return RECEPCION_BASE.map((base, i) => ({
      parametro: base.parametro, referencia: base.referencia,
      valor: guardado[i]?.valor ?? "",
    }));
  });
  function setPrelim(i: number, campo: "valor" | "cumple", v: string) {
    setPrelimState(arr => arr.map((f, idx) => idx === i ? { ...f, [campo]: v } : f));
  }
  function setRecep(i: number, v: string) {
    setRecepState(arr => arr.map((f, idx) => idx === i ? { ...f, valor: v } : f));
  }

  // Seguimiento D1–D7: array de 7 días, cada uno un objeto indicador→valor
  const [seguim, setSeguimState] = useState<SeguimientoDia[]>(() => {
    const guardado = item?.data.seguimiento ?? [];
    return DIAS.map((_, i) => guardado[i] ? { ...guardado[i] } : {});
  });
  function setSeguim(diaIdx: number, clave: string, v: string) {
    setSeguimState(arr => arr.map((d, idx) => idx === diaIdx ? { ...d, [clave]: v } : d));
  }

  function set<K extends keyof LoteData>(k: K, v: LoteData[K]) {
    setData(d => ({ ...d, [k]: v }));
  }
  function setLog<K extends keyof LoteData["logistica"]>(k: K, v: string) {
    setData(d => ({ ...d, logistica: { ...d.logistica, [k]: v } }));
  }

  async function submit() {
    setError(null);
    if (!data.codigo.trim()) { setError("El código del lote es obligatorio"); setTab("generales"); return; }
    if (!data.granjaId)       { setError("Debes seleccionar una granja"); setTab("generales"); return; }

    // Una etapa se considera completa si tiene al menos un valor diligenciado
    const prelimCompleto = prelim.some(f => f.valor.trim() !== "" || f.cumple !== "");
    const recepCompleto  = recep.some(f => f.valor.trim() !== "");
    const seguimCompleto = seguim.some(dia => Object.values(dia).some(v => (v ?? "").toString().trim() !== ""));

    const payload: LoteData = {
      ...data,
      granjaNombre: granjas.find(g => g.id === data.granjaId)?.nombre ?? data.granjaNombre,
      preliminares: prelim,
      recepcion: recep,
      seguimiento: seguim,
      avance: {
        ...data.avance,
        datosGenerales: true,
        preliminares: prelimCompleto,
        recepcion: recepCompleto,
        seguimiento: seguimCompleto,
      },
    };
    try {
      if (esEdicion && item) await onUpdate(item.id, payload);
      else await onCreate(payload);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error al guardar el lote");
    }
  }

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-xs text-[#94A3B8] mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <header className="flex items-start justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{esEdicion ? "Editar Lote" : "Nuevo Lote"} — Registro Técnico Completo</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Complete todas las secciones para un registro técnico integral del lote</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-[#1E2D4A] overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors",
                tab === t.id ? "bg-[#0A111F] text-white border-b-2 border-emerald-500" : "text-[#64748B] hover:text-[#94A3B8]")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "generales" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Identificación del Lote</h3>
                <p className="text-[11px] text-[#64748B] mb-4">Información principal del lote</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={LBL}>Código *</label><input value={data.codigo} onChange={e => set("codigo", e.target.value)} placeholder="LOT-2026-001" className={IN}/></div>
                  <div><label className={LBL}>Tipo de producción</label>
                    <select value={data.tipoProduccion} onChange={e => set("tipoProduccion", e.target.value)} className={IN}>
                      <option value="engorde">engorde</option>
                    </select>
                  </div>
                  <div><label className={LBL}>Raza / Línea Genética</label><input value={data.raza} onChange={e => set("raza", e.target.value)} placeholder="Ross 308, Cobb 500…" className={IN}/></div>
                  <div><label className={LBL}>Proveedor / Planta incubadora</label><input value={data.proveedor} onChange={e => set("proveedor", e.target.value)} placeholder="Nombre proveedor" className={IN}/></div>
                  <div><label className={LBL}>Granja *</label>
                    <select value={data.granjaId} onChange={e => set("granjaId", e.target.value)} className={IN}>
                      <option value="">Seleccionar granja…</option>
                      {granjas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                  <div><label className={LBL}>Galpón principal</label>
                    <select value={data.galponPrincipal} onChange={e => set("galponPrincipal", e.target.value)} className={IN}>
                      <option value="">Seleccionar…</option>
                      {GALPONES.map(g => <option key={g} value={g}>Galpón {g}</option>)}
                    </select>
                  </div>
                  <div><label className={LBL}>Aves al ingreso</label><input type="number" value={data.avesIngreso || ""} onChange={e => set("avesIngreso", Number(e.target.value))} placeholder="0" className={IN}/></div>
                  <div><label className={LBL}>Aves actuales</label><input type="number" value={data.avesActuales || ""} onChange={e => set("avesActuales", Number(e.target.value))} placeholder="0" className={IN}/></div>
                  <div><label className={LBL}>Fecha ingreso</label><input type="date" value={data.fechaIngreso} onChange={e => set("fechaIngreso", e.target.value)} className={IN}/></div>
                  <div><label className={LBL}>Hora de ingreso</label><input type="time" value={data.horaIngreso} onChange={e => set("horaIngreso", e.target.value)} className={IN}/></div>
                  <div><label className={LBL}>Salida estimada</label><input type="date" value={data.fechaSalida} onChange={e => set("fechaSalida", e.target.value)} className={IN}/></div>
                  <div><label className={LBL}>Peso objetivo (kg)</label><input type="number" step="0.01" value={data.pesoObjetivo || ""} onChange={e => set("pesoObjetivo", Number(e.target.value))} placeholder="0" className={IN}/></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">Equipo Logístico</h3>
                <p className="text-[11px] text-[#64748B] mb-4">Responsables y origen del lote</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={LBL}>Técnico Veterinario</label><input value={data.veterinario} onChange={e => set("veterinario", e.target.value)} placeholder="Nombre" className={IN}/></div>
                  <div><label className={LBL}>Administrador de Granja</label><input value={data.administrador} onChange={e => set("administrador", e.target.value)} placeholder="Nombre" className={IN}/></div>
                  <div><label className={LBL}>Responsable de Recepción</label><input value={data.responsableRecepcion} onChange={e => set("responsableRecepcion", e.target.value)} placeholder="Nombre" className={IN}/></div>
                  <div><label className={LBL}>Edad (días)</label><input type="number" value={data.edadDias || ""} onChange={e => set("edadDias", Number(e.target.value))} placeholder="0" className={IN}/></div>
                  <div><label className={LBL}>Incubadora / Origen</label><input value={data.origen} onChange={e => set("origen", e.target.value)} placeholder="Origen" className={IN}/></div>
                  <div><label className={LBL}>Estado</label>
                    <select value={data.estado} onChange={e => set("estado", e.target.value as EstadoLote)} className={IN}>
                      {Object.entries(ESTADO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">Logística de Transporte</h3>
                <p className="text-[11px] text-[#64748B] mb-4">Tiempos del traslado del lote</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={LBL}>Hora despacho vehículo</label><input type="time" value={data.logistica.horaDespacho} onChange={e => setLog("horaDespacho", e.target.value)} className={IN}/></div>
                  <div><label className={LBL}>Hora llegada a granja</label><input type="time" value={data.logistica.horaLlegada} onChange={e => setLog("horaLlegada", e.target.value)} className={IN}/></div>
                  <div><label className={LBL}>Tiempo de viaje</label><input value={data.logistica.tiempoViaje} onChange={e => setLog("tiempoViaje", e.target.value)} placeholder="Ej. 1h 30min" className={IN}/></div>
                  <div><label className={LBL}>Permanencia vehículo en granja</label><input value={data.logistica.permanencia} onChange={e => setLog("permanencia", e.target.value)} placeholder="Ej. 45 min" className={IN}/></div>
                </div>
              </div>
            </div>
          )}

          {tab === "preliminares" && (
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Aspectos Preliminares (antes de recibir el pollito)</h3>
              <p className="text-[11px] text-[#64748B] mb-4">Verificación de condiciones previas al ingreso del pollito</p>
              <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0A111F] text-[#94A3B8] text-xs">
                      <th className="text-left font-medium px-3 py-2.5">Concepto</th>
                      <th className="text-left font-medium px-3 py-2.5 w-32">Objetivo</th>
                      <th className="text-left font-medium px-3 py-2.5 w-40">Valor / Resultado</th>
                      <th className="text-left font-medium px-3 py-2.5 w-32">¿Cumple?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prelim.map((fila, i) => (
                      <tr key={i} className="border-t border-[#1E2D4A]">
                        <td className="px-3 py-2 text-white">{fila.concepto}</td>
                        <td className="px-3 py-2 text-[#64748B] italic text-xs">{fila.objetivo}</td>
                        <td className="px-2 py-1.5">
                          <input value={fila.valor} onChange={e => setPrelim(i, "valor", e.target.value)} placeholder="—"
                            className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50"/>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={fila.cumple} onChange={e => setPrelim(i, "cumple", e.target.value)}
                            className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50">
                            <option value="">—</option>
                            <option value="si">Sí cumple</option>
                            <option value="no">No cumple</option>
                            <option value="parcial">Parcial</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "recepcion" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Durante la Recepción del Pollito</h3>
                <p className="text-[11px] text-[#64748B] mb-4">Evaluación de calidad del pollito al momento de la recepción</p>
                <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0A111F] text-[#94A3B8] text-xs">
                        <th className="text-left font-medium px-3 py-2.5">Parámetro</th>
                        <th className="text-left font-medium px-3 py-2.5 w-32">Referencia</th>
                        <th className="text-left font-medium px-3 py-2.5 w-40">Valor registrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recep.map((fila, i) => (
                        <tr key={i} className="border-t border-[#1E2D4A]">
                          <td className="px-3 py-2 text-white">{fila.parametro}</td>
                          <td className="px-3 py-2 text-[#64748B] italic text-xs">{fila.referencia}</td>
                          <td className="px-2 py-1.5">
                            <input value={fila.valor} onChange={e => setRecep(i, e.target.value)} placeholder="0"
                              className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50"/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={LBL}>Observaciones</label><textarea value={data.recepcionObs ?? ""} onChange={e => set("recepcionObs", e.target.value)} rows={3} placeholder="Observaciones de la recepción…" className={cn(IN, "resize-none")}/></div>
                <div><label className={LBL}>Plan de Acción</label><textarea value={data.recepcionPlan ?? ""} onChange={e => set("recepcionPlan", e.target.value)} rows={3} placeholder="Acciones correctivas si aplica…" className={cn(IN, "resize-none")}/></div>
              </div>
            </div>
          )}

          {tab === "seguimiento" && (
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Seguimiento Día 1 a 7</h3>
              <p className="text-[11px] text-[#64748B] mb-4">Monitoreo diario de indicadores productivos, ambientales y sanitarios</p>
              <div className="overflow-x-auto rounded-lg border border-[#1E2D4A]">
                <table className="text-sm border-collapse" style={{ minWidth: "760px" }}>
                  <thead>
                    <tr className="bg-[#0A111F]">
                      <th className="text-left font-medium px-3 py-2.5 text-[#94A3B8] text-xs sticky left-0 bg-[#0A111F] z-10" style={{ minWidth: "150px" }}>Indicador</th>
                      {DIAS.map(d => (
                        <th key={d} className="text-center font-semibold px-2 py-2.5 text-emerald-300 text-xs" style={{ minWidth: "80px" }}>Día {d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SEGUIMIENTO_INDICADORES.map(ind => (
                      <tr key={ind.clave} className="border-t border-[#1E2D4A]">
                        <td className="px-3 py-1.5 text-white text-xs sticky left-0 bg-[#0D1526] z-10">{ind.label}</td>
                        {DIAS.map((_, diaIdx) => (
                          <td key={diaIdx} className="px-1 py-1">
                            {ind.tipo === "num" ? (
                              <input
                                value={seguim[diaIdx]?.[ind.clave] ?? ""}
                                onChange={e => setSeguim(diaIdx, ind.clave, e.target.value)}
                                placeholder="—"
                                className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-md px-1.5 py-1 text-xs text-white text-center outline-none focus:border-emerald-500/50"/>
                            ) : (
                              <select
                                value={seguim[diaIdx]?.[ind.clave] ?? ""}
                                onChange={e => setSeguim(diaIdx, ind.clave, e.target.value)}
                                className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-md px-1 py-1 text-xs text-white outline-none focus:border-emerald-500/50">
                                <option value="">—</option>
                                {SEG_SELECT_OPCIONES.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#475569] mt-3">Las evidencias fotográficas por día y galpón se habilitan en la siguiente fase.</p>
            </div>
          )}

          {tab === "descargue" && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-[#1A2540] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-400"/>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Sección en preparación</p>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Checklist profesional de descargue (30 preguntas) con semaforización, cumplimiento por sección y exportación a PDF.
              </p>
              <p className="text-[11px] text-emerald-400/70 mt-3">Esta sección se habilita en la siguiente fase.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#1E2D4A]">
          <div className="text-[11px] text-[#64748B]">
            {error
              ? <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {error}</span>
              : esEdicion ? "Editando lote — los cambios se registran con fecha y usuario" : "Campos obligatorios: Código y Granja"}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white">Cancelar</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
              {esEdicion ? "Actualizar Lote" : "Guardar Lote"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
