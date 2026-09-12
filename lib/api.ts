import { reportError } from '@/lib/errorReporter';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type TokenResponse = {
  accessToken?: string;
  access_token?: string;
  role?: string;
  user?: { role?: string };
};

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

    throw new Error(body.message || 'Fallo en la solicitud');
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (p: string) => req(p),
  list: async (p: string) => {
    const response = await req(p);
    return Array.isArray(response) ? response : (response?.data ?? []);
  },
  post: (p: string, body: any) => req(p, { method: 'POST', body: JSON.stringify(body) }),
  put: (p: string, body: any) => req(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (p: string, body: any) => req(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};