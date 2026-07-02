"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIOS · Inventario de Producto · Formulario Evaluativo
// Transcribe el FORMATO EVALUACIÓN AUDITORIA INVENTARIO DE PRODUCTOS: 22 preguntas,
// escala, bitácora, cálculos, observaciones, plan de acción y evidencias.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from "react";
import {
  EVAL_META, EVAL_ESCALA, EVAL_PREGUNTAS, EVAL_ESTADOS, EVAL_ESTADO_COLOR, EVAL_PUNTAJES,
  EVIDENCIA_TIPOS, EVIDENCIA_CATEGORIAS, calcularEvaluacion,
  type EvalRespuestas, type BitacoraEntry,
} from "@/lib/evaluacion-producto.constants";
import {
  useEvaluaciones, useCreateEvaluacion, useUpdateEvaluacion, useDeleteEvaluacion,
  useEvidenciasEvaluacion, useCreateEvidenciaEvaluacion, useDeleteEvidenciaEvaluacion,
} from "@/hooks/useEvaluaciones";
import { AUDITORS } from "@/lib/constants";
import { procesarArchivo, imgSrc, esImagen, fmtSize } from "@/lib/evidencias-upload";
import type { EvaluacionInventario } from "@/lib/evaluacion.types";
import {
  ClipboardList, Plus, X, Loader2, Edit2, Trash2, Save, Sparkles, AlertTriangle,
  Camera, UploadCloud, Link2, Download, ExternalLink, FileText, CheckCircle2,
} from "lucide-react";

const isoToLocalDate = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); };
const fmtFecha = (iso?: string | null) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { dateStyle: "medium" }); };
const hoyDate = () => new Date().toISOString().slice(0, 10);
const hoyHora = () => new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

