import { reportError } from '@/lib/errorReporter';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_token');
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
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
    // esperado: sesión expirada, no se reporta
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fg_token');
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
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
  post: (p: string, body: any) => req(p, { method: 'POST', body: JSON.stringify(body) }),
  put: (p: string, body: any) => req(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (p: string, body: any) => req(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};