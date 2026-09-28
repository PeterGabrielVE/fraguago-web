'use client';

import { useEffect } from 'react';
import { identifyFromToken, initAnalytics } from '@/lib/analytics';
import { getToken } from '@/lib/api';

// Inicializa PostHog una vez y, si ya hay sesión (recarga de página),
// vuelve a asociar los eventos al usuario.
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
    identifyFromToken(getToken());
  }, []);

  return null;
}
