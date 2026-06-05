// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Email diagnostic (admin only)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export interface EmailStatus {
  configured: boolean;
  mode: "smtp" | "noop";
  smtp: {
    host: string | null;
    port: string;
    user: string | null;
    passSet: boolean;
    passLength: number;
    from: string | null;
  };
  appBaseUrl: string | null;
  diagnostics: string[];
}

export interface EmailTestResult {
  ok: boolean;
  mode: "smtp" | "noop";
  to: string;
  from: string;
  elapsedMs: number;
  messageId: string | null;
  error: string | null;
  timestamp: string;
  hint: string;
}

export function useEmailStatus() {
  return useQuery({
    queryKey: ["email", "status"],
    queryFn:  () => apiGet<EmailStatus>("/email/status"),
    staleTime: 30_000,
  });
}

export function useEmailTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to?: string) => apiPost<EmailTestResult>("/email/test", { to }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email", "status"] }),
  });
}
