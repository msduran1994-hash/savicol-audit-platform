"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Google Analytics 4 · tracking ligero
// ═══════════════════════════════════════════════════════════════════════════════
// Lee el Measurement ID en orden de prioridad:
//   1. /settings/public · integrations.googleAnalyticsId (configurado desde UI)
//   2. process.env.NEXT_PUBLIC_GA_ID (variable de entorno · fallback)
//
// Si ninguno está disponible, no se carga GA. Captura pageviews automáticos.
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import axios from "axios";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const ENV_GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
const API_BASE  = process.env.NEXT_PUBLIC_API_URL ?? "";

export function GoogleAnalytics() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [gaId, setGaId] = useState<string>(ENV_GA_ID);

  // Cargar GA_ID desde /settings/public · sobreescribe env var si está seteado
  useEffect(() => {
    if (!API_BASE) return;
    axios.get<Array<{ key: string; value: string }>>(`${API_BASE}/api/v1/settings/public`)
      .then(res => {
        const setting = res.data.find(s => s.key === "integrations.googleAnalyticsId");
        if (setting?.value && setting.value.startsWith("G-")) {
          setGaId(setting.value);
        }
      })
      .catch(() => {
        // Silencioso · si falla mantiene env var
      });
  }, []);

  // Pageview en cada cambio de ruta
  useEffect(() => {
    if (!gaId || typeof window.gtag !== "function") return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    window.gtag("config", gaId, { page_path: url });
  }, [pathname, searchParams, gaId]);

  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            send_page_view: false,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}

// Helper para tracking de eventos custom desde cualquier componente
export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params ?? {});
}
