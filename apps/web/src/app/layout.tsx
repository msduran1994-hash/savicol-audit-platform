import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { GoogleAnalytics } from "@/components/system/google-analytics";

export const metadata: Metadata = {
  title: { default: "Audit Platform · Savicol", template: "%s | Savicol" },
  description: "Plataforma empresarial de auditoría, control interno y seguimiento operativo.",
  keywords: ["auditoría", "control interno", "Savicol", "compliance", "COSO", "ISO"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
