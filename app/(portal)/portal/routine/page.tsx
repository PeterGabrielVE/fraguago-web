'use client';
import { useState } from 'react';
import { AlertCircle, CircleCheck, Dumbbell, User } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { trainerName, type Routine, type RoutineExercise } from '@/lib/portal';
import { challengeUpdatesMessage, type ChallengeProgressUpdate } from '@/lib/challenges';

// DB-06 — ejercicios de la rutina agrupados por día.
function ExercisesByDay({ exercises }: { exercises: RoutineExercise[] }) {
  const days = [...new Set(exercises.map((e) => e.day))].sort((a, b) => a - b);
  return (
    <div className="mt-3 space-y-3">
      {days.map((day) => (
        <div key={day}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Día {day}</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {exercises.filter((e) => e.day === day).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{e.exercise.name}</p>
                  {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-600">
                  <p className="font-semibold text-slate-900">{e.sets} × {e.reps}</p>
                  {e.restSeconds ? <p>Descanso {e.restSeconds}s</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function PortalRoutinePage() {
  const { status, data, error, refetch } = useAsync<Routine[]>(
    () => api.list('/me/routine') as Promise<Routine[]>,
    [],
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  // COM-B03 — registrar la rutina de hoy actualiza los retos de rutinas.
  async function complete(routine: Routine) {
    setCompletingId(routine.id);
    try {
      const res = (await api.post(`/me/routine/${routine.id}/complete`, {})) as { challenges?: ChallengeProgressUpdate[] };
      setDoneIds((prev) => new Set(prev).add(routine.id));
      toast.add({
        title: `"${routine.name}" completada`,
        description: challengeUpdatesMessage(res?.challenges),
        type: 'success',
      });
    } catch (e: any) {
      toast.add({ title: 'No se pudo registrar la rutina', description: e.message, type: 'error' });
    } finally {
      setCompletingId(null);
    }
  }

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
                  {routine.exercises?.length ? (
                    <ExercisesByDay exercises={routine.exercises} />
                  ) : routine.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{routine.description}</p>
                  ) : null}
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    {name ? `Entrenador: ${name}` : 'Sin entrenador asignado'}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Creada el {new Date(routine.createdAt).toLocaleDateString('es-MX')}
                  </p>
                  {routine.completedToday || doneIds.has(routine.id) ? (
                    <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      <CircleCheck className="h-4 w-4" /> Completada hoy
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => complete(routine)}
                      disabled={completingId === routine.id}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                      <CircleCheck className="h-4 w-4" />
                      {completingId === routine.id ? 'Registrando…' : 'Marcar como completada'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
