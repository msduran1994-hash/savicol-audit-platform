/* ════════════════════════════════════════════════════════════════════════════
   Exportar Dashboard de Granjas a PDF — reporte ejecutivo ESTRUCTURADO.
   Re-renderiza KPIs + gráficos clave como imágenes (canvas) en un PDF con los
   filtros aplicados y la fecha. No depende de SVG/recharts en html2canvas, así
   que sale nítido y completo. Solo incluye la información ya filtrada.
   ════════════════════════════════════════════════════════════════════════════ */
const NAVY = "#0D1526", CYAN = "#06B6D4";
const fNum = (n: any) => (Number(n) || 0).toLocaleString("es-CO");

// Barras horizontales dibujadas en canvas → <img>.
function canvasBars(titulo: string, datos: { label: string; valor: number; color: string; texto?: string }[], opts?: { unidad?: string }): string {
  if (typeof document === "undefined" || datos.length === 0) return "";
  const cssW = 760, rowH = 26, padT = 8, padB = 6, dpr = 2, padL = 200, padR = 80;
  const cssH = padT + datos.length * rowH + padB, w = cssW - padL - padR;
  const cv = document.createElement("canvas"); cv.width = cssW * dpr; cv.height = cssH * dpr;
  const ctx = cv.getContext("2d"); if (!ctx) return ""; ctx.scale(dpr, dpr);
  const max = Math.max(1, ...datos.map(d => d.valor));
  datos.forEach((d, i) => {
    const y = padT + i * rowH;
    ctx.fillStyle = "#334155"; ctx.font = "13px 'Times New Roman', serif"; ctx.textAlign = "right";
    ctx.fillText(d.label.length > 30 ? d.label.slice(0, 29) + "…" : d.label, padL - 8, y + 15);
    ctx.fillStyle = "#eef2f7"; ctx.fillRect(padL, y + 3, w, 16);
    const bw = Math.max(2, (d.valor / max) * w);
    ctx.fillStyle = d.color; ctx.fillRect(padL, y + 3, bw, 16);
    ctx.fillStyle = "#475569"; ctx.font = "bold 12px 'Times New Roman', serif"; ctx.textAlign = "left";
    ctx.fillText((d.texto ?? String(d.valor)) + (opts?.unidad || ""), padL + bw + 6, y + 15);
  });
  return `<div style="margin:6px 0 14px"><div style="font-size:14px;font-weight:700;color:${NAVY};margin-bottom:4px">${titulo}</div><img src="${cv.toDataURL("image/png")}" style="width:100%;height:auto"/></div>`;
}

