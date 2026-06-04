// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Documentos (granjas)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface DocumentoItem {
  id: string;
  granjaId: string;
  nombre: string;
  tipo: string;
  categoria: string;
  size: number;
  url: string;
  ocrTexto?: string;
  ocrCompletado: boolean;
  uploadedAt: string;
  uploadedBy: string;
  isDemo?: boolean;
  granja?: { id: string; codigo: string; nombre: string; region: string };
}

export interface DocumentoPayload {
  granjaId: string;
  nombre: string;
  tipo: string;
  categoria: string;
  size: number;
  url: string;
  ocrTexto?: string;
}

export interface DocumentoStats {
  total: number;
  sizeTotalBytes: number;
  porCategoria: Array<{ categoria: string; count: number; sizeTotal: number }>;
  porTipo: Array<{ tipo: string; count: number }>;
}

function buildQs(filters: Record<string, any>) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") qs.append(k, String(v)); });
  return qs.toString();
}

export function useDocumentos(filters: { granjaId?: string; categoria?: string; tipo?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["documentos", filters],
    queryFn:  () => apiGet<DocumentoItem[]>(`/documentos?${buildQs(filters)}`),
    staleTime: 30_000,
  });
}

export function useDocumentosStats(granjaId?: string) {
  return useQuery({
    queryKey: ["documentos", "stats", granjaId],
    queryFn:  () => apiGet<DocumentoStats>(`/documentos/stats${granjaId ? `?granjaId=${granjaId}` : ""}`),
    staleTime: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["documentos"] });
}

export function useCreateDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: DocumentoPayload) => apiPost<DocumentoItem>("/documentos", dto),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DocumentoPayload> }) =>
      apiPatch<DocumentoItem>(`/documentos/${id}`, patch),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/documentos/${id}`),
    onSuccess: () => invalidate(qc),
  });
}
