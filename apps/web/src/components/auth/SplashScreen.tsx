"use client";

/*
 * SplashScreen.tsx — Pantalla inicial corporativa (Fase 2)
 * Ubicación sugerida: apps/web/src/components/auth/SplashScreen.tsx
 * --------------------------------------------------------------------------
 * Logo + nombre + versión + animación de carga. Mobile-first, full-screen.
 * Llama onFinish() tras durationMs. Respeta prefers-reduced-motion.
 * No depende del backend: es puramente visual y seguro.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  logoSrc?: string;
  appName?: string;
  tagline?: string;
  version?: string;
  durationMs?: number;
  onFinish?: () => void;
}

export default function SplashScreen({
  logoSrc = "/favicon.svg",
  appName = "Audit Platform",
  tagline = "Auditoría & Control Interno",
  version = "v1.0.0",
  durationMs = 2200,
  onFinish,
}: Props) {
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), durationMs - 350);
    const t2 = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onFinish?.();
      }
    }, durationMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      role="status"
      aria-label="Cargando Audit Platform"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background:
          "radial-gradient(900px 600px at 50% 22%, #0E2148 0%, #0A1628 45%, #060D1C 100%)",
        opacity: leaving ? 0 : 1,
        transition: "opacity .35s ease",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        @keyframes sav-splash-pop {
          0%   { transform: scale(.82); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sav-splash-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-7px); }
        }
        @keyframes sav-splash-ring {
          0%   { transform: scale(.9); opacity: .55; }
          70%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes sav-splash-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes sav-splash-text {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sav-splash-logo { animation: sav-splash-pop .6s cubic-bezier(.34,1.4,.64,1) both, sav-splash-float 4s ease-in-out 0.6s infinite; }
        .sav-splash-ring { animation: sav-splash-ring 2.2s ease-out infinite; }
        .sav-splash-name { animation: sav-splash-text .5s ease .35s both; }
        .sav-splash-tag  { animation: sav-splash-text .5s ease .5s both; }
        .sav-splash-bar > span { animation: sav-splash-bar 1.3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sav-splash-logo, .sav-splash-ring, .sav-splash-name, .sav-splash-tag, .sav-splash-bar > span { animation: none !important; }
        }
      `}</style>

      {/* Logo con halo */}
      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        <span
          className="sav-splash-ring"
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "2px solid rgba(59,130,246,.5)",
          }}
        />
        <div
          className="sav-splash-logo"
          style={{
            display: "grid",
            placeItems: "center",
            width: 96,
            height: 96,
            borderRadius: 26,
            background: "linear-gradient(150deg,#1A3A8F 0%,#2557E0 55%,#06B6D4 100%)",
            boxShadow:
              "0 18px 50px rgba(37,87,224,.45), inset 0 1px 0 rgba(255,255,255,.18)",
            overflow: "hidden",
          }}
        >
          <img
            src={logoSrc}
            alt={appName}
            width={60}
            height={60}
            style={{ width: 60, height: 60, objectFit: "contain" }}
          />
        </div>
      </div>

      {/* Nombre + tagline */}
      <div style={{ textAlign: "center" }}>
        <h1
          className="sav-splash-name"
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: "#F8FAFC",
          }}
        >
          {appName}
        </h1>
        <p
          className="sav-splash-tag"
          style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(226,232,240,.55)" }}
        >
          {tagline}
        </p>
      </div>

      {/* Loader */}
      <div
        className="sav-splash-bar"
        style={{
          position: "relative",
          width: 150,
          height: 4,
          borderRadius: 4,
          overflow: "hidden",
          background: "rgba(148,163,184,.18)",
          marginTop: 4,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            borderRadius: 4,
            background: "linear-gradient(90deg,#1A3A8F,#06B6D4)",
          }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom) + 26px)",
          textAlign: "center",
          fontSize: 11,
          color: "rgba(148,163,184,.6)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, letterSpacing: ".04em" }}>
          Savicol S.A.S.
        </p>
        <p style={{ margin: "3px 0 0", opacity: 0.7 }}>{version}</p>
      </div>
    </div>
  );
}
