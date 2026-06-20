"use client";
import { useMemo, useState } from "react";
import { useRutasStore } from "@/store/rutas.store";
import { useShallow } from "zustand/react/shallow";
import { formatCOP, formatKg } from "@/lib/rutas.constants";
import type { Acompanamiento, AccionCumplimiento } from "@/lib/rutas.types";
import { FileText, Download, X, FileSpreadsheet, Eye, Loader2, Printer, Check } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// FASE 2 · Generador de Informes Ejecutivos de Rutas
// Toma datos REALES de Consolidado (acompañamientos) + Cumplimiento (acciones).
// 5 modelos. Planes de acción automáticos desde hallazgos. Export PDF / CSV / Imprimir.
// ═══════════════════════════════════════════════════════════════════════════════

type ModeloKey = "gerencial" | "operacional" | "estrategico" | "corporativo" | "tecnico";

const MODELOS: { key: ModeloKey; titulo: string; sub: string; desc: string; icon: string }[] = [
  { key: "gerencial",   titulo: "Ejecutivo Gerencial", sub: "Para Gerencia General",     desc: "Resumen ejecutivo, riesgos relevantes, cumplimiento general y hallazgos principales.", icon: "🔷" },
  { key: "operacional", titulo: "Operacional",         sub: "Para Coordinación",         desc: "Actividades ejecutadas, clientes, motivos, hallazgos y evidencias.",                  icon: "🔧" },
  { key: "estrategico", titulo: "Estratégico",         sub: "Para Dirección",            desc: "Tendencias, comparativos, riesgos recurrentes y oportunidades de mejora.",          icon: "📈" },
  { key: "corporativo", titulo: "Corporativo",         sub: "Para Junta / Comité",       desc: "Consolidado general, auditorías, planes de acción e indicadores de desempeño.",     icon: "🏢" },
  { key: "tecnico",     titulo: "Técnico Detallado",   sub: "Para Auditoría",            desc: "Trazabilidad completa, hallazgos, seguimientos y cumplimiento detallado.",          icon: "🔬" },
];

// ─── Planes de acción automáticos por motivo / criticidad ──────────────────────
const CORRECTIVA: Record<string, string> = {
  "Producto Vencido":        "Retirar y dar de baja el producto vencido; conciliar inventario y notificar al cliente.",
  "Empaque Dañado":          "Reponer la unidad afectada y revisar manipulación en cargue/descargue.",
  "Cadena de Frío Rota":     "Verificar temperatura, descartar producto fuera de rango y revisar el equipo de frío.",
  "Producto No Solicitado":  "Retornar el producto a CEDIS y ajustar el pedido con el cliente.",
  "Diferencia de Peso":      "Repesar y emitir nota de ajuste; calibrar báscula del vehículo.",
  "Calidad No Conforme":     "Aislar el lote, abrir no conformidad de calidad y reponer al cliente.",
  "Cantidad Equivocada":     "Conciliar cantidades contra remisión y completar/retornar el faltante o sobrante.",
  "Entrega Tardía":          "Analizar la ruta y los tiempos; reprogramar entrega y avisar al cliente.",
  "Cliente Ausente":         "Reagendar la visita y confirmar ventana horaria con el cliente.",
  "Otro":                    "Gestionar la no conformidad con el cliente y registrar la corrección.",
};
function preventivaPorCrit(c: string): string {
  if (c === "Crítico") return "Plan de control reforzado, capacitación inmediata al equipo de ruta y verificación en próximas 3 entregas.";
  if (c === "Alto")    return "Refuerzo del procedimiento, checklist obligatorio y seguimiento en próximas 2 entregas.";
  if (c === "Medio")   return "Recordatorio del procedimiento y verificación en la siguiente entrega.";
  return "Monitoreo dentro del control rutinario.";
}
function seguimientoPorCrit(c: string): string {
  if (c === "Crítico") return "Seguimiento semanal hasta cierre verificado.";
  if (c === "Alto")    return "Seguimiento quincenal hasta cierre.";
  if (c === "Medio")   return "Seguimiento mensual.";
  return "Seguimiento en revisión periódica.";
}