// Dona dibujada en canvas → <img> + leyenda.
function canvasDonut(titulo: string, segs: { label: string; valor: number; color: string }[]): string {
  if (typeof document === "undefined") return "";
  const total = segs.reduce((s, x) => s + x.valor, 0);
  if (total === 0) return `<div style="margin:6px 0 14px"><div style="font-size:14px;font-weight:700;color:${NAVY};margin-bottom:4px">${titulo}</div><div style="font-size:12px;color:#94a3b8">Sin datos</div></div>`;
  const size = 180, dpr = 2;
  const cv = document.createElement("canvas"); cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext("2d"); if (!ctx) return ""; ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, r = size / 2 - 6, rin = r * 0.6; let a0 = -Math.PI / 2;
  segs.filter(s => s.valor > 0).forEach(s => { const a1 = a0 + (s.valor / total) * 2 * Math.PI; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = s.color; ctx.fill(); a0 = a1; });
  ctx.beginPath(); ctx.arc(cx, cy, rin, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.fillStyle = NAVY; ctx.textAlign = "center"; ctx.font = "bold 24px 'Times New Roman', serif"; ctx.fillText(String(total), cx, cy + 5);
  const leg = segs.map(s => `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#334155;margin-bottom:4px"><span style="width:11px;height:11px;border-radius:2px;background:${s.color};display:inline-block"></span>${s.label}:&nbsp;<strong>${s.valor}</strong>&nbsp;(${Math.round((s.valor / total) * 100)}%)</div>`).join("");
  return `<div style="margin:6px 0 14px"><div style="font-size:14px;font-weight:700;color:${NAVY};margin-bottom:4px">${titulo}</div><div style="display:flex;align-items:center;gap:18px"><img src="${cv.toDataURL("image/png")}" style="width:${size}px;height:${size}px"/><div>${leg}</div></div></div>`;
}

export async function exportarDashboardPDF(opts: { exec: any; trz: any; filters: Record<string, any> }): Promise<void> {
  const { exec, trz, filters } = opts;
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const hoy = new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
  const k = exec?.kpis ?? {}; const ch = exec?.charts ?? {};

  const filtTxt = Object.entries(filters).filter(([kk, v]) => v != null && v !== "" && kk !== "year").map(([kk, v]) => `${kk}: ${v}`).join(" · ") || "ninguno";

  const kpiCards = [
    ["Granjas", fNum(k.totalGranjas)], ["Hallazgos", fNum(k.totalHallazgos)], ["Críticos", fNum(k.hallazgosCriticos)],
    ["Abiertos", fNum(k.hallazgosAbiertos)], ["Cerrados", fNum(k.hallazgosCerrados)], ["Cumpl. KPI", `${k.cumplimientoKPI ?? 0}%`],
    ["Auditorías", fNum(k.totalAuditorias)], ["Auditores", fNum(k.auditoresActivos)], ["Capacidad aves", fNum(k.capacidadTotal)],
  ];
  const kpiHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">${kpiCards.map(c => `<div style="border:1px solid #e2e8f0;border-left:4px solid ${CYAN};border-radius:6px;padding:8px 10px"><div style="font-size:12px;color:#94a3b8;text-transform:uppercase">${c[0]}</div><div style="font-size:22px;font-weight:800;color:${NAVY}">${c[1]}</div></div>`).join("")}</div>`;

  const critColor: Record<string, string> = { CRITICA: "#EF4444", ALTA: "#F97316", MEDIA: "#F59E0B", BAJA: "#10B981" };
  const catBars = canvasBars("Hallazgos por categoría", (ch.hallazgosPorCategoria ?? []).map((d: any) => ({ label: d.categoria, valor: d.count, color: "#F97316" })));
  const critDonut = canvasDonut("Hallazgos por criticidad", (ch.matrizCriticidad ?? []).map((d: any) => ({ label: d.criticidad, valor: d.count, color: critColor[d.criticidad] ?? "#64748B" })));
  const mitDonut = canvasDonut("Riesgos: mitigados vs activos", [{ label: "Mitigados", valor: k.hallazgosCerrados ?? 0, color: "#10B981" }, { label: "Activos", valor: k.hallazgosAbiertos ?? 0, color: "#EF4444" }]);
  const mortBars = canvasBars("Mortalidad por granja (%)", (trz?.datos ?? []).map((d: any) => ({ label: d.name, valor: d.mort, color: d.mortColor, texto: `${d.mort}` })), { unidad: "%" });
  const cumplBars = canvasBars("Cumplimiento por granja (%)", (trz?.datos ?? []).map((d: any) => ({ label: d.name, valor: d.cumpl, color: d.cumplColor, texto: `${d.cumpl}` })), { unidad: "%" });

  const resumen: string[] = exec?.resumenHeuristico?.resumen ?? [];
  const recomend: string[] = exec?.resumenHeuristico?.recomendaciones ?? [];
  const limpiar = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");
  const analisisHTML = `<div style="margin:8px 0 14px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:${NAVY};border-left:4px solid ${CYAN};padding-left:8px;margin-bottom:6px">Análisis Ejecutivo</div>${resumen.length ? `<ul style="font-size:13px;color:#334155;line-height:1.6;margin:0 0 8px;padding-left:18px">${resumen.map(s => `<li>${limpiar(s)}</li>`).join("")}</ul>` : '<p style="font-size:13px;color:#94a3b8">Sin resumen disponible.</p>'}${recomend.length ? `<div style="font-size:14px;font-weight:700;color:${NAVY};margin-top:6px">Recomendaciones</div><ul style="font-size:13px;color:#334155;line-height:1.6;margin:0;padding-left:18px">${recomend.map(s => `<li>${limpiar(s)}</li>`).join("")}</ul>` : ""}</div>`;

  const alertas: any[] = exec?.alertas ?? [];
  const alertasHTML = alertas.length ? `<div style="margin:8px 0 14px;page-break-inside:avoid"><div style="font-size:15px;font-weight:700;color:${NAVY};border-left:4px solid #EF4444;padding-left:8px;margin-bottom:6px">Alertas estratégicas (${alertas.length})</div>${alertas.map(a => `<div style="font-size:13px;color:#334155;margin-bottom:4px">• <strong>${a.severity ?? ""}</strong> · ${a.title ?? ""}${a.description ? ": " + a.description : ""}</div>`).join("")}</div>` : "";

  const html = `<div style="font-family:'Times New Roman', Times, serif;color:${NAVY};width:794px;padding:0 6px">
    <div style="background:linear-gradient(135deg,#0D1526,#0A2533);color:#fff;padding:22px 24px;margin-bottom:16px;border-radius:8px">
      <div style="font-size:13px;letter-spacing:2px;color:${CYAN};text-transform:uppercase;font-weight:700">Pollos Savicol S.A.S. · Granjas</div>
      <div style="font-size:24px;font-weight:800;margin-top:4px">Dashboard Ejecutivo · Granjas</div>
      <div style="font-size:13px;color:#cbd5e1;margin-top:6px">Generado: ${hoy}</div>
      <div style="font-size:13px;color:#cbd5e1">Filtros aplicados: Año ${filters.year ?? "—"} · ${filtTxt}</div>
    </div>
    ${kpiHTML}
    ${catBars}
    <div style="display:flex;gap:18px;flex-wrap:wrap">${critDonut}${mitDonut}</div>
    ${mortBars}
    ${cumplBars}
    ${analisisHTML}
    ${alertasHTML}
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Documento confidencial de uso interno · ${hoy}</div>
  </div>`;

  let cont: HTMLDivElement | null = document.createElement("div");
  cont.style.cssText = "position:absolute;top:0;left:-10000px;width:794px;background:#fff;";
  cont.innerHTML = html;
  document.body.appendChild(cont);
  try {
    await new Promise(r => setTimeout(r, 300));
    const canvas = await html2canvas(cont, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false, windowWidth: 794 });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
    const M = 12, usableW = pageW - M * 2, usableH = pageH - M * 2;
    const pxPerMm = canvas.width / usableW, pageHpx = Math.floor(usableH * pxPerMm);
    let rendered = 0, page = 0;
    while (rendered < canvas.height) {
      const sliceH = Math.min(pageHpx, canvas.height - rendered);
      if (page > 0) pdf.addPage();
      const pc = document.createElement("canvas"); pc.width = canvas.width; pc.height = sliceH;
      const pctx = pc.getContext("2d"); if (pctx) { pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, pc.width, sliceH); pctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH); }
      pdf.addImage(pc.toDataURL("image/jpeg", 0.85), "JPEG", M, M, usableW, sliceH / pxPerMm, undefined, "FAST");
      pdf.setFont("times", "normal"); pdf.setFontSize(9); pdf.setTextColor(120, 130, 145);
      pdf.text(`Página ${page + 1}`, pageW - M, pageH - 5, { align: "right" });
      rendered += sliceH; page++;
    }
    pdf.save(`Dashboard-Granjas-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally { if (cont?.parentNode) document.body.removeChild(cont); cont = null; }
}
