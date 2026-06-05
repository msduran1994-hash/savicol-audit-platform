"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// /restablecer?token=... · Restablecer contraseña con token de email
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { validatePasswordResetToken, resetPasswordWithToken } from "@/hooks/useInvitations";

function RestablecerPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const token  = search.get("token") ?? "";

  const [loading, setLoading]               = useState(true);
  const [validation, setValidation]         = useState<{ email: string; name: string; expiresAt: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!token) { setValidationError("Falta el token en el enlace."); setLoading(false); return; }
      try {
        const v = await validatePasswordResetToken(token);
        if (cancel) return;
        setValidation(v);
      } catch (e: any) {
        if (cancel) return;
        setValidationError(e?.response?.data?.message ?? e?.message ?? "Token inválido");
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 8)     { setSubmitError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirmPwd) { setSubmitError("Las contraseñas no coinciden"); return; }

    setSubmitting(true);
    try {
      await resetPasswordWithToken({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? e?.message ?? "Error al restablecer la contraseña");
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
            <p className="text-xs text-[#94A3B8] mt-0.5">Restablecer contraseña</p>
          </div>
        </div>

        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-6 shadow-2xl">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4"/>
              <p className="text-[#94A3B8] text-sm">Validando enlace...</p>
            </div>
          ) : validationError ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400"/>
              </div>
              <p className="text-white font-semibold mb-2">Enlace inválido o expirado</p>
              <p className="text-[#94A3B8] text-sm mb-6">{validationError}</p>
              <Link href="/login" className="inline-block px-4 py-2 rounded-lg bg-[#1A2540] border border-[#2A3F6A] text-sm text-white hover:bg-[#2A3F6A]">
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : success ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400"/>
              </div>
              <p className="text-white font-semibold mb-2">¡Contraseña actualizada!</p>
              <p className="text-[#94A3B8] text-sm mb-2">Redirigiendo al login...</p>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 mx-auto"/>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs text-[#94A3B8] mb-1">Cuenta:</p>
                <div className="flex items-center gap-2 text-white text-sm">
                  <Mail className="w-3.5 h-3.5 text-amber-400"/>
                  {validation?.email}
                </div>
                {validation?.expiresAt && (
                  <p className="text-[10px] text-[#475569] mt-2">
                    Este enlace expira el <span className="text-white">{new Date(validation.expiresAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </p>
                )}
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"/>
                    <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40"
                      placeholder="Mínimo 8 caracteres" minLength={8}/>
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white">
                      {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#94A3B8] block mb-1.5">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"/>
                    <input type={showPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#0A111F] border border-[#1E2D4A] rounded-lg text-sm text-white placeholder:text-[#475569] focus:outline-none focus:border-amber-500/40"
                      placeholder="Repite la nueva contraseña" minLength={8}/>
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
                  {submitting ? "Actualizando..." : "Guardar nueva contraseña"}
                </button>

                <p className="text-[10px] text-[#475569] text-center pt-2">
                  Al cambiar tu contraseña, todas las sesiones activas serán cerradas.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070B14] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-400"/></div>}>
      <RestablecerPageContent/>
    </Suspense>
  );
}
