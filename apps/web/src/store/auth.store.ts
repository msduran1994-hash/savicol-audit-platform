import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "ADMIN" | "AUDITOR" | "SUPERVISOR" | "VIEWER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mfaEnabled?: boolean;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** Refresh token (JWT) para renovar el access token sin sacar al usuario */
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Temp token emitido por /auth/login antes de pasar por MFA */
  tempToken: string | null;
  setUser: (user: AuthUser, token: string, refreshToken?: string) => void;
  /** Actualiza solo los tokens (usado al refrescar; el refresh rota ambos) */
  setTokens: (accessToken: string, refreshToken?: string) => void;
  /** Guarda el tempToken cuando el login requiere MFA */
  setMfaPending: (tempToken: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      tempToken:       null,

      setUser: (user, accessToken, refreshToken) =>
        set((s) => ({ user, accessToken, refreshToken: refreshToken ?? s.refreshToken, isAuthenticated: true, tempToken: null })),

      setTokens: (accessToken, refreshToken) =>
        set((s) => ({ accessToken, refreshToken: refreshToken ?? s.refreshToken })),

      setMfaPending: (tempToken) =>
        set({ tempToken, isAuthenticated: false }),

      logout: () => {
        // Limpiar stores de datos para garantizar estado limpio entre sesiones
        const keysToRemove = [
          "savicol-granjas-store",
          "savicol-cedis-store",
          "savicol-rutas-store",
          "savicol-audit-store",
        ];
        keysToRemove.forEach((k) => {
          try { localStorage.removeItem(k); } catch { /* SSR */ }
        });
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, tempToken: null });
      },
    }),
    {
      name: "savicol-auth",
      partialize: (s) => ({
        user:            s.user,
        accessToken:     s.accessToken,
        refreshToken:    s.refreshToken,
        isAuthenticated: s.isAuthenticated,
        // No persistir tempToken por seguridad
      }),
    }
  )
);
