import { QueryClient } from "@tanstack/react-query";

// QueryClient compartido. En el NAVEGADOR es un único singleton para que los stores
// (zustand) puedan invalidar sus queries al guardar y así refrescar al instante el
// Dashboard e informes (que se hidratan vía react-query). En SSR se crea uno nuevo por
// request (no se comparte estado entre peticiones).
function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });
}

let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeClient();
  if (!browserClient) browserClient = makeClient();
  return browserClient;
}
