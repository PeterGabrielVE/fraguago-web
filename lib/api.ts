import { reportError } from '@/lib/errorReporter';

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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_token');
}

async function refreshAccessToken(): Promise<string | null> {
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

    localStorage.setItem('fg_token', accessToken);
    localStorage.setItem('fg_session', JSON.stringify({
      accessToken,
      role: data.user?.role ?? data.role,
    }));
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
  const run = () => {
    const token = getToken();
    return fetch(BASE + path, {
      ...init,
      credentials: 'include',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
    });
  };
  let res = await run();
  if (res.status === 401 && getToken() && (await refreshAccessToken())) res = await run();
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
    throw new Error('No se pudo conectar con el servidor');
  }

  if (res.status === 401) {
    if (canRefresh && token && typeof window !== 'undefined') {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        return req(path, opts, false);
      }
    }

    // El refresh falló o la sesión ya no es recuperable.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fg_token');
      localStorage.removeItem('fg_session');
      document.cookie = 'fg_token=; path=/; max-age=0; samesite=lax';
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }

  if (res.status === 403) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/403') {
      window.location.href = '/403';
    }
    throw new Error('No tienes permisos para realizar esta acción');
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

    throw new ApiError(body.message || 'Fallo en la solicitud', res.status);
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