interface PlanAuto {
  acompanamientoId: string; cliente: string; ruta: string; auditor: string;
  motivo: string; criticidad: string; correctiva: string; preventiva: string; seguimiento: string;
}
function planesAutomaticos(acomp: Acompanamiento[], acciones: AccionCumplimiento[]): PlanAuto[] {
  const conPlan = new Set(acciones.map((a) => a.acompanamientoId));
  return acomp
    .filter((a) => (a.estado === "Con Hallazgos" || a.criticidad === "Crítico" || a.criticidad === "Alto") && !conPlan.has(a.id))
    .map((a) => ({
      acompanamientoId: a.id, cliente: a.clienteNombre, ruta: a.rutaNombre, auditor: a.auditorNombre,
      motivo: a.motivo, criticidad: a.criticidad,
      correctiva: CORRECTIVA[a.motivo] ?? CORRECTIVA["Otro"],
      preventiva: preventivaPorCrit(a.criticidad),
      seguimiento: seguimientoPorCrit(a.criticidad),
    }));
}

// ─── Cálculo de indicadores ────────────────────────────────────────────────────
function calcular(acomp: Acompanamiento[], acciones: AccionCumplimiento[]) {
  const total = acomp.length;
  const valorTotal = acomp.reduce((s, a) => s + (a.valorDevueltoCOP || 0), 0);
  const kgTotal = acomp.reduce((s, a) => s + (a.cantidadKgDevueltos || 0), 0);
  const criticos = acomp.filter((a) => a.criticidad === "Crítico").length;
  const altos = acomp.filter((a) => a.criticidad === "Alto").length;
  const conHallazgos = acomp.filter((a) => a.estado === "Con Hallazgos").length;
  const completados = acomp.filter((a) => a.estado === "Completado" || a.estado === "Cerrado").length;
  const cerradasAcc = acciones.filter((a) => a.estado === "Cerrado" || a.estado === "Cerrado con Reincidencia").length;
  const reincidencias = acciones.filter((a) => a.estado === "Cerrado con Reincidencia" || a.reincidencia).length;
  const avance = acciones.length ? Math.round(acciones.reduce((s, a) => s + (a.porcentajeAvance || 0), 0) / acciones.length) : 0;
  const cumplimiento = total ? Math.round((completados / total) * 100) : 0;
  const tasaCierre = acciones.length ? Math.round((cerradasAcc / acciones.length) * 100) : 0;

  const by = (key: (a: Acompanamiento) => string) => {
    const m: Record<string, number> = {};
    acomp.forEach((a) => { const k = key(a); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  };
  const motivos = by((a) => a.motivo).slice(0, 8);
  const clientes = by((a) => a.clienteNombre).slice(0, 8);
  const rutas = by((a) => a.rutaNombre).slice(0, 8);
  const auditores = by((a) => a.auditorNombre).slice(0, 8);

  const riesgoCount: Record<string, number> = {};
  acomp.forEach((a) => (a.riesgosAsociados || []).forEach((r) => (riesgoCount[r] = (riesgoCount[r] ?? 0) + 1)));
  const riesgos = Object.entries(riesgoCount).sort((x, y) => y[1] - x[1]);

  // Tendencia por mes (YYYY-MM)
  const mesMap: Record<string, { total: number; criticos: number }> = {};
  acomp.forEach((a) => {
    const m = (a.fecha || "").slice(0, 7);
    if (!m) return;
    if (!mesMap[m]) mesMap[m] = { total: 0, criticos: 0 };
    mesMap[m].total += 1;
    if (a.criticidad === "Crítico" || a.criticidad === "Alto") mesMap[m].criticos += 1;
  });
  const tendencia = Object.entries(mesMap).sort((x, y) => x[0].localeCompare(y[0]));

  return {
    total, valorTotal, kgTotal, criticos, altos, conHallazgos, completados, cumplimiento,
    accionesTotal: acciones.length, cerradasAcc, reincidencias, avance, tasaCierre,
    motivos, clientes, rutas, auditores, riesgos, tendencia,
  };
}

const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hoy = () => new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

// ─── Construcción del HTML del informe (vista previa / imprimir) ───────────────
function buildHTML(modelo: ModeloKey, acomp: Acompanamiento[], acciones: AccionCumplimiento[]): string {
  const k = calcular(acomp, acciones);
  const planes = planesAutomaticos(acomp, acciones);
  const info = MODELOS.find((m) => m.key === modelo)!;
  const conHall = acomp.filter((a) => a.estado === "Con Hallazgos" || a.criticidad === "Crítico" || a.criticidad === "Alto");

  const kpi = (label: string, value: string) =>
    `<div class="kpi"><div class="kpi-v">${value}</div><div class="kpi-l">${label}</div></div>`;

  const tablaRows = (rows: [string, number][], head: string) =>
    `<table class="t"><thead><tr><th>${head}</th><th style="text-align:right">Cantidad</th></tr></thead><tbody>` +
    rows.map(([n, c]) => `<tr><td>${esc(n)}</td><td style="text-align:right">${c}</td></tr>`).join("") +
    `</tbody></table>`;

  // Secciones según modelo
  const S: string[] = [];

  // Indicadores (todos los modelos)
  S.push(`<h2>Indicadores Generales</h2><div class="kpis">
    ${kpi("Acompañamientos", String(k.total))}
    ${kpi("Cumplimiento", k.cumplimiento + "%")}
    ${kpi("Con hallazgos", String(k.conHallazgos))}
    ${kpi("Críticos / Altos", k.criticos + " / " + k.altos)}
    ${kpi("Valor devuelto", formatCOP(k.valorTotal))}
    ${kpi("Kg devueltos", formatKg(k.kgTotal))}
    ${kpi("Planes de acción", String(k.accionesTotal))}
    ${kpi("Avance / Cierre", k.avance + "% / " + k.tasaCierre + "%")}
  </div>`);

  if (modelo === "gerencial" || modelo === "corporativo") {
    S.push(`<h2>Resumen Ejecutivo</h2><p>Durante el periodo se registraron <b>${k.total}</b> acompañamientos a rutas, con un cumplimiento general del <b>${k.cumplimiento}%</b>. Se identificaron <b>${k.conHallazgos}</b> acompañamientos con hallazgos (<b>${k.criticos}</b> críticos y <b>${k.altos}</b> altos) y un valor devuelto de <b>${formatCOP(k.valorTotal)}</b> (${formatKg(k.kgTotal)}). El avance promedio de los planes de acción es <b>${k.avance}%</b> con una tasa de cierre del <b>${k.tasaCierre}%</b>${k.reincidencias ? ` y <b>${k.reincidencias}</b> reincidencia(s) detectada(s)` : ""}.</p>`);
  }

  if (modelo === "gerencial" || modelo === "corporativo" || modelo === "estrategico") {
    if (k.riesgos.length) S.push(`<h2>Riesgos Relevantes</h2>${tablaRows(k.riesgos as [string, number][], "Tipo de riesgo")}`);
  }

  if (modelo === "operacional" || modelo === "corporativo" || modelo === "tecnico") {
    S.push(`<h2>Motivos de Devolución</h2>${tablaRows(k.motivos as [string, number][], "Motivo")}`);
    S.push(`<h2>Clientes con mayor recurrencia</h2>${tablaRows(k.clientes as [string, number][], "Cliente")}`);
  }

  if (modelo === "estrategico" || modelo === "corporativo") {
    S.push(`<h2>Rutas con mayor recurrencia</h2>${tablaRows(k.rutas as [string, number][], "Ruta")}`);
    if (k.tendencia.length) {
      S.push(`<h2>Tendencia mensual</h2><table class="t"><thead><tr><th>Mes</th><th style="text-align:right">Acompañamientos</th><th style="text-align:right">Críticos/Altos</th></tr></thead><tbody>` +
        k.tendencia.map(([m, v]) => `<tr><td>${m}</td><td style="text-align:right">${v.total}</td><td style="text-align:right">${v.criticos}</td></tr>`).join("") +
        `</tbody></table>`);
    }
  }

  if (modelo === "estrategico") {
    S.push(`<h2>Oportunidades de Mejora</h2><ul>
      <li>Atacar el motivo más recurrente (${k.motivos[0]?.[0] ?? "—"}) con un plan focalizado.</li>
      <li>Priorizar el cierre de los ${k.conHallazgos} acompañamientos con hallazgos.</li>
      <li>Reforzar control en las rutas y clientes de mayor recurrencia.</li>
    </ul>`);
  }

  // Detalle de hallazgos (operacional, corporativo, técnico)
  if (modelo === "operacional" || modelo === "corporativo" || modelo === "tecnico") {
    S.push(`<h2>Detalle de Hallazgos</h2><table class="t"><thead><tr>
      <th>Fecha</th><th>Cliente</th><th>Ruta</th><th>Auditor</th><th>Motivo</th><th>Criticidad</th><th>Estado</th><th>Evid.</th>${modelo === "tecnico" ? "<th>Observación</th>" : ""}
    </tr></thead><tbody>` +
      conHall.map((a) => `<tr>
        <td>${esc((a.fecha || "").slice(0, 10))}</td><td>${esc(a.clienteNombre)}</td><td>${esc(a.rutaNombre)}</td>
        <td>${esc(a.auditorNombre)}</td><td>${esc(a.motivo)}</td>
        <td><span class="chip c-${a.criticidad === "Crítico" ? "crit" : a.criticidad === "Alto" ? "alto" : "med"}">${esc(a.criticidad)}</span></td>
        <td>${esc(a.estado)}</td><td style="text-align:center">${(a.evidencias || []).length}</td>
        ${modelo === "tecnico" ? `<td>${esc(a.observacionAuditor)}</td>` : ""}
      </tr>`).join("") +
      `</tbody></table>`);
  }

  // Planes de acción (todos menos gerencial breve) — corporativo, operacional, técnico, gerencial resumido
  if (planes.length) {
    const rows = (modelo === "gerencial" ? planes.slice(0, 8) : planes);
    S.push(`<h2>Planes de Acción ${modelo === "gerencial" ? "(principales)" : "(generados automáticamente)"}</h2>
      <table class="t"><thead><tr><th>Cliente / Ruta</th><th>Motivo</th><th>Criticidad</th><th>Acción correctiva</th>${modelo !== "gerencial" ? "<th>Acción preventiva</th><th>Seguimiento</th>" : ""}</tr></thead><tbody>` +
      rows.map((p) => `<tr>
        <td><b>${esc(p.cliente)}</b><br><span class="muted">${esc(p.ruta)}</span></td>
        <td>${esc(p.motivo)}</td>
        <td><span class="chip c-${p.criticidad === "Crítico" ? "crit" : p.criticidad === "Alto" ? "alto" : "med"}">${esc(p.criticidad)}</span></td>
        <td>${esc(p.correctiva)}</td>
        ${modelo !== "gerencial" ? `<td>${esc(p.preventiva)}</td><td>${esc(p.seguimiento)}</td>` : ""}
      </tr>`).join("") +
      `</tbody></table>`);
  }

  // Seguimiento de cumplimiento (técnico, corporativo)
  if ((modelo === "tecnico" || modelo === "corporativo") && acciones.length) {
    S.push(`<h2>Seguimiento de Cumplimiento</h2><table class="t"><thead><tr>
      <th>Plan</th><th>Responsable</th><th>Estado</th><th>Avance</th><th>Compromiso</th>${modelo === "tecnico" ? "<th>Validado por</th>" : ""}
    </tr></thead><tbody>` +
      acciones.map((a) => `<tr>
        <td>${esc(a.planAccion)}</td><td>${esc(a.responsable)}</td><td>${esc(a.estado)}</td>
        <td style="text-align:right">${a.porcentajeAvance ?? 0}%</td><td>${esc((a.fechaCompromiso || "").slice(0, 10))}</td>
        ${modelo === "tecnico" ? `<td>${esc(a.validadoPor || "—")}</td>` : ""}
      </tr>`).join("") +
      `</tbody></table>`);
  }

  // Conclusión
  const concl = k.cumplimiento >= 90
    ? `El desempeño de Rutas es óptimo (${k.cumplimiento}%). Se recomienda sostener los controles y el seguimiento periódico de hallazgos.`
    : k.cumplimiento >= 70
    ? `El desempeño de Rutas es aceptable (${k.cumplimiento}%), con oportunidades de mejora. Priorizar el cierre de los ${k.conHallazgos} acompañamientos con hallazgos y atender los ${k.criticos} críticos.`
    : `El desempeño de Rutas es crítico (${k.cumplimiento}%). Se requiere intervención prioritaria sobre los ${k.criticos} críticos y ${k.altos} altos, y acelerar los planes de acción (${k.avance}% de avance).`;
  S.push(`<h2>Conclusión Ejecutiva</h2><p>${concl}</p>`);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Informe ${esc(info.titulo)} · Rutas · Savicol</title>
<style>
  *{box-sizing:border-box} body{font-family:Segoe UI,system-ui,Arial,sans-serif;color:#0F172A;margin:0;padding:32px;background:#fff}
  .top{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1A3A8F;padding-bottom:14px;margin-bottom:18px}
  .brand{display:flex;align-items:center;gap:12px}
  .mark{width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#1A3A8F,#3B82F6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px}
  .brand b{font-size:16px;color:#1A3A8F} .brand span{display:block;font-size:11px;color:#64748B}
  .meta{text-align:right;font-size:11px;color:#64748B}
  h1{font-size:20px;color:#0F172A;margin:4px 0 2px} .badge{display:inline-block;background:#1A3A8F;color:#fff;font-size:11px;padding:3px 10px;border-radius:20px}
  h2{font-size:13px;color:#1A3A8F;border-left:4px solid #C41230;padding-left:8px;margin:22px 0 8px}
  p{font-size:12.5px;line-height:1.6;color:#334155} ul{font-size:12.5px;color:#334155;line-height:1.6}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:6px 0}
  .kpi{border:1px solid #E2E8F0;border-radius:10px;padding:10px;background:#F8FAFC}
  .kpi-v{font-size:18px;font-weight:800;color:#1A3A8F} .kpi-l{font-size:10.5px;color:#64748B;margin-top:2px}
  table.t{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}
  table.t th{background:#0D1526;color:#fff;text-align:left;padding:6px 8px;font-weight:600}
  table.t td{border-bottom:1px solid #E2E8F0;padding:6px 8px;color:#334155;vertical-align:top}
  .muted{color:#94A3B8;font-size:10px}
  .chip{font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px}
  .c-crit{background:#FEE2E2;color:#B91C1C} .c-alto{background:#FFEDD5;color:#C2410C} .c-med{background:#E0F2FE;color:#0369A1}
  .foot{margin-top:26px;border-top:1px solid #E2E8F0;padding-top:8px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
  @media print{body{padding:14px}.no-print{display:none}}
</style></head><body>
  <div class="top">
    <div class="brand"><div class="mark">AP</div><div><b>Pollos Savicol S.A.S.</b><span>Audit Platform · Acompañamiento a Rutas</span></div></div>
    <div class="meta">Generado: ${hoy()}<br>Documento confidencial</div>
  </div>
  <span class="badge">${esc(info.icon)} Informe ${esc(info.titulo)}</span>
  <h1>Informe Ejecutivo de Rutas</h1>
  <p class="muted">${esc(info.desc)}</p>
  ${S.join("\n")}
  <div class="foot"><span>Pollos Savicol S.A.S. · Informe de Rutas · ${esc(info.titulo)}</span><span>Audit Platform</span></div>
  <div class="no-print" style="margin-top:20px;text-align:center">
    <button onclick="window.print()" style="background:#1A3A8F;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:13px;cursor:pointer">Imprimir / Guardar como PDF</button>
  </div>
</body></html>`;
}

// ─── PDF nativo (jsPDF) ────────────────────────────────────────────────────────
async function buildPDF(modelo: ModeloKey, acomp: Acompanamiento[], acciones: AccionCumplimiento[]) {
  const { default: jsPDF } = await import("jspdf");
  const k = calcular(acomp, acciones);
  const planes = planesAutomaticos(acomp, acciones);
  const info = MODELOS.find((m) => m.key === modelo)!;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const PW = 210, PH = 297, M = 14, CW = PW - M * 2;
  let y = 16;
  const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number]; };
  const fill = (h: string) => { const [r, g, b] = hex(h); doc.setFillColor(r, g, b); };
  const text = (h: string) => { const [r, g, b] = hex(h); doc.setTextColor(r, g, b); };
  const need = (h: number) => { if (y + h > PH - 14) { doc.addPage(); y = 16; } };

  // Encabezado
  fill("#1A3A8F"); doc.rect(0, 0, PW, 24, "F");
  text("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("Pollos Savicol S.A.S.", M, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Audit Platform · Acompañamiento a Rutas", M, 17);
  doc.setFontSize(8); doc.text(`Generado: ${hoy()}`, PW - M, 11, { align: "right" });
  y = 32;
  text("#0F172A"); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(`Informe ${info.titulo}`, M, y); y += 6;
  text("#64748B"); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.splitTextToSize(info.desc, CW).forEach((l: string) => { doc.text(l, M, y); y += 4.5; });
  y += 4;

  // KPIs
  const kpis: [string, string][] = [
    ["Acompañamientos", String(k.total)], ["Cumplimiento", k.cumplimiento + "%"],
    ["Con hallazgos", String(k.conHallazgos)], ["Críticos/Altos", k.criticos + "/" + k.altos],
    ["Valor devuelto", formatCOP(k.valorTotal)], ["Planes acción", String(k.accionesTotal)],
  ];
  const cols = 3, gap = 3, bw = (CW - gap * (cols - 1)) / cols, bh = 16;
  kpis.forEach((kp, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    if (col === 0) need(bh + 2);
    const bx = M + col * (bw + gap), byy = y + row * (bh + gap);
    fill("#F8FAFC"); doc.setDrawColor(226, 232, 240); doc.roundedRect(bx, byy, bw, bh, 2, 2, "FD");
    text("#1A3A8F"); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(kp[1], bx + 3, byy + 7);
    text("#64748B"); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(kp[0], bx + 3, byy + 12.5);
  });
  y += Math.ceil(kpis.length / cols) * (bh + gap) + 4;

  const seccion = (titulo: string) => {
    need(12); fill("#0D1526"); doc.rect(M, y, CW, 7, "F");
    text("#FFFFFF"); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.text(titulo, M + 3, y + 4.8); y += 9;
  };
  const filaRanking = (rows: [string, number][]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    rows.forEach(([n, c], i) => {
      need(5.5); if (i % 2 === 0) { fill("#F8FAFC"); doc.rect(M, y - 0.5, CW, 5.5, "F"); }
      text("#334155"); doc.text(String(n).slice(0, 70), M + 2, y + 3);
      text("#1A3A8F"); doc.setFont("helvetica", "bold"); doc.text(String(c), PW - M - 2, y + 3, { align: "right" });
      doc.setFont("helvetica", "normal"); y += 5.5;
    });
    y += 3;
  };

  if (modelo === "gerencial" || modelo === "corporativo") {
    seccion("Resumen Ejecutivo");
    text("#334155"); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const resumen = `Se registraron ${k.total} acompañamientos con cumplimiento general del ${k.cumplimiento}%. ${k.conHallazgos} con hallazgos (${k.criticos} críticos, ${k.altos} altos). Valor devuelto: ${formatCOP(k.valorTotal)} (${formatKg(k.kgTotal)}). Avance de planes: ${k.avance}% · cierre: ${k.tasaCierre}%.`;
    doc.splitTextToSize(resumen, CW).forEach((l: string) => { need(5); doc.text(l, M, y); y += 4.6; }); y += 3;
  }
  if (k.motivos.length && (modelo === "operacional" || modelo === "corporativo" || modelo === "tecnico")) {
    seccion("Motivos de Devolución"); filaRanking(k.motivos as [string, number][]);
    seccion("Clientes con mayor recurrencia"); filaRanking(k.clientes as [string, number][]);
  }
  if (modelo === "estrategico" || modelo === "corporativo") {
    seccion("Rutas con mayor recurrencia"); filaRanking(k.rutas as [string, number][]);
    if (k.riesgos.length) { seccion("Riesgos recurrentes"); filaRanking(k.riesgos as [string, number][]); }
  }

  // Planes de acción
  if (planes.length) {
    seccion("Planes de Acción (automáticos desde hallazgos)");
    doc.setFontSize(8);
    (modelo === "gerencial" ? planes.slice(0, 8) : planes).forEach((p, i) => {
      need(16); if (i % 2 === 0) { fill("#F8FAFC"); doc.rect(M, y - 1, CW, 16, "F"); }
      text("#0F172A"); doc.setFont("helvetica", "bold"); doc.text(`${p.cliente} · ${p.ruta}`, M + 2, y + 3);
      text("#C41230"); doc.text(p.criticidad, PW - M - 2, y + 3, { align: "right" });
      text("#475569"); doc.setFont("helvetica", "normal");
      doc.splitTextToSize(`Correctiva: ${p.correctiva}`, CW - 4).forEach((l: string) => { doc.text(l, M + 2, y + 7); y += 3.6; });
      doc.splitTextToSize(`Preventiva: ${p.preventiva} · ${p.seguimiento}`, CW - 4).forEach((l: string) => { doc.text(l, M + 2, y + 7); y += 3.6; });
      y += 5;
    });
  }

  // Conclusión
  need(24); seccion("Conclusión Ejecutiva");
  text("#334155"); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const concl = k.cumplimiento >= 90
    ? `El desempeño de Rutas es óptimo (${k.cumplimiento}%). Mantener controles y seguimiento periódico.`
    : k.cumplimiento >= 70
    ? `Desempeño aceptable (${k.cumplimiento}%). Priorizar el cierre de ${k.conHallazgos} acompañamientos con hallazgos y atender ${k.criticos} críticos.`
    : `Desempeño crítico (${k.cumplimiento}%). Intervención prioritaria sobre ${k.criticos} críticos y ${k.altos} altos; acelerar planes (${k.avance}%).`;
  doc.splitTextToSize(concl, CW).forEach((l: string) => { need(5); doc.text(l, M, y); y += 4.6; });

  // Pie con paginado
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); text("#94A3B8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("Pollos Savicol S.A.S. · Informe de Rutas · Documento confidencial", M, PH - 8);
    doc.text(`Página ${p} de ${pages}`, PW - M, PH - 8, { align: "right" });
  }
  doc.save(`Informe-Rutas-${modelo}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── CSV ("Excel") ─────────────────────────────────────────────────────────────
function buildCSV(acomp: Acompanamiento[], acciones: AccionCumplimiento[]) {
  const accByAcomp = new Map(acciones.map((a) => [a.acompanamientoId, a]));
  const head = ["Fecha", "Cliente", "Ruta", "Auditor", "Motivo", "Criticidad", "Estado", "Valor COP", "Kg", "Evidencias", "Observacion", "Plan accion", "Responsable", "Estado plan", "Avance %", "Fecha compromiso"];
  const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = acomp.map((a) => {
    const ac = accByAcomp.get(a.id);
    return [a.fecha?.slice(0, 10), a.clienteNombre, a.rutaNombre, a.auditorNombre, a.motivo, a.criticidad, a.estado,
      a.valorDevueltoCOP, a.cantidadKgDevueltos, (a.evidencias || []).length, a.observacionAuditor,
      ac?.planAccion ?? "", ac?.responsable ?? "", ac?.estado ?? "", ac?.porcentajeAvance ?? "", ac?.fechaCompromiso?.slice(0, 10) ?? ""].map(q).join(",");
  });
  const csv = "\uFEFF" + [head.map(q).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Rutas-Consolidado-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════
export function GeneradorInformesRutas() {
  const acomp = useRutasStore(useShallow((s: any) => s.acompanamientos as Acompanamiento[]));
  const acciones = useRutasStore(useShallow((s: any) => s.cumplimiento as AccionCumplimiento[]));
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<ModeloKey>("corporativo");
  const [busy, setBusy] = useState(false);

  const vacio = !acomp || acomp.length === 0;
  const planesCount = useMemo(() => planesAutomaticos(acomp || [], acciones || []).length, [acomp, acciones]);

  const preview = () => {
    const html = buildHTML(sel, acomp || [], acciones || []);
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  };
  const pdf = async () => { setBusy(true); try { await buildPDF(sel, acomp || [], acciones || []); } finally { setBusy(false); } };
  const csv = () => buildCSV(acomp || [], acciones || []);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Generar Informe
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-[#0D1526] border border-[#1E2D4A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1E2D4A]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-[#06B6D4]" /> Informe Ejecutivo de Rutas</h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Datos de Consolidado + Cumplimiento · {acomp?.length ?? 0} acompañamientos · {planesCount} plan(es) auto</p>
              </div>
              <button onClick={() => !busy && setOpen(false)} className="text-[#64748B] hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {vacio ? (
              <div className="p-8 text-center text-[#64748B] text-sm">No hay acompañamientos de Rutas para generar el informe.</div>
            ) : (
              <>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODELOS.map((m) => (
                    <button key={m.key} onClick={() => setSel(m.key)}
                      className={`text-left rounded-xl border p-3 transition ${sel === m.key ? "border-[#06B6D4] bg-[#06B6D41A]" : "border-[#1E2D4A] bg-[#0B1322] hover:border-[#2A3B5C]"}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${sel === m.key ? "text-[#06B6D4]" : "text-white"}`}>{m.icon} {m.titulo}</span>
                        {sel === m.key && <Check className="w-4 h-4 text-[#06B6D4]" />}
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mt-1">{m.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="p-4 border-t border-[#1E2D4A] flex flex-wrap items-center gap-2">
                  <button onClick={preview} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A2540] hover:bg-[#243150] text-white text-xs font-semibold">
                    <Eye className="w-3.5 h-3.5" /> Vista previa / Imprimir
                  </button>
                  <button onClick={pdf} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C41230] hover:bg-[#a50f28] text-white text-xs font-semibold disabled:opacity-60">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                  </button>
                  <button onClick={csv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#10663B] hover:bg-[#0c5230] text-white text-xs font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (CSV)
                  </button>
                  <span className="text-[10px] text-[#64748B] ml-auto flex items-center gap-1"><Printer className="w-3 h-3" /> El PDF visual sale desde "Vista previa → Imprimir".</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
