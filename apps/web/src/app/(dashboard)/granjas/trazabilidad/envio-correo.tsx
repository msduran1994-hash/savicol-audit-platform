"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// GRANJAS · Trazabilidad · Envío de informe por correo
// Reutiliza el EmailService del backend (Brevo/Resend/SMTP). El PDF ya viene
// generado (base64) desde el modal de informe. Sin almacenar contenido del correo.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from "react";
import { useEnviarInforme, useEnviosInforme } from "@/hooks/useEnvioInforme";
import { fmtSize } from "@/lib/evidencias-upload";
import {
  Mail, Send, X, Loader2, Paperclip, Trash2, CheckCircle2, AlertTriangle, History,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseEmails = (s: string): string[] => (s || "").split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
const fmtFechaHora = (iso?: string) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }); };

export function EnvioCorreoModal({ tipo, filename, pdfBase64, asuntoDefault, mensajeDefault, onClose }: {
  tipo: "General" | "Ejecutivo"; filename: string; pdfBase64: string;
  asuntoDefault: string; mensajeDefault: string; onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [cco, setCco] = useState("");
  const [asunto, setAsunto] = useState(asuntoDefault);
  const [mensaje, setMensaje] = useState(mensajeDefault);
  const [adjuntos, setAdjuntos] = useState<Array<{ name: string; content: string; type: string; size: number }>>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ ok: boolean; estado: string; mode: string; error?: string } | null>(null);
  const [histOpen, setHistOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const enviar = useEnviarInforme();
  const histQ = useEnviosInforme(histOpen);

  const invalidos = useMemo(() => [...parseEmails(to), ...parseEmails(cc), ...parseEmails(cco)].filter(e => !EMAIL_RE.test(e)), [to, cc, cco]);

  const onPickAdjunto = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Cada adjunto debe ser ≤ 8 MB."); return; }
    setError("");
    const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(new Error("No se pudo leer el archivo")); r.readAsDataURL(file); });
    const content = dataUrl.split(",")[1] ?? "";
    setAdjuntos(p => [...p, { name: file.name, content, type: file.type || "application/octet-stream", size: file.size }]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleEnviar = async () => {
    const dest = parseEmails(to);
    if (!dest.length) { setError("Indica al menos un destinatario principal."); return; }
    if (invalidos.length) { setError("Corrige los correos con formato inválido: " + invalidos.join(", ")); return; }
    if (!asunto.trim()) { setError("El asunto es obligatorio."); return; }
    if (!pdfBase64) { setError("No se recibió el PDF del informe."); return; }
    setError(""); setResult(null);
    try {
      const r = await enviar.mutateAsync({
        tipo, destinatarios: dest, cc: parseEmails(cc), cco: parseEmails(cco),
        asunto: asunto.trim(), mensaje, pdfBase64, filename,
        adjuntos: adjuntos.map(a => ({ name: a.name, content: a.content, type: a.type })),
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "No se pudo enviar el correo.");
    }
  };

  const IN = "w-full bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
  const LBL = "text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A]">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-400" /><h3 className="font-display font-bold text-white text-sm">Enviar Informe {tipo} por correo</h3></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setHistOpen(o => !o)} className="text-[11px] text-[#94A3B8] hover:text-white flex items-center gap-1"><History className="w-3.5 h-3.5" />Historial</button>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
          {result ? (
            <div className={`px-4 py-4 rounded-lg border ${result.ok && result.mode !== "noop" ? "bg-emerald-500/10 border-emerald-500/30" : result.mode === "noop" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                {result.ok && result.mode !== "noop" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                <p className="text-sm font-bold text-white">{result.mode === "noop" ? "Registrado (sin envío real)" : result.ok ? "Correo enviado" : "No se pudo enviar"}</p>
              </div>
              <p className="text-xs text-[#94A3B8]">
                {result.mode === "noop"
                  ? "El proveedor de correo no está configurado en el servidor (modo NO-OP): el envío quedó registrado en el historial pero no salió. Configura BREVO/RESEND/SMTP en Railway para enviar de verdad."
                  : result.ok ? `Estado: ${result.estado}. Las respuestas llegarán al correo con el que iniciaste sesión.` : (result.error || "Revisa las direcciones e inténtalo de nuevo.")}
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setResult(null)} className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white">Enviar otro</button>
                <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold">Cerrar</button>
              </div>
            </div>
          ) : histOpen ? (
            <div>
              <p className="text-[11px] text-[#94A3B8] mb-2">Últimos envíos (solo estado; no se almacena el contenido del correo):</p>
              {histQ.isLoading ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#475569]" /></div>
                : (histQ.data ?? []).length === 0 ? <p className="text-xs text-[#475569] py-6 text-center">Sin envíos registrados.</p>
                : (
                  <div className="space-y-1.5">
                    {(histQ.data ?? []).map(e => {
                      const c = e.estado === "Enviado" ? "#10B981" : e.estado === "NO-OP" ? "#F59E0B" : "#EF4444";
                      return (
                        <div key={e.id} className="bg-[#0A111F] border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white truncate">Informe {e.tipo} · {e.destinatarios}</span>
                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>{e.estado}</span>
                          </div>
                          <p className="text-[10px] text-[#64748B] mt-0.5">{fmtFechaHora(e.createdAt)} · {e.remitente || "—"}{e.cc ? ` · CC: ${e.cc}` : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              <div className="flex justify-end mt-3"><button onClick={() => setHistOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white">Volver</button></div>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-[#94A3B8]">
                Se adjunta automáticamente <strong className="text-emerald-300">{filename}</strong>. El remitente es la cuenta verificada de Savicol; las <strong>respuestas</strong> llegan al correo con el que iniciaste sesión.
              </div>
              <div><label className={LBL}>Destinatario(s) principal(es) *</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="correo1@dominio.com, correo2@dominio.com" className={IN} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className={LBL}>Copia (CC)</label><input value={cc} onChange={e => setCc(e.target.value)} placeholder="opcional" className={IN} /></div>
                <div><label className={LBL}>Copia oculta (CCO)</label><input value={cco} onChange={e => setCco(e.target.value)} placeholder="opcional" className={IN} /></div>
              </div>
              {invalidos.length > 0 && <p className="text-[11px] text-amber-400">Formato inválido: {invalidos.join(", ")}</p>}
              <div><label className={LBL}>Asunto *</label><input value={asunto} onChange={e => setAsunto(e.target.value)} className={IN} /></div>
              <div><label className={LBL}>Mensaje</label><textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={5} className={IN + " resize-none"} /></div>

              <div>
                <label className={LBL}>Adjuntos adicionales (opcional)</label>
                <input ref={fileRef} type="file" className="hidden" onChange={e => onPickAdjunto(e.target.files?.[0])} />
                <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs bg-[#1A2540] text-white flex items-center gap-1.5 hover:bg-[#22304d]"><Paperclip className="w-3.5 h-3.5" />Adjuntar archivo</button>
                {adjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {adjuntos.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[#0A111F] border border-[#1E2D4A] rounded px-2.5 py-1.5 text-[11px]">
                        <Paperclip className="w-3 h-3 text-[#64748B]" /><span className="text-white flex-1 truncate">{a.name}</span>
                        <span className="text-[#64748B]">{fmtSize(a.size)}</span>
                        <button onClick={() => setAdjuntos(p => p.filter((_, idx) => idx !== i))} className="text-[#94A3B8] hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</div>}
            </>
          )}
        </div>

        {!result && !histOpen && (
          <footer className="shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E2D4A]">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[#94A3B8] hover:text-white" disabled={enviar.isPending}>Cancelar</button>
            <button onClick={handleEnviar} disabled={enviar.isPending || !to.trim()} className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0A111F] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
              {enviar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}{enviar.isPending ? "Enviando…" : "Enviar correo"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
