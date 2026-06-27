/* ════════════════════════════════════════════════════════════════════════════
   Métricas de Trazabilidad (reutilizables) — mortalidad, muestreos, galpones.
   Misma lógica que el Informe General/Ejecutivo, extraída para que el Dashboard
   de Granjas la consuma sin duplicar ni alterar los informes.
   ════════════════════════════════════════════════════════════════════════════ */
import type { LoteItem, Muestreo } from "@/hooks/useLotes";

export const MORT_RANGO_D7 = 0.7; // % acumulado máximo al día 7 para "cumple"

// Conteos de aves = enteros. Ignora separadores de miles ("13.100"/"13,100" → 13100).
export const numv = (v: any) => { const n = parseInt((v ?? "").toString().replace(/[^\d]/g, ""), 10); return isFinite(n) ? n : 0; };

// Parser decimal robusto (coma o punto decimal, miles con punto).
export const numDec = (v: any) => { let s = (v ?? "").toString().trim(); if (!s) return 0; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const n = parseFloat(s.replace(/[^\d.\-]/g, "")); return isFinite(n) ? n : 0; };

export function galponesDeLote(l: LoteItem): string[] {
  const s = new Set<string>();
  if (l.data.galponPrincipal) s.add(l.data.galponPrincipal);
  (l.data.galponesEvaluados || "").split(/[,;/\s]+/).filter(Boolean).forEach(g => s.add(g));
  return Array.from(s);
}

export function mortLote(l: LoteItem) {
  const recep: any[] = (l.data as any).recepcion || [];
  const seg: any[] = (l.data as any).seguimiento || [];
  let pob = numv((recep.find((f: any) => /total\s+recibido/i.test(f.parametro)) || {}).valor);
  if (pob <= 0) { for (let i = 0; i < 7; i++) { const v = numv(seg[i]?.avesVivas); if (v > 0) { pob = v; break; } } }
  let totalMuertas = 0; for (let i = 0; i < 7; i++) totalMuertas += numv(seg[i]?.avesMuertas);
  const general = pob > 0 ? (totalMuertas / pob) * 100 : 0;
  let ultimo = -1; for (let i = 0; i < 7; i++) { if (seg[i] && Object.values(seg[i]).some(v => (v ?? "").toString().trim() !== "")) ultimo = i; }
  return { pob, totalMuertas, general, seg, tieneD7: pob > 0 && ultimo >= 6, cumple: pob > 0 && ultimo >= 6 && general <= MORT_RANGO_D7 };
}

export function statMuestreo(ms: Muestreo[]) {
  const v = ms.filter(m => (m.cantidad ?? 0) > 0 && (m.pesoTotal ?? 0) > 0);
  const totalM = v.length, pollitos = v.reduce((s, m) => s + m.cantidad, 0), pesoT = v.reduce((s, m) => s + m.pesoTotal, 0);
  const unit = pollitos > 0 ? pesoT / pollitos : 0;
  const us = v.map(m => m.pesoTotal / m.cantidad);
  const mean = us.length ? us.reduce((a, u) => a + u, 0) / us.length : 0;
  const sd = us.length ? Math.sqrt(us.reduce((a, u) => a + (u - mean) ** 2, 0) / us.length) : 0;
  const cv = mean > 0 ? (sd / mean) * 100 : 0;
  return { totalM, pollitos, pesoT, unit, cv };
}

// Peso (g) del último día con dato en el Seguimiento D1–7.
export function pesoLoteD7(seg: any[]): number {
  for (let i = 6; i >= 0; i--) { const v = numDec(seg[i]?.peso); if (v > 0) return v; }
  return 0;
}

// Desviación estándar poblacional de una serie numérica.
export function stddev(a: number[]): number {
  if (a.length <= 1) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
}
