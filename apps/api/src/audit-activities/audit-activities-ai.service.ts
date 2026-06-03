// ═══════════════════════════════════════════════════════════════════════════════
// AI Service · Resumen ejecutivo del cronograma
// ═══════════════════════════════════════════════════════════════════════════════
// Dos modos:
//   1. Si ANTHROPIC_API_KEY está seteada → usa Claude para resumen rico
//   2. Sino → fallback al heurístico del executive service (ya incluido)
//
// La respuesta incluye un disclaimer del modo usado para trazabilidad.
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AiSummaryInput {
  kpis: Record<string, number>;
  alertas: Array<{ severity: string; title: string; description: string }>;
  topAreas: Array<{ area: string; Cumplimiento: number; Actividades: number }>;
  ranking: Array<{ auditorName: string; completionRate: number; totalAssigned: number }>;
  calidadDatos: { score: number; issuesTotal: number; duplicados: number };
  heuristico: { resumen: string[]; recomendaciones: string[]; estado: string };
}

@Injectable()
export class AuditActivitiesAiService {
  private readonly logger = new Logger(AuditActivitiesAiService.name);

  constructor(private config: ConfigService) {}

  async generateSummary(input: AiSummaryInput): Promise<{
    mode: "claude" | "heuristic";
    resumen: string[];
    recomendaciones: string[];
    riesgos: string[];
    oportunidades: string[];
    generadoEn: string;
  }> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");

    if (apiKey) {
      try {
        return await this.callClaude(apiKey, input);
      } catch (e: any) {
        this.logger.warn(`Claude call failed (${e?.message}) · fallback to heuristic`);
        // fallthrough a heurístico
      }
    }

