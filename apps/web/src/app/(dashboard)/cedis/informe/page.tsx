import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// ════════════════════════════════════════════════════════════════════════════
// Endpoint IA · Informe Ejecutivo CEDIS
// Recibe el contexto consolidado de UNA auditoría (CEDI + fecha) y devuelve, en
// UNA sola llamada, todas las secciones narrativas del informe en formato JSON.
// Optimiza tokens vs. 10 llamadas separadas. Basado en datos reales recibidos.
// ════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cedi,            // nombre del CEDI
      fechaVisita,     // fecha de la visita
      auditor,         // auditor responsable
      administrador,   // líder/administrador del proceso
      hallazgos,       // [{ categoria, subtema, titulo, descripcion, criticidad, estado, tipoRiesgo }]
      planes,          // [{ titulo, responsable, estado, fechaCompromiso, recomendacionIA }]
      indicadores,     // { total, criticos, altos, abiertos, cerrados, cumplimiento }
      observaciones,   // texto consolidado de las áreas auditadas (Consolidado)
    } = body;

    if (!cedi || typeof cedi !== "string") {
      return NextResponse.json({ error: "El campo 'cedi' es obligatorio" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada en Vercel." }, { status: 503 });
    }

    // ── Resumir el contexto real para el prompt ───────────────────────────────
    const hallazgosTxt = Array.isArray(hallazgos) && hallazgos.length > 0
      ? hallazgos.map((h: any, i: number) =>
          `${i + 1}. [${h.categoria || "—"} · ${h.subtema || "—"}] ${h.titulo || "—"} — ${h.descripcion || ""} (Criticidad: ${h.criticidad || "—"}, Estado: ${h.estado || "—"}, Riesgo: ${h.tipoRiesgo || "—"})`
        ).join("\n").slice(0, 4000)
      : "Sin hallazgos registrados.";

    const planesTxt = Array.isArray(planes) && planes.length > 0
      ? planes.map((p: any, i: number) =>
          `${i + 1}. ${p.titulo || "—"} (Responsable: ${p.responsable || "—"}, Estado: ${p.estado || "—"}, Compromiso: ${p.fechaCompromiso || "—"})`
        ).join("\n").slice(0, 2000)
      : "Sin planes de acción registrados.";

    const ind = indicadores || {};
    const contexto = [
      `CEDI evaluado: ${cedi}`,
      `Fecha de visita: ${fechaVisita || "—"}`,
      `Auditor responsable: ${auditor || "—"}`,
      `Líder/Administrador del proceso: ${administrador || "—"}`,
      "",
      `Indicadores: ${ind.total ?? 0} hallazgos (${ind.criticos ?? 0} críticos, ${ind.altos ?? 0} altos, ${ind.abiertos ?? 0} abiertos, ${ind.cerrados ?? 0} cerrados). Cumplimiento: ${ind.cumplimiento ?? 0}%.`,
      "",
      "HALLAZGOS IDENTIFICADOS:",
      hallazgosTxt,
      "",
      "PLANES DE ACCIÓN:",
      planesTxt,
      observaciones ? `\nOBSERVACIONES DE ÁREAS AUDITADAS:\n${String(observaciones).slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n");

    const promptText = [
      "Eres Director de Auditoría Interna de Pollos Savicol S.A.S. (empresa avícola colombiana), redactando un informe ejecutivo de auditoría para un Centro de Distribución (CEDI), dirigido a la gerencia.",
      "Con base EXCLUSIVAMENTE en los datos reales de la auditoría que se presentan abajo, redacta las secciones narrativas del informe.",
      "",
      contexto,
      "",
      "INSTRUCCIONES CRÍTICAS:",
      "- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin ```json, sin texto antes o después.",
      "- Cada sección debe ser profesional, técnica, ejecutiva y ESPECÍFICA a este CEDI y sus hallazgos reales.",
      "- NO inventes datos, cifras, normas ni hechos que no estén en el contexto. Si algo no consta, mantente general pero veraz.",
      "- Español formal de auditoría corporativa. Sin introducciones tipo 'A continuación...'.",
      "",
      "El JSON debe tener EXACTAMENTE estas claves (todas string, prosa de 2-4 frases salvo indicación):",
      "{",
      '  "resumenEjecutivo": "Resumen ejecutivo gerencial del estado del CEDI auditado (3-5 frases).",',
      '  "objetivo": "Objetivo de la auditoría según alcance, hallazgos y procesos auditados.",',
      '  "alcance": "Alcance de la auditoría.",',
      '  "enfoque": "Enfoque metodológico de la auditoría.",',
      '  "metodos": "Métodos y procedimientos técnicos aplicados.",',
      '  "marcoLegal": "Marco legal y normativo aplicable (normativa sanitaria avícola, control interno, INVIMA, ICA, etc. cuando aplique al contexto).",',
      '  "efectos": "Efectos y consecuencias potenciales de los hallazgos identificados.",',
      '  "controles": "Controles existentes identificados según los registros.",',
      '  "fortalezas": "Fortalezas identificadas a partir de los resultados.",',
      '  "conclusiones": "Conclusiones ejecutivas (3-5 frases).",',
      '  "recomendaciones": "Recomendaciones con enfoque ejecutivo y gerencial (3-5 frases)."',
      "}",
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: [{ type: "text", text: promptText }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Anthropic HTTP ${response.status}`, detail: errorBody },
        { status: 502 }
      );
    }

    const data = await response.json();
    let texto = data.content?.[0]?.text?.trim() ?? "";

    // Limpiar posibles fences de markdown
    texto = texto.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

    let secciones: Record<string, string>;
    try {
      secciones = JSON.parse(texto);
    } catch {
      // Si el modelo no devolvió JSON válido, devolver el texto como resumen
      return NextResponse.json(
        { error: "La IA no devolvió un JSON válido", raw: texto.slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({ secciones }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
