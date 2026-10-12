import { reportError } from '@/lib/errorReporter';
import { resetAnalytics } from '@/lib/analytics';
import { getActiveLocale, tActive } from '@/lib/i18n/client';
import { reportReachable, reportUnreachable } from '@/lib/offline/connectivity';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Base del API para clientes que no pasan por req() (p. ej. streams SSE).
export const API_BASE = BASE;

type TokenResponse = {
  accessToken?: string;
  access_token?: string;
  role?: string;
  user?: { role?: string };
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// La petición no llegó al API (sin internet, backend caído, DNS). El modo
// offline la distingue de un error que sí respondió el servidor.
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_token');
}

export type StoredSession = {
  accessToken: string;
  role?: string;
  expiresAt?: number;
};

export function readTokenPayload(token: string): { sub?: string; email?: string; role?: string; exp?: number; gymId?: string } {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

// Vigencia del refresh token (debe coincidir con JWT_REFRESH_EXPIRES_SEC del API).
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
// Cookie marcador (no sensible) que le dice al middleware que hay un refresh
// token vivo: la cookie real es httpOnly y con path=/api/auth, el middleware
// no la ve, y sin esto mandaba al login a los 15 min aunque la sesión siguiera.
const AUTH_MARKER_COOKIE = 'fg_auth';

export function hasRefreshMarker(): boolean {
  return typeof document !== 'undefined' && document.cookie.split('; ').some((c) => c.startsWith(`${AUTH_MARKER_COOKIE}=`));
}

// Único punto que guarda la sesión (login y cada renovación), así expiresAt,
// rol y cookies quedan siempre sincronizados.
export function saveSession(accessToken: string, role?: string): StoredSession {
  const payload = readTokenPayload(accessToken);
  const session: StoredSession = {
    accessToken,
    role: role ?? payload.role,
    expiresAt: payload.exp ? payload.exp * 1000 : undefined,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('fg_token', accessToken);
    localStorage.setItem('fg_session', JSON.stringify(session));
    document.cookie = `fg_token=${encodeURIComponent(accessToken)}; path=/;${session.expiresAt ? ` expires=${new Date(session.expiresAt).toUTCString()};` : ''} samesite=lax`;
    document.cookie = `${AUTH_MARKER_COOKIE}=1; path=/; max-age=${REFRESH_TTL_SEC}; samesite=lax`;
  }
  return session;
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fg_token');
  localStorage.removeItem('fg_session');
  document.cookie = 'fg_token=; path=/; max-age=0; samesite=lax';
  document.cookie = `${AUTH_MARKER_COOKIE}=; path=/; max-age=0; samesite=lax`;
  resetAnalytics();
}

function isTokenFresh(token: string) {
  const exp = readTokenPayload(token).exp;
  return !exp || exp * 1000 > Date.now() + 5_000;
}

// El API rota el refresh token y, si recibe uno ya usado, lo trata como robo y
// cierra TODAS las sesiones. Por eso solo puede haber una renovación a la vez:
// varias peticiones con 401 en paralelo (p. ej. api.list) comparten la misma
// promesa, y entre pestañas se serializa con Web Locks.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(staleToken: string | null = getToken()): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!refreshInFlight) {
    const run = () => doRefresh(staleToken);
    // request() resuelve con el valor de la promesa del callback (el tipado del DOM no lo aplana).
    const locked = navigator.locks?.request
      ? navigator.locks.request('fg-auth-refresh', run) as unknown as Promise<string | null>
      : run();
    refreshInFlight = locked.finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function doRefresh(staleToken: string | null): Promise<string | null> {
  // Otra pestaña pudo renovar mientras esperábamos el lock: usamos su token.
  const current = getToken();
  if (current && current !== staleToken && isTokenFresh(current)) return current;

  try {
    const response = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json() as TokenResponse;
    const accessToken = data.accessToken ?? data.access_token;
    if (!accessToken) return null;

    saveSession(accessToken, data.user?.role ?? data.role);
    return accessToken;
  } catch {
    return null;
  }
}

// Renueva el access token con el refresh token (cookie). Reutilizable por
// clientes que no usan req(): descargas, subidas con progreso, SSE.
export function refreshSession(): Promise<string | null> {
  return refreshAccessToken();
}

// fetch autenticado con un reintento tras renovar el token si responde 401.
// Para respuestas binarias (descargas) donde req() no sirve porque parsea JSON.
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let sentToken: string | null = null;
  const run = () => {
    const token = sentToken = getToken();
    return fetch(BASE + path, {
      ...init,
      credentials: 'include',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
    });
  };
  let res = await run();
  if (res.status === 401 && sentToken && (await refreshAccessToken(sentToken))) res = await run();
  return res;
}

