// apps/web/src/app/api/generar-pdf/route.ts
// Convierte el HTML del modelo de informe a PDF real usando Puppeteer + Chromium serverless
// El PDF generado es IDÉNTICO al informe HTML descargado desde la plataforma
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const runtime   = "nodejs";
export const maxDuration = 60; // segundos máximos (Vercel Pro permite hasta 60s)

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      htmlContent,   // HTML completo del modelo seleccionado
      filename,      // nombre del archivo PDF
    } = body;

    if (!htmlContent || typeof htmlContent !== "string" || htmlContent.length < 100) {
      return NextResponse.json({ error: "htmlContent requerido" }, { status: 400 });
    }

    // ── Usar Puppeteer + @sparticuz/chromium para HTML→PDF ───────────────────
    let pdfBuffer: Buffer;

    try {
      // Importación dinámica para evitar errores en edge/build
      const chromium    = (await import("@sparticuz/chromium")).default;
      const puppeteer   = (await import("puppeteer-core")).default;

      // Configuración para entorno serverless
      const executablePath = await chromium.executablePath();

      const browser = await puppeteer.launch({
        args:            chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless:        true,
      });

      const page = await browser.newPage();

      // Cargar el HTML del informe completo
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
      });

      // Generar PDF con formato A4 — idéntico a window.print()
      pdfBuffer = Buffer.from(await page.pdf({
        format:           "A4",
        printBackground:  true,    // incluir colores de fondo CSS
        margin: {
          top:    "0mm",
          right:  "0mm",
          bottom: "0mm",
          left:   "0mm",
        },
        displayHeaderFooter: false,
      }));

      await browser.close();

    } catch (puppeteerError: any) {
      // Fallback: si Puppeteer falla, retornar el HTML como base64 con extensión .html
      // El destinatario puede abrirlo en el navegador y verá el informe completo
      console.error("[generar-pdf] Puppeteer error:", puppeteerError?.message);

      // Intentar con html-to-pdf alternativo basado en fetch a servicio externo
      // Fallback final: retornar HTML como adjunto
      const htmlB64 = Buffer.from(htmlContent, "utf-8").toString("base64");
      return NextResponse.json({
        pdfBase64: htmlB64,
        filename:  (filename ?? "informe").replace(".pdf", ".html"),
        format:    "html",
        warning:   "PDF generado como HTML descargable (misma visualización en navegador)",
      }, { status: 200 });
    }

    const pdfB64 = pdfBuffer.toString("base64");
    const fname  = filename ?? `Informe-Auditoria-Savicol-${new Date().toISOString().slice(0,10)}.pdf`;

    return NextResponse.json({
      pdfBase64: pdfB64,
      filename:  fname,
      format:    "pdf",
      size:      pdfBuffer.length,
    }, { status: 200 });

  } catch (err: any) {
    console.error("[generar-pdf v5]", err?.message ?? err);
    return NextResponse.json(
      { error: "Error al generar el PDF: " + (err?.message ?? "desconocido") },
      { status: 500 }
    );
  }
}
