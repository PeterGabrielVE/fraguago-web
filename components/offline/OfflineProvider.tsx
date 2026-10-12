'use client';

import { useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { useT } from '@/components/I18nProvider';
import { getRole } from '@/lib/auth';
import { getConnectivity, startConnectivityMonitor, subscribeConnectivity } from '@/lib/offline/connectivity';
import { pruneSnapshots } from '@/lib/offline/resources';
import { getOfflineScope } from '@/lib/offline/scope';
import { offlineRoutesForRole, registerServiceWorker } from '@/lib/offline/service-worker';
import { onOpsApplied, startSyncEngine } from '@/lib/offline/sync';

// Una operación enviada al momento (con conexión) no necesita aviso; solo las
// que estuvieron esperando en la cola.
const DEFERRED_MS = 15_000;

// Arranca el modo offline para la sesión actual: vigilancia de la conexión,
// sincronización automática de la cola y service worker. Se monta una vez en
// los layouts con sesión (panel y portal). No pinta nada.
export default function OfflineProvider() {
  const t = useT();

  useEffect(() => {
    const stopMonitor = startConnectivityMonitor();
    const stopSync = startSyncEngine();
    void registerServiceWorker(offlineRoutesForRole(getRole()));

    // Pide al navegador no borrar la base local si falta espacio.
    void navigator.storage?.persist?.().catch(() => {});
    const scope = getOfflineScope();
    if (scope) void pruneSnapshots(scope).catch(() => {});

    let wasDown = getConnectivity().backend === 'down';
    const stopToasts = subscribeConnectivity(() => {
      const { backend } = getConnectivity();
      if (backend === 'down' && !wasDown) {
        toast.add({ title: t('offline.toast.wentOffline'), description: t('offline.toast.wentOfflineDesc'), type: 'warning' });
      } else if (backend === 'up' && wasDown) {
        toast.add({ title: t('offline.toast.backOnline'), type: 'success' });
      }
      if (backend !== 'unknown') wasDown = backend === 'down';
    });

    const stopApplied = onOpsApplied((ops) => {
      const deferred = ops.filter((op) => Date.now() - new Date(op.createdAt).getTime() > DEFERRED_MS).length;
      if (deferred > 0) toast.add({ title: t('offline.toast.synced', { count: deferred }), type: 'success' });
    });

    return () => {
      stopMonitor();
      stopSync();
      stopToasts();
      stopApplied();
    };
  }, [t]);

  return null;
}
