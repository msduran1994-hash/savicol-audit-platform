"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0D1526",
            color: "#F8FAFC",
            border: "1px solid #1E2D4A",
            borderRadius: "10px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#10B981", secondary: "#064E3B" } },
          error: { iconTheme: { primary: "#EF4444", secondary: "#450A0A" } },
        }}
      />
    </QueryClientProvider>
  );
}
