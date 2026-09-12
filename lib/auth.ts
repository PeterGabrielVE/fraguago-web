import { api, getToken } from './api';

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  role?: string;
  user?: { role?: string };
  data?: { accessToken?: string; access_token?: string; role?: string; user?: { role?: string } };
};

export type AuthSession = {
  accessToken: string;
  role?: string;
  expiresAt?: number;
};

function readTokenPayload(token: string): { role?: string; exp?: number } {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string; exp?: number };
    return decoded;
  } catch {
    return {};
  }
}

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password }) as LoginResponse;
  const data = response.data ?? response;
  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) throw new Error('El servidor no devolvió un access token');
  const tokenPayload = readTokenPayload(accessToken);
  const session: AuthSession = {
    accessToken,
    role: data.user?.role ?? data.role ?? tokenPayload.role,
    expiresAt: tokenPayload.exp ? tokenPayload.exp * 1000 : undefined,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('fg_token', session.accessToken);
    localStorage.setItem('fg_session', JSON.stringify(session));
    // Fallback para el middleware durante la navegación en desarrollo.
    document.cookie = `fg_token=${encodeURIComponent(session.accessToken)}; path=/;${session.expiresAt ? ` expires=${new Date(session.expiresAt).toUTCString()};` : ''} samesite=lax`;
  }
  return { ...data, accessToken };
}

export function getRole(data?: LoginResponse): string | undefined {
  const token = data?.accessToken ?? getToken();
  return data?.user?.role ?? data?.role ?? (token ? readTokenPayload(token).role : undefined);
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('fg_session');
  const legacyToken = localStorage.getItem('fg_token');
  let session: AuthSession | null = null;

  try {
    session = stored ? JSON.parse(stored) as AuthSession : null;
  } catch {
    session = null;
  }

  if (!session && legacyToken) {
    const payload = readTokenPayload(legacyToken);
    session = { accessToken: legacyToken, role: payload.role, expiresAt: payload.exp ? payload.exp * 1000 : undefined };
  }

  if (!session?.accessToken) return null;
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }

  return session;
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_session');
    document.cookie = 'fg_token=; path=/; max-age=0; samesite=lax';
  }
}

export function getRoleRedirect(data?: LoginResponse): string {
  switch (getRole(data)?.toUpperCase()) {
    case 'TRAINER':
      return '/routines';
    case 'ADMIN':
    case 'OWNER':
    case 'GYM_OWNER':
    default:
      return '/dashboard';
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout', {});
  } finally {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
}

export { getToken };
