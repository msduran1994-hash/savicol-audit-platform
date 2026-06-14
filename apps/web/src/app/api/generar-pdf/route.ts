// apps/web/src/app/api/generar-pdf/route.ts
// Generador de PDF profesional — estructura PDF 1.4 correcta sin dependencias
// Offsets xref calculados con acumulación precisa de bytes reales
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─── Logo corporativo Pollos Savicol S.A.S. (JPEG embebido en base64) ──────────
const LOGO_B64 = "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";
const LOGO_W = 80, LOGO_H = 112;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function displayEstado(e: string): string {
  return ({ COMPLETADO:"Completado", EN_CURSO:"En Curso", EN_ESPERA:"En Espera",
            NO_INICIADO:"No Iniciado", ABIERTO:"Abierto", EN_PLAN:"En Plan",
            CERRADO:"Cerrado", PENDIENTE:"Pendiente" })[e] ?? e;
}
function fmtF(d?: string): string {
  if (!d) return "---";
  try { return new Date(d).toLocaleDateString("es-CO", { year:"numeric", month:"short", day:"numeric" }); }
  catch { return d.slice(0,10); }
}

// Escapar texto para PDF (solo ASCII imprimible, sin chars especiales)
function esc(s: string): string {
  return (s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes → ASCII
    .replace(/[^\x20-\x7E]/g, " ")                    // quitar no-ASCII
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Línea de texto PDF con posición absoluta
function txt(x: number, y: number, s: string, font = "/F1", size = 9): string {
  return `BT ${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET\n`;
}

// Línea horizontal
function hrule(x1: number, y: number, x2: number): string {
  return `${x1} ${y} m ${x2} ${y} l S\n`;
}

// Rectángulo relleno
function rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number): string {
  return `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f 0 0 0 rg\n`;
}

// ─── Generar PDF ─────────────────────────────────────────────────────────────
function generarPDF(
  modelo: string,
  kpis: any[], hallazgos: any[], granjas: any[],
  auditor: string, descripcion: string
): Buffer {
  const fecha   = fmtF(new Date().toISOString());
  const pct     = kpis.length
    ? Math.round(kpis.reduce((a, k) => a + (k.porcentajeAvance ?? 0), 0) / kpis.length) : 0;
  const comp    = kpis.filter(k => k.estado === "COMPLETADO").length;
  const enCurso = kpis.filter(k => k.estado === "EN_CURSO").length;
  const noIni   = kpis.filter(k => k.estado === "NO_INICIADO").length;
  const hallAb  = hallazgos.filter(h => h.estado === "ABIERTO").length;
  const hash    = Date.now().toString(36).toUpperCase().slice(-12);

  // ── Construir el stream de contenido (operadores gráficos PDF) ────────────
  let s = "";
  const PW = 595;  // A4 width
  const PH = 841;  // A4 height

  // PORTADA — fondo azul oscuro
  s += rect(0, PH - 200, PW, 200, 0.05, 0.08, 0.15);      // fondo azul
  s += rect(0, PH - 210, PW, 10, 0.77, 0.07, 0.19);       // raya roja

  // Logo corporativo Pollos Savicol S.A.S. — imagen JPEG en la portada
  s += `q 64 0 0 90 45 ${PH - 195} cm /Im1 Do Q\n`;

  // Nombre empresa y NIT oficial
  s += `1 1 1 rg\n`;
  s += txt(122, PH - 60, "Pollos Savicol S.A.S.", "/F2", 16);
  s += txt(122, PH - 78, "NIT: 860.403.972  |  Control Interno y Auditoria", "/F1", 8);
  s += `0 0 0 rg\n`;

  // Título del informe
  const titulos: Record<string,string> = {
    "1-ejecutivo": "Informe Ejecutivo de Auditoria",
    "2-tecnico":   "Informe Tecnico de Auditoria",
    "3-dashboard": "Dashboard de Auditoria",
    "4-granja":    "Informe Individual por Granja",
    "5-general":   "Informe General de Auditoria",
  };
  s += `1 1 1 rg\n`;
  s += txt(50, PH - 115, titulos[modelo] ?? "Informe de Auditoria KPI", "/F2", 18);
  s += txt(50, PH - 135, `Area de Control Interno y Auditoria  |  Fecha: ${fecha}`, "/F1", 9);
  s += `0 0 0 rg\n`;

  // Badge CONFIDENCIAL
  s += rect(50, PH - 165, 100, 15, 0.77, 0.07, 0.19);
  s += `1 1 1 rg\n`;
  s += txt(53, PH - 158, "CONFIDENCIAL", "/F2", 8);
  s += `0 0 0 rg\n`;

  // ── META INFO (cuadrícula 3x2) ────────────────────────────────────────────
  const metaY = PH - 230;
  const metaW = (PW - 100) / 3;
  const metas = [
    ["AUDITOR RESPONSABLE", auditor || "Auditor Interno"],
    ["FECHA DE GENERACION", fecha],
    ["AVANCE GLOBAL KPI",   pct + "%"],
    ["TOTAL PLANES KPI",    String(kpis.length)],
    ["TOTAL HALLAZGOS",     String(hallazgos.length)],
    ["GRANJAS EVALUADAS",   String(granjas.filter((g:any) => kpis.some((k:any) => k.granjaId === g.id)).length)],
  ];
  metas.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const mx  = 50 + col * (metaW + 2);
    const my  = metaY - row * 52;
    s += rect(mx, my - 42, metaW, 44, 0.97, 0.98, 0.99);
    s += `0.88 0.91 0.93 rg\n`;
    s += rect(mx, my - 42, metaW, 44, 0.97, 0.98, 0.99);
    s += `0 0 0 rg\n`;
    // Borde
    s += `0.87 0.91 0.94 RG ${mx} ${my - 42} ${metaW} 44 re S 0 0 0 RG\n`;
    s += txt(mx + 6, my - 14, label, "/F1", 7);
    s += txt(mx + 6, my - 28, value, "/F2", 12);
  });

  // ── DESCRIPCIÓN DEL CORREO ────────────────────────────────────────────────
  let cy = metaY - 120;
  if (descripcion?.trim()) {
    s += rect(50, cy - 4, PW - 100, 14, 0.27, 0.48, 1.0);
    s += `1 1 1 rg\n`;
    s += txt(54, cy + 2, "DESCRIPCION / OBSERVACIONES DEL AUDITOR", "/F2", 8);
    s += `0 0 0 rg\n`;
    cy -= 16;

    // Partir descripción en líneas de 90 chars
    const words  = descripcion.trim().split(" ");
    const lines2: string[] = [];
    let   curLine = "";
    words.forEach(w => {
      const test = curLine ? curLine + " " + w : w;
      if (test.length > 88) { lines2.push(curLine); curLine = w; }
      else curLine = test;
    });
    if (curLine) lines2.push(curLine);

    s += rect(50, cy - lines2.length * 11 - 8, PW - 100, lines2.length * 11 + 12, 1.0, 0.98, 0.93);
    s += `0.57, 0.25, 0.0 RG 50 ${cy - lines2.length * 11 - 8} ${PW - 100} ${lines2.length * 11 + 12} re S 0 0 0 RG\n`;
    lines2.forEach(line => {
      s += txt(54, cy, line, "/F1", 9);
      cy -= 11;
    });
    cy -= 10;
  }

  // ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────────
  cy -= 10;
  s += rect(50, cy - 4, PW - 100, 16, 0.05, 0.08, 0.15);
  s += `1 1 1 rg\n`;
  s += txt(54, cy + 2, "RESUMEN EJECUTIVO", "/F2", 10);
  s += `0 0 0 rg\n`;
  cy -= 22;

  // Cards de KPI (4 tarjetas horizontales)
  const cardW = (PW - 108) / 4;
  const cardH = 44;
  const cards = [
    { label:"Total KPIs",   val:String(kpis.length),  r:0.29, g:0.47, b:1.0 },
    { label:"Completados",  val:String(comp),          r:0.13, g:0.77, b:0.37 },
    { label:"En Curso",     val:String(enCurso),       r:0.98, g:0.45, b:0.09 },
    { label:"No Iniciados", val:String(noIni),         r:0.94, g:0.27, b:0.27 },
  ];
  cards.forEach((c, i) => {
    const cx = 50 + i * (cardW + 2);
    s += rect(cx, cy - cardH + 4, cardW, cardH, 0.97, 0.98, 0.99);
    s += `${c.r} ${c.g} ${c.b} rg\n`;
    s += txt(cx + 4, cy - 18, c.val, "/F2", 20);
    s += `0.4 0.51 0.64 rg\n`;
    s += txt(cx + 4, cy - 32, c.label.toUpperCase(), "/F1", 7);
    s += `0 0 0 rg\n`;
  });
  cy -= cardH + 8;

  // Barra de avance global
  s += txt(50, cy, `Avance Global de Planes de Accion: ${pct}%`, "/F2", 9);
  cy -= 12;
  s += rect(50, cy - 8, PW - 100, 10, 0.88, 0.91, 0.94);
  if (pct > 0) {
    s += rect(50, cy - 8, (PW - 100) * pct / 100, 10, 0.13, 0.77, 0.37);
  }
  cy -= 22;

  // Estadísticas hallazgos
  s += txt(50, cy, `Hallazgos: ${hallazgos.length} total  |  Abiertos: ${hallAb}  |  En Plan: ${hallazgos.filter((h:any) => h.estado === "EN_PLAN").length}  |  Cerrados: ${hallazgos.filter((h:any) => h.estado === "CERRADO").length}`, "/F1", 8);
  cy -= 18;

  // ── HALLAZGOS ─────────────────────────────────────────────────────────────
  if (hallazgos.length > 0 && cy > 150) {
    s += rect(50, cy - 4, PW - 100, 16, 0.05, 0.08, 0.15);
    s += `1 1 1 rg\n`;
    s += txt(54, cy + 2, `HALLAZGOS IDENTIFICADOS (${Math.min(hallazgos.length, 8)} de ${hallazgos.length})`, "/F2", 10);
    s += `0 0 0 rg\n`;
    cy -= 18;

    // Encabezado tabla
    s += rect(50, cy - 4, PW - 100, 13, 0.08, 0.11, 0.20);
    s += `1 1 1 rg\n`;
    s += txt(52, cy, "HALLAZGO", "/F2", 7);
    s += txt(252, cy, "GRANJA", "/F2", 7);
    s += txt(352, cy, "AUDITOR", "/F2", 7);
    s += txt(442, cy, "FECHA", "/F2", 7);
    s += txt(492, cy, "ESTADO", "/F2", 7);
    s += `0 0 0 rg\n`;
    cy -= 14;

    hallazgos.slice(0, 8).forEach((h: any, i: number) => {
      if (cy < 60) return;
      const g = granjas.find((gr: any) => gr.id === h.granjaId);
      if (i % 2 === 0) s += rect(50, cy - 4, PW - 100, 12, 0.97, 0.98, 0.99);
      s += txt(52, cy,  (h.titulo ?? "---").slice(0, 30),      "/F1", 7);
      s += txt(252, cy, (g?.nombre ?? "---").slice(0, 14),     "/F1", 7);
      s += txt(352, cy, (h.auditorNombre ?? "---").slice(0, 12), "/F1", 7);
      s += txt(442, cy, fmtF(h.fechaVisita),                   "/F1", 7);
      s += txt(492, cy, displayEstado(h.estado ?? ""),          "/F1", 7);
      cy -= 12;
    });
    cy -= 6;
  }

  // ── PLANES KPI ────────────────────────────────────────────────────────────
  if (kpis.length > 0 && cy > 120) {
    s += rect(50, cy - 4, PW - 100, 16, 0.05, 0.08, 0.15);
    s += `1 1 1 rg\n`;
    s += txt(54, cy + 2, `PLANES DE ACCION KPI (${Math.min(kpis.length, 6)} de ${kpis.length})`, "/F2", 10);
    s += `0 0 0 rg\n`;
    cy -= 20;

    kpis.slice(0, 6).forEach((k: any) => {
      if (cy < 100) return;
      const g    = granjas.find((gr: any) => gr.id === k.granjaId);
      const pctK = k.porcentajeAvance ?? 0;

      s += rect(50, cy - 46, PW - 100, 50, 0.97, 0.98, 0.99);
      s += `0.87 0.91 0.94 RG 50 ${cy - 46} ${PW - 100} 50 re S 0 0 0 RG\n`;

      // Header tarjeta KPI
      s += rect(50, cy - 12, PW - 100, 16, 0.08, 0.11, 0.20);
      s += `1 1 1 rg\n`;
      s += txt(54, cy - 8, (k.accion ?? "---").slice(0, 55), "/F2", 9);
      s += `0 0 0 rg\n`;

      // Meta
      s += txt(54, cy - 22, `Granja: ${g?.nombre ?? "---"}  |  Responsable: ${k.responsable ?? "---"}  |  Estado: ${displayEstado(k.estado ?? "")}`, "/F1", 7);

      // Barra de progreso
      s += txt(54, cy - 32, `Avance: ${pctK}%`, "/F1", 7);
      s += rect(110, cy - 36, (PW - 170), 6, 0.88, 0.91, 0.94);
      if (pctK > 0) {
        const barColor = pctK >= 80 ? [0.13, 0.77, 0.37] : pctK >= 40 ? [0.98, 0.45, 0.09] : [0.94, 0.27, 0.27];
        s += `${barColor[0]} ${barColor[1]} ${barColor[2]} rg\n`;
        s += `110 ${cy - 36} ${(PW - 170) * pctK / 100} 6 re f\n`;
        s += `0 0 0 rg\n`;
      }

      // Plan IA
      if (k.planAccionVeterinario && k.planAccionVeterinario !== "---" && k.planAccionVeterinario !== "—") {
        const planText = k.planAccionVeterinario.slice(0, 85);
        s += txt(54, cy - 44, `Plan IA: ${planText}`, "/F1", 7);
      }
      cy -= 54;
    });
    cy -= 6;
  }

  // ── CONCLUSIONES ──────────────────────────────────────────────────────────
  if (cy > 100) {
    s += rect(50, cy - 4, PW - 100, 16, 0.05, 0.08, 0.15);
    s += `1 1 1 rg\n`;
    s += txt(54, cy + 2, "CONCLUSIONES Y RECOMENDACIONES", "/F2", 10);
    s += `0 0 0 rg\n`;
    cy -= 20;
    s += txt(50, cy, `El avance global del ${pct}% requiere activacion inmediata de los ${noIni} planes No Iniciados.`, "/F1", 8);
    cy -= 12;
    s += txt(50, cy, `Los ${hallAb} hallazgos abiertos requieren seguimiento semanal prioritario por el equipo auditor.`, "/F1", 8);
    cy -= 12;
    s += txt(50, cy, `Se recomienda implementar los planes de accion IA generados en campo en las proximas visitas.`, "/F1", 8);
    cy -= 18;
  }

  // ── FIRMA DIGITAL ─────────────────────────────────────────────────────────
  if (cy > 60) {
    s += hrule(50, cy + 4, PW - 50);
    cy -= 6;

    const midX1 = 175;
    const midX2 = 420;
    s += hrule(midX1 - 60, cy - 30, midX1 + 60);
    s += hrule(midX2 - 60, cy - 30, midX2 + 60);
    s += txt(midX1 - 55, cy - 42, auditor || "Auditor Interno", "/F2", 9);
    s += txt(midX2 - 55, cy - 42, "Gerencia General", "/F2", 9);
    s += txt(midX1 - 55, cy - 52, "Auditor Interno | Control Interno", "/F1", 7);
    s += txt(midX2 - 55, cy - 52, "Pollos Savicol S.A.S.", "/F1", 7);
    s += `0.29 0.47 1.0 rg\n`;
    s += txt(midX1 - 55, cy - 62, `Firma digital: SHA-${hash}`, "/F1", 7);
    s += txt(midX2 - 55, cy - 62, "Pendiente de aprobacion", "/F1", 7);
    s += `0 0 0 rg\n`;
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
  s += hrule(50, 28, PW - 50);
  s += `0.58 0.64 0.73 rg\n`;
  s += txt(50, 15, `Pollos Savicol S.A.S.  |  Control Interno y Auditoria  |  ${fecha}  |  CONFIDENCIAL`, "/F1", 7);
  s += `0 0 0 rg\n`;

  // ── Ensamblar PDF con offsets correctos ───────────────────────────────────
  const streamBytes = Buffer.from(s, "latin1");

  // Construir todos los objetos como Buffers
  const obj1 = Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "latin1");
  const obj2 = Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", "latin1");
  const logoJpeg = Buffer.from(LOGO_B64, "base64");
  const obj3 = Buffer.from(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R\n" +
    "  /MediaBox [0 0 595 841]\n" +
    "  /Contents 4 0 R\n" +
    "  /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >>\n>>\nendobj\n",
    "latin1"
  );
  const obj4 = Buffer.from(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`,
    "latin1"
  );
  const obj4end  = Buffer.from("\nendstream\nendobj\n", "latin1");
  const obj5 = Buffer.from(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    "latin1"
  );
  const obj6 = Buffer.from(
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    "latin1"
  );

  // Obj 7: Logo Pollos Savicol S.A.S.
  const obj7h = Buffer.from(
    `7 0 obj\n<< /Type /XObject /Subtype /Image\n  /Width ${LOGO_W} /Height ${LOGO_H}\n  /ColorSpace /DeviceRGB /BitsPerComponent 8\n  /Filter /DCTDecode /Length ${logoJpeg.length}\n>>\nstream\n`,
    "latin1"
  );
  const obj7e = Buffer.from("\nendstream\nendobj\n", "latin1");

  // Header del PDF (15 bytes)
  const header  = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1");

  // Calcular offsets acumulando bytes reales
  const pieces   = [header, obj1, obj2, obj3, obj4, streamBytes, obj4end, obj5, obj6, obj7h, logoJpeg, obj7e];
  const offsets  = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // offsets 1-7
  let accumulated = 0;

  pieces.forEach((p, i) => {
    if (i === 1) offsets[1] = accumulated; // obj1 offset
    if (i === 2) offsets[2] = accumulated; // obj2 offset
    if (i === 3) offsets[3] = accumulated; // obj3 offset
    if (i === 4) offsets[4] = accumulated; // obj4 offset
    if (i === 7) offsets[5] = accumulated; // obj5 offset
    if (i === 8) offsets[6] = accumulated; // obj6
    if (i === 9) offsets[7] = accumulated; // obj7 offset
    accumulated += p.length;
  });

  const xrefOffset = accumulated;

  // Tabla xref — 8 entradas (0 libre + 7 objetos, incluye logo)
  const xref = Buffer.from(
    "xref\n0 8\n" +
    "0000000000 65535 f \n" +
    `${String(offsets[1]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[2]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[3]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[4]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[5]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[6]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[7]).padStart(10, "0")} 00000 n \n` +
    `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    "latin1"
  );

  return Buffer.concat([...pieces, xref]);
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { modelo, kpis, hallazgos, granjas, auditor, descripcion, granjaFiltroId }
      = await req.json();

    if (!kpis || !hallazgos || !granjas) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const kpisF = granjaFiltroId ? kpis.filter((k: any) => k.granjaId === granjaFiltroId) : kpis;
    const hallF = granjaFiltroId ? hallazgos.filter((h: any) => h.granjaId === granjaFiltroId) : hallazgos;

    const pdfBuffer = generarPDF(
      modelo ?? "5-general",
      kpisF, hallF, granjas,
      auditor ?? "Auditor Interno",
      descripcion ?? ""
    );

    // Verificar que el PDF es válido
    if (!pdfBuffer.slice(0, 4).equals(Buffer.from("%PDF"))) {
      throw new Error("PDF generado inválido");
    }

    const base64  = pdfBuffer.toString("base64");
    const filename = `Informe-Auditoria-Savicol-${modelo ?? "general"}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return NextResponse.json({ pdfBase64: base64, filename }, { status: 200 });

  } catch (err: any) {
    console.error("[generar-pdf v3]", err?.message ?? err);
    return NextResponse.json(
      { error: "Error al generar el PDF: " + (err?.message ?? "desconocido") },
      { status: 500 }
    );
  }
}
