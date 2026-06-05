"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// /olvide · Solicitar restablecimiento de contraseña
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import Link from "next/link";
import { Shield, Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { requestPasswordReset } from "@/hooks/useInvitations";

export default function OlvidePage() {
  const [email, setEmail]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent]             = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!email.includes("@")) { setSubmitError("Email inválido"); return; }
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? e?.message ?? "Error al solicitar el restablecimiento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Shield className="w-7 h-7 text-[#0A111F]"/>
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-xl leading-none">Savicol Audit</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">Recuperar acceso</p>
          </div>
        </div>

        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6 shadow-2xl">
          {sent ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400"/>
              </div>
              <p className="text-white font-semibold mb-2">Solicitud enviada</p>
              <p className="text-[#94A3B8] text-sm mb-6">
                Si <span className="text-amber-400">{email}</span> está registrado en Savicol, recibirás un correo con instrucciones para restablecer tu contraseña.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-sm text-white hover:bg-[#2A3F6A]">
                <ArrowLeft className="w-3.5 h-3.5"/>Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-white text-lg mb-2">¿Olvidaste tu contraseña?</h2>
              <p className="text-[#94A3B8] text-sm mb-6">
                Ingresa tu correo corporativo. Te enviaremos un enlace para crear una nueva contraseña (válido por 1 hora).
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"/>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full pl-10 pr-3 py-2.5 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40"
                      placeholder="tu@savicol.com"/>
                  </div>
                </div>

                {submitError && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
                    <span>{submitError}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#0A111F] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                  {submitting ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs text-[#94A3B8] hover:text-white inline-flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3"/>Volver al login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
