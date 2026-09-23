'use client';
import { AlertCircle, Dumbbell, User } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { trainerName, type Routine } from '@/lib/portal';

export default function PortalRoutinePage() {
  const { status, data, error, refetch } = useAsync<Routine[]>(
    () => api.list('/me/routine') as Promise<Routine[]>,
    [],
  );

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mi rutina</h1>
            <p className="mt-1 text-slate-600">Planes de entrenamiento asignados por tu entrenador.</p>
          </div>
        </div>
      </div>

      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        loading={
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        }
        errorFallback={
          <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los datos.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
              Reintentar
            </button>
          </div>
        }
        empty={
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <Dumbbell className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Todavía no tenés una rutina asignada.</p>
          </div>
        }
      >
        {(routines) => (
          <div className="grid gap-4 md:grid-cols-2">
            {routines.map((routine) => {
              const name = trainerName(routine.trainer);
              return (
                <div key={routine.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">{routine.name}</h2>
                  {routine.description && (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{routine.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    {name ? `Entrenador: ${name}` : 'Sin entrenador asignado'}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Creada el {new Date(routine.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
