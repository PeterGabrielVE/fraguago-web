'use client';
import { useState } from 'react';
import { AlertCircle, UserX } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { InactiveMember } from '@/lib/retention';
import { useI18n } from '@/components/I18nProvider';

type InactiveResponse = { days: number; total: number; data: InactiveMember[] };

const DAY_OPTIONS = [4, 7, 14, 30];

// RET-B02 — socios con membresía vigente que dejaron de venir: los mismos que
// detecta el job diario, con la fecha del último aviso enviado.
export default function Page() {
  const { t, intlLocale } = useI18n();
  const DATE = (iso: string) => new Date(iso).toLocaleDateString(intlLocale);
  const [days, setDays] = useState(4);
  const { status, data, error, refetch } = useAsync<InactiveResponse>(
    () => api.get(`/retention/inactive?days=${days}`) as Promise<InactiveResponse>,
    [days],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('retention.inactive.title')}</h1>
            <p className="text-sm text-slate-500">{t('retention.inactive.subtitle', { days })}</p>
          </div>
        </div>
        <div role="group" aria-label={t('retention.inactive.thresholdLabel')} className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                days === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {t('retention.inactive.plusDays', { days: d })}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <AsyncBoundary
          status={status}
          data={data}
          error={error}
          onRetry={refetch}
          isEmpty={(d) => d.data.length === 0}
          loading={<div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div>}
          errorFallback={
            <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-7 w-7 text-red-500" />
              <p className="text-sm text-slate-600">{error?.message ?? t('retention.inactive.loadError')}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">{t('common.retry')}</button>
            </div>
          }
          empty={<p className="py-12 text-center text-sm text-slate-500">{t('retention.inactive.empty', { days })}</p>}
        >
          {(d) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t('retention.inactive.colMember')}</th>
                    <th className="px-4 py-3">{t('retention.inactive.colAway')}</th>
                    <th className="px-4 py-3">{t('retention.inactive.colLastVisit')}</th>
                    <th className="px-4 py-3">{t('retention.inactive.colPlan')}</th>
                    <th className="px-4 py-3">{t('retention.inactive.colContact')}</th>
                    <th className="px-4 py-3">{t('retention.inactive.colLastNotice')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.data.map((m) => (
                    <tr key={m.memberId}>
                      <td className="px-4 py-3 font-medium text-slate-900">{m.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          m.daysInactive >= 14 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                        )}>
                          {t('retention.inactive.days', { days: m.daysInactive })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.lastAttendance ? DATE(m.lastAttendance) : t('retention.inactive.never')}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.plan ?? '—'}
                        {m.membershipEnd && <span className="block text-xs text-slate-400">{t('retention.inactive.expires', { date: DATE(m.membershipEnd) })}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="block">{m.email ?? '—'}</span>
                        {m.phone && <span className="block text-xs text-slate-400">{m.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.lastNotifiedAt ? DATE(m.lastNotifiedAt) : t('retention.inactive.noNotice')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{t('retention.inactive.total', { count: d.total })}</p>
            </div>
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
