import { getDb, type OfflineScope, type OutboxError, type OutboxOp, type OutboxOpType } from './db';

// Cola persistente de operaciones pendientes de sincronizar. Vive en IndexedDB:
// sobrevive a recargas y a cerrar el navegador.

// Una operación "processing" sin novedades durante este tiempo quedó colgada
// (la pestaña se cerró a mitad del envío) y se puede volver a tomar. El
// servidor es idempotente, así que reenviarla no la duplica.
const STALE_LOCK_MS = 60_000;
// Las ya sincronizadas se conservan unos días como historial y luego se borran.
const KEEP_SYNCED_MS = 3 * 86_400_000;

export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Contexto no seguro (http en una IP de la red local): UUID v4 a mano.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function enqueue(
  scope: OfflineScope,
  input: { type: OutboxOpType; entity: OutboxOp['entity']; payload: Record<string, unknown>; label: string; entityId?: string },
): Promise<OutboxOp> {
  const op: OutboxOp = {
    id: newId(),
    gymId: scope.gymId,
    userId: scope.userId,
    type: input.type,
    entity: input.entity,
    entityId: input.entityId ?? newId(),
    payload: input.payload,
    label: input.label,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };
  await getDb(scope).outbox.add(op);
  return op;
}

export function listOps(scope: OfflineScope): Promise<OutboxOp[]> {
  return getDb(scope).outbox.orderBy('createdAt').toArray();
}

export function getOp(scope: OfflineScope, id: string): Promise<OutboxOp | undefined> {
  return getDb(scope).outbox.get(id);
}

// Toma la siguiente operación enviable (la más antigua) y la marca como
// "processing" dentro de una transacción: dos pestañas nunca toman la misma.
export async function claimNext(scope: OfflineScope, now = Date.now()): Promise<OutboxOp | null> {
  const db = getDb(scope);
  return db.transaction('rw', db.outbox, async () => {
    const candidates = await db.outbox.where('status').anyOf('pending', 'processing').sortBy('createdAt');
    const next = candidates.find((op) =>
      op.status === 'pending'
        ? (op.nextAttemptAt ?? 0) <= now
        : (op.lockedAt ?? 0) + STALE_LOCK_MS <= now,
    );
    if (!next) return null;
    const claimed: OutboxOp = { ...next, status: 'processing', lockedAt: now, attempts: next.attempts + 1 };
    await db.outbox.put(claimed);
    return claimed;
  });
}

export async function markSynced(scope: OfflineScope, id: string, server: { entityId?: string | null; result?: unknown }) {
  await getDb(scope).outbox.update(id, {
    status: 'synced',
    syncedAt: new Date().toISOString(),
    serverEntityId: server.entityId ?? undefined,
    result: server.result,
    error: undefined,
    lockedAt: undefined,
    nextAttemptAt: undefined,
  });
}

export async function markNeedsAttention(scope: OfflineScope, id: string, error: OutboxError) {
  await getDb(scope).outbox.update(id, { status: 'needs_attention', error, lockedAt: undefined, nextAttemptAt: undefined });
}

// Devuelve la operación a la cola para un intento posterior. `uncounted`: el
// envío no llegó al servidor (sin red), así que no cuenta como intento.
export async function release(
  scope: OfflineScope,
  op: OutboxOp,
  opts: { retryAt?: number; error?: OutboxError; uncounted?: boolean } = {},
) {
  await getDb(scope).outbox.update(op.id, {
    status: 'pending',
    attempts: opts.uncounted ? Math.max(0, op.attempts - 1) : op.attempts,
    lockedAt: undefined,
    nextAttemptAt: opts.retryAt,
    error: opts.error,
  });
}

// Reintento pedido por el usuario para una operación que requería intervención.
export async function retryOp(scope: OfflineScope, id: string) {
  const db = getDb(scope);
  await db.transaction('rw', db.outbox, async () => {
    const op = await db.outbox.get(id);
    if (op?.status !== 'needs_attention') return;
    await db.outbox.put({ ...op, status: 'pending', attempts: 0, error: undefined, nextAttemptAt: undefined });
  });
}

// Descarta una operación que aún no se aplicó en el servidor.
export async function discardOp(scope: OfflineScope, id: string) {
  const db = getDb(scope);
  await db.transaction('rw', db.outbox, async () => {
    const op = await db.outbox.get(id);
    if (op && op.status !== 'synced') await db.outbox.delete(id);
  });
}

export async function pruneSynced(scope: OfflineScope, now = Date.now()) {
  const limit = new Date(now - KEEP_SYNCED_MS).toISOString();
  await getDb(scope).outbox
    .where('status').equals('synced')
    .filter((op) => (op.syncedAt ?? op.createdAt) < limit)
    .delete();
}
