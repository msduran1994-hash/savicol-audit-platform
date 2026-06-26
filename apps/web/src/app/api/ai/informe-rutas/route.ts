import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// ════════════════════════════════════════════════════════════════════════════
// Endpoint · Informe Ejecutivo RUTAS (Acompañamiento a Rutas)
// Recibe el contexto consolidado de los acompañamientos filtrados (Consolidado +
// Cumplimiento + Evidencias) y devuelve, en UNA sola llamada, las secciones
// narrativas del informe en formato JSON. Basado EXCLUSIVAMENTE en datos reales.
// Conector autorizado: Anthropic. Si no hay clave, el cliente usa narrativa
// determinista de respaldo (el informe se genera igual con datos reales).
// ════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      alcance,         // { cliente, ruta, auditor, riesgo, desde, hasta }
      indicadores,     // { total, criticos, altos, conHallazgos, valorCOP, kg, cumplimiento, cobertura }
      acompanamientos, // [{ fecha, cliente, ruta, auditor, motivo, criticidad, estado, riesgos, valorCOP }]
      planes,          // [{ hallazgo, responsable, estado, avance, fechaCompromiso }]
    } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada." }, { status: 503 });
    }

    const al = alcance || {};
    const ind = indicadores || {};

    const acompTxt = Array.isArray(acompanamientos) && acompanamientos.length > 0
      ? acompanamientos.slice(0, 60).map((a: any, i: number) =>
          `${i + 1}. ${a.fecha || "—"} · Cliente: ${a.cliente || "—"} · Ruta: ${a.ruta || "—"} · Auditor: ${a.auditor || "—"} · Motivo: ${a.motivo || "—"} (Criticidad: ${a.criticidad || "—"}, Estado: ${a.estado || "—"}, Riesgos: ${(a.riesgos || []).join(", ") || "—"})`
        ).join("\n").slice(0, 4500)
      : "Sin acompañamientos en el alcance.";

    const planesTxt = Array.isArray(planes) && planes.length > 0
      ? planes.slice(0, 40).map((p: any, i: number) =>
          `${i + 1}. ${p.hallazgo || "—"} (Responsable: ${p.responsable || "—"}, Estado: ${p.estado || "—"}, Avance: ${p.avance ?? 0}%, Compromiso: ${p.fechaCompromiso || "—"})`
        ).join("\n").slice(0, 2500)
      : "Sin planes de acción registrados.";

    const contexto = [
      "ALCANCE DEL INFORME (filtros aplicados):",
      `Cliente: ${al.cliente || "Todos"} · Ruta: ${al.ruta || "Todas"} · Auditor: ${al.auditor || "Todos"} · Riesgo: ${al.riesgo || "Todos"} · Periodo: ${al.desde || "inicio"} a ${al.hasta || "hoy"}`,
      "",
      `INDICADORES: ${ind.total ?? 0} acompañamientos auditados, ${ind.conHallazgos ?? 0} con hallazgos (${ind.criticos ?? 0} críticos, ${ind.altos ?? 0} altos). Impacto financiero: ${ind.valorCOP ?? "—"}. Mercancía devuelta: ${ind.kg ?? "—"}. Cumplimiento de planes: ${ind.cumplimiento ?? 0}%.`,
      "",
      "ACOMPAÑAMIENTOS (Consolidado):",
      acompTxt,
      "",
      "PLANES DE ACCIÓN (Cumplimiento):",
      planesTxt,
    ].join("\n");

    const promptText = [
      "Eres Director de Auditoría Interna de Pollos Savicol S.A.S. (empresa avícola colombiana), redactando un informe ejecutivo de auditoría sobre el acompañamiento a rutas de distribución, dirigido a la Gerencia y la Alta Dirección.",
      "Con base EXCLUSIVAMENTE en los datos reales que se presentan abajo, redacta las secciones narrativas del informe.",
      "",
      contexto,
      "",
      "INSTRUCCIONES CRÍTICAS:",
      "- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin ```json, sin texto antes o después.",
      "- Cada sección debe ser profesional, técnica, ejecutiva y ESPECÍFICA a estos datos reales.",
      "- NO inventes datos, cifras, normas ni hechos que no estén en el contexto. Si algo no consta, mantente general pero veraz.",
      "- Español formal de auditoría corporativa. Sin introducciones tipo 'A continuación...'.",
      "- Redacta en primera persona institucional como el equipo de auditoría humano. NUNCA menciones 'IA', 'inteligencia artificial', 'modelo', 'asistente' ni cómo se generó el texto. El informe debe leerse como redactado íntegramente por el auditor.",
      "",
      "El JSON debe tener EXACTAMENTE estas claves (todas string, prosa de 3-5 frases salvo indicación):",
      "{",
      '  "resumenEjecutivo": "Resumen ejecutivo gerencial de la operación logística auditada y su nivel de cumplimiento.",',
      '  "objetivo": "Objetivo de la auditoría contextualizado a los clientes, rutas y hallazgos evaluados.",',
      '  "alcance": "Alcance de la auditoría: registros evaluados, periodo, cobertura y evidencias.",',
      '  "diagnosticoGeneral": "Diagnóstico general del estado, cumplimiento, riesgos y hallazgos.",',
      '  "tendencias": "Tendencias: comportamiento en el tiempo, frecuencia de hallazgos y riesgos recurrentes.",',
      '  "evaluacionOperativa": "Evaluación operativa: desempeño, seguimiento y cumplimiento de compromisos.",',
      '  "recomendaciones": "Recomendaciones ejecutivas: acciones correctivas, preventivas y oportunidades de mejora (4-6 frases).",',
      '  "conclusionesGenerales": "Conclusiones generales.",',
      '  "conclusionesOperativas": "Conclusiones operativas.",',
      '  "conclusionesEstrategicas": "Conclusiones estratégicas."',
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
        max_tokens: 2200,
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
    texto = texto.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

    let secciones: Record<string, string>;
    try {
      secciones = JSON.parse(texto);
    } catch {
      return NextResponse.json(
        { error: "Respuesta no fue un JSON válido", raw: texto.slice(0, 500) },
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
