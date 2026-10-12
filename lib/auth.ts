import { api, getToken, readTokenPayload, saveSession, clearStoredSession, hasRefreshMarker, type StoredSession } from './api';
import { identifyFromToken } from './analytics';
import { tActive } from './i18n/client';
import { clearCachedData } from './offline/resources';
import { getOfflineScope } from './offline/scope';

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  role?: string;
  user?: { role?: string };
  data?: { accessToken?: string; access_token?: string; role?: string; user?: { role?: string } };
};

export type AuthSession = StoredSession;

// Respuesta del login cuando la cuenta tiene varios roles: todavía no hay
// sesión; con selectionToken (vence en 5 min) se elige el rol en selectRole().
export type RoleSelection = {
  roleSelectionRequired: true;
  roles: string[];
  selectionToken: string;
  user?: { firstName?: string; email?: string };
};

export function isRoleSelection(value: unknown): value is RoleSelection {
  return Boolean(value && typeof value === 'object' && (value as RoleSelection).roleSelectionRequired);
}

function startSession(response: LoginResponse) {
  const data = response.data ?? response;
  const accessToken = data.accessToken ?? data.access_token;
  if (!accessToken) throw new Error(tActive('labels.auth.noToken'));
  saveSession(accessToken, data.user?.role ?? data.role);
  identifyFromToken(accessToken);
  return { ...data, accessToken };
}

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password }) as LoginResponse | RoleSelection;
  if (isRoleSelection(response)) return response;
  return startSession(response);
}

export async function selectRole(selectionToken: string, role: string) {
  const response = await api.post('/auth/select-role', { selectionToken, role }) as LoginResponse;
  return startSession(response);
}

// Cambia el rol de la sesión actual (sin contraseña) y guarda los tokens nuevos.
export async function switchRole(role: string) {
  const response = await api.post('/auth/switch-role', { role }) as LoginResponse;
  return startSession(response);
}

export async function getMyRoles(): Promise<{ active?: string; roles: string[] }> {
  return api.get('/auth/roles');
}

export type Me = {
  id: string;
  email: string;
  gymId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
};

// Lo piden a la vez el menú de la cuenta y el saludo del dashboard: comparten
// la misma petición. Cambiar de rol o cerrar sesión recarga la página, así que
// el caché nunca sobrevive a la sesión.
let mePromise: Promise<Me> | null = null;

export function getMe(): Promise<Me> {
  if (!mePromise) {
    mePromise = (api.get('/auth/me') as Promise<Me>).catch((e) => {
      mePromise = null;
      throw e;
    });
  }
  return mePromise;
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

// Al cerrar sesión se borran los datos del gimnasio descargados en este
// navegador (puede ser compartido). La cola de cambios sin sincronizar se
// conserva: se envía cuando el mismo usuario vuelve a entrar.
async function clearOfflineCache() {
  const scope = getOfflineScope();
  if (!scope) return;
  try {
    await clearCachedData(scope);
  } catch {
    // Sin IndexedDB no hay nada que borrar.
  }
}

// reason se muestra en el login (p. ej. 'idle' tras cierre por inactividad).
export async function logout(reason?: 'idle') {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // Si el token ya no sirve igual cerramos localmente.
  } finally {
    await clearOfflineCache();
    clearSession();
    if (typeof window !== 'undefined') window.location.href = reason ? `/login?reason=${reason}` : '/login';
  }
}

// Revoca los refresh tokens de todos los dispositivos. A diferencia de logout(),
// si el API falla no se cierra nada: el usuario creería que las otras sesiones
// quedaron cerradas.
export async function logoutAll() {
  await api.post('/auth/logout-all', {});
  await clearOfflineCache();
  clearSession();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

export { getToken };
