// apps/web/src/app/api/generar-pdf/route.ts
// API Route Next.js — Genera PDF real con pdfkit (Node.js puro, sin Chromium)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
// pdfkit: librería PDF pura Node.js, sin dependencias nativas
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit");

export const runtime = "nodejs"; // MUST be nodejs — pdfkit no funciona en edge

// ─── Colores corporativos ────────────────────────────────────────────────────
const COLOR = {
  rojo:     "#C41230",
  azul:     "#0D1526",
  azulClaro:"#4A7AFF",
  verde:    "#22C55E",
  naranja:  "#F97316",
  amarillo: "#FBBF24",
  rojo2:    "#EF4444",
  gris:     "#94A3B8",
  grisClaro:"#E2E8F0",
  blanco:   "#FFFFFF",
  negro:    "#1A202C",
  texto:    "#475569",
};

// ─── Helper: estado display ──────────────────────────────────────────────────
function displayEstado(e: string): string {
  return ({
    COMPLETADO:"Completado", EN_CURSO:"En Curso",
    EN_ESPERA:"En Espera",  NO_INICIADO:"No Iniciado",
    ABIERTO:"Abierto",      EN_PLAN:"En Plan",
    CERRADO:"Cerrado",      PENDIENTE:"Pendiente",
  })[e] ?? e;
}

function fmtFecha(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", {
    year:"numeric", month:"short", day:"numeric"
  });
}

