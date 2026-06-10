"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { ThemeProvider } from "@/components/system/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
