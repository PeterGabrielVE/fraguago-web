'use client';

import { useEffect, useRef } from 'react';
import { getConnectivity, subscribeConnectivity } from '@/lib/offline/connectivity';
import { onOpsApplied } from '@/lib/offline/sync';

// Vuelve a cargar los datos de una pantalla cuando el servidor aplica cambios
// de la cola o cuando vuelve la conexión (lo mostrado podía ser la copia local).
export function useRefetchOnSync(refetch: () => void) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const stopApplied = onOpsApplied(() => refetchRef.current());
    let wasDown = getConnectivity().backend === 'down';
    const stopConnectivity = subscribeConnectivity(() => {
      const { backend } = getConnectivity();
      if (backend === 'up' && wasDown) refetchRef.current();
      if (backend !== 'unknown') wasDown = backend === 'down';
    });
    return () => {
      stopApplied();
      stopConnectivity();
    };
  }, []);
}
