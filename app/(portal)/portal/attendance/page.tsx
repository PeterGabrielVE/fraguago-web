'use client';
import { useState } from 'react';
import { AlertCircle, ClipboardCheck, Clock } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { SHIFT_LABELS, type Attendance } from '@/lib/portal';

export default function PortalAttendancePage() {
  const { status, data, error, refetch } = useAsync<Attendance[]>(
    () => api.list('/me/attendances') as Promise<Attendance[]>,
    [],
  );
  const [checkingIn, setCheckingIn] = useState(false);

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      await api.post('/me/check-in', {});
      toast.add({ title: 'Asistencia registrada', type: 'success' });
      refetch();
    } catch (e: any) {
      toast.add({ title: 'No se pudo registrar la asistencia', description: e.message, type: 'error' });
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Mis asistencias</h1>
              <p className="mt-1 text-slate-600">Registra tu entrada y revisa tu historial.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ClipboardCheck className="h-5 w-5" />
            {checkingIn ? 'Registrando…' : 'Marcar asistencia'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los datos.'}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
                Reintentar
              </button>
            </div>
          }
          empty={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Clock className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Todavía no tienes asistencias registradas.</p>
            </div>
          }
        >
          {(entries) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">Fecha y hora</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700">{new Date(entry.checkedInAt).toLocaleString('es-MX')}</td>
                      <td className="px-4 py-3 text-slate-600">{SHIFT_LABELS[entry.shift] ?? entry.shift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
