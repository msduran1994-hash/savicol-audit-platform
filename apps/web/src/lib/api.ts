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

/* ── Response interceptor: refresca el token si 401 ─────── */
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (refreshing) {
        // Esperar en cola al nuevo token
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      refreshing = true;
      try {
        // Enviamos el refresh token en el body (camino fiable cross-origin);
        // withCredentials mantiene también la cookie como respaldo.
        const res = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refreshToken: useAuthStore.getState().refreshToken },
          { withCredentials: true }
        );
        const newToken: string = res.data.accessToken;
        const newRefresh: string | undefined = res.data.refreshToken;
        // El refresh rota ambos tokens → guardamos los dos.
        useAuthStore.getState().setTokens(newToken, newRefresh);
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        refreshing = false;
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
