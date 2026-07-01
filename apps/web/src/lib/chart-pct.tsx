// ═══════════════════════════════════════════════════════════════════════════════
// Helpers para mostrar "cantidad · %" en las gráficas categóricas (barras y tortas)
// de los dashboards (Granjas, Rutas, CEDIS, Auditoría). El % es respecto del total
// del propio dataset de la gráfica. Las gráficas de tendencia (líneas) NO lo usan.
// ═══════════════════════════════════════════════════════════════════════════════

// Suma de un campo numérico de un dataset (denominador del %).
export const sumField = (data: any[] | undefined, key: string): number =>
  (data ?? []).reduce((s, d) => s + (Number(d?.[key]) || 0), 0);

// Label de una torta/dona: "valor · %". Recharts pasa `percent` (0..1) al callback.
export const pieValuePct = (d: any): string => {
  const v = Number(d?.value ?? 0);
  if (!v) return "";
  const p = d?.percent != null ? Math.round(d.percent * 100) : 0;
  return `${v} · ${p}%`;
};

// Contenido de <LabelList> para barras: "valor · %". `total` = suma del dataKey.
// Úsese como: <LabelList content={barLabelPct(sumField(data,"value"), { horizontal:true })}/>
// dentro de <Bar>. horizontal=true para barras horizontales (layout="vertical").
export function barLabelPct(
  total: number,
  opts?: { horizontal?: boolean; color?: string; fontSize?: number }
) {
  const color = opts?.color ?? "#E2E8F0";
  const fontSize = opts?.fontSize ?? 10;
  const horizontal = opts?.horizontal ?? false;
  const Label = (props: any) => {
    const { x, y, width, height, value } = props;
    const val = Number(value);
    if (value == null || value === "" || !val) return null;
    const p = total > 0 ? Math.round((val / total) * 100) : 0;
    const txt = `${value} · ${p}%`;
    if (horizontal) {
      return (
        <text x={Number(x) + Number(width) + 5} y={Number(y) + Number(height) / 2}
              fill={color} fontSize={fontSize} textAnchor="start" dominantBaseline="middle">{txt}</text>
      );
    }
    return (
      <text x={Number(x) + Number(width) / 2} y={Number(y) - 5}
            fill={color} fontSize={fontSize} textAnchor="middle">{txt}</text>
    );
  };
  return Label;
}
