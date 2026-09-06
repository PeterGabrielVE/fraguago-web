'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporter';
import { Button } from '@/components/ui/button'; // tu shadcn Button

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({ type: 'nextjs', error, digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground">
        Se produjo un error al cargar esta sección.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}