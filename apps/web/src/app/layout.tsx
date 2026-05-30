import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Audit Platform Savicol", template: "%s | Savicol" },
  description: "Plataforma empresarial de auditoría, control interno y seguimiento operativo.",
  keywords: ["auditoría", "control interno", "Savicol", "compliance"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#070B14] text-[#F8FAFC] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
