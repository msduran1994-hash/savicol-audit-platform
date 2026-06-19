import type { MetadataRoute } from "next";
import { BRAND_ICON_512, BRAND_ICON_MASKABLE } from "@/lib/brandLogo";

// Manifest dinámico de la PWA (Next.js App Router).
// Usa el logo corporativo "AP · Audit Platform Software" como ícono de la app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Audit Platform · Savicol",
    short_name: "Audit Platform",
    description:
      "Plataforma empresarial de auditoría, control interno y seguimiento operativo de Pollos Savicol S.A.S.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFFFF",
    theme_color: "#0A111F",
    lang: "es-CO",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: BRAND_ICON_512, sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: BRAND_ICON_512, sizes: "512x512", type: "image/webp", purpose: "any" },
      { src: BRAND_ICON_MASKABLE, sizes: "512x512", type: "image/webp", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Resumen Ejecutivo",
        short_name: "Resumen",
        description: "Consolidado gerencial de auditoría",
        url: "/resumen-ejecutivo?source=pwa",
      },
      {
        name: "Cronograma 2026",
        short_name: "Cronograma",
        description: "Plan anual de auditoría",
        url: "/cronograma?source=pwa",
      },
    ],
  };
}