// ─── Generar PDF con pdfkit ──────────────────────────────────────────────────
function generarPDF(
  modelo: string,
  kpis:      any[],
  hallazgos: any[],
  granjas:   any[],
  auditor:   string,
  descripcion: string,
  granjaFiltroId?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const W = doc.page.width - 100; // ancho útil
    const pct = kpis.length
      ? Math.round(kpis.reduce((a, k) => a + (k.porcentajeAvance ?? 0), 0) / kpis.length)
      : 0;
    const granja = granjaFiltroId
      ? granjas.find((g: any) => g.id === granjaFiltroId)
      : null;
    const fecha = fmtFecha(new Date().toISOString());

    // ── PORTADA ───────────────────────────────────────────────────────────────
    // Fondo rojo superior
    doc.rect(0, 0, doc.page.width, 200).fill(COLOR.azul);

    // Línea roja decorativa
    doc.rect(0, 190, doc.page.width, 10).fill(COLOR.rojo);

    // Logo / inicial empresa
    doc.rect(50, 40, 50, 50).fill(COLOR.rojo);
    doc.fontSize(28).fillColor(COLOR.blanco).font("Helvetica-Bold")
       .text("PS", 55, 52, { width: 40, align: "center" });

    // Nombre empresa
    doc.fontSize(18).fillColor(COLOR.blanco).font("Helvetica-Bold")
       .text("Pollos Savicol S.A.S.", 115, 45);
    doc.fontSize(9).fillColor(COLOR.gris).font("Helvetica")
       .text("Control Interno y Auditoría", 115, 70);

    // Título
    const titulo = modelo === "1-ejecutivo" ? "Informe Ejecutivo de Auditoría"
                 : modelo === "2-tecnico"   ? "Informe Técnico de Auditoría"
                 : modelo === "3-dashboard" ? "Dashboard de Auditoría"
                 : modelo === "4-granja"    ? `Informe de Granja — ${granja?.nombre ?? ""}`
                 : "Informe General de Auditoría";

    doc.fontSize(22).fillColor(COLOR.blanco).font("Helvetica-Bold")
       .text(titulo, 50, 115, { width: W + 50 });

    doc.fontSize(11).fillColor(COLOR.gris).font("Helvetica")
       .text(`Área de Control Interno y Auditoría · ${fecha}`, 50, 155);

    // Badge CONFIDENCIAL
    doc.rect(50, 170, 100, 16).fill(COLOR.rojo);
    doc.fontSize(8).fillColor(COLOR.blanco).font("Helvetica-Bold")
       .text("CONFIDENCIAL", 55, 174, { width: 90, align: "center" });

    // ── META INFO ─────────────────────────────────────────────────────────────
    doc.y = 220;
    const metaItems = [
      ["Auditor Responsable", auditor || "Auditor Interno"],
      ["Fecha de Generación", fecha],
      ["Avance Global KPI",   `${pct}%`],
      ["Total Planes KPI",    String(kpis.length)],
      ["Total Hallazgos",     String(hallazgos.length)],
      ["Granjas Evaluadas",   String(granjas.filter((g: any) =>
         kpis.some((k: any) => k.granjaId === g.id)).length)],
    ];

    const colW = (W + 50) / 3;
    metaItems.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 50 + col * colW;
      const y = doc.y + row * 50;

      doc.rect(x + 2, y, colW - 8, 42).fill("#F8FAFC").stroke(COLOR.grisClaro);
      doc.fontSize(8).fillColor(COLOR.gris).font("Helvetica")
         .text(label.toUpperCase(), x + 8, y + 6, { width: colW - 16 });
      doc.fontSize(13).fillColor(COLOR.negro).font("Helvetica-Bold")
         .text(value, x + 8, y + 18, { width: colW - 16 });
    });

    doc.y += 115;

    // ── DESCRIPCIÓN DEL CORREO ────────────────────────────────────────────────
    if (descripcion?.trim()) {
      doc.moveDown(0.5);
      doc.rect(50, doc.y, W + 50, 2).fill(COLOR.azulClaro);
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(COLOR.negro).font("Helvetica-Bold")
         .text("Descripción / Observaciones del Auditor");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(COLOR.texto).font("Helvetica")
         .text(descripcion.trim(), { width: W + 50, lineGap: 3 });
      doc.moveDown(0.8);
    }

    // ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────────
    seccionTitulo(doc, W, "Resumen Ejecutivo");

    // Tarjetas KPI
    const cards = [
      { label: "Total KPIs",    val: String(kpis.length),    col: COLOR.azulClaro },
      { label: "Completados",   val: String(kpis.filter((k:any)=>k.estado==="COMPLETADO").length), col: COLOR.verde },
      { label: "En Curso",      val: String(kpis.filter((k:any)=>k.estado==="EN_CURSO").length),  col: COLOR.naranja },
      { label: "No Iniciados",  val: String(kpis.filter((k:any)=>k.estado==="NO_INICIADO").length),col: COLOR.rojo2 },
    ];
    const cardW = (W + 50) / 4 - 4;
    cards.forEach(({ label, val, col }, i) => {
      const x = 50 + i * ((W + 50) / 4);
      const y = doc.y;
      doc.rect(x + 2, y, cardW, 50).fill("#F8FAFC").stroke(COLOR.grisClaro);
      doc.fontSize(22).fillColor(col).font("Helvetica-Bold")
         .text(val, x + 2, y + 6, { width: cardW, align: "center" });
      doc.fontSize(8).fillColor(COLOR.gris).font("Helvetica")
         .text(label.toUpperCase(), x + 2, y + 34, { width: cardW, align: "center" });
    });
    doc.y += 64;

    // Barra de avance global
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(COLOR.negro).font("Helvetica-Bold")
       .text("Avance Global de Planes de Acción");
    doc.moveDown(0.2);
    doc.rect(50, doc.y, W + 50, 12).fill(COLOR.grisClaro);
    doc.rect(50, doc.y, (W + 50) * (pct / 100), 12).fill(COLOR.verde);
    doc.fontSize(9).fillColor(COLOR.negro).font("Helvetica-Bold")
       .text(`${pct}%`, 50 + (W + 50) * (pct / 100) + 4, doc.y - 1);
    doc.y += 20;
    doc.moveDown(0.5);

    // ── HALLAZGOS ─────────────────────────────────────────────────────────────
    const hallMax = Math.min(hallazgos.length, 12);
    if (hallMax > 0) {
      seccionTitulo(doc, W, `Hallazgos Identificados (${hallazgos.length} total)`);
      tablaHallazgos(doc, W, hallazgos.slice(0, hallMax), granjas);
      doc.moveDown(0.5);
    }

    // ── PLANES KPI ────────────────────────────────────────────────────────────
    const kpiMax = Math.min(kpis.length, 8);
    if (kpiMax > 0) {
      doc.addPage();
      seccionTitulo(doc, W, `Planes de Acción KPI (${kpis.length} total)`);
      kpis.slice(0, kpiMax).forEach((k: any) => {
        kpiCard(doc, W, k, granjas, hallazgos);
      });
    }

    // ── FIRMA DIGITAL ─────────────────────────────────────────────────────────
    doc.addPage();
    seccionTitulo(doc, W, "Firma y Certificación");

    // Sello auditor
    const cx1 = 50 + (W + 50) / 4;
    const cy   = doc.y + 40;
    doc.circle(cx1, cy, 38).stroke(COLOR.rojo);
    doc.fontSize(7).fillColor(COLOR.rojo).font("Helvetica-Bold")
       .text("POLLOS SAVICOL", cx1 - 28, cy - 10, { width: 56, align: "center" })
       .text("S.A.S.", cx1 - 28, cy, { width: 56, align: "center" });

    const cx2 = 50 + (W + 50) * 3 / 4;
    doc.circle(cx2, cy, 38).stroke(COLOR.azul);
    doc.fontSize(7).fillColor(COLOR.azul).font("Helvetica-Bold")
       .text("V°B°", cx2 - 28, cy - 10, { width: 56, align: "center" })
       .text("GERENCIA", cx2 - 28, cy, { width: 56, align: "center" });

    doc.y = cy + 55;
    // Líneas de firma
    doc.moveTo(cx1 - 60, doc.y).lineTo(cx1 + 60, doc.y).stroke(COLOR.negro);
    doc.moveTo(cx2 - 60, doc.y).lineTo(cx2 + 60, doc.y).stroke(COLOR.negro);
    doc.y += 6;

    doc.fontSize(11).fillColor(COLOR.negro).font("Helvetica-Bold")
       .text(auditor || "Auditor Interno", cx1 - 70, doc.y, { width: 140, align: "center" })
       .text("Gerencia General",          cx2 - 70, doc.y, { width: 140, align: "center" });
    doc.y += 16;
    doc.fontSize(9).fillColor(COLOR.gris).font("Helvetica")
       .text("Auditor Interno",           cx1 - 70, doc.y, { width: 140, align: "center" })
       .text("Pollos Savicol S.A.S.",     cx2 - 70, doc.y, { width: 140, align: "center" });
    doc.y += 12;
    const hashId = Buffer.from(Date.now().toString()).toString("hex").toUpperCase().slice(0, 16);
    doc.fontSize(8).fillColor(COLOR.azulClaro).font("Helvetica")
       .text(`Firma digital: SHA-${hashId}`, cx1 - 70, doc.y, { width: 140, align: "center" })
       .text(`Pendiente aprobación`, cx2 - 70, doc.y, { width: 140, align: "center" });

    doc.y += 40;
    // Nota confidencialidad
    doc.rect(50, doc.y, W + 50, 36).fill("#F0F9FF").stroke("#BFDBFE");
    doc.fontSize(9).fillColor("#1E40AF").font("Helvetica")
       .text(
         `Documento confidencial generado automáticamente por el Sistema de Auditoría Interna de Pollos Savicol S.A.S. · ${fecha}`,
         58, doc.y + 6, { width: W + 34 }
       );

    // ── PIE DE PÁGINA en cada página ──────────────────────────────────────────
    const pages = (doc as any)._pageBuffer?.length ?? 1;
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(COLOR.gris).font("Helvetica")
         .text(
           `Pollos Savicol S.A.S. · Control Interno y Auditoría · ${fecha}  |  Pág. ${i + 1}`,
           50, doc.page.height - 40, { width: W + 50, align: "center" }
         );
    }

    doc.end();
  });
}