async function req(path: string, opts: RequestInit = {}, canRefresh = true) {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // El API aún responde en español; así puede localizar sus mensajes cuando lo soporte.
        'Accept-Language': getActiveLocale(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch (error) {
    // fetch solo lanza por fallo de red: backend caído, offline, CORS, DNS
    reportError({
      type: 'http',
      message: 'Sin conexión con el servidor',
      source: `${opts.method ?? 'GET'} ${path}`,
      error,
    });
    reportUnreachable();
    throw new NetworkError(tActive('api.offline'));
  }
  reportReachable();

  // Sin token no hay sesión que expirar (p. ej. /auth/login con clave
  // incorrecta): el 401 sigue como error normal con el mensaje del API.
  if (res.status === 401 && token) {
    if (canRefresh && token && typeof window !== 'undefined') {
      const refreshedToken = await refreshAccessToken(token);
      if (refreshedToken) {
        return req(path, opts, false);
      }
    }

    // El refresh falló o la sesión ya no es recuperable.
    if (typeof window !== 'undefined') {
      clearStoredSession();
      window.location.href = '/login?reason=expired';
    }
    throw new Error(tActive('api.sessionExpired'));
  }

  if (res.status === 403) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/403') {
      window.location.href = '/403';
    }
    throw new Error(tActive('api.forbidden'));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));

    // reporta solo fallos del servidor; los 4xx son problema del llamador
    if (res.status >= 500) {
      reportError({
        type: 'http',
        message: `HTTP ${res.status}: ${body.message ?? res.statusText}`,
        source: `${opts.method ?? 'GET'} ${path}`,
      });
    }

    throw new ApiError(body.message || tActive('api.requestFailed'), res.status);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Tope de filas que se traen para una lista completa (tablas y selects).
const MAX_LIST_ROWS = 5000;
// Máximo pageSize que aceptan los endpoints paginados del API.
const LIST_PAGE_SIZE = 100;

// Devuelve TODAS las filas de un endpoint. Si responde paginado
// ({ data, total } o { data, meta: { total } }) y la primera página no trae
// todo, pide el resto de páginas en paralelo (antes solo se veían 20).
async function listAll(path: string): Promise<any[]> {
  const first = await req(path);
  if (Array.isArray(first)) return first;
  const data: any[] = Array.isArray(first?.data) ? first.data : [];
  const total = typeof first?.total === 'number' ? first.total : first?.meta?.total;
  if (typeof total !== 'number' || data.length >= total) return data;

  const [base, query = ''] = path.split('?');
  const pages = Math.ceil(Math.min(total, MAX_LIST_ROWS) / LIST_PAGE_SIZE);
  const responses = await Promise.all(
    Array.from({ length: pages }, (_, i) => {
      const params = new URLSearchParams(query);
      params.set('page', String(i + 1));
      params.set('pageSize', String(LIST_PAGE_SIZE));
      return req(`${base}?${params}`);
    }),
  );
  // Sin duplicados si alguien crea/borra registros mientras se pagina.
  const byId = new Map<string, any>();
  const rows: any[] = [];
  for (const res of responses) {
    for (const row of res?.data ?? []) {
      if (row?.id) { if (byId.has(row.id)) continue; byId.set(row.id, row); }
      rows.push(row);
    }
  }
  return rows;
}

export const api = {
  get: (p: string) => req(p),
  list: listAll,
  post: (p: string, body: any) => req(p, { method: 'POST', body: JSON.stringify(body) }),
  put: (p: string, body: any) => req(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (p: string, body: any) => req(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};