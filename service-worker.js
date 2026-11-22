const CACHE_NAME = "madar-pwa-shell-v1";
const OFFLINE_PAGE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MADAR</title><body style="font-family:system-ui,sans-serif;background:#fbf9f5;color:#182b32;padding:2rem;line-height:1.8"><h1>MADAR | مدار</h1><p>يلزم الاتصال بالإنترنت لفتح المتجر وبياناته.</p></body></html>`;
self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("madar-pwa-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
// Only same-origin page navigations are cached; live Supabase/API requests stay untouched.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  url.search = "";
  url.hash = "";
  const cacheKey = url.href;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
        try { await (await caches.open(CACHE_NAME)).put(cacheKey, response.clone()); } catch (_) {}
      }
      return response;
    } catch (_) {
      const cached = await caches.match(cacheKey);
      if (cached) return cached;
      return new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  })());
});
