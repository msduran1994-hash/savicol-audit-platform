"use client";
// ═══════════════════════════════════════════════════════════════════════════
// MobileSplash · Pantalla inicial corporativa antes del login
// Se muestra una vez por sesión del navegador, se cierra sola a los 1.8s
// o al tocar. No depende del LOGO_URI del login: usa el ícono PWA.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { BRAND_ICON_512 } from "@/lib/brandLogo";

export function MobileSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("savicol-splash-shown")) return;
      sessionStorage.setItem("savicol-splash-shown", "1");
    } catch { /* SSR */ }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(160deg, #0A1628 0%, #0D1B2E 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 28,
        animation: "splashFade .4s ease",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      }}
    >
      <img
        src={BRAND_ICON_512}
        alt="Audit Platform"
        style={{
          width: 150, height: 150, borderRadius: 28,
          filter: "drop-shadow(0 8px 28px rgba(0,0,0,.4))",
          animation: "splashLogo 1.2s ease",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", margin: 0 }}>
          Audit Platform
        </p>
        <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginTop: 4,
          letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
          Savicol · v2026
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: "#C41230",
            display: "inline-block",
            animation: `splashDot 1s ${i * 0.15}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes splashFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes splashLogo {
          0% { opacity: 0; transform: scale(0.85) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashDot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
