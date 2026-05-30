"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* ── Login: llama al API y redirige a MFA ─────────────── */
export function useLogin() {
  const { setMfaPending } = useAuthStore();
  const router = useRouter();

  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: async (dto: { email: string; password: string }) => {
      const res = await axios.post(`${BASE}/api/v1/auth/login`, dto, {
        withCredentials: true,
      });
      return res.data as {
        mfaRequired: boolean;
        tempToken?: string;
        user?:        { id: string; email: string; name: string; role: any };
        accessToken?: string;
      };
    },
    onSuccess: (data) => {
      if (data.mfaRequired) {
        setMfaPending(data.tempToken!);
        router.push("/mfa");
      } else if (data.user && data.accessToken) {
        // Backend devolvió tokens directos (MFA no requerido)
        setUser(data.user, data.accessToken);
        toast.success(`Bienvenido ${data.user.name}`);
        router.push("/");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Credenciales inválidas");
    },
  });
}

/* ── MFA verify ───────────────────────────────────────── */
export function useMfaVerify() {
  const { setUser, setMfaPending } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (dto: { tempToken: string; code: string }) => {
      const res = await axios.post(`${BASE}/api/v1/auth/mfa/verify`, dto, {
        withCredentials: true,
      });
      return res.data as {
        user: { id: string; email: string; name: string; role: any };
        accessToken: string;
      };
    },
    onSuccess: (data) => {
      setUser(data.user, data.accessToken);
      setMfaPending(null);
      toast.success("Bienvenido");
      router.push("/");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Código MFA inválido");
    },
  });
}

/* ── Logout ───────────────────────────────────────────── */
export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await axios.post(`${BASE}/api/v1/auth/logout`, {}, { withCredentials: true });
    },
    onSettled: () => {
      logout();
      router.push("/login");
    },
  });
}