// ═══════════════════════════════════════════════════════════════════════════════
// Botón + orquestación (lista ↔ formulario)
// ═══════════════════════════════════════════════════════════════════════════════
export function FormularioEvaluativo() {
  const [listaOpen, setListaOpen] = useState(false);
  const [form, setForm] = useState<{ open: boolean; item: EvaluacionInventario | null }>({ open: false, item: null });

  return (
    <>
      <button onClick={() => setListaOpen(true)} className="px-3 py-1.5 bg-violet-600/15 border border-violet-500/40 rounded-lg text-xs text-violet-200 flex items-center gap-1.5 hover:bg-violet-600/25 font-semibold">
        <ClipboardList className="w-3.5 h-3.5" />Formulario Evaluativo
      </button>

      {listaOpen && (
        <EvaluacionesListaModal
          onClose={() => setListaOpen(false)}
          onNueva={() => { setForm({ open: true, item: null }); setListaOpen(false); }}
          onAbrir={(ev) => { setForm({ open: true, item: ev }); setListaOpen(false); }}
        />
      )}
      {form.open && (
        <EvaluacionFormModal item={form.item} onClose={() => setForm({ open: false, item: null })} onSaved={() => setForm({ open: false, item: null })} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lista de evaluaciones
// ═══════════════════════════════════════════════════════════════════════════════
function EvaluacionesListaModal({ onClose, onNueva, onAbrir }: { onClose: () => void; onNueva: () => void; onAbrir: (ev: EvaluacionInventario) => void }) {
  const q = useEvaluaciones("PRODUCTO");
  const rows = q.data ?? [];
  const remove = useDeleteEvaluacion();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-violet-400" />Formulario Evaluativo</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{EVAL_META.titulo} · {rows.length} evaluación(es)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onNueva} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Nueva evaluación</button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {q.isLoading ? (
            <div className="py-16 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 text-[#1E2D4A] mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Sin evaluaciones</p>
              <p className="text-[#475569] text-sm mb-4">Crea la primera evaluación de inventario de producto.</p>
              <button onClick={onNueva} className="btn-primary text-xs inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Nueva evaluación</button>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(ev => {
                const cc = ev.calificacion === "Bueno" ? "#10B981" : ev.calificacion === "Aceptable" ? "#F59E0B" : ev.calificacion === "Insatisfactorio" ? "#EF4444" : "#94A3B8";
                const ec = EVAL_ESTADO_COLOR[ev.estadoEvaluacion] ?? "#94A3B8";
                return (
                  <div key={ev.id} className="flex items-center gap-3 bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{ev.bodega || "Sin bodega"} <span className="text-[10px] text-[#64748B]">· {fmtFecha(ev.fecha)}{ev.hora ? ` ${ev.hora}` : ""}</span></p>
                      <p className="text-[11px] text-[#94A3B8]">{ev.auditores || "Sin auditor"}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}30` }}>{ev.estadoEvaluacion}</span>
                    <div className="text-right w-24">
                      <p className="text-sm font-bold" style={{ color: cc }}>{ev.calificacion || "—"}</p>
                      <p className="text-[10px] text-[#64748B]">{ev.porcentaje ?? 0}% · {(ev.promedio ?? 0).toFixed(1)}/5</p>
                    </div>
                    <button onClick={() => onAbrir(ev)} className="p-1.5 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Abrir"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={async () => { if (confirm("¿Eliminar esta evaluación?")) { try { await remove.mutateAsync(ev.id); } catch (e: any) { alert("Error: " + (e?.message)); } } }} className="p-1.5 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Formulario de evaluación
// ═══════════════════════════════════════════════════════════════════════════════
function EvaluacionFormModal({ item, onClose, onSaved }: { item: EvaluacionInventario | null; onClose: () => void; onSaved: () => void }) {
  const create = useCreateEvaluacion();
  const update = useUpdateEvaluacion();
  const parseJSON = <T,>(s: string | null | undefined, fb: T): T => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };

  const [info, setInfo] = useState({
    bodega: item?.bodega ?? "", auditores: item?.auditores ?? "", coordinador: item?.coordinador ?? "",
    director: item?.director ?? "", colaboradores: item?.colaboradores ?? "",
    fecha: isoToLocalDate(item?.fecha) || hoyDate(), hora: item?.hora ?? hoyHora(),
    estadoEvaluacion: item?.estadoEvaluacion ?? "En proceso",
  });
  const [resp, setResp] = useState<EvalRespuestas>(() => parseJSON<EvalRespuestas>(item?.respuestasJSON, {}));
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>(() => parseJSON<BitacoraEntry[]>(item?.bitacoraJSON, []));
  const [obs, setObs] = useState({ observacionGeneral: item?.observacionGeneral ?? "", conclusion: item?.conclusion ?? "", planAccion: item?.planAccion ?? "" });
  const [nuevaBita, setNuevaBita] = useState({ fecha: hoyDate(), hora: hoyHora(), evento: "" });
  const [savedId, setSavedId] = useState<string | null>(item?.id ?? null);
  const [error, setError] = useState("");
  const [genPlan, setGenPlan] = useState(false);

  const setI = (k: string, v: string) => setInfo(p => ({ ...p, [k]: v }));
  const setR = (itemId: string, patch: Partial<{ puntaje: number; evidencia: string; observacion: string }>) =>
    setResp(p => ({ ...p, [itemId]: { ...p[itemId], ...patch } }));

  const calc = useMemo(() => calcularEvaluacion(resp), [resp]);
  const saving = create.isPending || update.isPending;

  const buildPayload = () => ({
    modulo: "PRODUCTO", ...info,
    respuestasJSON: JSON.stringify(resp), bitacoraJSON: JSON.stringify(bitacora),
    observacionGeneral: obs.observacionGeneral || undefined, conclusion: obs.conclusion || undefined, planAccion: obs.planAccion || undefined,
    puntajeObtenido: calc.obtenido, contestadas: calc.contestadas, puntajeMaximo: calc.maximo,
    promedio: calc.promedio, porcentaje: calc.porcentaje, calificacion: calc.calificacion === "—" ? undefined : calc.calificacion,
  });

  const guardar = async (): Promise<string | null> => {
    if (!info.bodega.trim()) { setError("Indica la bodega evaluada."); return null; }
    setError("");
    try {
      const payload = buildPayload();
      if (savedId) { await update.mutateAsync({ id: savedId, patch: payload }); return savedId; }
      const created = await create.mutateAsync(payload); setSavedId(created.id); return created.id;
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message ?? "No se pudo guardar."); return null; }
  };

  const agregarBita = () => { if (!nuevaBita.evento.trim()) return; setBitacora(p => [...p, { ...nuevaBita, evento: nuevaBita.evento.trim() }]); setNuevaBita({ fecha: hoyDate(), hora: hoyHora(), evento: "" }); };

  // Plan de acción — reutiliza el motor existente (/api/ai/generar-plan), sin mencionar IA.
  const generarPlanAccion = async () => {
    setGenPlan(true); setError("");
    try {
      const debiles = EVAL_PREGUNTAS.filter(p => { const v = resp[p.item]?.puntaje; return typeof v === "number" && v <= 3; });
      const desc = [
        `Auditoría de inventario de producto. Bodega: ${info.bodega || "N/D"}. Calificación: ${calc.calificacion} (promedio ${calc.promedio}/5, ${calc.porcentaje}% de cumplimiento, ${calc.contestadas}/22 preguntas).`,
        debiles.length ? "Aspectos con menor puntaje (≤3):\n" + debiles.map(p => `- [${p.item}] ${p.aspecto} — puntaje ${resp[p.item]?.puntaje}.${resp[p.item]?.observacion ? " Obs: " + resp[p.item]?.observacion : ""}`).join("\n") : "Sin aspectos por debajo de 3.",
        bitacora.length ? "Bitácora: " + bitacora.map(b => `${b.fecha} ${b.hora}: ${b.evento}`).join("; ") : "",
        obs.observacionGeneral ? "Observación general: " + obs.observacionGeneral : "",
      ].filter(Boolean).join("\n");
      const res = await fetch("/api/ai/generar-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: `Plan de acción para la auditoría de inventario de producto de la bodega ${info.bodega || "N/D"} (calificación ${calc.calificacion}).`, descripcionHallazgo: desc, areaAuditada: "Inventario de Producto", auditor: info.auditores, modo: "implementacion" }),
      });
      const data = await res.json();
      if (res.ok && data.plan) setObs(p => ({ ...p, planAccion: data.plan }));
      else setError(data.error === "ANTHROPIC_API_KEY no configurada en Vercel." ? "El generador no está disponible en este entorno." : (data.error || "No se pudo generar el plan de acción."));
    } catch (e: any) { setError("No se pudo generar el plan de acción: " + (e?.message ?? e)); }
    finally { setGenPlan(false); }
  };

  const procesos = useMemo(() => Array.from(new Set(EVAL_PREGUNTAS.map(p => p.proceso))), []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-base">{EVAL_META.titulo}</h2>
            <p className="text-[11px] text-[#94A3B8]">{EVAL_META.subtitulo} · {EVAL_META.areasResponsables}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
        </header>

        {/* Resumen de cálculo (sticky) */}
        <div className="px-6 py-2.5 bg-[#0A111F] border-b border-[#1E2D4A] flex items-center gap-4 flex-wrap text-xs">
          <span className="text-[#94A3B8]">Puntaje: <strong className="text-white font-mono">{calc.obtenido}/{calc.maximo}</strong></span>
          <span className="text-[#94A3B8]">Contestadas: <strong className="text-white font-mono">{calc.contestadas}/22</strong></span>
          <span className="text-[#94A3B8]">Promedio: <strong className="text-white font-mono">{calc.promedio.toFixed(2)}/5</strong></span>
          <span className="text-[#94A3B8]">Cumplimiento: <strong className="text-white font-mono">{calc.porcentaje}%</strong></span>
          <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: `${calc.calificacionColor}22`, color: calc.calificacionColor, border: `1px solid ${calc.calificacionColor}` }}>{calc.calificacion}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Información general */}
          <Section title="Información General">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <F label="Bodega *" value={info.bodega} onChange={v => setI("bodega", v)} placeholder="Bodega evaluada" />
              <FDatalist label="Auditor(es)" value={info.auditores} onChange={v => setI("auditores", v)} options={AUDITORS.map(a => a.name)} />
              <F label="Coordinador del proceso" value={info.coordinador} onChange={v => setI("coordinador", v)} />
              <F label="Director del proceso" value={info.director} onChange={v => setI("director", v)} />
              <F label="Colaboradores participantes" value={info.colaboradores} onChange={v => setI("colaboradores", v)} />
              <Sel label="Estado de la evaluación" value={info.estadoEvaluacion} onChange={v => setI("estadoEvaluacion", v)} options={EVAL_ESTADOS as unknown as string[]} />
              <F label="Fecha" value={info.fecha} onChange={v => setI("fecha", v)} type="date" />
              <F label="Hora" value={info.hora} onChange={v => setI("hora", v)} type="time" />
            </div>
          </Section>

          {/* Evaluación — 22 preguntas por proceso */}
          <Section title="Evaluación (22 preguntas · puntaje 1 a 5)">
            <div className="space-y-4">
              {procesos.map(proc => (
                <div key={proc}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-violet-300 bg-[#0A111F] border border-[#1E2D4A] rounded px-2.5 py-1.5 mb-1.5">{proc}</div>
                  <div className="space-y-1.5">
                    {EVAL_PREGUNTAS.filter(p => p.proceso === proc).map(p => {
                      const r = resp[p.item] ?? {};
                      return (
                        <div key={p.item} className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg p-2.5">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-mono text-violet-300 mt-0.5 shrink-0 w-8">{p.item}</span>
                            <p className="text-xs text-white flex-1">{p.aspecto}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap pl-10">
                            <div className="flex gap-1">
                              {EVAL_PUNTAJES.map(n => (
                                <button key={n} onClick={() => setR(p.item, { puntaje: r.puntaje === n ? undefined : n })}
                                        className="w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center border transition-colors"
                                        style={r.puntaje === n
                                          ? { background: n >= 4 ? "#10B981" : n >= 3 ? "#F59E0B" : "#EF4444", color: "#fff", borderColor: "transparent" }
                                          : { background: "#0D1526", color: "#94A3B8", borderColor: "#1E2D4A" }}>{n}</button>
                              ))}
                            </div>
                            <select value={r.evidencia ?? ""} onChange={e => setR(p.item, { evidencia: e.target.value })} className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1 text-[11px] text-white">
                              <option value="">Evidencias…</option><option value="Sí">Sí</option><option value="No">No</option>
                            </select>
                            <input value={r.observacion ?? ""} onChange={e => setR(p.item, { observacion: e.target.value })} placeholder="Observación" className="flex-1 min-w-[140px] bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1 text-[11px] text-white" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Bitácora estructurada */}
          <Section title="Bitácora">
            <div className="space-y-2">
              {bitacora.length > 0 && (
                <div className="space-y-1">
                  {bitacora.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#0A111F] border border-[#1E2D4A] rounded px-2.5 py-1.5 text-xs">
                      <span className="text-[10px] font-mono text-[#64748B] shrink-0">{b.fecha} {b.hora}</span>
                      <span className="text-white flex-1">{b.evento}</span>
                      <button onClick={() => setBitacora(p => p.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input type="date" value={nuevaBita.fecha} onChange={e => setNuevaBita(p => ({ ...p, fecha: e.target.value }))} className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white" />
                <input type="time" value={nuevaBita.hora} onChange={e => setNuevaBita(p => ({ ...p, hora: e.target.value }))} className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white" />
                <input value={nuevaBita.evento} onChange={e => setNuevaBita(p => ({ ...p, evento: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") agregarBita(); }} placeholder="Evento / anotación…" className="flex-1 min-w-[180px] bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white" />
                <button onClick={agregarBita} className="px-2.5 py-1.5 rounded text-[11px] bg-[#1A2540] text-white flex items-center gap-1 hover:bg-[#22304d]"><Plus className="w-3 h-3" />Agregar</button>
              </div>
            </div>
          </Section>

          {/* Observaciones */}
          <Section title="Observaciones y Conclusión">
            <div className="grid grid-cols-1 gap-3">
              <Area label="Observación General" value={obs.observacionGeneral} onChange={v => setObs(p => ({ ...p, observacionGeneral: v }))} />
              <Area label="Conclusión de Auditoría" value={obs.conclusion} onChange={v => setObs(p => ({ ...p, conclusion: v }))} />
            </div>
          </Section>

          {/* Plan de acción */}
          <Section title="Plan de Acción">
            <div className="space-y-2">
              <button onClick={generarPlanAccion} disabled={genPlan} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600/20 border border-violet-500/40 text-violet-200 hover:bg-violet-600/30 flex items-center gap-1.5 disabled:opacity-50">
                {genPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}Generar Plan de Acción
              </button>
              <textarea value={obs.planAccion} onChange={e => setObs(p => ({ ...p, planAccion: e.target.value }))} rows={4} placeholder="El plan de acción se generará a partir de los puntajes, observaciones y bitácora. También puedes editarlo o escribirlo manualmente." className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white resize-none" />
            </div>
          </Section>

          {/* Evidencias (requiere guardar primero) */}
          <Section title="Evidencias">
            {savedId ? <EvidenciasEval evaluacionId={savedId} /> : (
              <p className="text-[11px] text-[#64748B] bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-3">Guarda la evaluación para poder adjuntar evidencias (fotos, PDF, Excel, documentos).</p>
            )}
          </Section>

          {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
        </div>

        <footer className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-[#1E2D4A]">
          <p className="text-[10px] text-[#64748B]">{savedId ? "Evaluación guardada · los cambios se guardan al presionar Guardar." : "Nueva evaluación"}</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white">Cerrar</button>
            <button onClick={async () => { const id = await guardar(); if (id) onSaved(); }} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Guardar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Evidencias del formulario ───────────────────────────────────────────────
function EvidenciasEval({ evaluacionId }: { evaluacionId: string }) {
  const q = useEvidenciasEvaluacion(evaluacionId);
  const evid = q.data ?? [];
  const create = useCreateEvidenciaEvaluacion();
  const remove = useDeleteEvidenciaEvaluacion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"subir" | "enlace">("subir");
  const [proc, setProc] = useState(false);
  const [f, setF] = useState({ tipo: "Foto", nombre: "", categoria: EVIDENCIA_CATEGORIAS[0] as string, url: "", size: 0, dataUrl: "" });
  const [err, setErr] = useState("");

  const onPick = async (file?: File) => {
    if (!file) return; setErr(""); setProc(true);
    try { const { dataUrl, size, tipo } = await procesarArchivo(file); setF(p => ({ ...p, dataUrl, size, tipo, nombre: p.nombre || file.name, url: "" })); }
    catch (e: any) { setErr(e?.message ?? "No se pudo procesar."); } finally { setProc(false); }
  };
  const guardar = async () => {
    const url = modo === "subir" ? f.dataUrl : f.url.trim();
    if (!url || !f.nombre.trim()) { setErr("Archivo/enlace y nombre requeridos."); return; }
    setErr("");
    try { await create.mutateAsync({ evaluacionId, tipo: f.tipo, nombre: f.nombre.trim(), url, size: f.size || 0, categoria: f.categoria }); setF({ tipo: "Foto", nombre: "", categoria: EVIDENCIA_CATEGORIAS[0] as string, url: "", size: 0, dataUrl: "" }); if (fileRef.current) fileRef.current.value = ""; }
    catch (e: any) { setErr(e?.message ?? "No se pudo guardar."); }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#1E2D4A] bg-[#0A111F] p-2.5 space-y-2">
        <div className="flex gap-2">
          <button onClick={() => setModo("subir")} className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${modo === "subir" ? "bg-[#1A2540] text-white" : "text-[#94A3B8]"}`}><UploadCloud className="w-3 h-3" />Subir</button>
          <button onClick={() => setModo("enlace")} className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${modo === "enlace" ? "bg-[#1A2540] text-white" : "text-[#94A3B8]"}`}><Link2 className="w-3 h-3" />Enlace</button>
        </div>
        {modo === "subir" ? (
          <div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf,.xlsx,.xls,.csv,video/*" className="hidden" onChange={e => onPick(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={proc} className="w-full border border-dashed border-[#1E2D4A] hover:border-cyan-500/50 rounded-lg py-3 flex items-center justify-center gap-2 text-[#94A3B8] hover:text-cyan-300 text-xs">
              {proc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}{f.dataUrl ? `Listo (${f.tipo} · ${fmtSize(f.size)})` : "Seleccionar archivo (imágenes se optimizan · máx 10 MB)"}
            </button>
          </div>
        ) : (
          <input value={f.url} onChange={e => setF(p => ({ ...p, url: e.target.value }))} placeholder="https://…" className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white" />
        )}
        <div className="grid grid-cols-3 gap-2">
          <input value={f.nombre} onChange={e => setF(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white" />
          <select value={f.tipo} onChange={e => setF(p => ({ ...p, tipo: e.target.value }))} className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white">{EVIDENCIA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={f.categoria} onChange={e => setF(p => ({ ...p, categoria: e.target.value }))} className="bg-[#0D1526] border border-[#1E2D4A] rounded px-2 py-1.5 text-[11px] text-white">{EVIDENCIA_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        {err && <p className="text-[11px] text-red-400">{err}</p>}
        <div className="flex justify-end"><button onClick={guardar} disabled={create.isPending} className="btn-primary text-[11px] flex items-center gap-1 disabled:opacity-50">{create.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Agregar</button></div>
      </div>
      {evid.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {evid.map(e => {
            const img = esImagen({ tipo: e.tipo, url: e.url });
            return (
              <div key={e.id} className="rounded-lg border border-[#1E2D4A] bg-[#0A111F] overflow-hidden">
                {img ? <img src={imgSrc(e.url)} alt={e.nombre} className="w-full h-24 object-cover" /> : <div className="w-full h-24 flex items-center justify-center"><FileText className="w-7 h-7 text-[#475569]" /></div>}
                <div className="p-1.5 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-white truncate flex-1">{e.nombre}</span>
                  <a href={imgSrc(e.url)} target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-cyan-400"><ExternalLink className="w-3 h-3" /></a>
                  <button onClick={async () => { if (confirm("¿Eliminar?")) { try { await remove.mutateAsync(e.id); } catch {} } }} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers de formulario ───────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-[11px] font-bold uppercase tracking-wider text-violet-300/80 mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{title}</h3>{children}</div>;
}
function F({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <div><label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" /></div>;
}
function FDatalist({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const id = "dl-" + label.replace(/\s+/g, "");
  return <div><label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label><input list={id} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white" /><datalist id={id}>{options.map(o => <option key={o} value={o} />)}</datalist></div>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <div><label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>;
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="text-[10px] text-[#94A3B8] mb-1 block">{label}</label><textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-white resize-none" /></div>;
}
