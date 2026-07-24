"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  useChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist, useLotes,
  checklistVacio, calcularCumplimiento, semaforo90, CHECKLIST_META, GALPONES, DIAS,
  comprimirImagen,
  type ChecklistData, type ChecklistItem, type ChecklistTipo, type PreguntaChk,
  type Muestreo, type LoteItem,
} from "@/hooks/useLotes";
import { galponesDeLote } from "@/lib/trazabilidad-metrics";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuthStore } from "@/store/auth.store";
import {
  Plus, Search, Trash2, X, Loader2, Pencil, AlertTriangle, ClipboardList,
  FileDown, ImagePlus, ChevronRight, Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Checklists profesionales (Encacetamiento · Trazabilidad 7 Días) · Fase A/B ───
// Componente reutilizable parametrizado por `tipo`. Cada checklist se guarda como
// su propio documento y genera un PDF ejecutivo con cumplimiento por sección/global.

const RESULTADO_LABEL: Record<string, string> = {
  cumple: "Cumple", no_cumple: "No cumple", parcial: "Parcial", na: "N/A", "": "—",
};
const fFecha = (d?: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const GALPON_TODOS = "TODOS";
const galponLabel = (g?: string) => !g ? "—" : g === GALPON_TODOS ? "Todos los galpones" : `Galpón ${g}`;

// ═══ Página de un checklist (lista + modal) ═══════════════════════════════════
export function ChecklistSection({ tipo }: { tipo: ChecklistTipo }) {
  const meta = CHECKLIST_META[tipo];
  const listaQ = useChecklists(tipo);
  const granjasQ = useGranjas();
  const usuario = useAuthStore((s) => s.user?.name ?? "Auditor");
  const crear = useCreateChecklist();
  const actualizar = useUpdateChecklist();
  const borrar = useDeleteChecklist();

  const [search, setSearch] = useState("");
  const [filterGranja, setFilterGranja] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem(`chk-f-granja-${tipo}`) ?? "" : ""));
  useEffect(() => { try { sessionStorage.setItem(`chk-f-granja-${tipo}`, filterGranja); } catch { /* SSR */ } }, [filterGranja, tipo]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);

  const items = listaQ.data ?? [];
  const granjas = granjasQ.data ?? [];

  const filtrados = useMemo(() => items.filter(it => {
    if (filterGranja && it.data.granjaId !== filterGranja) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(it.data.lote ?? "").toLowerCase().includes(q)
        && !(it.data.granjaNombre ?? "").toLowerCase().includes(q)
        && !(it.data.auditor ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, search, filterGranja]);

  async function handleDelete(it: ChecklistItem) {
    if (!confirm(`¿Eliminar el checklist del lote "${it.data.lote}"? Esta acción no se puede deshacer.`)) return;
    await borrar.mutateAsync(it.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por lote, granja o auditor…"
            className="w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"/>
        </div>
        <select value={filterGranja} onChange={e => setFilterGranja(e.target.value)}
          className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
          <option value="">Todas las granjas</option>
          {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold whitespace-nowrap">
          <Plus className="w-4 h-4"/> Nuevo Checklist
        </button>
      </div>

      {listaQ.isLoading ? (
        <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-8 justify-center"><Loader2 className="w-5 h-5 animate-spin"/> Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-14 text-[#64748B] bg-[#0D1526] border border-[#1E2D4A] rounded-2xl">
          <ClipboardList className="w-11 h-11 mx-auto mb-3 opacity-40"/>
          <p className="text-sm font-semibold text-white mb-1">Sin checklists registrados</p>
          <p className="text-xs">Clic en "Nuevo Checklist" para iniciar una evaluación de {meta.titulo.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map(it => {
            const pct = calcularCumplimiento(it.data.preguntas.map(p => p.resultado));
            const sem = semaforo90(pct);
            const respondidas = it.data.preguntas.filter(p => p.resultado !== "").length;
            return (
              <div key={it.id} className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-4 hover:border-[#2A3F6A] transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    {/* Primer nivel: Granja + Galpón (mayor jerarquía, como en Lotes) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white truncate">{it.data.granjaNombre || "Sin granja"}</h3>
                      {it.data.galpon && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">{galponLabel(it.data.galpon)}</span>
                      )}
                    </div>
                    {/* Segundo nivel: Lote · Fecha · Día · Auditor */}
                    <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-1 text-[11px] text-[#94A3B8]">
                      <span className="font-semibold text-[#CBD5E1]">Lote {it.data.lote || "—"}</span>
                      <span className="text-[#475569]">·</span>
                      <span>{fFecha(it.data.fechaVisita)}</span>
                      {it.data.diaEvaluado && (<><span className="text-[#475569]">·</span><span>Día {it.data.diaEvaluado}</span></>)}
                      {it.data.auditor && (<><span className="text-[#475569]">·</span><span>Auditor: {it.data.auditor}</span></>)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(it); setModalOpen(true); }} title="Editar" className="p-1.5 text-[#64748B] hover:text-emerald-400"><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(it)} title="Eliminar" className="p-1.5 text-[#64748B] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#94A3B8]">Cumplimiento · {respondidas}/{it.data.preguntas.length} preguntas</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${sem.color}22`, color: sem.color }}>{sem.label}</span>
                    <span className="text-sm font-bold" style={{ color: sem.color }}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: sem.color }}/>
                </div>
                <button onClick={() => { setEditing(it); setModalOpen(true); }}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-emerald-300 text-xs font-semibold">
                  Abrir checklist <ChevronRight className="w-3.5 h-3.5"/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ChecklistModal
          tipo={tipo}
          item={editing}
          granjas={granjas}
          usuario={usuario}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onCreate={async (data) => { await crear.mutateAsync(data); setModalOpen(false); setEditing(null); }}
          onUpdate={async (id, data) => { await actualizar.mutateAsync({ id, data }); setModalOpen(false); setEditing(null); }}
          saving={crear.isPending || actualizar.isPending}
        />
      )}
    </div>
  );
}

// ═══ Modal de un checklist ════════════════════════════════════════════════════
function ChecklistModal({ tipo, item, granjas, usuario, onClose, onCreate, onUpdate, saving }: {
  tipo: ChecklistTipo;
  item: ChecklistItem | null;
  granjas: any[];
  usuario: string;
  onClose: () => void;
  onCreate: (data: ChecklistData) => Promise<void>;
  onUpdate: (id: string, data: ChecklistData) => Promise<void>;
  saving: boolean;
}) {
  const meta = CHECKLIST_META[tipo];
  const esEdicion = !!item;
  // Registros oficiales de Lotes para los indicadores de mortalidad del PDF (Trazabilidad 7 Días).
  // react-query comparte la caché por clave, por lo que no genera una consulta adicional.
  const lotesQ = useLotes();
  const [data, setData] = useState<ChecklistData>(() => {
    const base = item ? { ...item.data, preguntas: item.data.preguntas.map(p => ({ ...p })) } : checklistVacio(tipo, "", usuario);
    // Registros previos: renombra "extractores"->"criadoras" (conserva la respuesta) e inserta las
    // preguntas nuevas del checklist que falten, al final de su sección, sin perder respuestas.
    base.preguntas = base.preguntas.map(p => p.pregunta === "¿Los extractores están operativos?" ? { ...p, pregunta: "¿Las criadoras están operativas?" } : p);
    const modelo = checklistVacio(base.tipo).preguntas;
    const tengo = new Set(base.preguntas.map(p => p.pregunta));
    modelo.filter(mp => !tengo.has(mp.pregunta)).forEach(mp => {
      let idx = -1;
      for (let i = base.preguntas.length - 1; i >= 0; i--) { if (base.preguntas[i].seccion === mp.seccion) { idx = i; break; } }
      base.preguntas.splice(idx >= 0 ? idx + 1 : base.preguntas.length, 0, { ...mp });
    });
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [subiendoIdx, setSubiendoIdx] = useState<number | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [tab, setTab] = useState<"checklist" | "muestreos">("checklist");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function set<K extends keyof ChecklistData>(k: K, v: ChecklistData[K]) { setData(d => ({ ...d, [k]: v })); }
  function setPreg(idx: number, campo: keyof PreguntaChk, v: string) {
    setData(d => ({ ...d, preguntas: d.preguntas.map((p, i) => i === idx ? { ...p, [campo]: v } : p) }));
  }

  // Vacío sanitario (días) = fecha de visita (encasetamiento) − fecha del último despoblamiento.
  const diasVacioEnc = (() => {
    const fd = data.fechaDespoblamiento;
    if (!fd || !data.fechaVisita) return null;
    const diff = Math.round((new Date(data.fechaVisita + "T00:00:00").getTime() - new Date(fd + "T00:00:00").getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  })();

  async function onFoto(idx: number, files: FileList | null) {
    if (!files || !files.length) return;
    setError(null); setSubiendoIdx(idx);
    try {
      const comprimida = await comprimirImagen(files[0], 1280, 0.7);
      setPreg(idx, "evidencia", comprimida);
    } catch (e: any) {
      setError(e?.message ?? "Error al procesar la imagen");
    } finally {
      setSubiendoIdx(null);
      if (fileRefs.current[idx]) fileRefs.current[idx]!.value = "";
    }
  }

  const cumplimientoGlobal = calcularCumplimiento(data.preguntas.map(p => p.resultado));
  const semG = semaforo90(cumplimientoGlobal);
  const respondidas = data.preguntas.filter(p => p.resultado !== "").length;
  const secciones = Array.from(new Set(data.preguntas.map(p => p.seccion)));

  async function handlePDF() {
    setGenerandoPDF(true);
    try {
      // Indicadores de mortalidad en tiempo real desde el módulo Lotes (solo Trazabilidad 7 Días).
      const mort = tipo === "trazabilidad7" ? calcMortCheck(data, lotesQ.data ?? []) : null;
      // Enriquece el PDF con redacción profesional; si no hay respuesta, usa las calculadas
      const ia = await obtenerSeccionesIA(tipo, data, cumplimientoGlobal);
      await generarPDFChecklistPro(tipo, data, cumplimientoGlobal, ia ?? undefined, mort);
    } finally {
      setGenerandoPDF(false);
    }
  }

  async function submit() {
    setError(null);
    if (!data.auditor.trim())  { setError("El nombre del auditor es obligatorio"); return; }
    if (!data.granjaId)        { setError("Debes seleccionar una granja"); return; }
    if (!data.lote.trim())     { setError("El lote es obligatorio"); return; }
    if (!data.galpon)          { setError("El galpón es obligatorio"); return; }
    const payload: ChecklistData = { ...data, granjaNombre: granjas.find(g => g.id === data.granjaId)?.nombre ?? data.granjaNombre };
    try {
      if (esEdicion && item) await onUpdate(item.id, payload);
      else await onCreate(payload);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error al guardar el checklist");
    }
  }

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-xs text-[#94A3B8] mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <header className="flex items-start justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{esEdicion ? "Editar" : "Nuevo"} — {meta.titulo}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{meta.objetivo}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cabecera cumplimiento */}
          <div className="rounded-xl p-4 border flex items-center justify-between" style={{ background: `${semG.color}10`, borderColor: `${semG.color}40` }}>
            <div>
              <p className="text-sm font-bold text-white">{meta.titulo}</p>
              <p className="text-[11px] text-[#94A3B8]">{respondidas}/{data.preguntas.length} preguntas respondidas</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block mb-1" style={{ background: `${semG.color}22`, color: semG.color }}>{semG.label}</span>
              <p className="text-2xl font-bold" style={{ color: semG.color }}>{cumplimientoGlobal}%</p>
            </div>
          </div>

          {/* Pestañas: Checklist · Muestreos */}
          <div className="flex gap-1 bg-[#0A111F] border border-[#1E2D4A] rounded-xl p-1 w-fit">
            <button type="button" onClick={() => setTab("checklist")}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors", tab === "checklist" ? "bg-emerald-500 text-[#0A111F]" : "text-[#94A3B8] hover:text-white")}>
              Checklist
            </button>
            <button type="button" onClick={() => data.galpon && setTab("muestreos")} disabled={!data.galpon}
              title={!data.galpon ? "Selecciona un galpón primero" : undefined}
              className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                tab === "muestreos" ? "bg-emerald-500 text-[#0A111F]" : "text-[#94A3B8] hover:text-white",
                !data.galpon && "opacity-40 cursor-not-allowed")}>
              <Scale className="w-3.5 h-3.5"/> Muestreos
            </button>
          </div>

          {tab === "checklist" && (<>
          {/* Datos obligatorios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={LBL}>Nombre Auditor *</label><input value={data.auditor} onChange={e => set("auditor", e.target.value)} placeholder="Nombre del auditor" className={IN}/></div>
            <div><label className={LBL}>Fecha Visita *</label><input type="date" value={data.fechaVisita} onChange={e => set("fechaVisita", e.target.value)} className={IN}/></div>
            <div><label className={LBL}>Granja *</label>
              <select value={data.granjaId} onChange={e => set("granjaId", e.target.value)} className={IN}>
                <option value="">Seleccionar granja…</option>
                {granjas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div><label className={LBL}>Lote *</label><input value={data.lote} onChange={e => set("lote", e.target.value)} placeholder="LOT-2026-001" className={IN}/></div>
            <div><label className={LBL}>Galpón *</label>
              <select value={data.galpon} onChange={e => set("galpon", e.target.value)} className={IN}>
                <option value="">Seleccionar…</option>
                <option value={GALPON_TODOS}>Todos los Galpones</option>
                {GALPONES.map(g => <option key={g} value={g}>Galpón {g}</option>)}
              </select>
            </div>
            {tipo === "encacetamiento" && <>
              <div><label className={LBL}>Técnico Veterinario</label><input value={data.tecnicoVeterinario ?? ""} onChange={e => set("tecnicoVeterinario", e.target.value)} placeholder="Nombre" className={IN}/></div>
              <div><label className={LBL}>Responsable de Recepción</label><input value={data.responsableRecepcion ?? ""} onChange={e => set("responsableRecepcion", e.target.value)} placeholder="Nombre" className={IN}/></div>
              <div><label className={LBL}>Cantidad de ingreso de aves</label><input type="number" min={0} value={data.cantidadIngreso ? String(data.cantidadIngreso) : ""} onChange={e => set("cantidadIngreso", parseInt(e.target.value) || 0)} placeholder="aves" className={IN}/></div>
              <div><label className={LBL}>Fecha último despoblamiento</label><input type="date" value={data.fechaDespoblamiento ?? ""} onChange={e => set("fechaDespoblamiento", e.target.value)} className={IN}/></div>
              <div><label className={LBL}>Vacío sanitario (días)</label><input readOnly value={diasVacioEnc != null ? String(diasVacioEnc) : "—"} className={cn(IN, "opacity-70")} title="Se calcula desde el último despoblamiento"/></div>
              <div><label className={LBL}>Reutilización de cama (usos)</label><input type="number" min={0} value={data.reutilizacionCama ? String(data.reutilizacionCama) : ""} onChange={e => set("reutilizacionCama", parseInt(e.target.value) || 0)} placeholder="usos" className={IN}/></div>
            </>}
            {tipo === "trazabilidad7" && (
              <div><label className={LBL}>Día Evaluado</label>
                <select value={data.diaEvaluado ?? ""} onChange={e => set("diaEvaluado", e.target.value)} className={IN}>
                  <option value="">Seleccionar…</option>
                  {DIAS.map(d => <option key={d} value={String(d)}>Día {d}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Preguntas por sección */}
          {secciones.map(sec => {
            const indices = data.preguntas.map((p, idx) => ({ p, idx })).filter(x => x.p.seccion === sec);
            const pctSec = calcularCumplimiento(indices.map(x => x.p.resultado));
            const semSec = semaforo90(pctSec);
            return (
              <div key={sec} className="rounded-xl border border-[#1E2D4A] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A111F]">
                  <h4 className="text-sm font-bold text-white">{sec}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${semSec.color}22`, color: semSec.color }}>{pctSec}%</span>
                </div>
                <div className="divide-y divide-[#1E2D4A]">
                  {indices.map(({ p, idx }, n) => (
                    <div key={idx} className="px-4 py-3">
                      <div className="flex gap-2 mb-2"><span className="text-[#64748B] text-xs shrink-0">{n + 1}.</span><p className="text-sm text-white">{p.pregunta}</p></div>
                      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 pl-5 items-center">
                        <select value={p.resultado} onChange={e => setPreg(idx, "resultado", e.target.value)}
                          className="bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50">
                          <option value="">Resultado…</option>
                          <option value="cumple">Cumple</option>
                          <option value="no_cumple">No cumple</option>
                          <option value="parcial">Parcial</option>
                          <option value="na">N/A</option>
                        </select>
                        <input value={p.observacion} onChange={e => setPreg(idx, "observacion", e.target.value)} placeholder="Observación…"
                          className="bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"/>
                        <div className="flex items-center gap-2">
                          {p.evidencia ? (
                            <div className="relative group">
                              <img src={p.evidencia} alt="evidencia" className="w-10 h-10 rounded object-cover border border-[#1E2D4A]"/>
                              <button onClick={() => setPreg(idx, "evidencia", "")} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500/90 text-white" title="Quitar"><X className="w-2.5 h-2.5"/></button>
                            </div>
                          ) : (
                            <button onClick={() => fileRefs.current[idx]?.click()} disabled={subiendoIdx === idx}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#1A2540] hover:bg-[#243150] text-[#94A3B8] text-[11px]" title="Adjuntar evidencia">
                              {subiendoIdx === idx ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImagePlus className="w-3 h-3"/>} Foto
                            </button>
                          )}
                          <input ref={el => { fileRefs.current[idx] = el; }} type="file" accept="image/*" className="hidden" onChange={e => onFoto(idx, e.target.files)}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Observación general y plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={LBL}>Observación General</label><textarea value={data.observacionGeneral ?? ""} onChange={e => set("observacionGeneral", e.target.value)} rows={3} placeholder="Observaciones…" className={cn(IN, "resize-none")}/></div>
            <div><label className={LBL}>Plan de Acción Correctivo</label><textarea value={data.planAccion ?? ""} onChange={e => set("planAccion", e.target.value)} rows={3} placeholder="Acciones correctivas…" className={cn(IN, "resize-none")}/></div>
          </div>

          <div className="flex justify-end">
            <button onClick={handlePDF} disabled={generandoPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-emerald-300 text-sm font-semibold disabled:opacity-60">
              {generandoPDF ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}
              {generandoPDF ? "Generando informe…" : "Descargar PDF"}
            </button>
          </div>
          </>)}

          {tab === "muestreos" && <MuestreosTab data={data} setData={setData} tipo={tipo}/>}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#1E2D4A]">
          <div className="text-[11px] text-[#64748B]">
            {error ? <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {error}</span>
              : "Obligatorios: Auditor, Granja, Lote y Galpón"}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white">Cancelar</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
              {esEdicion ? "Actualizar" : "Guardar"} Checklist
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ═══ Pestaña Muestreos (pesajes de pollitos por galpón · pesos en kg) ═════════
// Semáforo por coeficiente de variación (CV). Umbrales configurables.
const CV_VERDE = 8;    // % · verde si CV ≤ 8
const CV_NARANJA = 12; // % · naranja si CV ≤ 12 · rojo si > 12

function calcMuestreoStats(muestreos: Muestreo[]) {
  const validos = muestreos.filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0);
  const totalMuestreos   = validos.length;
  const totalPollitos    = validos.reduce((a, m) => a + m.cantidad, 0);
  const pesoTotal        = validos.reduce((a, m) => a + m.pesoTotal, 0);
  const pesoPromMuestreo = totalMuestreos ? pesoTotal / totalMuestreos : 0;
  const pesoUnitario     = totalPollitos ? pesoTotal / totalPollitos : 0;       // kg/ave
  const unidades = validos.map(m => m.pesoTotal / m.cantidad);                  // kg/ave por muestra
  const pesoMin = unidades.length ? Math.min(...unidades) : 0;
  const pesoMax = unidades.length ? Math.max(...unidades) : 0;
  const meanU = unidades.length ? unidades.reduce((a, u) => a + u, 0) / unidades.length : 0;
  const variance = unidades.length ? unidades.reduce((a, u) => a + (u - meanU) ** 2, 0) / unidades.length : 0;
  const desviacion = Math.sqrt(variance);                                       // kg
  const cv = meanU > 0 ? (desviacion / meanU) * 100 : 0;                        // %
  const dentro = unidades.filter(u => Math.abs(u - meanU) <= 0.10 * meanU).length;
  const uniformidad = unidades.length ? Math.round((dentro / unidades.length) * 100) : 0; // %
  const estado = totalMuestreos === 0
    ? { label: "Sin datos",                 color: "#64748B" }
    : cv <= CV_VERDE   ? { label: "Dentro del rango",        color: "#22C55E" }
    : cv <= CV_NARANJA ? { label: "Variación moderada",      color: "#F59E0B" }
    :                    { label: "Variación significativa", color: "#EF4444" };
  return { totalMuestreos, totalPollitos, pesoTotal, pesoPromMuestreo, pesoUnitario, pesoMin, pesoMax, desviacion, cv, uniformidad, estado };
}

const kg = (v: number, d = 3) => `${v.toLocaleString("es-CO", { maximumFractionDigits: d })} kg`;

function Dato({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-[#64748B]">{label}</p><p className="text-white font-medium truncate">{value}</p></div>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2"><p className="text-[9px] uppercase tracking-wide text-[#64748B]">{label}</p><p className="text-sm font-bold text-white mt-0.5">{value}</p></div>;
}
function GalponChip({ active, label, sub, color, onClick }: { active: boolean; label: string; sub?: string; color?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors",
        active ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200" : "bg-[#0D1526] border-[#1E2D4A] text-[#94A3B8] hover:text-white")}>
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>}
      <span className="font-semibold">{label}</span>
      {sub && <span className="text-[10px] text-[#64748B]">{sub}</span>}
    </button>
  );
}

function MuestreosTab({ data, setData, tipo }: {
  data: ChecklistData;
  setData: (updater: (d: ChecklistData) => ChecklistData) => void;
  tipo: ChecklistTipo;
}) {
  const muestreos = data.muestreos ?? [];
  const info = data.muestreoInfo ?? {};
  const esTodos = data.galpon === GALPON_TODOS;
  // Galpón por defecto de cada pesaje: el del checklist si es específico; vacío si es "Todos"
  const dgDefault = data.galpon && !esTodos ? data.galpon : "";

  // Semilla: 5 filas vacías la primera vez que se abre la pestaña
  useEffect(() => {
    if ((data.muestreos?.length ?? 0) === 0) {
      setData(d => ({ ...d, muestreos: Array.from({ length: 5 }, (_, i) => ({ n: i + 1, cantidad: 0, pesoTotal: 0, obs: "", galpon: dgDefault })) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMuestreos = (m: Muestreo[]) => setData(d => ({ ...d, muestreos: m }));
  const setInfo = (patch: Partial<NonNullable<ChecklistData["muestreoInfo"]>>) =>
    setData(d => ({ ...d, muestreoInfo: { ...(d.muestreoInfo ?? {}), ...patch } }));
  const updateRow = (i: number, field: keyof Muestreo, val: number | string) =>
    setMuestreos(muestreos.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRow = () => { if (muestreos.length >= 40) return; setMuestreos([...muestreos, { n: muestreos.length + 1, cantidad: 0, pesoTotal: 0, obs: "", galpon: filtroGalpon || dgDefault }]); };
  const removeRow = (i: number) => setMuestreos(muestreos.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, n: idx + 1 })));

  // Filtro por galpón (para analizar el resultado por galpón, no solo el general)
  const [filtroGalpon, setFiltroGalpon] = useState("");
  const galponesConDatos = useMemo(() => {
    const s = new Set<string>();
    muestreos.forEach(m => { if (((m.cantidad ?? 0) > 0 || (m.pesoTotal ?? 0) > 0) && m.galpon) s.add(m.galpon); });
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [muestreos]);
  const mostrarFiltro = galponesConDatos.length >= 2;
  const muestreosFiltrados = filtroGalpon ? muestreos.filter(m => (m.galpon ?? "") === filtroGalpon) : muestreos;
  const st = useMemo(() => calcMuestreoStats(muestreosFiltrados), [muestreos, filtroGalpon]); // eslint-disable-line react-hooks/exhaustive-deps

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-xs text-[#94A3B8] mb-1.5 block";
  const numv = (v: number) => v === 0 ? "" : String(v);
  const cellIn = "bg-[#0A111F] border border-[#1E2D4A] rounded-md px-2 py-1 text-white outline-none focus:border-emerald-500/50";

  return (
    <div className="space-y-5">
      {/* FASE 3 · Información general */}
      <div className="rounded-xl border border-[#1E2D4A] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#0A111F]"><h4 className="text-sm font-bold text-white">Información General</h4></div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Dato label="Lote" value={data.lote || "—"}/>
          <Dato label="Granja" value={data.granjaNombre || "—"}/>
          <Dato label="Galpón" value={galponLabel(data.galpon)}/>
          {tipo === "trazabilidad7" && <Dato label="Día evaluado" value={data.diaEvaluado ? `Día ${data.diaEvaluado}` : "—"}/>}
          <Dato label="Auditor" value={data.auditor || "—"}/>
          <Dato label="Fecha" value={data.fechaVisita || "—"}/>
          <div>
            <label className={LBL}>Género</label>
            <select value={info.genero ?? ""} onChange={e => setInfo({ genero: e.target.value as "" | "Macho" | "Hembra" })} className={IN}>
              <option value="">—</option><option value="Macho">Macho</option><option value="Hembra">Hembra</option>
            </select>
          </div>
          <div>
            <label className={LBL}>Capacidad del galpón</label>
            <input type="number" min={0} value={numv(info.capacidad ?? 0)} onChange={e => setInfo({ capacidad: parseInt(e.target.value) || 0 })} placeholder="aves" className={IN}/>
          </div>
          <div>
            <label className={LBL}>Cantidad actual de aves</label>
            <input type="number" min={0} value={numv(info.avesActuales ?? 0)} onChange={e => setInfo({ avesActuales: parseInt(e.target.value) || 0 })} placeholder="aves" className={IN}/>
          </div>
        </div>
      </div>

      {/* Filtro por galpón · permite validar el resultado por galpón, no solo el general */}
      {mostrarFiltro && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#94A3B8] font-semibold">Filtrar por galpón:</span>
          <GalponChip active={!filtroGalpon} label="Todos" onClick={() => setFiltroGalpon("")} />
          {galponesConDatos.map(g => {
            const s = calcMuestreoStats(muestreos.filter(m => (m.galpon ?? "") === g));
            return <GalponChip key={g} active={filtroGalpon === g} label={`Galpón ${g}`} color={s.estado.color}
              sub={`${s.totalMuestreos}·${kg(s.pesoUnitario)}·CV ${s.cv.toFixed(0)}%`}
              onClick={() => setFiltroGalpon(filtroGalpon === g ? "" : g)} />;
          })}
        </div>
      )}

      {/* FASE 4 · Tabla de muestreos */}
      <div className="rounded-xl border border-[#1E2D4A] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A111F]">
          <h4 className="text-sm font-bold text-white">Tabla de Muestreos <span className="text-[10px] text-[#64748B] font-normal">· pesos en kg{esTodos ? " · indica el galpón de cada pesaje" : ""}{filtroGalpon ? ` · filtrado: Galpón ${filtroGalpon}` : ""}</span></h4>
          <span className="text-[10px] text-[#94A3B8]">{muestreos.length} fila(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[#94A3B8] border-b border-[#1E2D4A]">
              <th className="text-left px-3 py-2 w-12">N.º</th>
              <th className="text-left px-3 py-2">Pollitos pesados</th>
              <th className="text-left px-3 py-2">Peso total (kg)</th>
              <th className="text-left px-3 py-2">Observaciones</th>
              <th className="text-left px-3 py-2 w-28">Galpón</th>
              <th className="px-2 py-2 w-8"></th>
            </tr></thead>
            <tbody>
              {muestreos.map((m, i) => {
                if (filtroGalpon && (m.galpon ?? "") !== filtroGalpon) return null;
                const u = m.cantidad > 0 && m.pesoTotal > 0 ? m.pesoTotal / m.cantidad : 0;
                return (
                  <tr key={i} className="border-b border-[#1E2D4A]/40">
                    <td className="px-3 py-1.5 text-[#64748B]">{m.n}</td>
                    <td className="px-3 py-1.5"><input type="number" min={0} value={numv(m.cantidad)} onChange={e => updateRow(i, "cantidad", parseInt(e.target.value) || 0)} placeholder="0" className={cn(cellIn, "w-24")}/></td>
                    <td className="px-3 py-1.5"><input type="number" min={0} step="0.001" value={m.pesoTotal === 0 ? "" : String(m.pesoTotal)} onChange={e => updateRow(i, "pesoTotal", parseFloat(e.target.value) || 0)} placeholder="0.000" className={cn(cellIn, "w-28")}/>{u > 0 && <span className="ml-2 text-[10px] text-[#64748B]">{kg(u)} c/u</span>}</td>
                    <td className="px-3 py-1.5"><input value={m.obs ?? ""} onChange={e => updateRow(i, "obs", e.target.value)} placeholder="Observación…" className={cn(cellIn, "w-full")}/></td>
                    <td className="px-3 py-1.5">
                      <select value={m.galpon ?? ""} onChange={e => updateRow(i, "galpon", e.target.value)}
                        className={cn(cellIn, "w-24", esTodos && !m.galpon && (m.cantidad > 0 || m.pesoTotal > 0) && "border-amber-500/60")}>
                        <option value="">—</option>
                        {GALPONES.map(g => <option key={g} value={g}>G{g}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center"><button type="button" onClick={() => removeRow(i)} className="text-[#64748B] hover:text-red-400" title="Quitar fila"><Trash2 className="w-3.5 h-3.5"/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-[#0A111F] border-t border-[#1E2D4A]">
          <button type="button" onClick={addRow} disabled={muestreos.length >= 40}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-emerald-300 text-xs font-semibold disabled:opacity-40">
            <Plus className="w-3.5 h-3.5"/> Agregar fila
          </button>
        </div>
      </div>

      {/* FASE 5 · Cálculos automáticos */}
      <p className="text-xs font-semibold text-[#94A3B8]">Indicadores {filtroGalpon ? `· Galpón ${filtroGalpon}` : "· General (todos los galpones)"}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Stat label="Total muestreos" value={String(st.totalMuestreos)}/>
        <Stat label="Total pollitos" value={String(st.totalPollitos)}/>
        <Stat label="Peso total" value={kg(st.pesoTotal)}/>
        <Stat label="Peso prom./muestreo" value={kg(st.pesoPromMuestreo)}/>
        <Stat label="Peso unitario prom." value={kg(st.pesoUnitario)}/>
        <Stat label="Peso mínimo (c/u)" value={kg(st.pesoMin)}/>
        <Stat label="Peso máximo (c/u)" value={kg(st.pesoMax)}/>
        <Stat label="Desviación" value={kg(st.desviacion)}/>
        <Stat label="CV" value={`${st.cv.toFixed(1)}%`}/>
        <Stat label="Uniformidad" value={st.totalMuestreos >= 2 ? `${st.uniformidad}%` : "—"}/>
      </div>

      {/* FASE 6 · Resumen del muestreo */}
      <div className="rounded-xl border p-4" style={{ background: `${st.estado.color}10`, borderColor: `${st.estado.color}40` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2"><Scale className="w-4 h-4" style={{ color: st.estado.color }}/> Resumen del Muestreo {filtroGalpon ? `· Galpón ${filtroGalpon}` : "· General"}</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">{st.totalMuestreos} muestreos · {st.totalPollitos} aves · {kg(st.pesoTotal)} · unitario {kg(st.pesoUnitario)}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold inline-block" style={{ background: `${st.estado.color}22`, color: st.estado.color }}>{st.estado.label}</span>
            <p className="text-[10px] text-[#64748B] mt-1">CV {st.cv.toFixed(1)}% · verde ≤{CV_VERDE}% · naranja ≤{CV_NARANJA}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ PDF ejecutivo nativo del checklist (jsPDF) ═══════════════════════════════
const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-4" };

// Secciones narrativas del informe (redactadas por el endpoint de IA, sin mencionarla)
interface SeccionesIA { resumenEjecutivo?: string; conclusiones?: string; planAccion?: string; }

// Llama al endpoint de IA existente (modo informe-checklist) para obtener las
// secciones narrativas. Si falla, devuelve null y el PDF usa las calculadas.
async function obtenerSeccionesIA(tipo: ChecklistTipo, data: ChecklistData, cumplimientoGlobal: number): Promise<SeccionesIA | null> {
  try {
    const meta = CHECKLIST_META[tipo];
    const cumpl = (rs: string[]) => {
      const v = rs.filter(r => r === "cumple" || r === "no_cumple" || r === "parcial");
      if (!v.length) return 0;
      return Math.round(v.reduce((a, r) => a + (r === "cumple" ? 100 : r === "parcial" ? 50 : 0), 0) / v.length);
    };
    const secciones = Array.from(new Set(data.preguntas.map(p => p.seccion)));
    // Resumen estructurado del checklist como texto para el prompt
    const detalle = [
      `Cumplimiento global: ${cumplimientoGlobal}%.`,
      ...secciones.map(s => {
        const fs = data.preguntas.filter(p => p.seccion === s);
        return `Sección "${s}": ${cumpl(fs.map(f => f.resultado))}% de cumplimiento.`;
      }),
      "",
      "Puntos no conformes o parciales:",
      ...data.preguntas.filter(p => p.resultado === "no_cumple" || p.resultado === "parcial")
        .map(p => `- (${p.resultado === "no_cumple" ? "No cumple" : "Parcial"}) ${p.pregunta}${p.observacion ? ` — Obs: ${p.observacion}` : ""}`),
    ].filter(Boolean).join("\n");
    const noConformes = data.preguntas.filter(p => p.resultado === "no_cumple" || p.resultado === "parcial").length;
    if (noConformes === 0) {
      // si todo cumple, igual pedimos redacción pero el detalle lo refleja
    }

    const res = await fetch("/api/ai/generar-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modo: "informe-checklist",
        accion: detalle,
        areaAuditada: meta.titulo,
        nombreGranja: data.granjaNombre,
        auditor: data.auditor,
        criticidad: cumplimientoGlobal >= 90 ? "Baja" : cumplimientoGlobal >= 70 ? "Media" : "Alta",
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const txt = (json?.plan ?? "").trim();
    if (!txt) return null;
    // El endpoint devuelve el texto en `plan`; aquí esperamos un JSON con las 3 secciones
    const limpio = txt.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(limpio);
    return {
      resumenEjecutivo: parsed.resumenEjecutivo,
      conclusiones: parsed.conclusiones,
      planAccion: parsed.planAccion,
    };
  } catch {
    return null;
  }
}


// ─── Indicadores de Mortalidad (desde el módulo Lotes) — Checklist Trazabilidad 7 Días ───
// % sobre aves recibidas (ingreso). Nivel 1 = galpón/lote del checklist; Nivel 2 = toda la granja.
interface MortNivel { muertes: number; ingreso: number; actuales: number; pct: number; nLotes: number }
interface MortCheck { galpon: MortNivel | null; granja: MortNivel | null; resumen: string }
// Umbral de mortalidad: verde <4%, amarillo 4–8%, rojo ≥8%.
function semColorMort(pct: number): string { return pct >= 8 ? "#DC2626" : pct >= 4 ? "#D97706" : "#16A34A"; }
function semLabelMort(pct: number): string { return pct >= 8 ? "Crítico" : pct >= 4 ? "Elevado" : "Óptimo"; }
function calcMortNivel(lotes: LoteItem[]): MortNivel | null {
  const rel = lotes.filter(l => (l.data.avesIngreso || 0) > 0);
  if (!rel.length) return null;
  const ingreso = rel.reduce((s, l) => s + (l.data.avesIngreso || 0), 0);
  const actuales = rel.reduce((s, l) => s + (l.data.avesActuales || 0), 0);
  const muertes = Math.max(0, ingreso - actuales);
  return { muertes, ingreso, actuales, pct: ingreso > 0 ? (muertes / ingreso) * 100 : 0, nLotes: rel.length };
}
function resumenMortalidad(pct: number | null): string {
  if (pct == null) return "No se dispone de registros de mortalidad para interpretar el comportamiento del lote en el período evaluado.";
  const nivel  = pct >= 8 ? "crítico" : pct >= 4 ? "elevado" : "dentro de parámetros aceptables";
  const riesgo = pct >= 8 ? "alto" : pct >= 4 ? "moderado" : "bajo";
  const causas = pct >= 8
    ? "posibles procesos infecciosos, estrés térmico, deficiencias en la calidad del pollito de un día o fallas en el manejo durante la recepción"
    : pct >= 4 ? "desviaciones en las condiciones ambientales, de bioseguridad o de manejo temprano del lote"
    : "un manejo adecuado de las condiciones de recepción y alistamiento";
  const reco = pct >= 8
    ? "Se requiere intervención inmediata: necropsias diagnósticas, revisión sanitaria y ambiental del galpón y refuerzo de los protocolos de manejo."
    : pct >= 4 ? "Se recomienda seguimiento estrecho, verificación de temperatura/ventilación y revisión de los protocolos de bioseguridad."
    : "Se recomienda mantener el manejo actual y continuar el monitoreo diario de la mortalidad.";
  return `La mortalidad acumulada del ${pct.toFixed(2)}% se clasifica como ${nivel}, con un riesgo productivo ${riesgo}. La tendencia observada es consistente con ${causas}. ${reco}`;
}
function calcMortCheck(data: ChecklistData, lotes: LoteItem[]): MortCheck | null {
  const dela = lotes.filter(l => l.data.granjaId === data.granjaId);
  if (!dela.length) return null; // sin registros para la granja
  const loteN = (data.lote || "").trim().toLowerCase();
  const galponSel = (data.galpon || "").trim().toLowerCase();
  const filtraGalpon = !!galponSel && galponSel !== GALPON_TODOS.toLowerCase();
  // Nivel 1 = galpón seleccionado, ya sea el galpón principal del lote o uno de los galpones evaluados (secundarios).
  const galponLotes = dela.filter(l =>
    (loteN ? (l.data.codigo || "").trim().toLowerCase() === loteN : true) &&
    (filtraGalpon ? galponesDeLote(l).some(g => g.trim().toLowerCase() === galponSel) : true)
  );
  const galpon = galponLotes.length ? calcMortNivel(galponLotes) : null;
  const granja = calcMortNivel(dela);
  return { galpon, granja, resumen: resumenMortalidad(galpon?.pct ?? granja?.pct ?? null) };
}

async function generarPDFChecklistPro(tipo: ChecklistTipo, data: ChecklistData, cumplimientoGlobal: number, ia?: SeccionesIA, mort?: MortCheck | null) {
  const { default: jsPDF } = await import("jspdf");
  const meta = CHECKLIST_META[tipo];
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 15, CW = PW - M * 2;
  let y = M;
  const setFill = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setFillColor((n>>16)&255,(n>>8)&255,n&255); };
  const setText = (hex: string) => { const n = parseInt(hex.replace("#",""),16); doc.setTextColor((n>>16)&255,(n>>8)&255,n&255); };
  const need = (h: number) => { if (y + h > PH - M) { doc.addPage(); y = M; } };
  const semColor = (p: number) => p >= 90 ? "#16A34A" : p >= 70 ? "#D97706" : "#DC2626";
  const semLabel = (p: number) => p >= 90 ? "ÓPTIMO" : p >= 70 ? "ACEPTABLE" : "CRÍTICO";
  const RL: Record<string,string> = { cumple:"Cumple", no_cumple:"No cumple", parcial:"Parcial", na:"N/A", "":"—" };
  const cumpl = (rs: string[]) => {
    const v = rs.filter(r => r === "cumple" || r === "no_cumple" || r === "parcial");
    if (!v.length) return 0;
    return Math.round(v.reduce((a, r) => a + (r === "cumple" ? 100 : r === "parcial" ? 50 : 0), 0) / v.length);
  };

  // Encabezado corporativo
  setFill("#0D1526"); doc.rect(0, 0, PW, 36, "F");
  setFill("#C41230"); doc.rect(0, 34, PW, 2, "F");
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(EMPRESA.nombre, M, 13);
  setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`NIT ${EMPRESA.nit}  ·  Auditoría Interna · Trazabilidad Avícola`, M, 19);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })}`, M, 24);
  setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(meta.titulo, M, 31);
  y = 44;

  // Información general
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
  doc.text("Información General", M, y); y += 2;
  setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
  const info: string[] = [
    `Auditor: ${data.auditor || "—"}`, `Fecha de visita: ${data.fechaVisita || "—"}`,
    `Granja: ${data.granjaNombre || "—"}`, `Lote: ${data.lote || "—"}`,
    `Galpón: ${data.galpon || "—"}`,
  ];
  if (tipo === "encacetamiento") {
    info.push(`Técnico Veterinario: ${data.tecnicoVeterinario || "—"}`);
    info.push(`Responsable de Recepción: ${data.responsableRecepcion || "—"}`);
    const dv = (data.fechaDespoblamiento && data.fechaVisita)
      ? Math.round((new Date(data.fechaVisita + "T00:00:00").getTime() - new Date(data.fechaDespoblamiento + "T00:00:00").getTime()) / 86400000)
      : null;
    info.push(`Ingreso de aves: ${data.cantidadIngreso ? data.cantidadIngreso.toLocaleString("es-CO") : "—"}`);
    info.push(`Vacío sanitario: ${dv != null && dv >= 0 ? dv + " día(s)" : "—"}`);
    info.push(`Últ. despoblamiento: ${data.fechaDespoblamiento || "—"}`);
    info.push(`Reutilización de cama: ${data.reutilizacionCama ? data.reutilizacionCama + " uso(s)" : "—"}`);
  } else {
    info.push(`Día evaluado: ${data.diaEvaluado || "—"}`);
  }
  for (let i = 0; i < info.length; i += 2) {
    doc.text(info[i], M, y);
    if (info[i+1]) doc.text(info[i+1], M + CW/2, y);
    y += 5.5;
  }
  y += 3;

  // Cumplimiento global
  need(20);
  const cg = semColor(cumplimientoGlobal);
  setFill("#F8FAFC"); doc.roundedRect(M, y, CW, 16, 2, 2, "F");
  setText("#475569"); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Cumplimiento Global", M + 4, y + 7);
  setText(cg); doc.setFontSize(18); doc.text(`${cumplimientoGlobal}%`, M + 4, y + 13.5);
  setText(cg); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(semLabel(cumplimientoGlobal), PW - M - 4, y + 10, { align: "right" });
  y += 22;

  // Cumplimiento por sección (barras)
  const secciones = Array.from(new Set(data.preguntas.map(p => p.seccion)));
  need(12 + secciones.length * 8 + 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
  doc.text("Cumplimiento por Sección", M, y); y += 2;
  setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  secciones.forEach(sec => {
    const filas = data.preguntas.filter(p => p.seccion === sec);
    const pct = cumpl(filas.map(f => f.resultado));
    const c = semColor(pct);
    setText("#334155"); doc.setFontSize(8);
    doc.text(sec.length > 40 ? sec.slice(0,38)+"…" : sec, M, y + 3);
    const barX = M + 80, barW = CW - 80 - 16;
    setFill("#E2E8F0"); doc.roundedRect(barX, y, barW, 4, 1, 1, "F");
    setFill(c); doc.roundedRect(barX, y, Math.max(1, barW * pct / 100), 4, 1, 1, "F");
    setText(c); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text(`${pct}%`, PW - M, y + 3, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 8;
  });
  y += 5;

  // Resultados por pregunta (por sección)
  secciones.forEach(sec => {
    const filas = data.preguntas.filter(p => p.seccion === sec);
    const pct = cumpl(filas.map(f => f.resultado));
    need(14);
    setFill("#0D1526"); doc.rect(M, y, CW, 8, "F");
    setText("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(sec, M + 3, y + 5.3);
    setText(semColor(pct)); doc.text(`${pct}%`, PW - M - 3, y + 5.3, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    filas.forEach((f, i) => {
      const pregLines = doc.splitTextToSize(f.pregunta, CW - 42);
      const obsLines = f.observacion ? doc.splitTextToSize(`Obs: ${f.observacion}`, CW - 10) : [];
      // Evidencia fotográfica ampliada con proporción preservada (sin deformar)
      let imgW = 0, imgH = 0;
      if (f.evidencia) {
        try {
          const pr = doc.getImageProperties(f.evidencia);
          if (pr?.width && pr?.height) {
            imgW = 85;                                  // ancho amplio de auditoría
            imgH = Math.min(90, imgW * pr.height / pr.width); // alto proporcional, con tope
          }
        } catch { imgW = 0; imgH = 0; }
      }
      const rowH = Math.max(7, pregLines.length * 3.6 + 2) + (obsLines.length * 3.4) + (imgH ? imgH + 6 : 0);
      need(rowH);
      if (i % 2 === 0) { setFill("#F8FAFC"); doc.rect(M, y, CW, rowH, "F"); }
      setText("#334155"); doc.text(pregLines, M + 3, y + 4);
      const rc = f.resultado === "cumple" ? "#16A34A" : f.resultado === "no_cumple" ? "#DC2626" : f.resultado === "parcial" ? "#D97706" : "#64748B";
      setText(rc); doc.setFont("helvetica", "bold"); doc.text(RL[f.resultado] ?? "—", PW - M - 3, y + 4, { align: "right" });
      doc.setFont("helvetica", "normal");
      let yy = y + 4 + pregLines.length * 3.6;
      if (obsLines.length) { setText("#64748B"); doc.text(obsLines, M + 5, yy); yy += obsLines.length * 3.4; }
      if (imgH) {
        try { doc.addImage(f.evidencia, "JPEG", M + 5, yy + 1, imgW, imgH); } catch {}
        yy += imgH + 6;
      }
      y += rowH;
    });
    y += 4;
  });

  // Secciones automáticas: usa las redactadas (IA) si llegaron; si no, calcula de los datos
  const noCumple = data.preguntas.filter(p => p.resultado === "no_cumple");
  const parciales = data.preguntas.filter(p => p.resultado === "parcial");
  const resumenCalc = `La evaluación de ${meta.titulo.toLowerCase()} para el lote ${data.lote || "—"} (galpón ${data.galpon || "—"}) alcanzó un cumplimiento global del ${cumplimientoGlobal}%, clasificado como ${semLabel(cumplimientoGlobal).toLowerCase()}. Se evaluaron ${data.preguntas.length} criterios distribuidos en ${secciones.length} secciones, de los cuales ${data.preguntas.filter(p=>p.resultado==="cumple").length} cumplen, ${parciales.length} presentan cumplimiento parcial y ${noCumple.length} no cumplen.`;
  const conclusionesCalc = cumplimientoGlobal >= 90
    ? "El proceso evaluado se encuentra dentro de los estándares esperados. Se recomienda mantener las prácticas actuales y dar continuidad al seguimiento periódico."
    : cumplimientoGlobal >= 70
    ? "El proceso evaluado presenta un cumplimiento aceptable con oportunidades de mejora. Se recomienda atender los puntos parciales y no conformes para elevar el desempeño."
    : "El proceso evaluado presenta un cumplimiento crítico. Se requiere intervención inmediata sobre los hallazgos no conformes para mitigar riesgos sobre el lote.";
  const planCalc = noCumple.length || parciales.length
    ? [...noCumple, ...parciales].map((p, i) => `${i+1}. ${p.pregunta}${p.observacion ? ` — ${p.observacion}` : ""}`).join("\n")
    : "No se identificaron no conformidades que requieran acción correctiva inmediata.";

  const resumen = ia?.resumenEjecutivo?.trim() || resumenCalc;
  const conclusiones = ia?.conclusiones?.trim() || conclusionesCalc;
  const planTexto = (data.planAccion?.trim() ? data.planAccion + "\n\n" : "") + (ia?.planAccion?.trim() || planCalc);

  // ─── Indicadores de Mortalidad (solo Trazabilidad 7 Días) · se dibuja justo antes de las Conclusiones ───
  const renderMortalidad = () => {
    need(22);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
    doc.text("Indicadores de Mortalidad", M, y); y += 2;
    setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 6;

    if (!mort || (!mort.galpon && !mort.granja)) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); setText("#64748B");
      doc.text("Sin registros de mortalidad disponibles para el período seleccionado.", M, y);
      y += 8;
      return;
    }

    doc.setFont("helvetica", "normal"); doc.setFontSize(8); setText("#94A3B8");
    doc.text("Fuente: módulo Lotes · porcentaje calculado sobre aves recibidas (ingreso).", M, y); y += 6;

    const filaNivel = (etiqueta: string, n: MortNivel) => {
      need(12);
      // Etiqueta del nivel
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); setText("#0D1526");
      doc.text(etiqueta, M, y);
      // Semáforo (se mide con su propia fuente)
      const label = semLabelMort(n.pct);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      const pw = doc.getTextWidth(label) + 8;
      const px = M + CW - pw;
      setFill(semColorMort(n.pct)); doc.roundedRect(px, y - 3.6, pw, 5.4, 1.2, 1.2, "F");
      setText("#FFFFFF"); doc.text(label, px + pw / 2, y + 0.3, { align: "center" });
      y += 5.6;
      // Detalle numérico
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
      doc.text(`Mortalidad ${n.pct.toFixed(2)}%  ·  ${n.muertes.toLocaleString("es")} de ${n.ingreso.toLocaleString("es")} aves recibidas`, M + 4, y);
      y += 7;
    };

    if (mort.galpon) {
      const sub = (data.galpon && data.galpon !== GALPON_TODOS) ? `Galpón ${data.galpon}` : (data.lote ? `Lote ${data.lote}` : "Lote evaluado");
      filaNivel(`Nivel 1 · ${sub}`, mort.galpon);
    }
    if (mort.granja) filaNivel(`Nivel 2 · Consolidado Granja${mort.granja.nLotes > 1 ? ` (${mort.granja.nLotes} lotes)` : ""}`, mort.granja);
    y += 1;

    // Resumen técnico automático
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); setText("#475569");
    doc.splitTextToSize(mort.resumen, CW).forEach((ln: string) => { need(5); doc.text(ln, M, y); y += 4.4; });
    y += 5;
  };

  const bloques: { titulo: string; texto: string }[] = [
    { titulo: "Objetivo del Checklist", texto: meta.objetivo },
    { titulo: "Enfoque de la Auditoría", texto: meta.enfoque },
    { titulo: "Resumen Ejecutivo", texto: resumen },
    { titulo: "Conclusiones", texto: conclusiones },
    { titulo: "Plan de Acción Correctivo", texto: planTexto },
  ];
  if (data.observacionGeneral?.trim()) {
    bloques.splice(3, 0, { titulo: "Observación General", texto: data.observacionGeneral });
  }
  bloques.forEach(b => {
    // Indicadores de Mortalidad se ubican inmediatamente antes de las Conclusiones (solo Trazabilidad 7 Días)
    if (tipo === "trazabilidad7" && b.titulo === "Conclusiones") renderMortalidad();
    need(16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); setText("#0D1526");
    doc.text(b.titulo, M, y); y += 2;
    setFill("#10B981"); doc.rect(M, y, 26, 0.7, "F"); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText("#334155");
    const lines = doc.splitTextToSize(b.texto, CW);
    lines.forEach((ln: string) => { need(5); doc.text(ln, M, y); y += 4.6; });
    y += 5;
  });

  // Firmas (por nombre registrado)
  need(34);
  y += 6;
  const firmas = [
    { rol: "Auditor", nombre: data.auditor },
    { rol: "Responsable de Recepción", nombre: data.responsableRecepcion || "—" },
    { rol: "Técnico Veterinario", nombre: data.tecnicoVeterinario || "—" },
  ];
  const fw = CW / 3;
  firmas.forEach((f, i) => {
    const fx = M + i * fw + 4;
    setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.line(fx, y + 14, fx + fw - 10, y + 14);
    setText("#0D1526"); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(f.nombre || "—", fx, y + 18);
    setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(f.rol, fx, y + 22);
  });

  // Pie
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setText("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(`${EMPRESA.nombre} · ${meta.titulo} · Documento confidencial`, M, PH - 8);
    doc.text(`Página ${p} de ${pages}`, PW - M, PH - 8, { align: "right" });
  }

  doc.save(`${meta.titulo.replace(/ /g, "-")}-${data.lote || "lote"}-G${data.galpon || "x"}.pdf`);
}
