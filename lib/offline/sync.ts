import { authorizedFetch } from '@/lib/api';
import { getActiveLocale } from '@/lib/i18n/client';
import { getConnectivity, isBackendUp, reportReachable, reportUnreachable, subscribeConnectivity } from './connectivity';
import { dbName, type OfflineScope, type OutboxOp } from './db';
import { getOp, listOps, pruneSynced } from './outbox';
import { getOfflineScope } from './scope';
import { drainOutbox, runExclusive, type Transport, type TransportResult } from './sync-engine';

// Sincronización con el API: envía la cola a POST /sync/operations y expone el
// estado (sincronizando / última vez) para la interfaz.

const TICK_MS = 20_000;
// Cuánto se muestra "Sincronizado" después de vaciar la cola.
export const SYNCED_NOTICE_MS = 5_000;

export type SyncState = { syncing: boolean; lastSyncedAt: number | null };

let state: SyncState = { syncing: false, lastSyncedAt: null };
const stateListeners = new Set<() => void>();
const appliedListeners = new Set<(ops: OutboxOp[]) => void>();

function setState(next: Partial<SyncState>) {
  state = { ...state, ...next };
  stateListeners.forEach((listener) => listener());
}

export function subscribeSync(listener: () => void) {
  stateListeners.add(listener);
  return () => { stateListeners.delete(listener); };
}

export function getSyncState(): SyncState {
  return state;
}

// Avisa cuando el servidor aplicó operaciones (para refrescar listas).
export function onOpsApplied(listener: (ops: OutboxOp[]) => void) {
  appliedListeners.add(listener);
  return () => { appliedListeners.delete(listener); };
}

const sendToApi: Transport = async (op): Promise<TransportResult> => {
  let res: Response;
  try {
    res = await authorizedFetch('/sync/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': getActiveLocale() },
      body: JSON.stringify({
        id: op.id,
        type: op.type,
        entityId: op.entityId,
        gymId: op.gymId,
        createdAt: op.createdAt,
        sentAt: new Date().toISOString(),
        payload: op.payload,
      }),
    });
  } catch {
    reportUnreachable();
    return { kind: 'retry', reason: 'network' };
  }
  reportReachable();

  const body = await res.json().catch(() => null);
  const message = Array.isArray(body?.message) ? body.message.join('; ') : String(body?.message ?? '');

  if (res.ok && (body?.status === 'applied' || body?.status === 'duplicate')) {
    return { kind: 'applied', entityId: body.entityId, result: body.result };
  }
  if (res.ok && (body?.status === 'rejected' || body?.status === 'conflict')) {
    return { kind: 'rejected', error: { code: String(body.code ?? 'REJECTED'), message, kind: body.status } };
  }
  // 401 tras intentar renovar el token: la sesión terminó. La cola queda
  // guardada y se envía cuando el mismo usuario vuelva a entrar.
  if (res.status === 401) return { kind: 'retry', reason: 'auth' };
  if (res.status === 403) return { kind: 'rejected', error: { code: 'FORBIDDEN', message, kind: 'rejected' } };
  if (res.status === 400 || res.status === 422) {
    return { kind: 'rejected', error: { code: 'VALIDATION', message, kind: 'rejected' } };
  }
  return { kind: 'retry', reason: 'server', message: message || `HTTP ${res.status}` };
};

let inFlight: Promise<void> | null = null;

// Vacía la cola del usuario actual. Varias llamadas a la vez comparten la
// misma pasada; entre pestañas solo sincroniza una.
export function syncNow(): Promise<void> {
  const scope = getOfflineScope();
  if (!scope) return Promise.resolve();
  if (!inFlight) {
    inFlight = run(scope).finally(() => { inFlight = null; });
  }
  return inFlight;
}

async function run(scope: OfflineScope) {
  setState({ syncing: true });
  try {
    const result = await runExclusive(`fg-sync:${dbName(scope)}`, () => drainOutbox(scope, sendToApi));
    if (result?.applied.length) {
      setState({ lastSyncedAt: Date.now() });
      appliedListeners.forEach((listener) => listener(result.applied));
    }
  } catch {
    // IndexedDB no disponible o bloqueada: se reintenta en la próxima pasada.
  } finally {
    setState({ syncing: false });
  }
}

// Envía ya la operación recién encolada y espera su resultado hasta
// `timeoutMs`. Devuelve su estado: "synced", "needs_attention" o, si no hubo
// respuesta a tiempo, "pending" (queda en la cola).
export async function flushOp(scope: OfflineScope, id: string, timeoutMs = 8_000): Promise<OutboxOp | undefined> {
  const deadline = Date.now() + timeoutMs;
  let passes = 0;
  for (;;) {
    const op = await getOp(scope, id);
    if (!op || op.status === 'synced' || op.status === 'needs_attention') return op;
    if (op.status === 'pending' && !inFlight) {
      // Una pasada que ya iba terminando pudo no verla: se lanza otra. Si tras
      // eso sigue pendiente, no se pudo enviar (sin red o sin sesión).
      if (passes >= 2 || (passes > 0 && !isBackendUp())) return op;
      passes++;
      void syncNow();
    }
    if (Date.now() >= deadline) return op;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

// Arranca la sincronización automática: al recuperar la conexión, al volver a
// la pestaña y periódicamente mientras haya operaciones pendientes.
export function startSyncEngine(): () => void {
  if (typeof window === 'undefined') return () => {};

  let wasUp = getConnectivity().backend === 'up';
  const unsubscribe = subscribeConnectivity(() => {
    const up = getConnectivity().backend === 'up';
    if (up && !wasUp) void syncNow();
    wasUp = up;
  });

  const tick = async () => {
    const scope = getOfflineScope();
    if (!scope || !isBackendUp()) return;
    try {
      const ops = await listOps(scope);
      if (ops.some((op) => op.status === 'pending' || op.status === 'processing')) void syncNow();
    } catch {
      // Sin IndexedDB no hay cola que enviar.
    }
  };
  const interval = setInterval(tick, TICK_MS);
  const onVisible = () => { if (document.visibilityState === 'visible') void tick(); };
  document.addEventListener('visibilitychange', onVisible);

  const scope = getOfflineScope();
  if (scope) void pruneSynced(scope).catch(() => {});
  void tick();

  return () => {
    unsubscribe();
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
