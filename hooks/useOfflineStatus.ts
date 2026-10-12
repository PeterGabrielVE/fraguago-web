'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { liveQuery } from 'dexie';
import { getConnectivity, subscribeConnectivity } from '@/lib/offline/connectivity';
import type { OutboxOp } from '@/lib/offline/db';
import { listOps } from '@/lib/offline/outbox';
import { getOfflineScope } from '@/lib/offline/scope';
import { SYNCED_NOTICE_MS, getSyncState, subscribeSync } from '@/lib/offline/sync';

export type OfflineStatus = 'online' | 'offline' | 'syncing' | 'pending' | 'synced' | 'error';

// Operaciones de la cola del usuario actual, en vivo (también refleja lo que
// cambian otras pestañas).
export function useOutbox(): OutboxOp[] {
  const [ops, setOps] = useState<OutboxOp[]>([]);

  useEffect(() => {
    const scope = getOfflineScope();
    if (!scope) return;
    const subscription = liveQuery(() => listOps(scope)).subscribe({
      next: setOps,
      error: () => { /* sin IndexedDB no hay cola */ },
    });
    return () => subscription.unsubscribe();
  }, []);

  return ops;
}

// Estado único de conexión + sincronización para la interfaz.
export function useOfflineStatus() {
  const connectivity = useSyncExternalStore(subscribeConnectivity, getConnectivity, getConnectivity);
  const sync = useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
  const ops = useOutbox();

  const queue = ops.filter((op) => op.status !== 'synced');
  const attention = queue.filter((op) => op.status === 'needs_attention').length;
  const pending = queue.length - attention;
  const isOnline = connectivity.browserOnline && connectivity.backend !== 'down';

  // "Sincronizado" se muestra unos segundos y vuelve a "En línea".
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!sync.lastSyncedAt) return;
    const left = sync.lastSyncedAt + SYNCED_NOTICE_MS - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => rerender((n) => n + 1), left);
    return () => clearTimeout(timer);
  }, [sync.lastSyncedAt]);
  const justSynced = Boolean(sync.lastSyncedAt && Date.now() - sync.lastSyncedAt < SYNCED_NOTICE_MS);

  let status: OfflineStatus = 'online';
  if (!isOnline) status = 'offline';
  else if (sync.syncing && pending > 0) status = 'syncing';
  else if (attention > 0) status = 'error';
  else if (pending > 0) status = 'pending';
  else if (justSynced) status = 'synced';

  return { status, isOnline, queue, pending, attention, lastSyncedAt: sync.lastSyncedAt };
}
