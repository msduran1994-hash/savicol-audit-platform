"use client";

/*
 * MobileLogin.tsx — Login móvil nativo (Fase 2)
 * Ubicación sugerida: apps/web/src/components/auth/MobileLogin.tsx
 * --------------------------------------------------------------------------
 * - Reutiliza tu hook useLogin() => MFA, useAuthStore y toast quedan INTACTOS.
 * - Splash corporativo (una vez por sesión).
 * - "Recordar sesión": precarga el correo en el próximo ingreso.
 * - "Recuperar contraseña": hoja inferior que llama a /auth/forgot-password.
 *   ⚠ Confirma que ese endpoint existe en tu API NestJS; si tiene otro nombre,
 *   cámbialo en RECOVER_PATH. La UI no revela si el correo existe (buena práctica).
 * - Mobile-first full-screen. No se usa en desktop (lo decide page.tsx).
 */

import { useEffect, useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import SplashScreen from "./SplashScreen";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim();
const RECOVER_PATH = "/api/v1/auth/forgot-password";
const REMEMBER_KEY = "sav_remember_email";
const SPLASH_KEY = "sav_splash_seen";
const VERSION = "v1.0.0";

export default function MobileLogin({ logoSrc = "/favicon.svg" }: { logoSrc?: string }) {
  const login = useLogin();

  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverSent, setRecoverSent] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // Splash solo una vez por sesión + precarga de correo recordado.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_KEY)) setShowSplash(false);
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRecoverEmail(saved);
      }
    } catch {}
  }, []);

  function finishSplash() {
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch {}
    setShowSplash(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}
    login.mutate({ email: email.trim(), password });
  }

  async function submitRecover(e: React.FormEvent) {
    e.preventDefault();
    setRecovering(true);
    try {
      await fetch(API_BASE + RECOVER_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: recoverEmail.trim() }),
      });
    } catch {
      /* Silencioso a propósito: no revelamos si el correo existe. */
    } finally {
      setRecovering(false);
      setRecoverSent(true);
    }
  }

  const error = (login.error as any)?.response?.data?.message;
  const loading = login.isPending;

  // ── estilos ──────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: "100%",
    height: 52,
    paddingLeft: 46,
    paddingRight: 16,
    background: "rgba(255,255,255,.06)",
    border: "1.5px solid rgba(255,255,255,.12)",
    borderRadius: 14,
    color: "#fff",
    fontSize: 16, // 16px evita el zoom automático en iOS
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color .2s, background .2s, box-shadow .2s",
  };
  const label: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.5)",
    marginBottom: 8,
  };
  const iconStyle: React.CSSProperties = {
    position: "absolute",
    left: 15,
    top: "50%",
    transform: "translateY(-50%)",
    width: 18,
    height: 18,
    color: "rgba(255,255,255,.3)",
    pointerEvents: "none",
  };

  if (showSplash) {
    return (
      <SplashScreen
        logoSrc={logoSrc}
        appName="Audit Platform"
        version={VERSION}
        onFinish={finishSplash}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding:
          "calc(env(safe-area-inset-top) + 40px) 22px calc(env(safe-area-inset-bottom) + 24px)",
        background:
          "radial-gradient(800px 500px at 50% 0%, #0E2148 0%, #0A1628 48%, #060D1C 100%)",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        .sav-in:focus { border-color: rgba(37,87,224,.7) !important; background: rgba(255,255,255,.1) !important; box-shadow: 0 0 0 4px rgba(37,87,224,.18) !important; }
        .sav-btn:active:not(:disabled) { transform: translateY(1px); }
        @keyframes sav-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes sav-fade { from { opacity: 0; } to { opacity: 1; } }
        .sav-card { animation: sav-fade .4s ease both; }
      `}</style>

      {/* Marca */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 8, marginBottom: 30 }}>
        <div style={{ display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(150deg,#1A3A8F,#2557E0 55%,#06B6D4)",
          boxShadow: "0 12px 34px rgba(37,87,224,.4), inset 0 1px 0 rgba(255,255,255,.18)", overflow: "hidden" }}>
          <img src={logoSrc} alt="Audit Platform" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>Audit Platform</h1>
          <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(226,232,240,.5)" }}>Accede con tus credenciales corporativas</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="sav-card" style={{ flex: 1, maxWidth: 460, width: "100%", margin: "0 auto" }}>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(196,18,48,.16)",
            border: "1px solid rgba(196,18,48,.3)", borderRadius: 12, padding: "11px 14px", marginBottom: 18,
            fontSize: 13, color: "#FCA5A5" }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Correo corporativo</label>
            <div style={{ position: "relative" }}>
              <svg style={iconStyle} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M2 6l7 4.5L16 6" />
              </svg>
              <input className="sav-in" style={input} type="email" inputMode="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@savicol.com.co" required />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={label}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <svg style={iconStyle} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <rect x="3.5" y="8" width="11" height="7.5" rx="1.5" /><path d="M6 8V5.8a3 3 0 016 0V8" />
              </svg>
              <input className="sav-in" style={{ ...input, paddingRight: 46 }}
                type={showPwd ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required />
              <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label="Mostrar u ocultar contraseña"
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none",
                  border: "none", padding: 6, cursor: "pointer", color: "rgba(255,255,255,.4)", lineHeight: 0 }}>
                <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  {showPwd
                    ? <><path d="M2 2l14 14M8 3.4A7 7 0 0116.5 9c-.5 1.2-1.3 2.2-2.3 3M11.5 11.6A4 4 0 016 8.5M1.5 9A7 7 0 015 4.6" /></>
                    : <><path d="M1.5 9S4 3.5 9 3.5 16.5 9 16.5 9 14 14.5 9 14.5 1.5 9 1.5 9z" /><circle cx="9" cy="9" r="2.3" /></>}
                </svg>
              </button>
            </div>
          </div>

          {/* Recordar + recuperar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13.5, color: "rgba(255,255,255,.7)" }}>
              <span onClick={() => setRemember((v) => !v)} role="checkbox" aria-checked={remember}
                style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0,
                  border: remember ? "none" : "1.5px solid rgba(255,255,255,.25)",
                  background: remember ? "linear-gradient(135deg,#2557E0,#06B6D4)" : "transparent",
                  transition: "all .15s" }}>
                {remember && (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.5l2.5 2.5L11 4" />
                  </svg>
                )}
              </span>
              Recordar sesión
            </label>
            <button type="button" onClick={() => { setRecoverSent(false); setRecoverOpen(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#7FB0FF" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Botón */}
          <button type="submit" disabled={loading} className="sav-btn"
            style={{ width: "100%", height: 54, border: "none", borderRadius: 14,
              background: "linear-gradient(135deg,#C41230 0%,#A60E26 60%,#8B0015 100%)",
              color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              boxShadow: "0 10px 28px rgba(196,18,48,.45), inset 0 1px 0 rgba(255,255,255,.15)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 9, transition: "transform .12s" }}>
            {loading ? "Verificando…" : "Acceder a la plataforma"}
          </button>
        </form>

        {/* Nota MFA */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 18, padding: "11px 14px",
          background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12,
          fontSize: 12, color: "rgba(255,255,255,.45)" }}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="rgba(196,18,48,.7)" strokeWidth={1.6} strokeLinecap="round" style={{ flexShrink: 0 }}>
            <rect x="3.5" y="8" width="11" height="7.5" rx="1.5" /><path d="M6 8V5.8a3 3 0 016 0V8" />
          </svg>
          Verificación multifactor (MFA) requerida para todos los roles.
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(148,163,184,.5)", marginTop: 22 }}>
        © 2026 Savicol S.A.S. · {VERSION}
      </p>

      {/* ── Hoja de recuperación ── */}
      {recoverOpen && (
        <>
          <div onClick={() => setRecoverOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(4,7,15,.7)", animation: "sav-fade .25s ease both" }} />
          <div role="dialog" aria-modal="true" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 90,
            background: "#0D1F3C", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: "1px solid rgba(255,255,255,.1)",
            padding: "22px 22px calc(env(safe-area-inset-bottom) + 26px)", animation: "sav-sheet-up .3s cubic-bezier(.32,.72,0,1) both" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", margin: "0 auto 18px" }} />
            {recoverSent ? (
              <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center", background: "rgba(34,197,94,.15)" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Revisa tu correo</h3>
                <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>
                  Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
                </p>
                <button onClick={() => setRecoverOpen(false)} style={{ width: "100%", height: 50, border: "none", borderRadius: 13,
                  background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={submitRecover}>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Recuperar contraseña</h3>
                <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>
                  Ingresa tu correo corporativo y te enviaremos un enlace de restablecimiento.
                </p>
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <svg style={iconStyle} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M2 6l7 4.5L16 6" />
                  </svg>
                  <input className="sav-in" style={input} type="email" inputMode="email" required
                    value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} placeholder="correo@savicol.com.co" />
                </div>
                <button type="submit" disabled={recovering} style={{ width: "100%", height: 52, border: "none", borderRadius: 13,
                  background: "linear-gradient(135deg,#1A3A8F,#2557E0)", color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: recovering ? "not-allowed" : "pointer", opacity: recovering ? 0.7 : 1 }}>
                  {recovering ? "Enviando…" : "Enviar enlace"}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
