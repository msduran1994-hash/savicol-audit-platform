// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · KPI Alerts (granjas)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export type KpiAlertSeverity = "VENCIDO" | "PROXIMO" | "RIESGO_CRITICO";

export interface KpiAlert {
  id:               string;
  granjaId:         string;
  granjaNombre:     string;
  granjaCodigo:     string;
  accion:           string;
  estado:           string;
  porcentajeAvance: number;
  fechaCompromiso:  string;
  responsable:      string;
  diasDeAtraso:     number;
  severity:         KpiAlertSeverity;
}

export interface AlertScanResult {
  scannedAt:   string;
  totalActive: number;
  alerts: {
    vencidos:        KpiAlert[];
    proximos:        KpiAlert[];
    riesgo_critico:  KpiAlert[];
  };
  summary: {
    totalAlertas:       number;
    porSeveridad:       Record<KpiAlertSeverity, number>;
    responsablesUnicos: number;
  };
}

export interface ReminderResult {
  scannedAt:        string;
  remindersSent:    number;
  emailsAttempted:  number;
  emailsSucceeded:  number;
  emailsFailed:     number;
  errors:           Array<{ kpiId: string; responsable: string; error: string }>;
}

export function useKpiAlerts(granjaId?: string) {
  const qs = granjaId ? `?granjaId=${granjaId}` : "";
  return useQuery({
    queryKey: ["kpi-alerts", granjaId],
    queryFn:  () => apiGet<KpiAlert[]>(`/granjas/kpi/alerts${qs}`),
    staleTime: 60_000,
  });
}

export function useKpiAlertScan(granjaId?: string) {
  const qs = granjaId ? `?granjaId=${granjaId}` : "";
  return useQuery({
    queryKey: ["kpi-alerts", "scan", granjaId],
    queryFn:  () => apiGet<AlertScanResult>(`/granjas/kpi/alerts/scan${qs}`),
    staleTime: 60_000,
  });
}

export function useSendKpiReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { granjaId?: string } = {}) =>
      apiPost<ReminderResult>("/granjas/kpi/alerts/remind", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-alerts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
