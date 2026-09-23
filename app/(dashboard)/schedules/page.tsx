'use client';
import { useState } from 'react';
import { CalendarDays, LayoutGrid, List } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

// día 0 = Lunes … día 6 = Domingo
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_OPTIONS = DAYS.map((label, value) => ({ value: String(value), label }));
const ROW_HEIGHT = 56; // px por hora

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function validateSchedule(form: Record<string, any>) {
  if (Array.isArray(form.weekday) && form.weekday.length === 0) {
    return 'Seleccioná al menos un día.';
  }
  if (form.startTime && form.endTime && timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
    return 'La hora de fin debe ser posterior a la hora de inicio.';
  }
  return null;
}

async function createRecurringSchedules(payload: Record<string, any>) {
  const days: string[] = Array.isArray(payload.weekday) ? payload.weekday : [payload.weekday];
  const { weekday, ...rest } = payload;
  for (const day of days) {
    await api.post('/schedules', { ...rest, weekday: Number(day) });
  }
}

function WeeklyCalendar() {
  const { status, data } = useAsync<any[]>(() => api.list('/schedules'), []);
  const schedules = (data ?? []).filter((s) => s.startTime && s.endTime);

  if (status === 'loading') {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Cargando…</div>;
  }
  if (status === 'error') {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">No se pudo cargar el calendario.</div>;
  }
  if (schedules.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aún no hay horarios para mostrar en el calendario.</div>;
  }

  const minutes = schedules.flatMap((s) => [timeToMinutes(s.startTime), timeToMinutes(s.endTime)]);
  const rangeStart = Math.max(Math.floor(Math.min(...minutes, 8 * 60) / 60) * 60 - 60, 0);
  const rangeEnd = Math.min(Math.ceil(Math.max(...minutes, 20 * 60) / 60) * 60 + 60, 24 * 60);
  const totalMinutes = rangeEnd - rangeStart;
  const containerHeight = (totalMinutes / 60) * ROW_HEIGHT;
  const hourMarks: number[] = [];
  for (let m = rangeStart; m <= rangeEnd; m += 60) hourMarks.push(m);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid min-w-[820px]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div />
        {DAYS.map((label, d) => (
          <div key={d} className="px-2 pb-2 text-center text-sm font-semibold text-slate-700">{label}</div>
        ))}

        <div className="relative" style={{ height: containerHeight }}>
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute right-2 -translate-y-2 text-xs text-slate-400"
              style={{ top: ((m - rangeStart) / totalMinutes) * containerHeight }}
            >
              {String(Math.floor(m / 60)).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {DAYS.map((_, d) => (
          <div key={d} className="relative border-l border-slate-100" style={{ height: containerHeight }}>
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: ((m - rangeStart) / totalMinutes) * containerHeight }}
              />
            ))}
            {schedules.filter((s) => s.weekday === d).map((s) => {
              const start = timeToMinutes(s.startTime);
              const end = timeToMinutes(s.endTime);
              const top = ((start - rangeStart) / totalMinutes) * containerHeight;
              const height = Math.max(((end - start) / totalMinutes) * containerHeight, 24);
              return (
                <div
                  key={s.id}
                  className="absolute left-1 right-1 overflow-hidden rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 shadow-sm"
                  style={{ top, height }}
                  title={`${s.title} · ${s.startTime}–${s.endTime}`}
                >
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-[11px] text-amber-700">{s.startTime}–{s.endTime}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <div className="space-y-4">
      {view === 'list' ? (
        <ResourceManager
          title="Horarios"
          subtitle="Clases y agenda."
          icon={CalendarDays}
          endpoint="/schedules"
          formVariant="modal"
          validate={validateSchedule}
          onCreate={createRecurringSchedules}
          getEditValues={(row) => ({ ...row, weekday: String(row.weekday) })}
          headerActions={
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setView('list')}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
              >
                <List className="h-4 w-4" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                <LayoutGrid className="h-4 w-4" /> Calendario
              </button>
            </div>
          }
          columns={[
            { key: 'title', label: 'Clase' },
            { key: 'weekday', label: 'Día', render: (r) => DAYS[r.weekday] },
            { key: 'startTime', label: 'Inicio' },
            { key: 'endTime', label: 'Fin' },
          ]}
          fields={[
            { name: 'title', label: 'Nombre', required: true, fullWidth: true },
            {
              name: 'weekday', label: 'Días', type: 'multiselect', required: true, createOnly: true,
              options: DAY_OPTIONS,
              presets: [
                { label: 'Lunes a viernes', values: ['0', '1', '2', '3', '4'] },
                { label: 'Todos los días', values: DAY_OPTIONS.map((o) => o.value) },
              ],
            },
            { name: 'weekday', label: 'Día', type: 'select', required: true, numeric: true, editOnly: true, options: DAY_OPTIONS },
            { name: 'capacity', label: 'Cupo', type: 'number' },
            { name: 'startTime', label: 'Inicio', type: 'time', required: true },
            { name: 'endTime', label: 'Fin', type: 'time', required: true },
          ]}
        />
      ) : (
        <div className="space-y-6 p-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Horarios</h1>
                  <p className="mt-1 text-slate-600">Clases y agenda.</p>
                </div>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                >
                  <List className="h-4 w-4" /> Lista
                </button>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
                >
                  <LayoutGrid className="h-4 w-4" /> Calendario
                </button>
              </div>
            </div>
          </div>
          <WeeklyCalendar />
        </div>
      )}
    </div>
  );
}
