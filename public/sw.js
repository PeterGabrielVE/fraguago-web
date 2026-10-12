// Service worker de FraguaGo.
//
// Guarda SOLO el cascarón de la app: el HTML de cada pantalla (que no trae
// datos: las pantallas los piden después por la API) y los estáticos de Next
// (/_next/static, con hash en el nombre). Así la app abre sin internet.
//
// Nunca intercepta /api: los datos del gimnasio no pasan por la caché HTTP
// (se guardan en IndexedDB, separados por gimnasio y usuario).
//
// Sube VERSION para descartar todo lo guardado en los dispositivos.

const VERSION = 'v1';
const SHELL_CACHE = `fg-shell-${VERSION}`;
const STATIC_CACHE = `fg-static-${VERSION}`;
const OFFLINE_URL = '/offline';
// Con copia guardada no se espera más que esto a una red lenta.
const NAVIGATION_TIMEOUT_MS = 4000;
const STATIC_MAX_ENTRIES = 600;

self.addEventListener('install', (event) => {
  event.waitUntil(warm([OFFLINE_URL]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('fg-') && key !== SHELL_CACHE && key !== STATIC_CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'WARM' && Array.isArray(event.data.urls)) {
    event.waitUntil(warm(event.data.urls));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API y analítica: siempre directo a la red, sin copia.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ingest/')) return;

  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  }
  // Lo demás (p. ej. las peticiones RSC de Next) va a la red. Sin conexión
  // fallan y Next hace una navegación completa, que sí se atiende arriba.
});

function isStatic(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// Navegación: primero la red (para tener siempre la versión desplegada); si
// no hay conexión, la copia de esa pantalla, y si no existe, /offline.
async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  const key = new URL(request.url).pathname;
  const cached = await cache.match(key);

  const network = fetch(request).then(async (response) => {
    if (isCacheableDocument(response)) {
      const copy = response.clone();
      await cache.put(key, response.clone());
      cacheAssets(await copy.text()).catch(() => {});
    }
    return response;
  });

  try {
    const response = cached
      ? await Promise.race([network, timeout(NAVIGATION_TIMEOUT_MS)])
      : await network;
    // El servidor web caído (502 del proxy) cuenta como sin conexión.
    if (response.status >= 500 && cached) return cached;
    return response;
  } catch {
    network.catch(() => {}); // si ganó el timeout, la red puede fallar después
    return cached || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

// Las redirecciones (p. ej. al login) no se guardan: dependen de la sesión.
function isCacheableDocument(response) {
  return response.ok && !response.redirected && response.type === 'basic'
    && (response.headers.get('content-type') || '').includes('text/html');
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

// Descarga y guarda el HTML de cada ruta y los estáticos que necesita.
async function warm(urls) {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!isCacheableDocument(response)) return;
      const copy = response.clone();
      await cache.put(new URL(url, self.location.origin).pathname, response);
      await cacheAssets(await copy.text());
    } catch {
      // Sin conexión ahora: se guardará cuando se visite la pantalla.
    }
  }));
  await trimStatic();
}

// Guarda los estáticos de Next que referencia un HTML: las etiquetas
// (/_next/static/...) y los chunks listados en los datos RSC (static/chunks/...).
async function cacheAssets(html) {
  const cache = await caches.open(STATIC_CACHE);
  const paths = new Set();
  for (const match of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\\\s<>]+/g)) {
    paths.add(match[0].startsWith('/_next/') ? match[0] : `/_next/${match[0]}`);
  }
  await Promise.all([...paths].map(async (path) => {
    try {
      if (await cache.match(path)) return;
      const response = await fetch(path);
      if (response.ok) await cache.put(path, response);
    } catch {
      // Se guardará al usarse.
    }
  }));
}

// Los estáticos de despliegues viejos se acumulan: se borran los más antiguos.
async function trimStatic() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - STATIC_MAX_ENTRIES)).map((key) => cache.delete(key)));
}
