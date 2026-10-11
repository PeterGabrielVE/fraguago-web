'use client';
import { useMemo } from 'react';
import { Activity, AlertCircle, TrendingUp } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtMeasurement, toNum, type Measurement, type MeasurementListResponse } from '@/lib/portal';
import { activeIntlLocale } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

// Mismo gráfico que el panel, cargado aparte (Recharts no va en el bundle inicial).
const WeightChart = dynamic(() => import('@/components/charts/ProgressCharts').then((m) => m.WeightChart), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full" />,
});


function fullDate(iso: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export default function PortalProgressPage() {
  const t = useT();
  const { status, data, error, refetch } = useAsync<Measurement[]>(async () => {
    const res = (await api.get('/me/progress')) as MeasurementListResponse;
    return res.data ?? [];
  }, []);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl" aria-hidden="true">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-slate-900">{t('portal.progress.title')}</h1>
            <p className="mt-1 text-slate-600">{t('portal.progress.subtitle')}</p>
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
            <p className="text-sm text-slate-600">{error?.message ?? t('portal.loadError')}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
              {t('common.retry')}
            </button>
          </div>
        }
        empty={
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <Activity className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">{t('portal.home.noMeasurements')}</p>
          </div>
        }
      >
        {(measurements) => <ProgressContent measurements={measurements} />}
      </AsyncBoundary>
    </div>
  );
}

function ProgressContent({ measurements }: { measurements: Measurement[] }) {
  const t = useT();
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
          {t('portal.progress.weightTrend')}
        </h2>
        <WeightChart data={weightSeries} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.date')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colWeight')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colHeight')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colBodyFat')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colChest')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colWaist')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.colArm')}</th>
                <th className="px-4 py-3 font-semibold text-slate-700">{t('progress.notes')}</th>
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
