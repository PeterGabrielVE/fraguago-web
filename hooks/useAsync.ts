'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'loading' | 'error' | 'success';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // mantiene la última fn sin re-disparar el efecto
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // ignora respuestas viejas si llega una nueva petición antes
  const callId = useRef(0);

  const run = useCallback(() => {
    const id = ++callId.current;
    setStatus('loading');
    setError(null);
    fnRef.current()
      .then((result) => {
        if (id === callId.current) {
          setData(result);
          setStatus('success');
        }
      })
      .catch((err) => {
        if (id === callId.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
        }
      });
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { status, data, error, refetch: run };
}