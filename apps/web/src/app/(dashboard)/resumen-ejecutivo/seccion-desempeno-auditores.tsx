"use client";
import { useState, useMemo } from "react";
import { useGranjas } from "@/hooks/useGranjas";
import {
  useActividadesAuditor, useCreateActividad, useUpdateActividad, useDeleteActividad,
  actividadVacia, calcularDesempeno, AUDITORES, AMBITOS, ESTADOS_ACT,
  type ActividadAuditor, type ActividadItem,
} from "@/hooks/useAuditorActividades";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Plus, Search, Trash2, X, Loader2, Pencil, AlertTriangle, Target,
  TrendingUp, Trophy, Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sección de Desempeño de Auditores (consolidada en Resumen Ejecutivo) ──────
// Panel de desempeño (tarjetas + gráfico + desglose por ámbito) + registro de
// actividades (modal). Reutiliza el hook useAuditorActividades. Sin tocar backend.

function semColor(p: number) { return p >= 90 ? "#22C55E" : p >= 70 ? "#F59E0B" : "#EF4444"; }
function semLabel(p: number) { return p >= 90 ? "Óptimo" : p >= 70 ? "Aceptable" : "Crítico"; }
const labelAmbito = (id: string) => AMBITOS.find(a => a.id === id)?.label ?? id;
const labelEstado = (id: string) => ESTADOS_ACT.find(e => e.id === id)?.label ?? id;
const colorEstado = (id: string) => ESTADOS_ACT.find(e => e.id === id)?.color ?? "#64748B";