// ─── Helpers de sección ──────────────────────────────────────────────────────
function seccionTitulo(doc: any, W: number, titulo: string) {
  doc.rect(50, doc.y, W + 50, 22).fill("#0D1526");
  doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold")
     .text("  " + titulo, 50, doc.y + 5, { width: W + 50 });
  doc.y += 30;
}

function tablaHallazgos(doc: any, W: number, hallazgos: any[], granjas: any[]) {
  const cols = [160, 100, 90, 80, 80];
  const headers = ["Hallazgo", "Granja", "Auditor", "Fecha", "Estado"];
  const x0 = 50;
  let y = doc.y;

  // Header
  doc.rect(x0, y, W + 50, 18).fill("#0D1526");
  let cx = x0;
  headers.forEach((h, i) => {
    doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold")
       .text(h, cx + 3, y + 4, { width: cols[i] - 4, lineBreak: false });
    cx += cols[i];
  });
  y += 20;

  hallazgos.forEach((h: any, idx: number) => {
    if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
    const bg = idx % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
    doc.rect(x0, y, W + 50, 18).fill(bg);
    const g = granjas.find((gr: any) => gr.id === h.granjaId);
    const row = [
      h.titulo?.slice(0, 28) ?? "—",
      g?.nombre?.slice(0, 16) ?? "—",
      h.auditorNombre?.split(" ")[0] ?? "—",
      fmtFecha(h.fechaVisita),
      displayEstado(h.estado),
    ];
    cx = x0;
    row.forEach((val, i) => {
      const isEstado = i === 4;
      doc.fontSize(7.5)
         .fillColor(isEstado && h.estado === "CERRADO" ? "#166534"
                  : isEstado && h.estado === "ABIERTO" ? "#991B1B"
                  : "#1A202C")
         .font(isEstado ? "Helvetica-Bold" : "Helvetica")
         .text(val, cx + 3, y + 4, { width: cols[i] - 4, lineBreak: false });
      cx += cols[i];
    });
    y += 20;
  });
  doc.y = y + 4;
}

