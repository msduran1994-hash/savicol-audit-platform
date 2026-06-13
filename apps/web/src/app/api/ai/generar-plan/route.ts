import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion, tipoRiesgo, estadoHallazgo, nombreGranja, descripcionHallazgo } = body;

    if (!accion || typeof accion !== "string" || !accion.trim()) {
      return NextResponse.json({ error: "El campo 'accion' es obligatorio" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada en Vercel." }, { status: 503 });
    }

    const prompt = [
      "Eres auditor de bioseguridad avícola con experiencia en granjas colombianas de Savicol.",
      "Genera un plan de acción correctivo para el siguiente hallazgo.",
      "",
      `Granja: ${nombreGranja || "Granja Savicol"}`,
      `Hallazgo: ${accion.trim()}`,
      descripcionHallazgo ? `Descripción: ${descripcionHallazgo}` : "",
      `Tipo de riesgo: ${tipoRiesgo || "Operativo"}`,
      `Estado actual: ${estadoHallazgo || "Abierto"}`,
      "",
      "INSTRUCCIONES: Máximo 80 palabras en un solo párrafo. Profesional, claro y accionable.",
      "Incluye acción concreta, responsable sugerido y plazo. Sin introducciones. Comienza directo.",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    // Retornar el error exacto de Anthropic para diagnóstico
    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Anthropic HTTP ${response.status}`, detail: errorBody },
        { status: 502 }
      );
    }

    const data = await response.json();
    const plan = data.content?.[0]?.text?.trim() ?? "";

    if (!plan) {
      return NextResponse.json({ error: "No se pudo generar el plan." }, { status: 500 });
    }

    return NextResponse.json({ plan }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
