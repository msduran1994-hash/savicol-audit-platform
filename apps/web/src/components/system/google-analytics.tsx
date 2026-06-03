"use client";
// ═══════════════════════════════════════════════════════════════════════════════
// Google Analytics 4 · tracking ligero
// ═══════════════════════════════════════════════════════════════════════════════
// Solo se monta si NEXT_PUBLIC_GA_ID está configurado (formato G-XXXXXXXXXX).
// Captura automáticamente pageviews al navegar entre rutas (Next.js App Router).
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export function GoogleAnalytics() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Pageview en cada cambio de ruta
  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== "function") return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    window.gtag("config", GA_ID, { page_path: url });
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            send_page_view: false,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}

// Helper para tracking de eventos custom
export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params ?? {});
}
