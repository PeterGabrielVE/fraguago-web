'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRole } from '@/lib/auth';
import {
  getReadMap,
  isUnread,
  loadNotifications,
  saveReadMap,
  type AppNotification,
  type ReadMap,
} from '@/lib/notifications';

const POLL_MS = 2 * 60 * 1000;

export type NotificationsState = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  /** Todas las fuentes fallaron (sin conexión, backend caído...). */
  error: boolean;
  /** Alguna fuente falló, pero hay datos del resto. */
  partial: boolean;
  lastUpdated: Date | null;
  isUnread: (notification: AppNotification) => boolean;
  markRead: (notification: AppNotification) => void;
  markAllRead: () => void;
  refresh: () => void;
};

export function useNotifications(): NotificationsState {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readMap, setReadMap] = useState<ReadMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [partial, setPartial] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const result = await loadNotifications(getRole());
      const allFailed = result.totalSources > 0 && result.failedSources === result.totalSources;
      setError(allFailed);
      setPartial(!allFailed && result.failedSources > 0);
      if (!allFailed) {
        setItems(result.items);
        setLastUpdated(new Date());
        // Olvida el estado de notificaciones que ya no existen, para que no crezca sin fin.
        const current = new Set(result.items.map((item) => item.id));
        setReadMap(() => {
          const stored = getReadMap();
          const pruned = Object.fromEntries(Object.entries(stored).filter(([id]) => current.has(id)));
          saveReadMap(pruned);
          return pruned;
        });
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  // Sondeo periódico; se pausa con la pestaña oculta y refresca al volver.
  useEffect(() => {
    setReadMap(getReadMap());
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const markRead = useCallback((notification: AppNotification) => {
    setReadMap((prev) => {
      const next = { ...prev, [notification.id]: notification.fingerprint };
      saveReadMap(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadMap(() => {
      const next = Object.fromEntries(items.map((item) => [item.id, item.fingerprint]));
      saveReadMap(next);
      return next;
    });
  }, [items]);

  const unreadCount = useMemo(() => items.filter((item) => isUnread(item, readMap)).length, [items, readMap]);
  const checkUnread = useCallback((notification: AppNotification) => isUnread(notification, readMap), [readMap]);

  return { items, unreadCount, loading, error, partial, lastUpdated, isUnread: checkUnread, markRead, markAllRead, refresh };
}
