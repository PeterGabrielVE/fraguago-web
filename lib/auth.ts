import { api, getToken } from './api';

type LoginResponse = {
  accessToken: string;
  role?: string;
  user?: { role?: string };
};

function getTokenRole(token: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
    return decoded.role;
  } catch {
    return undefined;
  }
}

export async function login(email: string, password: string) {
  const data = await api.post('/auth/login', { email, password }) as LoginResponse;
  if (typeof window !== 'undefined') localStorage.setItem('fg_token', data.accessToken);
  return data;
}

export function getRole(data?: LoginResponse): string | undefined {
  const token = data?.accessToken ?? getToken();
  return data?.user?.role ?? data?.role ?? (token ? getTokenRole(token) : undefined);
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

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fg_token');
    window.location.href = '/login';
  }
}

export { getToken };
