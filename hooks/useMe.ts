'use client';

import { useEffect, useState } from 'react';
import { getMe, type Me } from '@/lib/auth';

// Usuario de la sesión (con nombre). null mientras carga o si la petición falla:
// quien lo usa debe tener un texto de respaldo.
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => { if (!cancelled) setMe(data); })
      .catch(() => { /* sin datos: se usa el respaldo */ });
    return () => { cancelled = true; };
  }, []);

  return me;
}
