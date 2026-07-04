// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Envío de informes por correo (Granjas → Trazabilidad)
// ═══════════════════════════════════════════════════════════════════════════════
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export interface EnviarInformePayload {
  tipo: string;
  destinatarios: string[];
  cc?: string[];
  cco?: string[];
  asunto: string;
  mensaje: string;
  pdfBase64: string;
  filename: string;
  adjuntos?: Array<{ name: string; content: string; type: string }>;
}

export interface EnvioInformeResult { ok: boolean; mode: string; estado: string; messageId?: string; error?: string; }

export interface EnvioInforme {
  id: string;
  tipo: string;
  asunto?: string | null;
  destinatarios?: string | null;
  cc?: string | null;
  cco?: string | null;
  remitente?: string | null;
  remitenteEmail?: string | null;
  estado: string;
  modo?: string | null;
  messageId?: string | null;
  mensajeError?: string | null;
  createdAt: string;
}

export function useEnviarInforme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EnviarInformePayload) => apiPost<EnvioInformeResult>("/informes/enviar", dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["informes-envios"] }),
  });
}

export function useEnviosInforme(enabled = true) {
  return useQuery({
    queryKey: ["informes-envios"],
    queryFn:  () => apiGet<EnvioInforme[]>("/informes/envios"),
    enabled,
    staleTime: 15_000,
  });
}
