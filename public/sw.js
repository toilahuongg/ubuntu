const CACHE_NAME = "ubuntu-v11";
const OFFLINE_URL = "/offline";
const DEFAULT_NOTIFICATION_ICON = "/icons/logo.png";

const PRECACHE = [
  "/manifest.json",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/icons/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigation(request) {
  return request.mode === "navigate";
}

function isMutableStaticAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon-precomposed.png" ||
    pathname.startsWith("/badges/") ||
    pathname.startsWith("/cosmetics/")
  );
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(async () => {
      const cached = await caches.match(request);
      return cached || Response.error();
    });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API requests
  if (url.pathname.startsWith("/api/")) return;

  // Cache hashed Next.js static assets (JS, CSS, fonts) — immutable, safe to cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for mutable static assets (icons, badges, cosmetics)
  if (isMutableStaticAsset(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation: network-first, fallback to cache, then offline page
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlineResponse = await caches.match(OFFLINE_URL);
          return offlineResponse || new Response("Bạn đang ngoại tuyến", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Thông báo", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Thông báo";
  const options = {
    body: data.body || "",
    icon: data.icon || DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_ICON,
    tag: data.tag,
    data: { url: data.url || "/" },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const focusedClient = clientList.find((c) => "focus" in c);
        if (focusedClient) {
          focusedClient.navigate(targetUrl).catch(() => {});
          return focusedClient.focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
