// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Bulk Imports (CSV/Excel → DB)
// ═══════════════════════════════════════════════════════════════════════════════
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

export interface ImportResult {
  total:   number;
  created: number;
  updated: number;
  skipped: number;
  errors:  Array<{ row: number; field?: string; message: string }>;
}

export type ImportEntity =
  | "granjas"
  | "hallazgos-granja"
  | "kpis"
  | "cronograma"
  | "hallazgos-cedi";

const INVALIDATE_KEYS: Record<ImportEntity, string[][]> = {
  "granjas":          [["granjas"], ["granjas-executive"]],
  "hallazgos-granja": [["hallazgos"], ["granjas-executive"]],
  "kpis":             [["kpis"], ["granjas-executive"]],
  "cronograma":       [["audit-activities"], ["audit-activities-executive"]],
  "hallazgos-cedi":   [["cedis-hallazgos"], ["cedis-executive"]],
};

export function useImport(entity: ImportEntity) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: any[]) => apiPost<ImportResult>(`/imports/${entity}`, { rows }),
    onSuccess: () => {
      INVALIDATE_KEYS[entity].forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

// ─── CSV parser mínimo (sin deps) ───
// Soporta: comillas dobles, \r\n y \n, valores con coma dentro de comillas
export function parseCSV(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"')                   { inQuotes = false; }
      else                                  { cur += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",")                              { row.push(cur); cur = ""; }
      else if (c === "\n" || (c === "\r" && text[i + 1] === "\n")) {
        if (c === "\r") i++;
        row.push(cur); rows.push(row); cur = ""; row = [];
      } else { cur += c; }
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }

  // Filtrar líneas vacías
  const clean = rows.filter(r => r.some(v => v.trim() !== ""));
  if (clean.length === 0) return [];

  const headers = clean[0].map(h => h.trim());
  return clean.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}
