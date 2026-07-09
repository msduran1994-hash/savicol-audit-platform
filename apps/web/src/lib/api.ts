import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim();

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

/* ── Request interceptor: inyecta el access token ─────── */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ── Refresco de token (reutilizable: interceptor 401 + refresco proactivo) ──── */
// Single-flight: si ya hay un refresco en curso, todas las llamadas comparten la
// MISMA promesa. Esto evita que el refresco proactivo (temporizador) y el reactivo
// (401) disparen dos POST /auth/refresh a la vez —lo que crearía dos sesiones y
// podría dejar guardado un token que no es el de la sesión más reciente (→ logout).
let refreshPromise: Promise<string> | null = null;

/**
 * Renueva el access token usando el refresh token almacenado. El backend rota
 * AMBOS tokens, así que persistimos los dos. Enviamos el refresh token en el body
 * (camino fiable cross-origin Vercel↔Railway) y withCredentials mantiene la cookie
 * httpOnly como respaldo. Devuelve el nuevo access token o lanza si el refresh falla.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        { refreshToken: useAuthStore.getState().refreshToken },
        { withCredentials: true }
      );
      const newToken: string = res.data.accessToken;
      const newRefresh: string | undefined = res.data.refreshToken;
      useAuthStore.getState().setTokens(newToken, newRefresh);
      return newToken;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/* ── Response interceptor: refresca el token si 401 ─────── */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Intento único y silencioso de renovar el token (por si la sesión superó el TTL
        // largo). Single-flight: peticiones concurrentes comparten el mismo refresco.
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // NO forzamos el cierre de sesión ni redirigimos: el ÚNICO cierre automático es
        // el de inactividad (40 min, con aviso). Rechazamos para que el llamador maneje
        // el error sin expulsar al usuario que está trabajando.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/* ── Helpers tipados ──────────────────────────────────── */
export const apiGet  = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((r) => r.data);

export const apiPost = <T>(url: string, data?: object) =>
  api.post<T>(url, data).then((r) => r.data);

export const apiPatch = <T>(url: string, data?: object) =>
  api.patch<T>(url, data).then((r) => r.data);

export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((r) => r.data);
