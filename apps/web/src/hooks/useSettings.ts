// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Settings (configuración global) + API Tokens
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim();

export interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  label?: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}

export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string;          // JSON array stringificado
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

// ─── SETTINGS ─────────────────────────────────────────────
export function useSettings(category?: string) {
  return useQuery({
    queryKey: ["settings", category],
    queryFn:  () => apiGet<Setting[]>(category ? `/settings?category=${category}` : "/settings"),
    staleTime: 30_000,
  });
}

export function useSettingsPublic() {
  // Endpoint público (sin auth) · útil para layout que necesita logo/GA antes del login
  return useQuery({
    queryKey: ["settings", "public"],
    queryFn: async () => {
      const res = await axios.get<Setting[]>(`${API_BASE}/api/v1/settings/public`);
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Setting> & { key: string; value: string }) =>
      apiPost<Setting>("/settings", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── API TOKENS ───────────────────────────────────────────
export function useApiTokens() {
  return useQuery({
    queryKey: ["api-tokens"],
    queryFn:  () => apiGet<ApiToken[]>("/api-tokens"),
    staleTime: 30_000,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; scopes?: string[]; expiresInDays?: number }) =>
      apiPost<ApiToken & { token: string }>("/api-tokens", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-tokens"] }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch<{ message: string }>(`/api-tokens/${id}/revoke`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-tokens"] }),
  });
}

export function useDeleteApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api-tokens/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-tokens"] }),
  });
}

// ─── HELPERS ──────────────────────────────────────────────
export function getSetting(settings: Setting[] | undefined, key: string): string | undefined {
  return settings?.find(s => s.key === key)?.value;
}
