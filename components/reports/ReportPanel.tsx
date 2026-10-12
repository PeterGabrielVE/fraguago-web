'use client';
import type { ReactNode } from 'react';
import { AsyncBoundary } from '@/components/async-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { getReport, type DateRange, type ReportTab } from '@/lib/reports';

function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

// Carga un reporte del API para el rango dado y maneja carga y error.
export default function ReportPanel<T>({
  tab, range, children,
}: { tab: ReportTab; range: DateRange; children: (data: T) => ReactNode }) {
  const { status, data, error, refetch } = useAsync<T>(() => getReport<T>(tab, range), [tab, range.from, range.to]);
  return (
    <AsyncBoundary status={status} data={data} error={error} onRetry={refetch} isEmpty={() => false} loading={<ReportSkeleton />}>
      {children}
    </AsyncBoundary>
  );
}
