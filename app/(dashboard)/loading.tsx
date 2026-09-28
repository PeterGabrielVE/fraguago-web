import { Skeleton } from '@/components/ui/skeleton';

// Se muestra al instante al navegar entre secciones del sidebar,
// mientras la página destino termina de cargar.
export default function DashboardLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="space-y-6 p-4 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="ml-auto h-9 w-32" />
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </main>
  );
}
