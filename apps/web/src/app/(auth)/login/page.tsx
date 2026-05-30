"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setMfaPending, setUser } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Credenciales incorrectas");
      }
      const body = await res.json();
      if (body.mfaRequired) {
        setMfaPending(body.tempToken);
        router.push("/mfa");
      } else if (body.user && body.accessToken) {
        // Login directo sin MFA: guardar sesión y redirigir
        setUser(body.user, body.accessToken);
        router.push("/");
      } else {
        throw new Error("Respuesta del servidor inválida");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070B14] overflow-hidden">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#2A3F6A 1px, transparent 1px), linear-gradient(90deg, #2A3F6A 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-glow-blue">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-lg leading-none">Audit Platform</p>
            <p className="text-xs text-amber-400 font-medium tracking-widest uppercase">Savicol</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-blue-400">
              Control Interno · Auditoría · Analítica
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.1] text-white">
              Plataforma de<br />
              <span className="text-gradient-gold">Auditoría</span><br />
              Empresarial
            </h1>
          </div>
          <p className="text-[#94A3B8] text-lg leading-relaxed max-w-sm">
            Sistema integrado de auditoría, control interno, seguimiento operativo
            y análisis ejecutivo para Savicol.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {["Dashboard Ejecutivo", "Cronograma 2026", "KPIs Interactivos", "Trazabilidad"].map(f => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-[#1A2540] text-[#94A3B8] border border-[#1E2D4A]">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: "6", label: "Auditores" },
            { value: "2026", label: "Año Activo" },
            { value: "100%", label: "Trazabilidad" },
          ].map(({ value, label }) => (
            <div key={label} className="card-base text-center">
              <p className="font-display text-2xl font-bold text-gradient-blue">{value}</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-white">Audit Platform</p>
              <p className="text-xs text-amber-400 tracking-widest uppercase">Savicol</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-white">Iniciar Sesión</h2>
            <p className="text-[#94A3B8] mt-2 text-sm">
              Accede con tus credenciales corporativas
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#94A3B8]">Correo corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@savicol.com"
                  className={cn("input-base pl-10", errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#94A3B8]">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  {...register("password")}
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn("input-base pl-10 pr-10", errors.password && "border-red-500")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base relative overflow-hidden group"
            >
              <span className={cn("transition-opacity", isLoading && "opacity-0")}>
                Iniciar Sesión
              </span>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              )}
            </button>

            {/* MFA note */}
            <p className="text-center text-xs text-[#475569]">
              <Lock className="inline w-3 h-3 mr-1" />
              Autenticación multifactor (MFA) requerida para todos los roles
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1E2D4A] text-center text-xs text-[#475569]">
            © {new Date().getFullYear()} Savicol · Audit Platform v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
