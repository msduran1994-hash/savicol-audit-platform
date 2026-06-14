import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Tipo de cada imagen de evidencia recibida
interface EvidenciaImg {
  mediaType: string;   // "image/jpeg" | "image/webp" | "image/png"
  data: string;        // base64 SIN el prefijo data:...;base64,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      accion, tipoRiesgo, estadoHallazgo, nombreGranja, descripcionHallazgo,
      auditor, categoria, criticidad,
      evidencias,   // EvidenciaImg[] — imágenes opcionales
    } = body;

    if (!accion || typeof accion !== "string" || !accion.trim()) {
      return NextResponse.json({ error: "El campo 'accion' es obligatorio" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada en Vercel." }, { status: 503 });
    }

    // ── Construir el prompt de texto ──────────────────────────────────────────
    const fotosCount = Array.isArray(evidencias) ? evidencias.length : 0;
    const promptText = [
      "Eres auditor de bioseguridad avícola con experiencia en granjas colombianas de Savicol.",
      "Genera un plan de acción correctivo para el siguiente hallazgo.",
      "",
      `Granja: ${nombreGranja || "Granja Savicol"}`,
      `Hallazgo: ${accion.trim()}`,
      descripcionHallazgo ? `Descripción: ${descripcionHallazgo}` : "",
      auditor      ? `Auditor que registró el hallazgo: ${auditor}` : "",
      `Tipo de riesgo: ${tipoRiesgo || "Operativo"}`,
      categoria    ? `Categoría: ${categoria}` : "",
      criticidad   ? `Criticidad: ${criticidad}` : "",
      `Estado actual: ${estadoHallazgo || "Abierto"}`,
      fotosCount > 0
        ? `\nSe adjuntan ${fotosCount} evidencia(s) fotográfica(s) del hallazgo. Analízalas y considera lo que muestran (condiciones reales, deficiencias visibles, riesgos sanitarios) al elaborar el plan.`
        : "",
      "",
      "INSTRUCCIONES: Máximo 80 palabras en un solo párrafo. Profesional, claro y accionable.",
      "Incluye acción concreta, responsable sugerido y plazo. Sin introducciones. Comienza directo.",
    ].filter(Boolean).join("\n");

    // ── Construir el contenido del mensaje (texto + imágenes) ──────────────────
    const content: any[] = [];

    // Adjuntar hasta 4 imágenes (límite razonable de tokens/tamaño)
    if (Array.isArray(evidencias) && evidencias.length > 0) {
      for (const ev of evidencias.slice(0, 4)) {
        if (ev?.data && ev?.mediaType) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: ev.mediaType,
              data: ev.data,
            },
          });
        }
      }
    }

    // El texto va al final (las imágenes primero ayudan al análisis visual)
    content.push({ type: "text", text: promptText });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        messages: [{ role: "user", content }],
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
    const plan = data.content?.[0]?.text?.trim() ?? "";

    if (!plan) {
      return NextResponse.json({ error: "No se pudo generar el plan." }, { status: 500 });
    }

    return NextResponse.json({ plan, analizadas: fotosCount }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
