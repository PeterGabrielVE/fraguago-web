import { api, getToken, readTokenPayload, saveSession, clearStoredSession, hasRefreshMarker, type StoredSession } from './api';
import { identifyFromToken } from './analytics';
import { tActive } from './i18n/client';

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  role?: string;
  user?: { role?: string };
  data?: { accessToken?: string; access_token?: string; role?: string; user?: { role?: string } };
};

export type AuthSession = StoredSession;

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password }) as LoginResponse;
  const data = response.data ?? response;
  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) throw new Error(tActive('labels.auth.noToken'));
  saveSession(accessToken, data.user?.role ?? data.role);
  identifyFromToken(accessToken);
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
  // Access token vencido NO es sesión vencida: la primera petición recibe 401
  // y api.ts lo renueva con el refresh token. Solo descartamos si tampoco hay
  // refresh token vivo (antes esto echaba al usuario a los 15 min al recargar).
  if (session.expiresAt && session.expiresAt <= Date.now() && !hasRefreshMarker()) {
    clearSession();
    return null;
  }

  return session;
}

export function clearSession() {
  clearStoredSession();
}

// gym del usuario logueado (viene en el access token).
export function getGymId(): string | undefined {
  const token = getToken();
  return token ? readTokenPayload(token).gymId : undefined;
}

export function getRoleRedirect(data?: LoginResponse): string {
  switch (getRole(data)?.toUpperCase()) {
    case 'TRAINER':
      return '/routines';
    case 'MEMBER':
      return '/portal';
    case 'ADMIN':
    case 'OWNER':
    case 'GYM_OWNER':
    default:
      return '/dashboard';
  }
}

// reason se muestra en el login (p. ej. 'idle' tras cierre por inactividad).
export async function logout(reason?: 'idle') {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // Si el token ya no sirve igual cerramos localmente.
  } finally {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = reason ? `/login?reason=${reason}` : '/login';
  }
}

export { getToken };
