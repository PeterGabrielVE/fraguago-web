import { getToken, readTokenPayload } from '@/lib/api';
import { offlineStorageAvailable, type OfflineScope } from './db';

// Gimnasio y usuario de la sesión actual (del access token). Define qué base
// local se abre; null si no hay sesión o el navegador no tiene IndexedDB.
export function getOfflineScope(): OfflineScope | null {
  if (!offlineStorageAvailable()) return null;
  const token = getToken();
  if (!token) return null;
  const { gymId, sub } = readTokenPayload(token);
  return gymId && sub ? { gymId, userId: sub } : null;
}
