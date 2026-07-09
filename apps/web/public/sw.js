/* ═══════════════════════════════════════════════════════════════════════════
   Service Worker · Audit Platform Savicol (PWA)
   Estrategia conservadora y segura para una app de auditoría con datos en vivo:
   - NUNCA cachea llamadas al API ni autenticación (siempre red).
   - Navegación/documentos: network-first con respaldo en caché (la app abre
     aunque haya mala conexión, pero prioriza datos frescos).
   - Estáticos (JS/CSS/imágenes/fuentes): network-first con respaldo en caché,
     para que cada despliegue tome efecto de inmediato (evita servir JS viejo).
   - Versionar CACHE invalida cachés antiguas en cada actualización.
   ═══════════════════════════════════════════════════════════════════════════ */
const CACHE = "savicol-pwa-v4";
const OFFLINE_URL = "/";

// Rutas/orígenes que NUNCA deben cachearse (datos en vivo y seguridad)
function esNoCacheable(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("railway.app") ||        // backend NestJS
    url.pathname.includes("/auth") ||
    url.search.includes("no-cache")
  );
}

self.addEventListener("install", (event) => {
  // Activación inmediata de la nueva versión
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL]).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // solo GET

  const url = new URL(request.url);

  // 1) API, auth y datos en vivo → siempre red, nunca caché
  if (esNoCacheable(url)) return;

  // 2) Navegación (documentos HTML) → network-first con respaldo
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // 3) Estáticos del mismo origen → network-first con respaldo en caché.
  //    Garantiza que el JS/CSS recién desplegado se sirva fresco (sin código
  //    viejo en caché); si no hay red, recurre a la copia cacheada.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Permite a la app forzar la actualización del SW (botón "actualizar")
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
