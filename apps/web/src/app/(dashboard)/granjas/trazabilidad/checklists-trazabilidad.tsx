"use client";
import { useState, useMemo, useRef } from "react";
import {
  useChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist,
  checklistVacio, calcularCumplimiento, semaforo90, CHECKLIST_META, GALPONES, DIAS,
  comprimirImagen,
  type ChecklistData, type ChecklistItem, type ChecklistTipo, type PreguntaChk,
} from "@/hooks/useLotes";
import { useGranjas } from "@/hooks/useGranjas";
import { useAuthStore } from "@/store/auth.store";
import {
  Plus, Search, Trash2, X, Loader2, Pencil, AlertTriangle, ClipboardList,
  FileDown, ImagePlus, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Checklists profesionales (Encacetamiento · Trazabilidad 7 Días) · Fase A/B ───
// Componente reutilizable parametrizado por `tipo`. Cada checklist se guarda como
// su propio documento y genera un PDF ejecutivo con cumplimiento por sección/global.

const RESULTADO_LABEL: Record<string, string> = {
  cumple: "Cumple", no_cumple: "No cumple", parcial: "Parcial", na: "N/A", "": "—",
};
const fFecha = (d?: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);

  const items = listaQ.data ?? [];
  const granjas = granjasQ.data ?? [];

  const filtrados = useMemo(() => items.filter(it => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (it.data.lote ?? "").toLowerCase().includes(q)
      || (it.data.granjaNombre ?? "").toLowerCase().includes(q)
      || (it.data.auditor ?? "").toLowerCase().includes(q);
  }), [items, search]);

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
                    <h3 className="text-base font-bold text-white truncate">Lote {it.data.lote || "—"} · Galpón {it.data.galpon || "—"}</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{it.data.granjaNombre || "Sin granja"} · {fFecha(it.data.fechaVisita)}{it.data.diaEvaluado ? ` · Día ${it.data.diaEvaluado}` : ""}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Auditor: {it.data.auditor || "—"}</p>
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
  const [data, setData] = useState<ChecklistData>(() => item ? { ...item.data } : checklistVacio(tipo, "", usuario));
  const [error, setError] = useState<string | null>(null);
  const [subiendoIdx, setSubiendoIdx] = useState<number | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function set<K extends keyof ChecklistData>(k: K, v: ChecklistData[K]) { setData(d => ({ ...d, [k]: v })); }
  function setPreg(idx: number, campo: keyof PreguntaChk, v: string) {
    setData(d => ({ ...d, preguntas: d.preguntas.map((p, i) => i === idx ? { ...p, [campo]: v } : p) }));
  }

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
      // Enriquece el PDF con redacción profesional; si no hay respuesta, usa las calculadas
      const ia = await obtenerSeccionesIA(tipo, data, cumplimientoGlobal);
      await generarPDFChecklistPro(tipo, data, cumplimientoGlobal, ia ?? undefined);
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
                {GALPONES.map(g => <option key={g} value={g}>Galpón {g}</option>)}
              </select>
            </div>
            {tipo === "encacetamiento" && <>
              <div><label className={LBL}>Técnico Veterinario</label><input value={data.tecnicoVeterinario ?? ""} onChange={e => set("tecnicoVeterinario", e.target.value)} placeholder="Nombre" className={IN}/></div>
              <div><label className={LBL}>Responsable de Recepción</label><input value={data.responsableRecepcion ?? ""} onChange={e => set("responsableRecepcion", e.target.value)} placeholder="Nombre" className={IN}/></div>
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

// ═══ PDF ejecutivo nativo del checklist (jsPDF) ═══════════════════════════════
const EMPRESA = { nombre: "Pollos Savicol S.A.S.", nit: "860.403.972-5" };

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


async function generarPDFChecklistPro(tipo: ChecklistTipo, data: ChecklistData, cumplimientoGlobal: number, ia?: SeccionesIA) {
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
