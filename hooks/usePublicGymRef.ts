'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getGymId, getRole } from '@/lib/auth';

// Roles que pueden leer /gym; con otro rol el API responde 403 y el cliente
// redirige a /403, así que ni se intenta.
const GYM_READ_ROLES = ['OWNER', 'ADMIN', 'STAFF'];

// Identificador del gym para los enlaces públicos (/registro/<x>,
// /check-in/<x>): su slug, o el id del token si este rol no puede leer
// /gym (el API acepta ambos). undefined hasta montar.
export function usePublicGymRef(): string | undefined {
  const [ref, setRef] = useState<string>();

  useEffect(() => {
    const gymId = getGymId();
    if (!GYM_READ_ROLES.includes(getRole()?.toUpperCase() ?? '')) {
      setRef(gymId);
      return;
    }
    api.get('/gym')
      .then((gym: { slug?: string }) => setRef(gym.slug || gymId))
      .catch(() => setRef(gymId));
  }, []);

  return ref;
}
