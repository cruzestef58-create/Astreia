/* Service worker : l'appli s'ouvre même sans réseau, et se met à jour dès qu'il revient. */
const CACHE = "astreia-v1";
const ESSENTIELS = ["/", "/manifest.json", "/icones/192.png", "/icones/512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENTIELS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname === "/ws") return;                    // le direct ne passe jamais par le cache

  if (url.origin !== location.origin) {
    // polices Google : cache d'abord, elles ne bougent pas
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copie = res.clone();
        caches.open(CACHE).then(c => c.put(req, copie));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // même origine : réseau d'abord pour toujours avoir la dernière version
  e.respondWith(
    fetch(req).then(res => {
      const copie = res.clone();
      caches.open(CACHE).then(c => c.put(req, copie));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("/")))
  );
});
