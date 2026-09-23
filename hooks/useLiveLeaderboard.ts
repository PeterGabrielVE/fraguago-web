'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { SseError, streamSse } from '@/lib/sse';
import type { Leaderboard } from '@/lib/challenges';

export type LiveMode = 'connecting' | 'live' | 'polling';

// Si el stream no está disponible, se refresca por polling cada 15 s.
const POLL_MS = 15_000;
// Evita pedir el leaderboard más de una vez por segundo ante ráfagas.
const MIN_REFRESH_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

// COM-F02 — leaderboard "en tiempo real": carga inicial por la API y luego
// escucha el stream SSE; cada aviso `update` vuelve a pedir el leaderboard.
// Si el stream se cae, reintenta con backoff exponencial y mientras tanto
// hace polling, así la vista nunca queda congelada.
export function useLiveLeaderboard(basePath: string) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<LiveMode>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastFetch = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastFetch.current = Date.now();
    try {
      const result = (await api.get(`${basePath}/leaderboard`)) as Leaderboard;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [basePath]);

  // Refresco con throttle: como máximo uno cada MIN_REFRESH_MS.
  const scheduleRefresh = useCallback(() => {
    if (pending.current) return;
    const wait = Math.max(0, MIN_REFRESH_MS - (Date.now() - lastFetch.current));
    pending.current = setTimeout(() => {
      pending.current = null;
      load();
    }, wait);
  }, [load]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Stream SSE con reconexión.
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let attempt = 0;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      while (!stopped) {
        setMode((m) => (m === 'live' ? m : 'connecting'));
        let fatal = false;
        try {
          await streamSse(`${basePath}/stream`, {
            signal: controller.signal,
            onMessage: (msg) => {
              if (msg.event === 'ready') {
                attempt = 0;
                setMode('live');
                scheduleRefresh(); // pudo haber cambios mientras reconectaba
              } else if (msg.event === 'update') {
                scheduleRefresh();
              } else if (msg.event === 'error') {
                fatal = true; // el reto no existe / no es visible
              }
            },
          });
        } catch (e) {
          if (controller.signal.aborted) return;
          // 403/404 no se arreglan reintentando. 401: el polling (api.get)
          // renueva el token y el próximo intento del stream ya lo usa.
          if (e instanceof SseError && (e.status === 403 || e.status === 404)) fatal = true;
        }
        if (stopped) return;
        setMode('polling');
        if (fatal) return;
        attempt++;
        await sleep(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt));
      }
    })();

    return () => {
      stopped = true;
      controller.abort();
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
    };
  }, [basePath, scheduleRefresh]);

  // Polling de respaldo mientras el stream no está en vivo.
  useEffect(() => {
    if (mode === 'live') return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [mode, load]);

  return { data, error, loading, mode, lastUpdated, refresh: load };
}
