"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// GRANJAS · Trazabilidad de Descartes — Fase 1 (formulario + cálculos + lista)
// Un registro = un viaje/vehículo. Persistencia real vía /descartes (NestJS/Prisma).
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import {
  useDescartes, useCreateDescarte, useUpdateDescarte, useDeleteDescarte,
  useEvidenciasDescarte, useCreateEvidenciaDescarte, useDeleteEvidenciaDescarte,
} from "@/hooks/useDescartes";
import { procesarArchivo, imgSrc, fmtSize, esImagen } from "@/lib/evidencias-upload";
import { useGranjas } from "@/hooks/useGranjas";
import { AUDITORS } from "@/lib/constants";
import {
  TIPO_DESCARTE, MOTIVO_DESCARTE, CLASIFICACION_SANITARIA, NIVEL_RIESGO_DESCARTE,
  ESTADO_DESCARTE, DESTINO_DESCARTE, RIESGO_COLOR, ESTADO_DESCARTE_COLOR, TIEMPO_OBJETIVO_MIN,
  CHECKLIST_DESCARTE, CHECKLIST_ESTADOS, CHECKLIST_TOTAL_ITEMS, checklistStats,
  EVIDENCIA_TIPOS, EVIDENCIA_CATEGORIAS,
  type ChecklistRespuesta, type ChecklistRespuestas,
} from "@/lib/descartes.constants";
import type { DescarteAve, DescartePayload, EvidenciaDescarte } from "@/lib/descartes.types";
import {
  Bird, Plus, X, Loader2, AlertTriangle, Trash2, Edit2, Filter,
  Clock, Scale, Save, MapPin, CheckCircle2, ClipboardCheck,
  Camera, UploadCloud, Link2, Download, ExternalLink, Image as ImageIcon, Maximize2, FolderOpen,
} from "lucide-react";

// ─── Helpers de fecha/tiempo ─────────────────────────────────────────────────
const isoToLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtFecha = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
};
// Minutos entre dos datetime-local; null si falta o el fin es anterior al inicio.
const minsBetween = (a?: string, b?: string): number | null => {
  if (!a || !b) return null;
  const t = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return isNaN(t) || t < 0 ? null : Math.round(t);
};
const fmtDur = (m: number | null): string =>
  m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
