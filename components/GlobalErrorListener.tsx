// components/GlobalErrorListener.tsx
'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporter';

export function GlobalErrorListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const target = event.target;
      // fallo de carga de recurso (img, script, css): no burbujea
      if (target && target !== window && target instanceof HTMLElement) {
        const url = (target as HTMLImageElement).src || (target as HTMLLinkElement).href;
        reportError({ type: 'resource', message: `Failed to load: ${url}`, source: target.tagName });
        return;
      }
      reportError({
        type: 'uncaught',
        message: event.message,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
        error: event.error,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      reportError({ type: 'unhandledrejection', reason: event.reason });
    };

    window.addEventListener('error', onError, true); // 'true' = fase de captura, para recursos
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}