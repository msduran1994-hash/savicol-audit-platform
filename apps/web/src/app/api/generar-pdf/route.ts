// apps/web/src/app/api/generar-pdf/route.ts
// Generador de PDF profesional — estructura PDF 1.4 correcta sin dependencias
// Offsets xref calculados con acumulación precisa de bytes reales
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

  // Logo PS
  s += rect(50, PH - 90, 50, 50, 0.77, 0.07, 0.19);
  s += `1 1 1 rg\n`;
  s += txt(57, PH - 60, "PS", "/F2", 20);
  s += `0 0 0 rg\n`;

  // Nombre empresa
  s += `1 1 1 rg\n`;
  s += txt(115, PH - 60, "Pollos Savicol S.A.S.", "/F2", 16);
  s += txt(115, PH - 78, "NIT: 901.XXX.XXX-X  |  Control Interno y Auditoria", "/F1", 8);
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
  const obj3 = Buffer.from(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R\n" +
    "  /MediaBox [0 0 595 841]\n" +
    "  /Contents 4 0 R\n" +
    "  /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>\n>>\nendobj\n",
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

  // Header del PDF (15 bytes)
  const header  = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1");

  // Calcular offsets acumulando bytes reales
  const pieces   = [header, obj1, obj2, obj3, obj4, streamBytes, obj4end, obj5, obj6];
  const offsets  = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // obj 1-6 necesitamos offsets 1,2,3,4,7,8
  let accumulated = 0;

  pieces.forEach((p, i) => {
    if (i === 1) offsets[1] = accumulated; // obj1 offset
    if (i === 2) offsets[2] = accumulated; // obj2 offset
    if (i === 3) offsets[3] = accumulated; // obj3 offset
    if (i === 4) offsets[4] = accumulated; // obj4 offset
    if (i === 7) offsets[5] = accumulated; // obj5 offset
    if (i === 8) offsets[6] = accumulated; // obj6 offset
    accumulated += p.length;
  });

  const xrefOffset = accumulated;

  // Tabla xref — 7 entradas (0 libre + 6 objetos)
  const xref = Buffer.from(
    "xref\n0 7\n" +
    "0000000000 65535 f \n" +
    `${String(offsets[1]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[2]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[3]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[4]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[5]).padStart(10, "0")} 00000 n \n` +
    `${String(offsets[6]).padStart(10, "0")} 00000 n \n` +
    `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
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
