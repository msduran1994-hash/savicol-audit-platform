"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { ThemeProvider } from "@/components/system/theme-provider";
import { BrandHydration } from "@/components/system/brand-hydration";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  // Singleton en el navegador (mismo cliente que usan los stores para invalidar al guardar).
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandHydration />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!font-sans",
            style: {
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#DCFCE7" } },
            error:   { iconTheme: { primary: "#C41230", secondary: "#FEE2E2" } },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
