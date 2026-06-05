// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS · Invitations (admin) + Password Reset (público)
// ═══════════════════════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export interface InvitationItem {
  id:           string;
  email:        string;
  name:         string;
  role:         string;
  status:       "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt:    string;
  acceptedAt?:  string | null;
  createdAt:    string;
  invitedByName: string;
}

export interface CreateInvitationDto {
  email: string;
  name:  string;
  role?: string;
}

export interface CreateInvitationResult {
  id: string;
  email: string;
  name: string;
  role: string;
  expiresAt: string;
  emailSent: boolean;
  emailMode: "smtp" | "noop";
  emailError?: string | null;
  // Si emailMode=noop, viene el link para que el admin lo copie
  activationUrl?: string;
}

export function useInvitations(filters: { status?: string; email?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.append("status", filters.status);
  if (filters.email)  qs.append("email",  filters.email);
  return useQuery({
    queryKey: ["invitations", filters],
    queryFn:  () => apiGet<InvitationItem[]>(`/invitations?${qs}`),
    staleTime: 30_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["invitations"] });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInvitationDto) => apiPost<CreateInvitationResult>("/invitations", dto),
    onSuccess:  () => invalidate(qc),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ id: string }>(`/invitations/${id}`),
    onSuccess:  () => invalidate(qc),
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<{ ok: boolean; mode: string; activationUrl?: string; error?: string }>(`/invitations/${id}/resend`, {}),
    onSuccess:  () => invalidate(qc),
  });
}

// ─── PÚBLICOS (sin auth) ───
// usados en /activar y /restablecer
export async function validateInvitationToken(token: string) {
  return apiGet<{ email: string; name: string; role: string; expiresAt: string }>(`/invitations/validate?token=${encodeURIComponent(token)}`);
}

export async function acceptInvitation(payload: { token: string; password: string; name?: string }) {
  return apiPost<{ id: string; email: string; name: string; role: string; message: string }>(`/invitations/accept`, payload);
}

export async function requestPasswordReset(email: string) {
  return apiPost<{ ok: boolean; message: string }>(`/password-reset/request`, { email });
}

export async function validatePasswordResetToken(token: string) {
  return apiGet<{ email: string; name: string; expiresAt: string }>(`/password-reset/validate?token=${encodeURIComponent(token)}`);
}

export async function resetPasswordWithToken(payload: { token: string; newPassword: string }) {
  return apiPost<{ ok: boolean; message: string }>(`/password-reset/reset`, payload);
}
