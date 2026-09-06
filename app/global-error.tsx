'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporter';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({ type: 'global-error', error, digest: error.digest });
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">La aplicación falló</h2>
        <button onClick={reset} className="rounded-md border px-4 py-2">
          Recargar
        </button>
      </body>
    </html>
  );
}