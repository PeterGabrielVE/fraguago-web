import type { OfflineScope, OutboxError, OutboxOp } from './db';
import { claimNext, markNeedsAttention, markSynced, release } from './outbox';

// Núcleo de la sincronización: vacía la cola en orden. No sabe de HTTP ni de
// React; el envío se inyecta (`Transport`) para poder probarlo.

export type TransportResult =
  // El servidor la aplicó (o ya la había aplicado: misma clave de idempotencia).
  | { kind: 'applied'; entityId?: string | null; result?: unknown }
  // El servidor respondió que no: no sirve reintentar sin que alguien intervenga.
  | { kind: 'rejected'; error: OutboxError }
  // No se pudo completar ahora: se reintenta más tarde.
  | { kind: 'retry'; reason: 'network' | 'auth' | 'server'; message?: string };

export type Transport = (op: OutboxOp) => Promise<TransportResult>;

export type DrainResult = { applied: OutboxOp[]; stopped?: 'network' | 'auth' };

// Errores del servidor (5xx) seguidos antes de pedir intervención.
export const MAX_SERVER_ATTEMPTS = 6;

export function backoffMs(attempts: number) {
  return Math.min(5 * 60_000, 2_000 * 2 ** attempts);
}

export async function drainOutbox(scope: OfflineScope, transport: Transport): Promise<DrainResult> {
  const applied: OutboxOp[] = [];

  for (;;) {
    const op = await claimNext(scope);
    if (!op) return { applied };

    let res: TransportResult;
    try {
      res = await transport(op);
    } catch (err) {
      res = { kind: 'retry', reason: 'network', message: err instanceof Error ? err.message : String(err) };
    }

    if (res.kind === 'applied') {
      await markSynced(scope, op.id, res);
      applied.push({ ...op, status: 'synced', serverEntityId: res.entityId ?? undefined, result: res.result });
      continue;
    }

    if (res.kind === 'rejected') {
      await markNeedsAttention(scope, op.id, res.error);
      continue;
    }

    // Sin red o sin sesión: el resto de la cola fallaría igual. Se corta aquí
    // y todo queda pendiente, en orden, para la próxima pasada.
    if (res.reason !== 'server') {
      await release(scope, op, { uncounted: true });
      return { applied, stopped: res.reason };
    }

    const error: OutboxError = { code: 'SERVER_ERROR', message: res.message ?? '', kind: 'error' };
    if (op.attempts >= MAX_SERVER_ATTEMPTS) {
      await markNeedsAttention(scope, op.id, error);
    } else {
      await release(scope, op, { retryAt: Date.now() + backoffMs(op.attempts), error });
    }
  }
}

// Ejecuta `fn` solo si ninguna otra pestaña lo está haciendo (Web Locks). Si
// otra pestaña ya sincroniza esta cola, no hace nada: ella la vacía entera.
export async function runExclusive<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return fn();
  return navigator.locks.request(name, { ifAvailable: true }, (lock) => (lock ? fn() : null)) as Promise<T | null>;
}
