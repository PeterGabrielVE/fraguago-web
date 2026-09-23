'use client';
import { useMemo } from 'react';
import { Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { fmtMeasurement, toNum, type Measurement, type MeasurementListResponse } from '@/lib/portal';

const weightChartConfig = {
  weightKg: { label: 'Peso (kg)', theme: { light: '#d97706', dark: '#f59e0b' } },
} satisfies ChartConfig;

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

function fullDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function PortalProgressPage() {
  const { status, data, error, refetch } = useAsync<Measurement[]>(async () => {
    const res = (await api.get('/me/progress')) as MeasurementListResponse;
    return res.data ?? [];
  }, []);

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mi progreso</h1>
            <p className="mt-1 text-slate-600">Historial de mediciones registradas por tu entrenador.</p>
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
            <Activity className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Todavía no tienes mediciones registradas.</p>
          </div>
        }
      >
        {(measurements) => <ProgressContent measurements={measurements} />}
      </AsyncBoundary>
    </div>
  );
}

function ProgressContent({ measurements }: { measurements: Measurement[] }) {
  const chronological = useMemo(() => [...measurements].reverse(), [measurements]);
  const weightSeries = useMemo(
    () =>
      chronological
        .filter((m) => toNum(m.weightKg) !== undefined)
        .map((m) => ({ date: m.date, weightKg: toNum(m.weightKg)! })),
    [chronological],
  );

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TrendingUp className="h-4 w-4 text-amber-600" />
          Evolución de peso
        </h2>
        {weightSeries.length < 2 ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
            Aún no hay suficientes mediciones de peso para graficar (mínimo 2).
          </div>
        ) : (
          <ChartContainer config={weightChartConfig} className="aspect-auto h-56 w-full">
            <AreaChart data={weightSeries} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortDate} minTickGap={20} />
              <YAxis tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" labelFormatter={(v) => fullDate(String(v))} />} />
              <Area
                dataKey="weightKg"
                type="monotone"
                stroke="var(--color-weightKg)"
                fill="var(--color-weightKg)"
                fillOpacity={0.1}
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-weightKg)', stroke: 'var(--color-background)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Fecha</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Peso</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Estatura</th>
                <th className="px-4 py-3 font-semibold text-slate-700">% Grasa</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Pecho</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Cintura</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Brazo</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Notas</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600">{fullDate(m.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.weightKg, ' kg')}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.heightCm, ' cm')}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.bodyFat, '%')}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.chestCm, ' cm')}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.waistCm, ' cm')}</td>
                  <td className="px-4 py-3 text-slate-700">{fmtMeasurement(m.armCm, ' cm')}</td>
                  <td className="max-w-40 truncate px-4 py-3 text-slate-500">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
