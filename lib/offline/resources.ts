import { api, ApiError, NetworkError } from '@/lib/api';
import { checkBackend, isBackendUp } from './connectivity';
import { getDb, type OfflineScope } from './db';
import { listOps } from './outbox';
import { overlayAttendance, overlayMembers } from './overlays';
import { getOfflineScope } from './scope';

// Lectura con respaldo local: los datos se piden al API y se guardan en
// IndexedDB; si el API no responde se devuelve la última copia. Las pantallas
// llaman a listResource/getResource en vez de a api.list/api.get y no saben de
// dónde vino el dato.
//
// Solo se guardan los recursos de esta lista (lecturas útiles sin conexión).
// Todo lo demás pasa directo al API, sin copia local.
const CACHEABLE = new Set([
  '/members',
  '/membership-plans',
  '/memberships',
  '/memberships/expiring',
  '/memberships/expired',
  '/routines',
  '/trainers',
  '/attendance',
  // Portal del socio
  '/me/profile',
  '/me/membership',
  '/me/attendances',
  '/me/routine',
  '/me/progress',
]);

// Las copias de listas por fecha (asistencia) se acumulan: se borran las viejas.
const SNAPSHOT_MAX_AGE_MS = 14 * 86_400_000;

export type ResourceInfo = { source: 'network' | 'cache'; savedAt: number };

const info = new Map<string, ResourceInfo>();
const listeners = new Set<() => void>();

function setInfo(path: string, next: ResourceInfo) {
  const current = info.get(path);
  if (current?.source === next.source && current.savedAt === next.savedAt) return;
  info.set(path, next);
  listeners.forEach((listener) => listener());
}

export function subscribeResourceInfo(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// De dónde salió la última lectura de `path` (para avisar que son datos guardados).
export function getResourceInfo(path: string): ResourceInfo | undefined {
  return info.get(path);
}

function isCacheable(path: string) {
  return CACHEABLE.has(path.split('?')[0]);
}

// El API no respondió o está reiniciando: vale usar la copia local. Un 4xx es
// una respuesta real del servidor y se muestra tal cual.
function isUnavailable(err: unknown) {
  return err instanceof NetworkError || (err instanceof ApiError && [502, 503, 504].includes(err.status));
}

async function cached<T>(path: string, fetcher: () => Promise<T>): Promise<T> {
  const scope = getOfflineScope();
  if (!scope || !isCacheable(path)) return fetcher();

  // API caído: se responde con la copia sin esperar a que falle la red.
  if (!isBackendUp()) {
    const snapshot = await readSnapshot(scope, path);
    if (snapshot) {
      void checkBackend();
      setInfo(path, { source: 'cache', savedAt: snapshot.savedAt });
      return snapshot.data as T;
    }
  }

  try {
    const data = await fetcher();
    const savedAt = Date.now();
    await getDb(scope).snapshots.put({ path, data, savedAt }).catch(() => {});
    setInfo(path, { source: 'network', savedAt });
    return data;
  } catch (err) {
    if (isUnavailable(err)) {
      const snapshot = await readSnapshot(scope, path);
      if (snapshot) {
        setInfo(path, { source: 'cache', savedAt: snapshot.savedAt });
        return snapshot.data as T;
      }
    }
    throw err;
  }
}

async function readSnapshot(scope: OfflineScope, path: string) {
  try {
    return await getDb(scope).snapshots.get(path);
  } catch {
    return undefined;
  }
}

// Suma a la lista lo que está en la cola y el servidor aún no devuelve.
async function withPendingOps(path: string, rows: any[]): Promise<any[]> {
  const scope = getOfflineScope();
  if (!scope) return rows;
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  try {
    if (base === '/members' && !params.get('q') && !params.get('status')) {
      return overlayMembers(rows, await listOps(scope));
    }
    const date = params.get('date');
    if (base === '/attendance' && date) {
      return overlayAttendance(rows, await listOps(scope), { date, shift: params.get('shift') ?? undefined });
    }
  } catch {
    // Sin IndexedDB no hay cola que mezclar.
  }
  return rows;
}

// Igual que api.list (todas las páginas), con copia local.
export async function listResource(path: string): Promise<any[]> {
  const rows = await cached(path, () => api.list(path));
  return withPendingOps(path, rows);
}

// Igual que api.get, con copia local.
export function getResource<T = any>(path: string): Promise<T> {
  return cached(path, () => api.get(path) as Promise<T>);
}

// Borra las copias descargadas (no la cola). Al cerrar sesión: los datos del
// gimnasio no quedan en un navegador compartido.
export async function clearCachedData(scope: OfflineScope) {
  info.clear();
  await getDb(scope).snapshots.clear();
}

export async function pruneSnapshots(scope: OfflineScope, now = Date.now()) {
  await getDb(scope).snapshots.where('savedAt').below(now - SNAPSHOT_MAX_AGE_MS).delete();
}
