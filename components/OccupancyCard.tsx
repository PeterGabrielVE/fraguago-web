'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, DoorOpen, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useLiveResource } from '@/hooks/useLiveResource';
import LiveIndicator from '@/components/LiveIndicator';
import { OCCUPANCY_STATUS, type OccupancyDetail, type OccupancyEntry } from '@/lib/occupancy';

// Las entradas sin salida vencen con el tiempo (duración promedio de visita),
// así que se refresca cada minuto aunque no lleguen eventos.
const TIME_REFRESH_MS = 60_000;

function entryName(entry: OccupancyEntry) {
  const p = entry.member?.user?.profile;
  return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || entry.memberId;
}

// Aforo del gimnasio en tiempo real. `scope="staff"` usa /attendance/occupancy
// y puede listar quién está dentro con su botón de salida; `scope="member"`
// usa /me/occupancy (solo números).
export default function OccupancyCard({
  scope,
  showInside = false,
  className,
}: {
  scope: 'staff' | 'member';
  showInside?: boolean;
  className?: string;
}) {
  const base = scope === 'staff' ? '/attendance/occupancy' : '/me/occupancy';
  const { data, error, loading, mode, lastUpdated, refresh } = useLiveResource<OccupancyDetail>(
    base,
    `${base}/stream`,
    { refreshEveryMs: TIME_REFRESH_MS },
  );
  const [closingId, setClosingId] = useState<string | null>(null);

  async function checkOut(entry: OccupancyEntry) {
    setClosingId(entry.id);
    try {
      await api.post(`/attendance/${entry.id}/check-out`, {});
      toast.add({ title: `Salida registrada: ${entryName(entry)}`, type: 'success' });
      refresh();
    } catch (e: any) {
      toast.add({ title: 'No se pudo registrar la salida', description: e.message, type: 'error' });
    } finally {
      setClosingId(null);
    }
  }

  const status = data ? OCCUPANCY_STATUS[data.status] : null;

  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Aforo en tiempo real</h2>
            <p className="text-xs text-slate-500">
              {scope === 'member' ? '¿Cómo está el gimnasio ahora mismo?' : 'Personas dentro de las instalaciones.'}
            </p>
          </div>
        </div>
        <LiveIndicator mode={mode} lastUpdated={lastUpdated} onRefresh={refresh} refreshLabel="Actualizar aforo" />
      </div>

      <div className="p-5">
        {loading && !data ? (
          <div className="space-y-3">
            <div className="h-10 w-32 animate-pulse rounded-md bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
          </div>
        ) : error && !data ? (
          <div role="alert" className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error.message}
          </div>
        ) : data && status ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-4xl font-bold tabular-nums text-slate-900">
                {data.current}
                {data.capacity !== null && (
                  <span className="text-xl font-medium text-slate-400"> / {data.capacity}</span>
                )}
              </p>
              <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', status.badge)}>
                {status.label}
                {data.percentage !== null && ` · ${data.percentage}%`}
              </span>
            </div>

            {data.capacity !== null ? (
              <>
                <div
                  className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Ocupación del gimnasio"
                  aria-valuemin={0}
                  aria-valuemax={data.capacity}
                  aria-valuenow={data.current}
                >
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', status.bar)}
                    style={{ width: `${data.percentage ?? 0}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  {data.status === 'FULL'
                    ? 'Las instalaciones están llenas. No se permiten nuevas entradas hasta que salga alguien.'
                    : `${data.available} ${data.available === 1 ? 'lugar disponible' : 'lugares disponibles'}.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                {scope === 'staff' ? (
                  <>
                    No hay aforo máximo configurado.{' '}
                    <Link href="/settings" className="font-semibold text-amber-700 hover:text-amber-800">
                      Configurarlo
                    </Link>
                  </>
                ) : (
                  'Personas entrenando ahora mismo.'
                )}
              </p>
            )}

            {showInside && data.inside && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <DoorOpen className="h-4 w-4 text-amber-600" />
                  Dentro ahora ({data.inside.length})
                </h3>
                {data.inside.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay nadie dentro en este momento.</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {data.inside.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate text-slate-700">{entryName(entry)}</p>
                          <p className="text-xs text-slate-500">
                            Entró {new Date(entry.checkedInAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => checkOut(entry)}
                          disabled={closingId === entry.id}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          {closingId === entry.id ? 'Registrando…' : 'Marcar salida'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Si no se marca la salida, se asume tras {data.avgVisitMinutes} min.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
