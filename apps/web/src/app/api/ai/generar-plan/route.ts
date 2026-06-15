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
      modo,         // "plan" (default) | "implementacion" | "recomendaciones"
      areaAuditada, // contexto adicional (ej. CEDIS / subtema)
    } = body;

    if (!accion || typeof accion !== "string" || !accion.trim()) {
      return NextResponse.json({ error: "El campo 'accion' es obligatorio" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada en Vercel." }, { status: 503 });
    }

    // ── Construir el prompt de texto según el modo ────────────────────────────
    const fotosCount = Array.isArray(evidencias) ? evidencias.length : 0;
    const contexto = [
      `Hallazgo: ${accion.trim()}`,
      descripcionHallazgo ? `Descripción detallada: ${descripcionHallazgo}` : "",
      areaAuditada ? `Área auditada: ${areaAuditada}` : "",
      nombreGranja ? `Ubicación/Unidad: ${nombreGranja}` : "",
      auditor      ? `Auditor: ${auditor}` : "",
      `Tipo de riesgo: ${tipoRiesgo || "Operativo"}`,
      categoria    ? `Categoría: ${categoria}` : "",
      criticidad   ? `Criticidad: ${criticidad}` : "",
      `Estado actual: ${estadoHallazgo || "Abierto"}`,
      fotosCount > 0
        ? `Se adjuntan ${fotosCount} evidencia(s) fotográfica(s); analízalas y considera lo que muestran.`
        : "",
    ].filter(Boolean).join("\n");

    let promptText: string;
    if (modo === "implementacion") {
      promptText = [
        "Eres auditor operacional senior de Savicol con experiencia en centros de distribución (CEDIS) avícolas en Colombia.",
        "Con base en el siguiente hallazgo, redacta un PLAN DE IMPLEMENTACIÓN accionable.",
        "",
        contexto,
        "",
        "INSTRUCCIONES: Máximo 2 párrafos breves (110 palabras total). En prosa profesional, integra de forma fluida:",
        "el plan de acción específico, las actividades sugeridas, las acciones preventivas y correctivas, y el resultado esperado.",
        "Específico al hallazgo, sin contenido genérico, sin introducciones. Comienza directo con la acción.",
      ].join("\n");
    } else if (modo === "recomendaciones") {
      promptText = [
        "Eres auditor operacional senior de Savicol con experiencia en centros de distribución (CEDIS) avícolas en Colombia.",
        "Con base en el siguiente hallazgo, redacta RECOMENDACIONES PROFESIONALES.",
        "",
        contexto,
        "",
        "INSTRUCCIONES: Máximo 2 párrafos breves (110 palabras total). En prosa profesional, integra de forma fluida:",
        "recomendaciones profesionales, buenas prácticas, acciones de seguimiento, controles preventivos y observaciones de mejora continua.",
        "Específico al hallazgo, sin contenido genérico, sin introducciones. Comienza directo.",
      ].join("\n");
    } else {
      // Modo "plan" original (compatibilidad con módulo KPI de Granjas)
      promptText = [
        "Eres auditor de bioseguridad avícola con experiencia en granjas colombianas de Savicol.",
        "Genera un plan de acción correctivo para el siguiente hallazgo.",
        "",
        contexto,
        "",
        "INSTRUCCIONES: Máximo 80 palabras en un solo párrafo. Profesional, claro y accionable.",
        "Incluye acción concreta, responsable sugerido y plazo. Sin introducciones. Comienza directo.",
      ].join("\n");
    }

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
        max_tokens: (modo === "implementacion" || modo === "recomendaciones") ? 320 : 250,
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
