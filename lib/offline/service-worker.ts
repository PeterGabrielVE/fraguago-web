// Registro del service worker (public/sw.js): guarda el "cascarón" de la app
// (HTML sin datos + JS/CSS) para poder abrirla sin internet. Los datos del
// gimnasio nunca pasan por él: van por IndexedDB (lib/offline/db.ts).

// Pantallas que deben abrir sin conexión aunque no se hayan visitado antes.
const STAFF_ROUTES = ['/dashboard', '/attendance', '/members', '/membership-plans', '/memberships', '/routines'];
const MEMBER_ROUTES = ['/portal', '/portal/routine', '/portal/membership', '/portal/attendance'];

export function offlineRoutesForRole(role: string | undefined): string[] {
  return role?.toUpperCase() === 'MEMBER' ? MEMBER_ROUTES : STAFF_ROUTES;
}

// En desarrollo el service worker estorba (sirve bundles viejos): solo en
// producción, o forzándolo con NEXT_PUBLIC_ENABLE_SW=true.
function enabled() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === 'true');
}

// Registra el service worker y precarga `urls` (una vez por pestaña).
export async function registerServiceWorker(urls: string[]) {
  if (!enabled()) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const registration = await navigator.serviceWorker.ready;
    const warmedKey = `fg_sw_warmed:${urls.join(',')}`;
    if (sessionStorage.getItem(warmedKey)) return;
    sessionStorage.setItem(warmedKey, '1');
    registration.active?.postMessage({ type: 'WARM', urls });
  } catch {
    // Sin service worker la app funciona igual mientras haya conexión.
  }
}
