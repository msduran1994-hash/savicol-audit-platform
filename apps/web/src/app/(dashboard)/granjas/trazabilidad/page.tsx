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
  CHECKLIST_SECCIONES, ALISTAMIENTO_PREGUNTAS, CHECKLIST_TOTAL,
  calcularCumplimiento, semaforo,
  type LoteData, type LoteItem, type EstadoLote,
  type FilaPreliminar, type FilaRecepcion, type SeguimientoDia,
  type PreguntaChecklist, type PreguntaAlistamiento,
} from "@/hooks/useLotes";
import {
  Egg, Plus, Search, Trash2, X, Loader2, Pencil, AlertTriangle,
  CheckCircle2, Circle, TrendingUp, Bird, Calendar, ChevronRight,
  ClipboardCheck, FileDown,
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
  { id: "alistamiento",label: "Alistamiento" },
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

  // Checklist de Descargue: 30 preguntas aplanadas (sección + pregunta + resultado/obs/evidencia)
  const [checklist, setChecklistState] = useState<PreguntaChecklist[]>(() => {
    const guardado = item?.data.checklist ?? [];
    const flat: PreguntaChecklist[] = [];
    CHECKLIST_SECCIONES.forEach(sec => {
      sec.preguntas.forEach(preg => {
        const prev = guardado.find(g => g.seccion === sec.seccion && g.pregunta === preg);
        flat.push({ seccion: sec.seccion, pregunta: preg, resultado: prev?.resultado ?? "", observacion: prev?.observacion ?? "", evidencia: prev?.evidencia ?? "" });
      });
    });
    return flat;
  });
  function setChecklist(idx: number, campo: "resultado" | "observacion" | "evidencia", v: string) {
    setChecklistState(arr => arr.map((p, i) => i === idx ? { ...p, [campo]: v } : p));
  }
  const [checklistAuditor, setChecklistAuditor] = useState(item?.data.checklistAuditor ?? usuario);
  const [checklistFecha, setChecklistFecha] = useState(item?.data.checklistFecha ?? new Date().toISOString().slice(0, 10));

  // Alistamiento: 5 preguntas críticas
  const [alist, setAlistState] = useState<PreguntaAlistamiento[]>(() => {
    const guardado = item?.data.alistamiento ?? [];
    return ALISTAMIENTO_PREGUNTAS.map((preg, i) => ({
      pregunta: preg,
      resultado: guardado[i]?.resultado ?? "",
      observacion: guardado[i]?.observacion ?? "",
    }));
  });
  function setAlist(i: number, campo: "resultado" | "observacion", v: string) {
    setAlistState(arr => arr.map((p, idx) => idx === i ? { ...p, [campo]: v } : p));
  }

  // Cumplimiento global del checklist (para semáforo en cabecera)
  const cumplimientoGlobal = calcularCumplimiento(checklist.map(p => p.resultado));
  const respondidas = checklist.filter(p => p.resultado !== "").length;

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
    const descargueCompleto   = checklist.some(p => p.resultado !== "");
    const alistamientoCompleto = alist.some(p => p.resultado !== "");

    const payload: LoteData = {
      ...data,
      granjaNombre: granjas.find(g => g.id === data.granjaId)?.nombre ?? data.granjaNombre,
      preliminares: prelim,
      recepcion: recep,
      seguimiento: seguim,
      checklist,
      checklistAuditor,
      checklistFecha,
      alistamiento: alist,
      avance: {
        ...data.avance,
        datosGenerales: true,
        preliminares: prelimCompleto,
        recepcion: recepCompleto,
        seguimiento: seguimCompleto,
        descargue: descargueCompleto,
        alistamiento: alistamientoCompleto,
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

          {tab === "alistamiento" && (
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Alistamiento — Evaluación previa a la recepción</h3>
              <p className="text-[11px] text-[#64748B] mb-4">5 preguntas críticas que deben verificarse antes del arribo del lote</p>
              {(() => {
                const cumpl = calcularCumplimiento(alist.map(a => a.resultado));
                const sem = semaforo(cumpl);
                return (
                  <div className="flex items-center justify-between bg-[#0A111F] rounded-xl p-3 mb-4 border border-[#1E2D4A]">
                    <span className="text-xs text-[#94A3B8]">Cumplimiento de alistamiento</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${sem.color}22`, color: sem.color }}>{sem.label}</span>
                      <span className="text-base font-bold" style={{ color: sem.color }}>{cumpl}%</span>
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-3">
                {alist.map((p, i) => (
                  <div key={i} className="bg-[#0A111F] rounded-xl p-3 border border-[#1E2D4A]">
                    <p className="text-sm text-white mb-2">{i + 1}. {p.pregunta}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select value={p.resultado} onChange={e => setAlist(i, "resultado", e.target.value)}
                        className="bg-[#0D1526] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50">
                        <option value="">Resultado…</option>
                        <option value="cumple">Cumple</option>
                        <option value="no_cumple">No cumple</option>
                        <option value="parcial">Parcial</option>
                        <option value="na">N/A</option>
                      </select>
                      <input value={p.observacion} onChange={e => setAlist(i, "observacion", e.target.value)} placeholder="Observación…"
                        className="bg-[#0D1526] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "descargue" && (
            <div className="space-y-4">
              {/* Cabecera con semáforo y cumplimiento global */}
              {(() => {
                const sem = semaforo(cumplimientoGlobal);
                return (
                  <div className="rounded-xl p-4 border" style={{ background: `${sem.color}10`, borderColor: `${sem.color}40` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${sem.color}22`, color: sem.color }}>
                          <ClipboardCheck className="w-6 h-6"/>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Checklist de Descargue</p>
                          <p className="text-[11px] text-[#94A3B8]">{data.codigo || "Lote"} — {respondidas}/{CHECKLIST_TOTAL} preguntas respondidas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block mb-1" style={{ background: `${sem.color}22`, color: sem.color }}>{sem.label}</span>
                        <p className="text-2xl font-bold" style={{ color: sem.color }}>{cumplimientoGlobal}%</p>
                        <p className="text-[9px] text-[#94A3B8]">Cumplimiento</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Auditor y fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={LBL}>Auditor *</label><input value={checklistAuditor} onChange={e => setChecklistAuditor(e.target.value)} placeholder="Nombre del auditor" className={IN}/></div>
                <div><label className={LBL}>Fecha de visita *</label><input type="date" value={checklistFecha} onChange={e => setChecklistFecha(e.target.value)} className={IN}/></div>
              </div>

              {/* Secciones del checklist */}
              {CHECKLIST_SECCIONES.map(sec => {
                const indices = checklist.map((p, idx) => ({ p, idx })).filter(x => x.p.seccion === sec.seccion);
                const cumplSec = calcularCumplimiento(indices.map(x => x.p.resultado));
                const semSec = semaforo(cumplSec);
                return (
                  <div key={sec.seccion} className="rounded-xl border border-[#1E2D4A] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A111F]">
                      <h4 className="text-sm font-bold text-white">{sec.seccion}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${semSec.color}22`, color: semSec.color }}>{cumplSec}%</span>
                    </div>
                    <div className="divide-y divide-[#1E2D4A]">
                      {indices.map(({ p, idx }, n) => (
                        <div key={idx} className="px-4 py-3">
                          <div className="flex gap-2 mb-2">
                            <span className="text-[#64748B] text-xs shrink-0">{n + 1}.</span>
                            <p className="text-sm text-white">{p.pregunta}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-5">
                            <select value={p.resultado} onChange={e => setChecklist(idx, "resultado", e.target.value)}
                              className="bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50">
                              <option value="">Resultado…</option>
                              <option value="cumple">Cumple</option>
                              <option value="no_cumple">No cumple</option>
                              <option value="parcial">Parcial</option>
                              <option value="na">N/A</option>
                            </select>
                            <input value={p.observacion} onChange={e => setChecklist(idx, "observacion", e.target.value)} placeholder="Observación…"
                              className="bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"/>
                            <input value={p.evidencia} onChange={e => setChecklist(idx, "evidencia", e.target.value)} placeholder="URL evidencia…"
                              className="bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Observaciones generales y plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={LBL}>Observaciones generales</label><textarea value={data.checklistObsGeneral ?? ""} onChange={e => set("checklistObsGeneral", e.target.value)} rows={3} placeholder="Observaciones del descargue…" className={cn(IN, "resize-none")}/></div>
                <div><label className={LBL}>Plan de Acción</label><textarea value={data.checklistPlan ?? ""} onChange={e => set("checklistPlan", e.target.value)} rows={3} placeholder="Acciones correctivas…" className={cn(IN, "resize-none")}/></div>
              </div>

              {/* Botón PDF */}
              <div className="flex justify-end">
                <button onClick={() => generarPDFChecklist(data, checklist, alist, checklistAuditor, checklistFecha, cumplimientoGlobal)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-emerald-300 text-sm font-semibold">
                  <FileDown className="w-4 h-4"/> Descargar PDF Checklist
                </button>
              </div>
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

// ─── PDF nativo del Checklist de Descargue (jsPDF, texto real seleccionable) ───
const RESULTADO_LABEL: Record<string, string> = {
  cumple: "Cumple", no_cumple: "No cumple", parcial: "Parcial", na: "N/A", "": "—",
};
async function generarPDFChecklist(
  data: LoteData,
  checklist: PreguntaChecklist[],
  alist: PreguntaAlistamiento[],
  auditor: string,
  fecha: string,
  cumplimientoGlobal: number,
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 15, CW = PW - M * 2;
  let y = M;
  const setFill = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setFillColor((n>>16)&255,(n>>8)&255,n&255); };
  const setText = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setTextColor((n>>16)&255,(n>>8)&255,n&255); };
  const need = (h: number) => { if (y + h > PH - M) { doc.addPage(); y = M; } };
  const semColor = (pct: number) => pct >= 85 ? "#16A34A" : pct >= 60 ? "#D97706" : "#DC2626";
  const semLabel = (pct: number) => pct >= 85 ? "ÓPTIMO" : pct >= 60 ? "ACEPTABLE" : "CRÍTICO";
  const cumpl = (rs: string[]) => {
    const v = rs.filter(r => r === "cumple" || r === "no_cumple" || r === "parcial");
    if (!v.length) return 0;
    return Math.round(v.reduce((a, r) => a + (r === "cumple" ? 100 : r === "parcial" ? 50 : 0), 0) / v.length);
  };

  // Encabezado corporativo
  setFill("#0D1526"); doc.rect(0, 0, PW, 34, "F");
  setFill("#C41230"); doc.rect(0, 32, PW, 2, "F");
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Pollos Savicol S.A.S.", M, 13);
  setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("NIT 860.403.972-5  ·  Auditoría Interna · Trazabilidad Avícola", M, 19);
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Checklist de Descargue y Recepción", M, 28);
  y = 42;

  // Datos del lote
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
  doc.text("Información del Lote", M, y); y += 2;
  setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
  const info = [
    `Código: ${data.codigo || "—"}`, `Granja: ${data.granjaNombre || "—"}`,
    `Raza: ${data.raza || "—"}`, `Galpón: ${data.galponPrincipal || "—"}`,
    `Auditor: ${auditor || "—"}`, `Fecha: ${fecha || "—"}`,
  ];
  for (let i = 0; i < info.length; i += 2) {
    doc.text(info[i], M, y);
    if (info[i+1]) doc.text(info[i+1], M + CW/2, y);
    y += 5.5;
  }
  y += 3;

  // Resumen de cumplimiento global con semáforo
  need(20);
  const cg = semColor(cumplimientoGlobal);
  setFill("#F8FAFC"); doc.roundedRect(M, y, CW, 16, 2, 2, "F");
  setText("#475569"); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Cumplimiento Global", M + 4, y + 7);
  setText(cg); doc.setFontSize(18);
  doc.text(`${cumplimientoGlobal}%`, M + 4, y + 13.5);
  setText(cg); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(semLabel(cumplimientoGlobal), PW - M - 4, y + 10, { align: "right" });
  y += 22;

  // Secciones del checklist
  const secciones = Array.from(new Set(checklist.map(p => p.seccion)));
  secciones.forEach(sec => {
    const filas = checklist.filter(p => p.seccion === sec);
    const pct = cumpl(filas.map(f => f.resultado));
    need(14);
    setFill("#0D1526"); doc.rect(M, y, CW, 8, "F");
    setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(sec, M + 3, y + 5.3);
    setText(semColor(pct)); doc.text(`${pct}%`, PW - M - 3, y + 5.3, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filas.forEach((f, i) => {
      const pregLines = doc.splitTextToSize(f.pregunta, CW - 40);
      const obsLines = f.observacion ? doc.splitTextToSize(`Obs: ${f.observacion}`, CW - 8) : [];
      const rowH = Math.max(6, pregLines.length * 3.6 + 2) + (obsLines.length * 3.4);
      need(rowH);
      if (i % 2 === 0) { setFill("#F8FAFC"); doc.rect(M, y, CW, rowH, "F"); }
      setText("#334155"); doc.text(pregLines, M + 3, y + 4);
      const rl = RESULTADO_LABEL[f.resultado] ?? "—";
      const rc = f.resultado === "cumple" ? "#16A34A" : f.resultado === "no_cumple" ? "#DC2626" : f.resultado === "parcial" ? "#D97706" : "#64748B";
      setText(rc); doc.setFont("helvetica", "bold");
      doc.text(rl, PW - M - 3, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      if (obsLines.length) { setText("#64748B"); doc.text(obsLines, M + 5, y + 4 + pregLines.length * 3.6); }
      y += rowH;
    });
    y += 4;
  });

  // Alistamiento
  const alistResp = alist.filter(a => a.resultado);
  if (alistResp.length) {
    need(14);
    const pctA = cumpl(alist.map(a => a.resultado));
    setFill("#0D1526"); doc.rect(M, y, CW, 8, "F");
    setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Alistamiento — Preguntas Críticas", M + 3, y + 5.3);
    setText(semColor(pctA)); doc.text(`${pctA}%`, PW - M - 3, y + 5.3, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    alist.forEach((a, i) => {
      const lines = doc.splitTextToSize(`${i+1}. ${a.pregunta}`, CW - 40);
      const rowH = Math.max(6, lines.length * 3.6 + 2);
      need(rowH);
      if (i % 2 === 0) { setFill("#F8FAFC"); doc.rect(M, y, CW, rowH, "F"); }
      setText("#334155"); doc.text(lines, M + 3, y + 4);
      const rl = RESULTADO_LABEL[a.resultado] ?? "—";
      setText("#0D1526"); doc.setFont("helvetica", "bold");
      doc.text(rl, PW - M - 3, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += rowH;
    });
    y += 4;
  }

  // Observaciones generales y plan
  if (data.checklistObsGeneral || data.checklistPlan) {
    need(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); setText("#0D1526");
    doc.text("Observaciones y Plan de Acción", M, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
    if (data.checklistObsGeneral) {
      const l = doc.splitTextToSize(`Observaciones: ${data.checklistObsGeneral}`, CW);
      need(l.length * 4 + 2); doc.text(l, M, y); y += l.length * 4 + 2;
    }
    if (data.checklistPlan) {
      const l = doc.splitTextToSize(`Plan de acción: ${data.checklistPlan}`, CW);
      need(l.length * 4 + 2); doc.text(l, M, y); y += l.length * 4 + 2;
    }
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("Pollos Savicol S.A.S. · Trazabilidad Avícola · Documento confidencial", M, PH - 8);
    doc.text(`Página ${p} de ${pages}`, PW - M, PH - 8, { align: "right" });
  }

  doc.save(`Checklist-Descargue-${data.codigo || "lote"}.pdf`);
}
