import { api, getToken } from './api';

export async function login(email: string, password: string) {
  const data = await api.post('/auth/login', { email, password });
  if (typeof window !== 'undefined') localStorage.setItem('fg_token', data.accessToken);
  return data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fg_token');
    window.location.href = '/login';
  }
}

export { getToken };
