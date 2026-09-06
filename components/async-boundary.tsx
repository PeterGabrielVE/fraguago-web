'use client';

import type { ReactNode } from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'error' | 'success';

interface AsyncBoundaryProps<T> {
  status: Status;
  data: T | null;
  error?: Error | null;
  onRetry?: () => void;
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  empty?: ReactNode;
  errorFallback?: ReactNode;
  children: (data: T) => ReactNode;
}

export function AsyncBoundary<T>({
  status,
  data,
  error,
  onRetry,
  isEmpty = defaultIsEmpty,
  loading,
  empty,
  errorFallback,
  children,
}: AsyncBoundaryProps<T>) {
  if (status === 'loading') return <>{loading ?? <DefaultLoading />}</>;
  if (status === 'error') {
    return <>{errorFallback ?? <DefaultError error={error} onRetry={onRetry} />}</>;
  }
  // success pero sin contenido → estado vacío
  if (data == null || isEmpty(data)) return <>{empty ?? <DefaultEmpty />}</>;
  return <>{children(data)}</>;
}

// por defecto: un array vacío cuenta como "vacío"
function defaultIsEmpty(data: unknown) {
  return Array.isArray(data) && data.length === 0;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function DefaultLoading() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function DefaultEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No hay nada por aquí todavía.</p>
    </div>
  );
}

function DefaultError({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">
        {error?.message ?? 'No se pudieron cargar los datos.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}