const num = (v: any): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export default function DescartesPage() {
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroRiesgo, setFiltroRiesgo] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DescarteAve | null>(null);
  const [checklistFor, setChecklistFor] = useState<DescarteAve | null>(null);
  const [evidenciasFor, setEvidenciasFor] = useState<DescarteAve | null>(null);

  const descQ = useDescartes({
    estado: filtroEstado || undefined,
    nivelRiesgo: filtroRiesgo || undefined,
    motivo: filtroMotivo || undefined,
  });
  const rows = descQ.data ?? [];

  const removeD = useDeleteDescarte();

  // Resumen ligero (el Dashboard completo es una fase posterior)
  const kpis = useMemo(() => {
    const totalAves = rows.reduce((s, r) => s + (r.cantidadAves || 0), 0);
    const pesoTotal = rows.reduce((s, r) => s + (r.pesoTotalKg || 0), 0);
    const tiempos = rows
      .map(r => minsBetween(isoToLocalInput(r.horaInicioCargue), isoToLocalInput(r.horaFinDescarga)))
      .filter((x): x is number => x != null);
    const tProm = tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null;
    return { total: rows.length, totalAves, pesoTotal, tProm };
  }, [rows]);

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Trazabilidad de Descartes"
        subtitle={`${kpis.total} descarte(s) · ${kpis.totalAves.toLocaleString("es-CO")} aves · ${kpis.pesoTotal.toLocaleString("es-CO", { maximumFractionDigits: 0 })} kg`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/>Filtros:</span>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todos los estados</option>
            {ESTADO_DESCARTE.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todo riesgo</option>
            {NIVEL_RIESGO_DESCARTE.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)} className="px-3 py-1.5 bg-[#0D1526] border border-[#1E2D4A] rounded-lg text-xs text-white">
            <option value="">Todo motivo</option>
            {MOTIVO_DESCARTE.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs ml-auto flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5"/>Nuevo descarte
          </button>
        </div>

        {/* Resumen ligero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpi icon={<Bird/>}  label="Descartes"        value={String(kpis.total)}                                        color="#F59E0B"/>
          <MiniKpi icon={<Bird/>}  label="Aves descartadas" value={kpis.totalAves.toLocaleString("es-CO")}                    color="#EF4444"/>
          <MiniKpi icon={<Scale/>} label="Peso total (kg)"  value={kpis.pesoTotal.toLocaleString("es-CO",{maximumFractionDigits:0})} color="#06B6D4"/>
          <MiniKpi icon={<Clock/>} label="Tiempo prom."     value={fmtDur(kpis.tProm)}                                        color="#8B5CF6"/>
        </div>

        {/* Lista */}
        <div className="card-base p-0 overflow-hidden">
          {descQ.isLoading ? (
            <div className="py-16 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin"/></div>
          ) : rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Bird className="w-10 h-10 text-[#1E2D4A] mb-4"/>
              <p className="text-white font-semibold mb-1">Sin descartes registrados</p>
              <p className="text-[#475569] text-sm mb-4">Registra el primer descarte con "Nuevo descarte".</p>
              <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5"/>Nuevo descarte</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0D1526]">
                  <tr className="text-[10px] uppercase tracking-wider text-[#475569] border-b border-[#1E2D4A]">
                    <th className="text-left p-2.5">Fecha</th>
                    <th className="text-left p-2.5">Granja · Galpón · Lote</th>
                    <th className="text-left p-2.5">Tipo · Motivo</th>
                    <th className="text-right p-2.5">Aves</th>
                    <th className="text-right p-2.5">Peso (kg)</th>
                    <th className="text-left p-2.5">Planta</th>
                    <th className="text-center p-2.5">Riesgo</th>
                    <th className="text-center p-2.5">Estado</th>
                    <th className="text-center p-2.5">Checklist</th>
                    <th className="text-right p-2.5">T. total</th>
                    <th className="text-center p-2.5 w-20">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const tTotal = minsBetween(isoToLocalInput(r.horaInicioCargue), isoToLocalInput(r.horaFinDescarga));
                    const rc = RIESGO_COLOR[r.nivelRiesgo] ?? "#94A3B8";
                    const ec = ESTADO_DESCARTE_COLOR[r.estado] ?? "#94A3B8";
                    return (
                      <tr key={r.id} className="border-b border-[#1E2D4A]/50 table-row-hover">
                        <td className="p-2.5 text-[#94A3B8] font-mono text-xs whitespace-nowrap">{fmtFecha(r.fechaHoraDescarte)}</td>
                        <td className="p-2.5">
                          <p className="text-white">{r.granjaNombre}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">Galpón {r.galpon} · Lote {r.lote}</p>
                        </td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{r.tipoDescarte}<br/><span className="text-[10px]">{r.motivo}</span></td>
                        <td className="p-2.5 text-right font-mono text-xs text-white">{(r.cantidadAves||0).toLocaleString("es-CO")}</td>
                        <td className="p-2.5 text-right font-mono text-xs text-cyan-300">{(r.pesoTotalKg||0).toLocaleString("es-CO",{maximumFractionDigits:1})}</td>
                        <td className="p-2.5 text-[#94A3B8] text-xs">{r.plantaDestino || "—"}</td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: `${rc}18`, color: rc, border: `1px solid ${rc}30` }}>{r.nivelRiesgo}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}30` }}>{r.estado}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          {(() => { const cs = checklistStats(r.checklistJSON); return cs.respondidos === 0
                            ? <span className="text-[10px] text-[#475569]">—</span>
                            : <span className="text-[10px] font-mono" style={{ color: cs.pct >= 90 ? "#10B981" : cs.pct >= 70 ? "#F59E0B" : "#EF4444" }}>{cs.pct}%<span className="text-[#64748B]"> ({cs.respondidos}/{cs.total})</span></span>; })()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs" style={{ color: tTotal != null && tTotal > TIEMPO_OBJETIVO_MIN ? "#EF4444" : "#94A3B8" }}>{fmtDur(tTotal)}</td>
                        <td className="p-2.5">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => setChecklistFor(r)} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-emerald-400" title="Checklist de trazabilidad"><ClipboardCheck className="w-3 h-3"/></button>
                            <button onClick={() => setEvidenciasFor(r)} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-cyan-400" title="Evidencias"><Camera className="w-3 h-3"/></button>
                            <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1 rounded hover:bg-[#1A2540] text-[#94A3B8] hover:text-white" title="Editar"><Edit2 className="w-3 h-3"/></button>
                            <button onClick={async () => { if (confirm(`¿Eliminar el descarte de ${r.granjaNombre} (galpón ${r.galpon})?`)) { try { await removeD.mutateAsync(r.id); } catch (e:any) { alert("Error: " + (e?.response?.data?.message ?? e?.message)); } } }} className="p-1 rounded hover:bg-red-950/30 text-[#94A3B8] hover:text-red-400" title="Eliminar"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <DescarteModal
          item={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}

      {checklistFor && (
        <ChecklistModal
          descarte={checklistFor}
          onClose={() => setChecklistFor(null)}
          onSaved={() => setChecklistFor(null)}
        />
      )}

      {evidenciasFor && (
        <EvidenciasModal descarte={evidenciasFor} onClose={() => setEvidenciasFor(null)} />
      )}
    </div>
  );
}

function MiniKpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card-base flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-lg font-bold text-white leading-tight truncate">{value}</p>
        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Formulario de descarte
// ═══════════════════════════════════════════════════════════════════════════════
function DescarteModal({ item, onClose, onSaved }: {
  item: DescarteAve | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const granjasQ = useGranjas();
  const granjas = granjasQ.data ?? [];
  const createD = useCreateDescarte();
  const updateD = useUpdateDescarte();

  const [f, setF] = useState<any>(() => item ? {
    ...item,
    fechaHoraDescarte:  isoToLocalInput(item.fechaHoraDescarte),
    horaInicioCargue:   isoToLocalInput(item.horaInicioCargue),
    horaFinCargue:      isoToLocalInput(item.horaFinCargue),
    horaSalidaGranja:   isoToLocalInput(item.horaSalidaGranja),
    horaLlegadaPlanta:  isoToLocalInput(item.horaLlegadaPlanta),
    horaInicioDescarga: isoToLocalInput(item.horaInicioDescarga),
    horaFinDescarga:    isoToLocalInput(item.horaFinDescarga),
  } : {
    fechaHoraDescarte: isoToLocalInput(new Date().toISOString()),
    granjaId: "", granjaNombre: "", empresa: "", integracion: "", galpon: "", lote: "",
    lineaGenetica: "", loteEdadDias: "", tipoDescarte: "Sanitario", motivo: MOTIVO_DESCARTE[0],
    clasificacionSanitaria: "Apto", nivelRiesgo: "Medio", estado: "Registrado",
    cantidadAves: "", pesoPromedioKg: "", mortalidadTraslado: "",
    destino: "Planta de beneficio", plantaDestino: "", transportadora: "", vehiculoPlaca: "",
    conductor: "", responsableDespacho: "", responsableRecepcion: "", medicoVeterinario: "",
    horaInicioCargue: "", horaFinCargue: "", horaSalidaGranja: "", horaLlegadaPlanta: "",
    horaInicioDescarga: "", horaFinDescarga: "",
    gpsSalidaLat: "", gpsSalidaLng: "", gpsLlegadaLat: "", gpsLlegadaLng: "", distanciaKm: "", ruta: "",
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setF((prev: any) => ({ ...prev, [k]: v }));

  // ── Cálculos automáticos ──
  const pesoTotal = +(num(f.cantidadAves) * num(f.pesoPromedioKg)).toFixed(2);
  const tCargue   = minsBetween(f.horaInicioCargue, f.horaFinCargue);
  const tTrayecto = minsBetween(f.horaSalidaGranja, f.horaLlegadaPlanta);
  const tEspera   = minsBetween(f.horaLlegadaPlanta, f.horaInicioDescarga);
  const tDescarga = minsBetween(f.horaInicioDescarga, f.horaFinDescarga);
  const tTotal    = minsBetween(f.horaInicioCargue, f.horaFinDescarga);
  const avesMin   = tCargue && tCargue > 0 ? Math.round(num(f.cantidadAves) / tCargue) : null;

  // ── Validaciones de orden de tiempos (fin ≥ inicio) ──
  const timeErrs: string[] = [];
  const chk = (a: string, b: string, lbl: string) => {
    if (f[a] && f[b] && new Date(f[b]).getTime() < new Date(f[a]).getTime()) timeErrs.push(lbl);
  };
  chk("horaInicioCargue", "horaFinCargue", "El fin de cargue es anterior al inicio.");
  chk("horaSalidaGranja", "horaLlegadaPlanta", "La llegada a planta es anterior a la salida de granja.");
  chk("horaInicioDescarga", "horaFinDescarga", "El fin de descarga es anterior al inicio.");

  const retraso = tTotal != null && tTotal > TIEMPO_OBJETIVO_MIN;

  async function guardar() {
    setError(null);
    // Validaciones obligatorias
    if (!f.fechaHoraDescarte) return setError("La fecha y hora del descarte es obligatoria.");
    if (!f.granjaNombre?.trim()) return setError("Selecciona la granja.");
    if (!f.galpon?.trim()) return setError("El galpón es obligatorio.");
    if (!f.lote?.trim()) return setError("El lote es obligatorio.");
    if (!f.motivo?.trim()) return setError("El motivo del descarte es obligatorio.");
    if (num(f.cantidadAves) <= 0) return setError("La cantidad de aves debe ser mayor a 0.");
    if (num(f.pesoPromedioKg) < 0 || num(f.cantidadAves) < 0 || num(f.mortalidadTraslado) < 0)
      return setError("No se permiten cantidades ni pesos negativos.");
    if (timeErrs.length) return setError(timeErrs.join(" "));

    const payload: DescartePayload = {
      fechaHoraDescarte: f.fechaHoraDescarte,
      granjaId: f.granjaId || null,
      granjaNombre: f.granjaNombre.trim(),
      empresa: f.empresa || null,
      integracion: f.integracion || null,
      galpon: f.galpon.trim(),
      lote: f.lote.trim(),
      lineaGenetica: f.lineaGenetica || null,
      loteEdadDias: f.loteEdadDias === "" ? null : Math.round(num(f.loteEdadDias)),
      tipoDescarte: f.tipoDescarte,
      motivo: f.motivo,
      clasificacionSanitaria: f.clasificacionSanitaria || null,
      nivelRiesgo: f.nivelRiesgo,
      estado: f.estado,
      cantidadAves: Math.round(num(f.cantidadAves)),
      pesoPromedioKg: f.pesoPromedioKg === "" ? null : num(f.pesoPromedioKg),
      pesoTotalKg: pesoTotal || null,
      mortalidadTraslado: f.mortalidadTraslado === "" ? null : Math.round(num(f.mortalidadTraslado)),
      destino: f.destino || null,
      plantaDestino: f.plantaDestino || null,
      transportadora: f.transportadora || null,
      vehiculoPlaca: f.vehiculoPlaca || null,
      conductor: f.conductor || null,
      responsableDespacho: f.responsableDespacho || null,
      responsableRecepcion: f.responsableRecepcion || null,
      medicoVeterinario: f.medicoVeterinario || null,
      horaInicioCargue: f.horaInicioCargue || null,
      horaFinCargue: f.horaFinCargue || null,
      horaSalidaGranja: f.horaSalidaGranja || null,
      horaLlegadaPlanta: f.horaLlegadaPlanta || null,
      horaInicioDescarga: f.horaInicioDescarga || null,
      horaFinDescarga: f.horaFinDescarga || null,
      gpsSalidaLat: f.gpsSalidaLat === "" ? null : num(f.gpsSalidaLat),
      gpsSalidaLng: f.gpsSalidaLng === "" ? null : num(f.gpsSalidaLng),
      gpsLlegadaLat: f.gpsLlegadaLat === "" ? null : num(f.gpsLlegadaLat),
      gpsLlegadaLng: f.gpsLlegadaLng === "" ? null : num(f.gpsLlegadaLng),
      distanciaKm: f.distanciaKm === "" ? null : num(f.distanciaKm),
      ruta: f.ruta || null,
      observaciones: f.observaciones || null,
    };

    setSaving(true);
    try {
      if (item) await updateD.mutateAsync({ id: item.id, patch: payload });
      else      await createD.mutateAsync(payload);
      onSaved();
    } catch (e: any) {
      const raw = e?.response?.data;
      setError((Array.isArray(raw?.message) ? raw.message.join(" · ") : raw?.message) ?? e?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const gmaps = f.gpsSalidaLat && f.gpsSalidaLng
    ? `https://www.google.com/maps?q=${f.gpsSalidaLat},${f.gpsSalidaLng}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">{item ? "Editar descarte" : "Nuevo descarte"}</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">Trazabilidad logística, sanitaria y operativa del descarte de aves</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Información general */}
          <Section title="Información general">
            <Grid>
              <F label="Fecha y hora del descarte *"><input type="datetime-local" value={f.fechaHoraDescarte} onChange={e => set("fechaHoraDescarte", e.target.value)} className="input-base"/></F>
              <F label="Granja *">
                <select value={f.granjaId} onChange={e => { const g = granjas.find((x:any)=>x.id===e.target.value); set("granjaId", e.target.value); set("granjaNombre", g?.nombre ?? ""); }} className="input-base">
                  <option value="">{f.granjaNombre || "Selecciona granja"}</option>
                  {granjas.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </F>
              <F label="Galpón *"><input value={f.galpon} onChange={e => set("galpon", e.target.value)} placeholder="Ej. 3" className="input-base"/></F>
              <F label="Lote *"><input value={f.lote} onChange={e => set("lote", e.target.value)} placeholder="Ej. L-2026-014" className="input-base"/></F>
              <F label="Empresa"><input value={f.empresa} onChange={e => set("empresa", e.target.value)} className="input-base"/></F>
              <F label="Integración"><input value={f.integracion} onChange={e => set("integracion", e.target.value)} className="input-base"/></F>
              <F label="Línea genética"><input value={f.lineaGenetica} onChange={e => set("lineaGenetica", e.target.value)} placeholder="Ej. Ross 308" className="input-base"/></F>
              <F label="Edad del lote (días)"><input type="number" min={0} value={f.loteEdadDias} onChange={e => set("loteEdadDias", e.target.value)} className="input-base"/></F>
              <F label="Tipo de descarte"><Sel value={f.tipoDescarte} onChange={v => set("tipoDescarte", v)} opts={TIPO_DESCARTE}/></F>
              <F label="Motivo *"><Sel value={f.motivo} onChange={v => set("motivo", v)} opts={MOTIVO_DESCARTE}/></F>
              <F label="Clasificación sanitaria"><Sel value={f.clasificacionSanitaria} onChange={v => set("clasificacionSanitaria", v)} opts={CLASIFICACION_SANITARIA}/></F>
              <F label="Nivel de riesgo"><Sel value={f.nivelRiesgo} onChange={v => set("nivelRiesgo", v)} opts={NIVEL_RIESGO_DESCARTE}/></F>
              <F label="Estado del proceso"><Sel value={f.estado} onChange={v => set("estado", v)} opts={ESTADO_DESCARTE}/></F>
            </Grid>
          </Section>

          {/* Información productiva */}
          <Section title="Información productiva">
            <Grid cols={4}>
              <F label="Cantidad de aves *"><input type="number" min={0} value={f.cantidadAves} onChange={e => set("cantidadAves", e.target.value)} className="input-base"/></F>
              <F label="Peso promedio (kg)"><input type="number" min={0} step="0.01" value={f.pesoPromedioKg} onChange={e => set("pesoPromedioKg", e.target.value)} className="input-base"/></F>
              <F label="Peso total (kg) · auto"><input value={pesoTotal ? pesoTotal.toLocaleString("es-CO") : "—"} readOnly className="input-base opacity-70 cursor-not-allowed"/></F>
              <F label="Mortalidad en traslado"><input type="number" min={0} value={f.mortalidadTraslado} onChange={e => set("mortalidadTraslado", e.target.value)} className="input-base"/></F>
            </Grid>
          </Section>

          {/* Información logística */}
          <Section title="Información logística">
            <Grid>
              <F label="Destino"><Sel value={f.destino} onChange={v => set("destino", v)} opts={DESTINO_DESCARTE}/></F>
              <F label="Planta de beneficio"><input value={f.plantaDestino} onChange={e => set("plantaDestino", e.target.value)} placeholder="Nombre de la planta" className="input-base"/></F>
              <F label="Transportadora"><input value={f.transportadora} onChange={e => set("transportadora", e.target.value)} className="input-base"/></F>
              <F label="Vehículo / Placa"><input value={f.vehiculoPlaca} onChange={e => set("vehiculoPlaca", e.target.value)} placeholder="ABC-123" className="input-base"/></F>
              <F label="Conductor"><input value={f.conductor} onChange={e => set("conductor", e.target.value)} className="input-base"/></F>
            </Grid>
          </Section>

          {/* Responsables */}
          <Section title="Responsables">
            <Grid cols={3}>
              <F label="Médico veterinario"><input list="dsc-auditores" value={f.medicoVeterinario} onChange={e => set("medicoVeterinario", e.target.value)} className="input-base"/></F>
              <F label="Responsable de despacho"><input list="dsc-auditores" value={f.responsableDespacho} onChange={e => set("responsableDespacho", e.target.value)} className="input-base"/></F>
              <F label="Responsable de recepción"><input value={f.responsableRecepcion} onChange={e => set("responsableRecepcion", e.target.value)} className="input-base"/></F>
            </Grid>
            <datalist id="dsc-auditores">{AUDITORS.map(a => <option key={a.id} value={a.name}/>)}</datalist>
          </Section>

          {/* Control de tiempos */}
          <Section title="Control de tiempos">
            <Grid cols={3}>
              <F label="Inicio de cargue"><input type="datetime-local" value={f.horaInicioCargue} onChange={e => set("horaInicioCargue", e.target.value)} className="input-base"/></F>
              <F label="Fin de cargue"><input type="datetime-local" value={f.horaFinCargue} onChange={e => set("horaFinCargue", e.target.value)} className="input-base"/></F>
              <F label="Salida de granja"><input type="datetime-local" value={f.horaSalidaGranja} onChange={e => set("horaSalidaGranja", e.target.value)} className="input-base"/></F>
              <F label="Llegada a planta"><input type="datetime-local" value={f.horaLlegadaPlanta} onChange={e => set("horaLlegadaPlanta", e.target.value)} className="input-base"/></F>
              <F label="Inicio de descarga"><input type="datetime-local" value={f.horaInicioDescarga} onChange={e => set("horaInicioDescarga", e.target.value)} className="input-base"/></F>
              <F label="Fin de descarga"><input type="datetime-local" value={f.horaFinDescarga} onChange={e => set("horaFinDescarga", e.target.value)} className="input-base"/></F>
            </Grid>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-1">
              <Calc label="T. cargue" v={fmtDur(tCargue)}/>
              <Calc label="T. trayecto" v={fmtDur(tTrayecto)}/>
              <Calc label="T. espera" v={fmtDur(tEspera)}/>
              <Calc label="T. descarga" v={fmtDur(tDescarga)}/>
              <Calc label="T. total" v={fmtDur(tTotal)} alert={retraso}/>
              <Calc label="Aves/min cargue" v={avesMin != null ? String(avesMin) : "—"}/>
            </div>
            {retraso && (
              <p className="text-[11px] text-red-300 flex items-center gap-1.5 mt-1"><AlertTriangle className="w-3 h-3"/>Tiempo total ({fmtDur(tTotal)}) supera el objetivo ({fmtDur(TIEMPO_OBJETIVO_MIN)}).</p>
            )}
            {timeErrs.length > 0 && (
              <p className="text-[11px] text-red-300 flex items-center gap-1.5 mt-1"><AlertTriangle className="w-3 h-3"/>{timeErrs.join(" ")}</p>
            )}
          </Section>

          {/* Georreferenciación */}
          <Section title="Georreferenciación">
            <Grid cols={3}>
              <F label="GPS salida (lat)"><input type="number" step="any" value={f.gpsSalidaLat} onChange={e => set("gpsSalidaLat", e.target.value)} placeholder="4.6543" className="input-base"/></F>
              <F label="GPS salida (lng)"><input type="number" step="any" value={f.gpsSalidaLng} onChange={e => set("gpsSalidaLng", e.target.value)} placeholder="-74.0891" className="input-base"/></F>
              <F label="Distancia (km)"><input type="number" step="any" min={0} value={f.distanciaKm} onChange={e => set("distanciaKm", e.target.value)} className="input-base"/></F>
              <F label="GPS llegada (lat)"><input type="number" step="any" value={f.gpsLlegadaLat} onChange={e => set("gpsLlegadaLat", e.target.value)} className="input-base"/></F>
              <F label="GPS llegada (lng)"><input type="number" step="any" value={f.gpsLlegadaLng} onChange={e => set("gpsLlegadaLng", e.target.value)} className="input-base"/></F>
              <F label="Ruta"><input value={f.ruta} onChange={e => set("ruta", e.target.value)} placeholder="Descripción de la ruta" className="input-base"/></F>
            </Grid>
            {gmaps && (
              <a href={gmaps} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/>Ver punto de salida en Google Maps</a>
            )}
          </Section>

          {/* Observaciones */}
          <Section title="Observaciones">
            <textarea value={f.observaciones} onChange={e => set("observaciones", e.target.value)} rows={2} className="input-base resize-none" placeholder="Observaciones sanitarias, logísticas u operativas..."/>
          </Section>
        </div>

        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span>{error}</span>
          </div>
        )}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-[11px] text-[#475569] flex items-center gap-1.5">
            {retraso ? <><AlertTriangle className="w-3.5 h-3.5 text-red-400"/>Con retraso logístico</> : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/>Dentro de objetivo</>}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs" disabled={saving}>Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary text-xs flex items-center gap-2">
              {saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
              {saving ? "Guardando..." : (item ? "Guardar cambios" : "Registrar descarte")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares del formulario ───────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}
function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 4 ? "md:grid-cols-4" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return <div className={`grid grid-cols-1 ${c} gap-3`}>{children}</div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8] font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Sel({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: readonly string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input-base">
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Calc({ label, v, alert }: { label: string; v: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-center ${alert ? "border-red-500/40 bg-red-500/5" : "border-[#1E2D4A] bg-[#0A111F]"}`}>
      <p className={`font-mono text-sm font-bold ${alert ? "text-red-300" : "text-white"}`}>{v}</p>
      <p className="text-[9px] text-[#64748B] uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Checklist de trazabilidad (por descarte)
// ═══════════════════════════════════════════════════════════════════════════════
function ChecklistModal({ descarte, onClose, onSaved }: {
  descarte: DescarteAve;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateD = useUpdateDescarte();
  const [ans, setAns] = useState<ChecklistRespuestas>(() => {
    try { return descarte.checklistJSON ? JSON.parse(descarte.checklistJSON) : {}; } catch { return {}; }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setItem = (id: string, patch: Partial<ChecklistRespuesta>) =>
    setAns(prev => ({ ...prev, [id]: { estado: "", ...prev[id], ...patch } }));

  const stats = useMemo(() => {
    let cumple = 0, noCumple = 0, noAplica = 0, respondidos = 0, noCumpleSinObs = 0;
    for (const cat of CHECKLIST_DESCARTE) for (const it of cat.items) {
      const r = ans[it.id]; if (!r || !r.estado) continue;
      respondidos++;
      if (r.estado === "Cumple") cumple++;
      else if (r.estado === "No cumple") { noCumple++; if (!r.obs?.trim()) noCumpleSinObs++; }
      else if (r.estado === "No aplica") noAplica++;
    }
    const base = cumple + noCumple;
    return {
      respondidos, total: CHECKLIST_TOTAL_ITEMS, cumple, noCumple, noAplica,
      pendientes: CHECKLIST_TOTAL_ITEMS - respondidos,
      pct: base > 0 ? Math.round((cumple / base) * 100) : 0, noCumpleSinObs,
    };
  }, [ans]);

  const estColor = (e: string) =>
    e === "Cumple" ? "#10B981" : e === "No cumple" ? "#EF4444" : e === "No aplica" ? "#94A3B8" : "#1E2D4A";

  async function persist(cerrar: boolean) {
    setError(null);
    if (cerrar) {
      if (stats.pendientes > 0) return setError(`Faltan ${stats.pendientes} ítem(s) por responder para cerrar el proceso.`);
      if (stats.noCumpleSinObs > 0) return setError(`Hay ${stats.noCumpleSinObs} ítem(s) "No cumple" sin observación.`);
    }
    setSaving(true);
    try {
      await updateD.mutateAsync({ id: descarte.id, patch: { checklistJSON: JSON.stringify(ans), ...(cerrar ? { estado: "Cerrado" } : {}) } });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error al guardar el checklist");
    } finally {
      setSaving(false);
    }
  }

  const avancePct = stats.total ? Math.round((stats.respondidos / stats.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Checklist de trazabilidad</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{descarte.granjaNombre} · Galpón {descarte.galpon} · Lote {descarte.lote}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="px-6 pt-3">
          <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1">
            <span>Avance {stats.respondidos}/{stats.total} · Cumplimiento <span className="font-bold text-white">{stats.pct}%</span></span>
            <span>{stats.cumple} cumple · {stats.noCumple} no cumple · {stats.noAplica} N/A</span>
          </div>
          <div className="h-1.5 bg-[#1A2540] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${avancePct}%`, background: "#10B981" }}/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {CHECKLIST_DESCARTE.map(cat => (
            <div key={cat.categoria}>
              <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">{cat.categoria}</p>
              <div className="space-y-2">
                {cat.items.map(it => {
                  const r = ans[it.id] ?? { estado: "" as const };
                  return (
                    <div key={it.id} className="rounded-lg border border-[#1E2D4A] bg-[#0A111F] p-3">
                      <p className="text-sm text-white mb-2">{it.pregunta}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {CHECKLIST_ESTADOS.map(e => {
                          const active = r.estado === e;
                          const c = estColor(e);
                          return (
                            <button key={e} type="button" onClick={() => setItem(it.id, { estado: e })}
                              className="text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors"
                              style={{ background: active ? `${c}22` : "transparent", color: active ? c : "#94A3B8", borderColor: active ? `${c}66` : "#2A3F6A" }}>
                              {e}
                            </button>
                          );
                        })}
                        {r.estado === "No cumple" && (
                          <select value={r.criticidad ?? "Medio"} onChange={e => setItem(it.id, { criticidad: e.target.value })}
                            className="text-[11px] px-2 py-1 rounded-lg bg-[#0D1526] border border-[#2A3F6A] text-white ml-auto">
                            {NIVEL_RIESGO_DESCARTE.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        )}
                      </div>
                      {r.estado && (
                        <input value={r.obs ?? ""} onChange={e => setItem(it.id, { obs: e.target.value })}
                          placeholder={r.estado === "No cumple" ? "Observación (obligatoria para cerrar)…" : "Observación (opcional)…"}
                          className="input-base mt-2 text-xs"/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span>{error}</span>
          </div>
        )}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[#1E2D4A]">
          <p className="text-[11px] text-[#475569]">
            {descarte.estado === "Cerrado" ? "Proceso cerrado" : `${stats.pendientes} pendiente(s)`}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs" disabled={saving}>Cancelar</button>
            <button onClick={() => persist(false)} disabled={saving} className="btn-secondary text-xs flex items-center gap-2">
              {saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}Guardar avance
            </button>
            <button onClick={() => persist(true)} disabled={saving} className="btn-primary text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3"/>Guardar y cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Miniatura de evidencia con degradación si la imagen no carga ────────────
function EvidThumb({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className={`flex items-center justify-center bg-[#0D1526] border border-[#2A3F6A] ${className ?? ""}`}><ImageIcon className="w-6 h-6 text-[#475569]"/></div>;
  return <img src={imgSrc(url)} alt={alt} className={className} loading="lazy" onError={() => setErr(true)}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL · Evidencias del descarte (fotos/PDF/Excel/enlaces · base64)
// ═══════════════════════════════════════════════════════════════════════════════
function EvidenciasModal({ descarte, onClose }: { descarte: DescarteAve; onClose: () => void }) {
  const evidQ = useEvidenciasDescarte(descarte.id);
  const evid = evidQ.data ?? [];
  const createEv = useCreateEvidenciaDescarte();
  const removeEv = useDeleteEvidenciaDescarte();

  const [modo, setModo] = useState<"subir" | "enlace">("subir");
  const [tipo, setTipo] = useState<string>("Foto");
  const [categoria, setCategoria] = useState<string>(EVIDENCIA_CATEGORIAS[0]);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(file?: File) {
    if (!file) return;
    setErr(null); setProcesando(true);
    try {
      const { dataUrl, size: s, tipo: t } = await procesarArchivo(file);
      setUrl(dataUrl); setSize(s); setTipo(t); setPreview(dataUrl.startsWith("data:image/") ? dataUrl : null);
      setNombre(prev => prev || file.name);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo procesar el archivo"); setPreview(null); setUrl(""); setSize(0);
    } finally { setProcesando(false); }
  }

  async function agregar() {
    setErr(null);
    if (!nombre.trim()) return setErr("El nombre es obligatorio.");
    if (!url.trim()) return setErr(modo === "subir" ? "Selecciona un archivo." : "La URL es obligatoria.");
    setSaving(true);
    try {
      await createEv.mutateAsync({ descarteId: descarte.id, tipo, nombre: nombre.trim(), url: url.trim(), size, categoria });
      setNombre(""); setUrl(""); setSize(0); setPreview(null); if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error al guardar la evidencia");
    } finally { setSaving(false); }
  }

  const cambiarModo = (m: "subir" | "enlace") => { setModo(m); setErr(null); setPreview(null); setUrl(""); setSize(0); };
  const TAB = (m: "subir" | "enlace", label: string, Icon: any) => (
    <button type="button" onClick={() => cambiarModo(m)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${modo === m ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-[#0D1526] border-[#1E2D4A] text-[#94A3B8] hover:text-white"}`}>
      <Icon className="w-3.5 h-3.5"/> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-card">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div>
            <h2 className="font-display font-bold text-white text-lg">Evidencias del descarte</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{descarte.granjaNombre} · Galpón {descarte.galpon} · Lote {descarte.lote} · {evid.length} archivo(s)</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Cargar evidencia */}
          <div className="rounded-xl border border-[#1E2D4A] bg-[#0A111F] p-3 space-y-3">
            <div className="flex gap-2">
              {TAB("subir", "Subir archivo", UploadCloud)}
              {TAB("enlace", "Pegar enlace", Link2)}
            </div>
            {modo === "subir" ? (
              <div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.xlsx,.xls,.csv,video/*" className="hidden" onChange={e => onPick(e.target.files?.[0])}/>
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="Vista previa" className="w-full max-h-56 object-contain rounded-lg border border-[#1E2D4A] bg-[#0A111F]"/>
                    <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 text-[11px] bg-[#0D1526]/90 border border-[#1E2D4A] rounded-md px-2 py-1 text-cyan-300">Cambiar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={procesando} className="w-full border-2 border-dashed border-[#1E2D4A] hover:border-cyan-500/50 rounded-lg py-6 flex flex-col items-center gap-2 text-[#94A3B8] hover:text-cyan-300 transition-colors">
                    {procesando ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6"/>}
                    <span className="text-sm font-medium">{procesando ? "Procesando…" : "Haz clic para seleccionar un archivo"}</span>
                    <span className="text-[10px]">Imágenes (se optimizan), PDF, Excel · máx. 10 MB</span>
                  </button>
                )}
                {url && !procesando && <p className="text-[10px] text-emerald-400 mt-1.5">Archivo listo · {tipo} · {fmtSize(size)}</p>}
              </div>
            ) : (
              <div>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="input-base"/>
                <p className="text-[10px] text-[#475569] mt-1">Para videos o archivos grandes, pega un enlace público.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre *" className="input-base"/>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-base">
                {EVIDENCIA_CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-base">
                {EVIDENCIA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {err && <p className="text-[11px] text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/>{err}</p>}
            <div className="flex justify-end">
              <button onClick={agregar} disabled={saving || procesando} className="btn-primary text-xs bg-cyan-500 hover:bg-cyan-600 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>}Agregar evidencia
              </button>
            </div>
          </div>

          {/* Galería */}
          {evidQ.isLoading ? (
            <div className="py-8 flex items-center justify-center text-[#475569]"><Loader2 className="w-5 h-5 animate-spin"/></div>
          ) : evid.length === 0 ? (
            <div className="py-10 text-center"><FolderOpen className="w-9 h-9 text-[#1E2D4A] mx-auto mb-3"/><p className="text-white text-sm font-semibold">Sin evidencias</p><p className="text-[#475569] text-xs">Agrega la primera foto o documento.</p></div>
          ) : (
            <div className={`grid gap-3 ${evid.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {evid.map((e: EvidenciaDescarte) => {
                const img = esImagen(e);
                const h = evid.length === 1 ? "h-72" : "h-52";
                return (
                  <div key={e.id} className="bg-[#1A2540] border border-[#2A3F6A] rounded-lg overflow-hidden flex flex-col">
                    {img ? (
                      <button onClick={() => setLightbox(e.url)} className={`relative group block w-full bg-[#0A111F] ${h}`} title="Ampliar">
                        <EvidThumb url={e.url} alt={e.nombre} className={`w-full object-contain ${h}`}/>
                        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-3 h-3"/>Ampliar</span>
                      </button>
                    ) : (
                      <div className={`flex items-center justify-center bg-[#0D1526] ${h}`}><FolderOpen className="w-12 h-12 text-[#475569]"/></div>
                    )}
                    <div className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{e.nombre}</p>
                        <p className="text-[10px] text-[#94A3B8] truncate">{e.tipo} · {e.categoria ?? "—"} · {fmtSize(e.size)}</p>
                      </div>
                      {img ? (
                        <button onClick={() => setLightbox(e.url)} className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Ver"><Maximize2 className="w-4 h-4"/></button>
                      ) : /^data:/i.test(e.url) ? (
                        <a href={e.url} download={e.nombre} className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Descargar"><Download className="w-4 h-4"/></a>
                      ) : (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-cyan-500/10 text-[#94A3B8] hover:text-cyan-400 shrink-0" title="Abrir"><ExternalLink className="w-4 h-4"/></a>
                      )}
                      <button onClick={async () => { if (confirm(`¿Eliminar "${e.nombre}"?`)) { try { await removeEv.mutateAsync(e.id); } catch (er:any) { alert("Error: " + (er?.response?.data?.message ?? er?.message)); } } }} className="p-1.5 rounded hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 shrink-0" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end px-6 py-3 border-t border-[#1E2D4A]">
          <button onClick={onClose} className="btn-ghost text-xs">Cerrar</button>
        </footer>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}><X className="w-7 h-7"/></button>
          <img src={imgSrc(lightbox)} alt="Evidencia" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" onClick={ev => ev.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}