export function SeccionDesempenoAuditores() {
  const listaQ = useActividadesAuditor();
  const granjasQ = useGranjas();
  const crear = useCreateActividad();
  const actualizar = useUpdateActividad();
  const borrar = useDeleteActividad();

  const [search, setSearch] = useState("");
  const [fAuditor, setFAuditor] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActividadItem | null>(null);
  const [verTabla, setVerTabla] = useState(false);

  const items = listaQ.data ?? [];
  const granjas = granjasQ.data ?? [];
  const granjaContenedor = granjas[0]?.id ?? "";

  const desempeno = useMemo(() => calcularDesempeno(items), [items]);

  // Datos para el gráfico de cumplimiento por auditor (solo con actividad)
  const dataGrafico = useMemo(() =>
    desempeno.filter(d => d.total > 0).map(d => ({
      nombre: d.auditor.split(" ")[0],
      cumplimiento: d.cumplimiento,
      auditor: d.auditor,
    })), [desempeno]);

  // Totales por ámbito (todos los auditores)
  const totalesAmbito = useMemo(() => {
    const t = { granja: 0, ruta: 0, cedis: 0, mensual: 0 };
    items.forEach(it => { if (t[it.data.ambito] !== undefined) t[it.data.ambito] += 1; });
    return t;
  }, [items]);

  const totalActividades = items.length;
  const totalHallazgos = useMemo(() => items.reduce((a, it) => a + (Number(it.data.hallazgos) || 0), 0), [items]);
  const cumplimientoPromedio = useMemo(() => {
    const conAct = desempeno.filter(d => d.total > 0);
    return conAct.length ? Math.round(conAct.reduce((a, d) => a + d.cumplimiento, 0) / conAct.length) : 0;
  }, [desempeno]);

  const filtrados = useMemo(() => items.filter(it => {
    if (fAuditor && it.data.auditor !== fAuditor) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return it.data.auditor.toLowerCase().includes(q)
      || it.data.objetivo.toLowerCase().includes(q)
      || labelAmbito(it.data.ambito).toLowerCase().includes(q);
  }), [items, search, fAuditor]);

  async function handleDelete(it: ActividadItem) {
    if (!confirm(`¿Eliminar esta actividad de ${it.data.auditor}?`)) return;
    await borrar.mutateAsync(it.id);
  }

  return (
    <section className="bg-[#0A111F] border border-[#1E2D4A] rounded-2xl p-5 space-y-5">
      {/* Encabezado de la sección */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#4A7AFF1A", color: "#4A7AFF" }}>
          <Users2 className="w-4.5 h-4.5"/>
        </div>
        <div className="flex-1 min-w-[180px]">
          <h2 className="text-sm font-bold text-white">Desempeño de Auditores</h2>
          <p className="text-[11px] text-[#64748B]">Actividades realizadas y cumplimiento por auditor</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} disabled={!granjaContenedor}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold whitespace-nowrap disabled:opacity-50">
          <Plus className="w-3.5 h-3.5"/> Registrar actividad
        </button>
      </div>

      {listaQ.isLoading ? (
        <div className="flex items-center gap-2 text-[#94A3B8] text-sm p-6 justify-center"><Loader2 className="w-5 h-5 animate-spin"/> Cargando desempeño…</div>
      ) : totalActividades === 0 ? (
        <div className="text-center py-10 text-[#64748B] bg-[#0D1526] border border-dashed border-[#1E2D4A] rounded-xl">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-40"/>
          <p className="text-sm font-semibold text-white mb-1">Sin actividades registradas</p>
          <p className="text-xs">Usa "Registrar actividad" para empezar a medir el desempeño de los auditores.</p>
        </div>
      ) : (
        <>
        {/* KPIs de la sección */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
            <p className="text-2xl font-bold" style={{ color: semColor(cumplimientoPromedio) }}>{cumplimientoPromedio}%</p>
            <p className="text-[10px] text-[#64748B]">Cumplimiento promedio · {semLabel(cumplimientoPromedio)}</p>
          </div>
          <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
            <p className="text-2xl font-bold text-white">{totalActividades}</p>
            <p className="text-[10px] text-[#64748B]">Actividades registradas</p>
          </div>
          <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
            <p className="text-2xl font-bold text-amber-400">{totalHallazgos}</p>
            <p className="text-[10px] text-[#64748B]">Hallazgos detectados</p>
          </div>
          <div className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A]">
            <p className="text-2xl font-bold text-[#4A7AFF]">{desempeno.filter(d => d.total > 0).length}</p>
            <p className="text-[10px] text-[#64748B]">Auditores activos</p>
          </div>
        </div>

        {/* Gráfico de cumplimiento por auditor */}
        {dataGrafico.length > 0 && (
          <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400"/>
              <h3 className="text-sm font-bold text-white">% Cumplimiento por auditor</h3>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dataGrafico} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false}/>
                <XAxis dataKey="nombre" stroke="#94A3B8" fontSize={11}/>
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]}/>
                <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid #1E2D4A", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} cursor={{ fill: "#1E2D4A33" }}
                  formatter={(v: any) => [`${v}%`, "Cumplimiento"]}/>
                <Bar dataKey="cumplimiento" radius={[4, 4, 0, 0]}>
                  {dataGrafico.map((d, i) => <Cell key={i} fill={semColor(d.cumplimiento)}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tarjetas por auditor */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {desempeno.map(d => (
            <button key={d.auditor} onClick={() => { setFAuditor(fAuditor === d.auditor ? "" : d.auditor); setVerTabla(true); }}
              className={cn("bg-[#0D1526] border rounded-xl p-3 text-left transition-colors",
                fAuditor === d.auditor ? "border-emerald-500/60" : "border-[#1E2D4A] hover:border-[#2A3F6A]")}>
              <p className="text-xs font-bold text-white truncate">{d.auditor}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: semColor(d.cumplimiento) }}>{d.cumplimiento}%</p>
              <p className="text-[10px] text-[#64748B]">{d.total} act · {d.hallazgos} hall.</p>
              <div className="h-1 bg-[#1E2D4A] rounded-full overflow-hidden mt-1.5">
                <div className="h-full rounded-full" style={{ width: `${d.cumplimiento}%`, background: semColor(d.cumplimiento) }}/>
              </div>
              {/* Desglose por ámbito */}
              <div className="flex gap-1 mt-2 text-[8px] text-[#64748B]">
                <span title="Granja">G:{d.porAmbito.granja}</span>
                <span title="Ruta">R:{d.porAmbito.ruta}</span>
                <span title="CEDIS">C:{d.porAmbito.cedis}</span>
                <span title="Mensual">M:{d.porAmbito.mensual}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Desglose global por ámbito */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Granjas auditadas", val: totalesAmbito.granja },
            { label: "Rutas auditadas", val: totalesAmbito.ruta },
            { label: "CEDIS auditados", val: totalesAmbito.cedis },
            { label: "Actividades mensuales", val: totalesAmbito.mensual },
          ].map((a, i) => (
            <div key={i} className="bg-[#0D1526] rounded-xl p-3 border border-[#1E2D4A] text-center">
              <p className="text-xl font-bold text-white">{a.val}</p>
              <p className="text-[10px] text-[#64748B]">{a.label}</p>
            </div>
          ))}
        </div>

        {/* Toggle tabla detalle */}
        <div className="flex items-center justify-between">
          <button onClick={() => setVerTabla(v => !v)} className="text-xs text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5"/> {verTabla ? "Ocultar" : "Ver"} detalle de actividades ({totalActividades})
          </button>
          {fAuditor && <button onClick={() => setFAuditor("")} className="text-[11px] text-[#94A3B8] hover:text-white flex items-center gap-1"><X className="w-3 h-3"/> Quitar filtro: {fAuditor}</button>}
        </div>

        {verTabla && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por auditor, objetivo o ámbito…"
                  className="w-full bg-[#0D1526] border border-[#1E2D4A] rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"/>
              </div>
              <select value={fAuditor} onChange={e => setFAuditor(e.target.value)}
                className="bg-[#0D1526] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50">
                <option value="">Todos los auditores</option>
                {AUDITORES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#1E2D4A] text-[#94A3B8] text-xs">
                    <th className="text-left px-4 py-3 font-semibold">Auditor</th>
                    <th className="text-left px-4 py-3 font-semibold">Ámbito</th>
                    <th className="text-left px-4 py-3 font-semibold">Objetivo</th>
                    <th className="text-left px-4 py-3 font-semibold">Mes</th>
                    <th className="text-center px-4 py-3 font-semibold">Hallazgos</th>
                    <th className="text-center px-4 py-3 font-semibold">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(it => (
                    <tr key={it.id} className="border-b border-[#1E2D4A]/50 hover:bg-[#0A111F]/40">
                      <td className="px-4 py-3 text-white font-medium">{it.data.auditor}</td>
                      <td className="px-4 py-3 text-[#cbd5e1]">{labelAmbito(it.data.ambito)}</td>
                      <td className="px-4 py-3 text-[#cbd5e1]">{it.data.objetivo || "—"}</td>
                      <td className="px-4 py-3 text-[#94A3B8]">{it.data.mes}</td>
                      <td className="px-4 py-3 text-center text-amber-400 font-bold">{it.data.hallazgos}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${colorEstado(it.data.estado)}22`, color: colorEstado(it.data.estado) }}>
                          {labelEstado(it.data.estado)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setEditing(it); setModalOpen(true); }} title="Editar" className="p-1.5 text-[#64748B] hover:text-emerald-400"><Pencil className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(it)} title="Eliminar" className="p-1.5 text-[#64748B] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
      )}

      {modalOpen && (
        <ActividadModal
          item={editing}
          granjas={granjas}
          granjaContenedor={granjaContenedor}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onCreate={async (data, granjaId) => { await crear.mutateAsync({ data, granjaId }); setModalOpen(false); setEditing(null); }}
          onUpdate={async (id, data, granjaId) => { await actualizar.mutateAsync({ id, data, granjaId }); setModalOpen(false); setEditing(null); }}
          saving={crear.isPending || actualizar.isPending}
        />
      )}
    </section>
  );
}
// ═══ Modal de actividad de auditor ════════════════════════════════════════════
function ActividadModal({ item, granjas, granjaContenedor, onClose, onCreate, onUpdate, saving }: {
  item: ActividadItem | null;
  granjas: any[];
  granjaContenedor: string;
  onClose: () => void;
  onCreate: (data: ActividadAuditor, granjaId: string) => Promise<void>;
  onUpdate: (id: string, data: ActividadAuditor, granjaId: string) => Promise<void>;
  saving: boolean;
}) {
  const esEdicion = !!item;
  const [data, setData] = useState<ActividadAuditor>(() => item ? { ...item.data } : actividadVacia());
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ActividadAuditor>(k: K, v: ActividadAuditor[K]) { setData(d => ({ ...d, [k]: v })); }

  async function submit() {
    setError(null);
    if (!data.auditor) { setError("Selecciona un auditor"); return; }
    if (!data.mes) { setError("Indica el mes"); return; }
    try {
      if (esEdicion && item) await onUpdate(item.id, data, granjaContenedor);
      else await onCreate(data, granjaContenedor);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Error al guardar la actividad");
    }
  }

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-xs text-[#94A3B8] mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-lg">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <h2 className="font-display font-bold text-white text-lg">{esEdicion ? "Editar" : "Nueva"} Actividad</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5"/></button>
        </header>

        <div className="p-6 space-y-4">
          <div>
            <label className={LBL}>Auditor *</label>
            <select value={data.auditor} onChange={e => set("auditor", e.target.value)} className={IN}>
              <option value="">Seleccionar auditor…</option>
              {AUDITORES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Ámbito *</label>
              <select value={data.ambito} onChange={e => set("ambito", e.target.value as any)} className={IN}>
                {AMBITOS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>Estado *</label>
              <select value={data.estado} onChange={e => set("estado", e.target.value as any)} className={IN}>
                {ESTADOS_ACT.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LBL}>Objetivo (granja / ruta / CEDIS específico)</label>
            {data.ambito === "granja" && granjas.length ? (
              <select value={data.objetivo} onChange={e => set("objetivo", e.target.value)} className={IN}>
                <option value="">Seleccionar granja…</option>
                {granjas.map(g => <option key={g.id} value={g.nombre}>{g.nombre}</option>)}
              </select>
            ) : (
              <input value={data.objetivo} onChange={e => set("objetivo", e.target.value)} placeholder="Nombre del objetivo auditado" className={IN}/>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LBL}>Mes *</label>
              <input type="month" value={data.mes} onChange={e => set("mes", e.target.value)} className={IN}/>
            </div>
            <div>
              <label className={LBL}>Fecha</label>
              <input type="date" value={data.fecha} onChange={e => set("fecha", e.target.value)} className={IN}/>
            </div>
            <div>
              <label className={LBL}>Hallazgos</label>
              <input type="number" min={0} value={data.hallazgos} onChange={e => set("hallazgos", Math.max(0, parseInt(e.target.value) || 0))} className={IN}/>
            </div>
          </div>
          <div>
            <label className={LBL}>Observación</label>
            <textarea value={data.observacion} onChange={e => set("observacion", e.target.value)} rows={2} placeholder="Detalle de la actividad…" className={cn(IN, "resize-none")}/>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#1E2D4A]">
          <div className="text-[11px] text-[#64748B]">
            {error ? <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {error}</span> : "Obligatorios: Auditor, Ámbito, Estado y Mes"}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-white">Cancelar</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-sm font-bold flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
              {esEdicion ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