function kpiCard(doc: any, W: number, k: any, granjas: any[], hallazgos: any[]) {
  if (doc.y > doc.page.height - 130) doc.addPage();

  const g = granjas.find((gr: any) => gr.id === k.granjaId);
  const h = k.hallazgoId ? hallazgos.find((hh: any) => hh.id === k.hallazgoId) : null;
  const pct = k.porcentajeAvance ?? 0;
  const stColor = k.estado === "COMPLETADO" ? "#22C55E"
                : k.estado === "EN_CURSO"   ? "#F97316"
                : k.estado === "EN_ESPERA"  ? "#FBBF24"
                : "#EF4444";

  const y0 = doc.y;
  doc.rect(50, y0, W + 50, 95).fill("#F8FAFC").stroke("#E2E8F0");

  // Título + estado
  doc.rect(50, y0, W + 50, 22).fill("#1A202C");
  doc.fontSize(10).fillColor("#FFFFFF").font("Helvetica-Bold")
     .text(k.accion?.slice(0, 60) ?? "—", 56, y0 + 5, { width: W + 30, lineBreak: false });
  doc.rect(W + 60, y0 + 4, 34, 14).fill(stColor);
  doc.fontSize(7).fillColor("#FFFFFF").font("Helvetica-Bold")
     .text(displayEstado(k.estado).slice(0, 10), W + 61, y0 + 7, { width: 32, lineBreak: false });

  // Meta
  doc.fontSize(8).fillColor("#475569").font("Helvetica")
     .text(
       `Granja: ${g?.nombre ?? "—"}  ·  Responsable: ${k.responsable ?? "—"}${h ? `  ·  Hallazgo: ${h.titulo?.slice(0, 25)}` : ""}${k.fechaCompromiso ? `  ·  Compromiso: ${fmtFecha(k.fechaCompromiso)}` : ""}`,
       56, y0 + 28, { width: W + 34, lineBreak: false }
     );

  // Barra progreso
  doc.rect(56, y0 + 44, W + 34, 8).fill("#E2E8F0");
  if (pct > 0) doc.rect(56, y0 + 44, (W + 34) * (pct / 100), 8).fill(stColor);
  doc.fontSize(8).fillColor("#1A202C").font("Helvetica-Bold")
     .text(`${pct}%`, W + 64, y0 + 42, { width: 30 });

  // Plan IA
  if (k.planAccionVeterinario && k.planAccionVeterinario !== "—") {
    doc.rect(56, y0 + 58, W + 34, 30).fill("#FFFBEB").stroke("#FDE68A");
    doc.fontSize(7.5).fillColor("#92400E").font("Helvetica-Bold")
       .text("Plan de Acción IA: ", 60, y0 + 63, { continued: true })
       .font("Helvetica")
       .text(k.planAccionVeterinario.slice(0, 140), { width: W + 20, lineGap: 1 });
  }

  doc.y = y0 + 102;
}

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { modelo, kpis, hallazgos, granjas, auditor, descripcion, granjaFiltroId }
      = await req.json();

    if (!kpis || !hallazgos || !granjas) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const pdfBuffer = await generarPDF(
      modelo ?? "5-general",
      kpis, hallazgos, granjas,
      auditor ?? "Auditor Interno",
      descripcion ?? "",
      granjaFiltroId
    );

    const base64 = pdfBuffer.toString("base64");
    const filename = `Informe-Auditoria-Savicol-${modelo ?? "general"}-${new Date().toISOString().slice(0,10)}.pdf`;

    return NextResponse.json({ pdfBase64: base64, filename }, { status: 200 });

  } catch (err: any) {
    console.error("[generar-pdf]", err?.message ?? err);
    return NextResponse.json(
      { error: "Error al generar el PDF: " + (err?.message ?? "desconocido") },
      { status: 500 }
    );
  }
}
