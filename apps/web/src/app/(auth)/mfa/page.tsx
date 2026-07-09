"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import axios from "axios";
import toast from "react-hot-toast";

const schema = z.object({
  code: z.string().length(6, "El código debe tener 6 dígitos").regex(/^\d{6}$/, "Solo dígitos"),
});
type FormValues = z.infer<typeof schema>;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function MfaPage() {
  const router = useRouter();
  const { tempToken, setUser, setMfaPending } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const code = watch("code", "");

  const onSubmit = async (data: FormValues) => {
    if (!tempToken) { router.push("/login"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/mfa/verify`, {
        tempToken,
        code: data.code,
      }, { withCredentials: true });
      setUser(res.data.user, res.data.accessToken, res.data.refreshToken);
      setMfaPending(null);
      toast.success("Acceso verificado");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl p-8 shadow-card">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-2xl text-white mb-2">
              Verificación en dos pasos
            </h1>
            <p className="text-[#94A3B8] text-sm leading-relaxed">
              Ingresa el código de 6 dígitos generado por tu aplicación autenticadora
              <br />
              <span className="text-amber-400 font-medium">(Google Authenticator / Authy)</span>
            </p>
          </div>

          {/* Code input */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#94A3B8] tracking-wider uppercase">
                Código de verificación
              </label>
              <input
                {...register("code")}
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                className="w-full bg-[#1A2540] border border-[#2A3F6A] rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold text-white tracking-[0.5em] placeholder:text-[#475569] placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
              />
              {errors.code && (
                <p className="text-xs text-red-400">{errors.code.message}</p>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i < code.length ? "bg-amber-400 scale-125" : "bg-[#2A3F6A]"
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full h-12 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-[#070B14] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              ) : (
                "Verificar acceso"
              )}
            </button>
          </form>

          {/* Back */}
          <button
            onClick={() => { setMfaPending(null); router.push("/login"); }}
            className="mt-6 w-full flex items-center justify-center gap-2 text-[#64748B] hover:text-[#94A3B8] text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-[#475569] mt-4">
          El código es válido por 30 segundos · Plataforma de Auditoría Savicol
        </p>
      </div>
    </div>
  );
}