    return this.heuristicResponse(input);
  }

  // ────────────────────────────────────────────────────────
  // CLAUDE (opcional · solo si ANTHROPIC_API_KEY)
  // ────────────────────────────────────────────────────────
  private async callClaude(apiKey: string, input: AiSummaryInput) {
    const prompt = this.buildPrompt(input);

    // Llamada directa a la API sin SDK (evita dependencia extra)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",  // económico para resúmenes
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Anthropic API ${response.status}: ${txt.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const text = data?.content?.[0]?.text ?? "";

    // Parsear secciones de la respuesta de Claude (formato esperado en el prompt)
    const sections = this.parseClaudeResponse(text);

    return {
      mode: "claude" as const,
      ...sections,
      generadoEn: new Date().toISOString(),
    };
  }

  private buildPrompt(input: AiSummaryInput): string {
    return `Eres un analista ejecutivo experto en auditoría interna. Analiza los siguientes datos del cronograma anual de auditoría de Savicol (planta avícola colombiana) y genera un informe ejecutivo conciso, accionable, en español formal de Colombia.

DATOS DEL CRONOGRAMA:
- Actividades planificadas: ${input.kpis.actividadesPlanificadas}
- Completadas: ${input.kpis.actividadesCompletadas}
- En curso: ${input.kpis.actividadesEnCurso}
- Vencidas: ${input.kpis.actividadesVencidas}
- % cumplimiento: ${input.kpis.porcentajeCumplimientoGeneral}%
- Avance ponderado: ${input.kpis.avanceAcumuladoPonderado}%
- Índice calidad: ${input.kpis.indiceCalidadCronograma}%
- Cobertura áreas: ${input.kpis.coberturaAuditoria}%
- Hallazgos identificados: ${input.kpis.totalHallazgos}

ALERTAS ACTIVAS:
${input.alertas.map(a => `- [${a.severity}] ${a.title}`).join("\n")}

TOP ÁREAS:
${input.topAreas.map(a => `- ${a.area}: ${a.Cumplimiento}% (${a.Actividades} actividades)`).join("\n")}

TOP AUDITORES:
${input.ranking.slice(0, 5).map(a => `- ${a.auditorName}: ${a.completionRate}% (${a.totalAssigned} asignadas)`).join("\n")}

CALIDAD DE DATOS:
- Score: ${input.calidadDatos.score}/100 · ${input.calidadDatos.issuesTotal} issues · ${input.calidadDatos.duplicados} duplicados

ESTRUCTURA REQUERIDA (responde EXACTAMENTE con estos 4 bloques · sin texto extra):

## RESUMEN
- bullet 1
- bullet 2
- bullet 3

## RECOMENDACIONES
- bullet 1
- bullet 2
- bullet 3

## RIESGOS
- bullet 1
- bullet 2

## OPORTUNIDADES
- bullet 1
- bullet 2

Máximo 4 bullets por sección. Enfoque ejecutivo · gerencial · accionable.`;
  }

  private parseClaudeResponse(text: string): {
    resumen: string[];
    recomendaciones: string[];
    riesgos: string[];
    oportunidades: string[];
  } {
    const sections: Record<string, string[]> = {
      resumen: [], recomendaciones: [], riesgos: [], oportunidades: [],
    };

    const sectionMap: Record<string, string> = {
      "RESUMEN":         "resumen",
      "RECOMENDACIONES": "recomendaciones",
      "RIESGOS":         "riesgos",
      "OPORTUNIDADES":   "oportunidades",
    };

    let current: string | null = null;
    for (const line of text.split("\n")) {
      const header = line.replace(/^##\s*/, "").trim().toUpperCase();
      if (sectionMap[header]) {
        current = sectionMap[header];
        continue;
      }
      const bullet = line.match(/^[-*•]\s+(.+)/);
      if (bullet && current) {
        sections[current].push(bullet[1].trim());
      }
    }

    return {
      resumen:         sections.resumen,
      recomendaciones: sections.recomendaciones,
      riesgos:         sections.riesgos,
      oportunidades:   sections.oportunidades,
    };
  }

  // ────────────────────────────────────────────────────────
  // HEURÍSTICO (fallback · siempre disponible)
  // ────────────────────────────────────────────────────────
  private heuristicResponse(input: AiSummaryInput) {
    const k = input.kpis;
    const riesgos: string[] = [];
    const oportunidades: string[] = [];

    if (k.actividadesVencidas > 0) {
      riesgos.push(`${k.actividadesVencidas} actividades vencidas pueden generar incumplimientos regulatorios`);
    }
    if (k.indiceCalidadCronograma < 70) {
      riesgos.push("Calidad de cronograma baja · alta tasa de tareas fuera de plazo");
    }
    if (k.coberturaAuditoria < 80) {
      riesgos.push(`Cobertura incompleta (${k.coberturaAuditoria}%) · áreas sin auditar quedan expuestas`);
    }
    if (input.calidadDatos.score < 70) {
      riesgos.push(`Baja calidad de datos del cronograma (score ${input.calidadDatos.score}/100)`);
    }

    if (k.actividadesEnCurso > 0) {
      oportunidades.push(`${k.actividadesEnCurso} actividades en curso pueden completarse esta semana con seguimiento activo`);
    }
    const topAuditor = input.ranking[0];
    if (topAuditor && topAuditor.completionRate >= 80) {
      oportunidades.push(`Aprovechar el desempeño de ${topAuditor.auditorName} (${topAuditor.completionRate}%) para mentoring del equipo`);
    }
    if (k.totalHallazgos > 0) {
      oportunidades.push(`${k.totalHallazgos} hallazgos detectados · oportunidad de implementar acciones correctivas estructurales`);
    }

    if (riesgos.length === 0) riesgos.push("Sin riesgos críticos detectados en este período");
    if (oportunidades.length === 0) oportunidades.push("Continuar la disciplina operativa actual");

    return {
      mode: "heuristic" as const,
      resumen:         input.heuristico.resumen,
      recomendaciones: input.heuristico.recomendaciones,
      riesgos,
      oportunidades,
      generadoEn: new Date().toISOString(),
    };
  }
}
