// Estado de conexión con el API. navigator.onLine solo dice si hay red local
// (un router sin internet cuenta como "online"), así que es apenas la primera
// señal: lo que decide es si el API responde en /health.

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const PROBE_TIMEOUT_MS = 5_000;
// Con el API caído se reintenta seguido para volver rápido; arriba, de vez en cuando.
const PROBE_DOWN_MS = 10_000;
const PROBE_UP_MS = 60_000;

export type BackendState = 'unknown' | 'up' | 'down';
export type ConnectivityState = { browserOnline: boolean; backend: BackendState };

let state: ConnectivityState = { browserOnline: true, backend: 'unknown' };
const listeners = new Set<() => void>();
let probeInFlight: Promise<boolean> | null = null;

function setState(next: Partial<ConnectivityState>) {
  const merged = { ...state, ...next };
  if (merged.browserOnline === state.browserOnline && merged.backend === state.backend) return;
  state = merged;
  listeners.forEach((listener) => listener());
}

export function subscribeConnectivity(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getConnectivity(): ConnectivityState {
  return state;
}

// Mientras no se sepa lo contrario se asume que hay servicio: la primera
// petición lo confirma o lo desmiente.
export function isBackendUp(): boolean {
  return state.browserOnline && state.backend !== 'down';
}

// Lo llama el cliente HTTP: una respuesta del API (del estado que sea) prueba
// que hay servicio.
export function reportReachable() {
  setState({ backend: 'up', browserOnline: true });
}

// Un fetch que falla puede ser un corte momentáneo: se confirma con /health
// antes de declarar el API caído.
export function reportUnreachable() {
  void checkBackend();
}

export function checkBackend(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true);
  if (!probeInFlight) {
    probeInFlight = probe().finally(() => { probeInFlight = null; });
  }
  return probeInFlight;
}

async function probe(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setState({ browserOnline: false, backend: 'down' });
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/health`, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
    // Un 5xx del proxy (API reiniciando) tampoco es servicio operativo.
    setState({ browserOnline: true, backend: res.ok ? 'up' : 'down' });
    return res.ok;
  } catch {
    setState({ backend: 'down' });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Arranca la vigilancia (eventos del navegador + sondeo periódico). Devuelve
// la función que la detiene.
export function startConnectivityMonitor(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onOnline = () => { setState({ browserOnline: true }); void checkBackend(); };
  const onOffline = () => setState({ browserOnline: false, backend: 'down' });
  const onVisible = () => { if (document.visibilityState === 'visible') void checkBackend(); };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);

  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(async () => {
      if (document.visibilityState === 'visible') await checkBackend();
      schedule();
    }, state.backend === 'up' ? PROBE_UP_MS : PROBE_DOWN_MS);
  };
  void checkBackend();
  schedule();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
    clearTimeout(timer);
  };
}
