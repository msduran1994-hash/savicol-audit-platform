"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  "Cronograma de Auditoría 2026",
  "KPIs de Control Interno",
  "Módulo Granjas · Rutas · CEDIS",
  "Dashboard Ejecutivo",
];

export default function LoginPage() {
  const router = useRouter();
  const { setMfaPending, setUser } = useAuthStore();
  const [showPwd, setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState("");

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
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#F4F6FA" }}>

      {/* ── Left panel: Corporate Branding ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between relative overflow-hidden"
           style={{ background: "linear-gradient(160deg, #1A3A8F 0%, #122970 60%, #0D1F5C 100%)" }}>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Red accent line top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "#C41230" }} />

        {/* Floating geometric shapes */}
        <div className="absolute top-20 right-12 w-64 h-64 rounded-full animate-float"
             style={{ background: "rgba(196,18,48,0.08)", filter: "blur(40px)" }} />
        <div className="absolute bottom-32 left-8 w-48 h-48 rounded-full animate-float-slow"
             style={{ background: "rgba(255,255,255,0.05)", filter: "blur(30px)" }} />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full animate-float-delay"
             style={{ background: "rgba(196,18,48,0.05)", filter: "blur(20px)" }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-4">
            {/* Shield logo mark */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                   style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                   style={{ background: "#C41230" }}>
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">SAVICOL</h1>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase mt-0.5"
                 style={{ color: "rgba(255,255,255,0.55)" }}>Audit Platform</p>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-10 pb-4 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
                 style={{ background: "rgba(196,18,48,0.20)", color: "#FCA5A5", border: "1px solid rgba(196,18,48,0.30)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Control Interno · Auditoría · Riesgos
            </div>
            <h2 className="text-4xl font-black text-white leading-[1.15] tracking-tight">
              Plataforma de<br />
              <span style={{ color: "#FCA5A5" }}>Auditoría</span><br />
              Corporativa
            </h2>
            <p style={{ color: "rgba(255,255,255,0.60)" }}
               className="text-base leading-relaxed max-w-xs">
              Sistema integrado para auditoría, control interno,
              cumplimiento, riesgos y gestión corporativa.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                     style={{ background: "rgba(196,18,48,0.20)", border: "1px solid rgba(196,18,48,0.35)" }}>
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#FCA5A5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 p-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "2026", label: "Año activo" },
              { value: "100%", label: "Trazabilidad" },
              { value: "COSO", label: "Framework" },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                   style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</p>
              </div>
            ))}
          </div>
          {/* Red bottom bar */}
          <div className="mt-6 h-px" style={{ background: "rgba(196,18,48,0.40)" }} />
          <p className="mt-3 text-xs text-center font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} Savicol · Sistema de Auditoría Empresarial
          </p>
        </div>
      </div>

      {/* ── Right panel: Login form ─────────────────────────────── */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 lg:p-12"
           style={{ background: "#F4F6FA" }}>
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "#1A3A8F" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-lg" style={{ color: "#1A3A8F" }}>SAVICOL</p>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C41230" }}>Audit Platform</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8"
               style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(26,58,143,0.09)" }}>

            {/* Red top accent */}
            <div className="h-1 -mx-8 -mt-8 mb-8 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #1A3A8F, #C41230)" }} />

            <div className="mb-7">
              <h2 className="text-2xl font-black" style={{ color: "#0F172A" }}>Iniciar Sesión</h2>
              <p className="text-sm mt-1.5" style={{ color: "#64748B" }}>
                Accede con tus credenciales corporativas
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "#475569" }}>
                  Correo corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@savicol.com.co"
                    className={cn(
                      "input-base pl-10",
                      errors.email && "!border-red-400 focus:!border-red-500 focus:!shadow-none"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "#475569" }}>
                    Contraseña
                  </label>
                  <a href="/olvide" className="text-xs font-medium transition-colors hover:underline"
                     style={{ color: "#1A3A8F" }}>
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input
                    {...register("password")}
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn("input-base pl-10 pr-10", errors.password && "!border-red-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#94A3B8" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
                     style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#DC2626" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-sm font-bold rounded-xl text-white transition-all relative overflow-hidden
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #1A3A8F, #122970)" }}
              >
                <span className={cn("transition-opacity", isLoading && "opacity-0")}>
                  Ingresar a la plataforma
                </span>
                {isLoading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                )}
              </button>

              {/* MFA note */}
              <div className="flex items-center justify-center gap-1.5 text-xs"
                   style={{ color: "#94A3B8" }}>
                <Lock className="w-3 h-3" />
                <span>Autenticación de dos factores activa</span>
              </div>
            </form>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "#94A3B8" }}>
            © {new Date().getFullYear()} Savicol · Audit Platform · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
