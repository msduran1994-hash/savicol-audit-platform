// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Módulo Users (Gestión de usuarios y roles · solo ADMIN)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mfaEnabled?: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password?: string;
  role?: string;
  mfaEnabled?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

const QK = "users";

// ─── LISTA ─────────────────────────────────────────────────────
export function useUsers(filters: { search?: string; role?: string; isActive?: string } = {}) {
  return useQuery({
    queryKey: [QK, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, String(v)); });
      return apiGet<AppUser[]>(`/users${params.toString() ? `?${params}` : ""}`);
    },
    staleTime: 30_000,
  });
}

// ─── DETALLE ───────────────────────────────────────────────────
export function useUser(id: string | null) {
  return useQuery({
    queryKey: [QK, id],
    queryFn:  () => apiGet<AppUser>(`/users/${id}`),
    enabled:  !!id,
  });
}

// ─── CREAR ─────────────────────────────────────────────────────
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUserPayload) =>
      apiPost<AppUser & { tempPassword?: string }>("/users", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

// ─── ACTUALIZAR ───────────────────────────────────────────────
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserPayload }) =>
      apiPatch<AppUser>(`/users/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

// ─── CAMBIAR ROL ──────────────────────────────────────────────
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiPatch<AppUser>(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

// ─── ACTIVAR/DESACTIVAR ────────────────────────────────────────
export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch<AppUser>(`/users/${id}/toggle-active`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

// ─── ELIMINAR ──────────────────────────────────────────────────
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

// ─── RESET PASSWORD (ADMIN devuelve tempPassword) ──────────────
export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ message: string; tempPassword: string }>(`/users/${id}/reset-password`),
  });
}

// ─── CAMBIAR CONTRASEÑA (usuario actual) ───────────────────────
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, currentPassword, newPassword }: { id: string; currentPassword: string; newPassword: string }) =>
      apiPost<{ message: string }>(`/users/${id}/change-password`, { currentPassword, newPassword }),
  });
}

// ─── SESIONES ─────────────────────────────────────────────────
export function useUserSessions(id: string | null) {
  return useQuery({
    queryKey: [QK, "sessions", id],
    queryFn:  () => apiGet<Array<{ id: string; userAgent: string; ipAddress: string; expiresAt: string; createdAt: string }>>(`/users/${id}/sessions`),
    enabled:  !!id,
  });
}

export function useRevokeAllSessions() {
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/users/${id}/sessions`),
  });
}
