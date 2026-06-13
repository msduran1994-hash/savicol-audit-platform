// apps/web/src/app/api/ai/generar-plan/route.ts
// ─── API Route Next.js — Proxy seguro para Anthropic IA ──────────────────────
// Esta ruta actúa como proxy entre el frontend y la API de Anthropic.
// La ANTHROPIC_API_KEY nunca se expone al browser — solo existe en el servidor.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Edge runtime para latencia mínima

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion, tipoRiesgo, estadoHallazgo, nombreGranja, descripcionHallazgo } = body;

    // Validación de entrada
    if (!accion || typeof accion !== "string" || !accion.trim()) {
      return NextResponse.json(
        { error: "El campo 'accion' es obligatorio" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Servicio IA no configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    // Construir el prompt especializado
    const prompt = [
      "Eres un auditor de bioseguridad avícola con experiencia en granjas colombianas de la empresa Savicol.",
      "Genera un plan de acción correctivo para el siguiente hallazgo de auditoría.",
      "",
      `Granja: ${nombreGranja || "Granja Savicol"}`,
      `Hallazgo detectado: ${accion.trim()}`,
      descripcionHallazgo ? `Descripción adicional: ${descripcionHallazgo}` : "",
      `Tipo de riesgo: ${tipoRiesgo || "Operativo"}`,
      `Estado actual: ${estadoHallazgo || "Abierto"}`,
      "",
      "INSTRUCCIONES:",
      "- Máximo 80 palabras.",
      "- Un solo párrafo continuo (sin listas ni viñetas).",
      "- Lenguaje profesional, claro y humano.",
      "- Incluye: acción concreta, responsable sugerido, plazo estimado.",
      "- Específico para granjas avícolas colombianas.",
      "- No uses introducciones como 'Se recomienda' o 'Plan de acción:'.",
      "- Comienza directamente con la acción a tomar.",
    ].filter(Boolean).join("\n");

    // Llamar a la API de Anthropic desde el servidor (sin CORS)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001", // Haiku: rápido y económico para planes cortos
        max_tokens: 200,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI Route] Anthropic error:", response.status, errText);
      return NextResponse.json(
        { error: "Error al conectar con el servicio IA. Intenta nuevamente." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const plan = data.content?.[0]?.text?.trim() ?? "";

    if (!plan) {
      return NextResponse.json(
        { error: "No se pudo generar el plan. Intenta nuevamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan }, { status: 200 });

  } catch (err: any) {
    console.error("[AI Route] Error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Error interno del servidor IA." },
      { status: 500 }
    );
  }
}
