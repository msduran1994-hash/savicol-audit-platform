import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { GoogleAnalytics } from "@/components/system/google-analytics";
import { PwaRegister } from "@/components/system/pwa-register";
import { BRAND_ICON_512 } from "@/lib/brandLogo";

export const metadata: Metadata = {
  title: { default: "Audit Platform · Savicol", template: "%s | Savicol" },
  description: "Plataforma empresarial de auditoría, control interno y seguimiento operativo.",
  keywords: ["auditoría", "control interno", "Savicol", "compliance", "COSO", "ISO"],
  applicationName: "Audit Platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Audit Platform",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    // Ícono de la app en iOS: logo corporativo "AP · Audit Platform"
    apple: [{ url: BRAND_ICON_512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0A111F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <PwaRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
