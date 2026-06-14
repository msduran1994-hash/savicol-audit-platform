// apps/web/src/app/api/generar-pdf/route.ts
// HTML → PDF con @sparticuz/chromium + puppeteer-core (Vercel serverless)
// Produce PDF idéntico al informe HTML descargado desde la plataforma
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 60;

// Función auxiliar para intentar importar chromium
async function getPuppeteer() {
  const chromium  = (await import("@sparticuz/chromium")).default;
  const puppeteer = (await import("puppeteer-core")).default;
  return { chromium, puppeteer };
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { htmlContent, filename } = body ?? {};

  if (!htmlContent || typeof htmlContent !== "string" || htmlContent.length < 50) {
    return NextResponse.json({ error: "htmlContent requerido" }, { status: 400 });
  }

  const fname = filename
    ?? `Informe-Auditoria-Savicol-${new Date().toISOString().slice(0, 10)}.pdf`;

  // ── Intentar con Puppeteer + Chromium ────────────────────────────────────
  try {
    const { chromium, puppeteer } = await getPuppeteer();

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args:            [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 },
      executablePath,
      headless:        true,
    });

    try {
      const page = await browser.newPage();

      // Emular A4 para que el CSS @media print funcione
      await page.emulateMediaType("print");

      // Cargar HTML completo del modelo seleccionado
      await page.setContent(htmlContent, {
        waitUntil: "domcontentloaded",
        timeout:   30000,
      });

      // Esperar a que los estilos CSS terminen de aplicarse
      await page.evaluate(() => document.fonts.ready);

      // Generar PDF A4 con todos los estilos y colores de fondo
      const pdfUint8 = await page.pdf({
        format:              "A4",
        printBackground:     true,   // ← incluye gradientes, colores, imágenes CSS
        preferCSSPageSize:   false,
        margin: {
          top:    "0",
          right:  "0",
          bottom: "0",
          left:   "0",
        },
        displayHeaderFooter: false,
        timeout:             30000,
      });

      const pdfBuffer = Buffer.from(pdfUint8);
      const pdfB64    = pdfBuffer.toString("base64");

      return NextResponse.json({
        pdfBase64: pdfB64,
        filename:  fname,
        format:    "pdf",
        size:      pdfBuffer.length,
      });

    } finally {
      await browser.close();
    }

  } catch (puppeteerErr: any) {
    // ── Fallback: retornar el HTML comprimido en base64 ─────────────────────
    // El destinatario puede abrir el .html y verá el informe idéntico
    console.error("[generar-pdf] Puppeteer error:", puppeteerErr?.message);

    const htmlB64    = Buffer.from(htmlContent, "utf-8").toString("base64");
    const htmlFname  = fname.replace(/\.pdf$/i, ".html");

    return NextResponse.json({
      pdfBase64: htmlB64,
      filename:  htmlFname,
      format:    "html",
      warning:   "PDF generado como HTML — abrirlo en navegador para vista idéntica",
    });
  }
}
