const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_token');
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fg_token');
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || 'Fallo en la solicitud');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p: string) => req(p),
  post: (p: string, body: any) => req(p, { method: 'POST', body: JSON.stringify(body) }),
  patch: (p: string, body: any) => req(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};
