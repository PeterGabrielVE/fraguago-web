'use client';
import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Landmark, PenLine, RefreshCw, WifiOff } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { CURRENCY_LABELS } from '@/lib/currency';
import { fetchBcvRates, syncBcvRates, type BcvRates } from '@/lib/exchangeRates';
import { useI18n } from '@/components/I18nProvider';
import { cn } from '@/lib/utils';

// Tasa oficial del BCV (la sincroniza el backend cada 12 horas): una casilla por
// divisa con los bolívares por unidad, como la publica el BCV, estado del servicio y
// "Actualizar ahora". Si el BCV no responde, invita a registrar la tasa a mano.
export default function BcvRateCard({ onSynced }: { onSynced: () => void }) {
  const { t, formatNumber, dateLocale } = useI18n();
  const [bcv, setBcv] = useState<BcvRates | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'down'>('loading');
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    fetchBcvRates()
      .then((data) => { setBcv(data); setStatus('ok'); })
      .catch(() => setStatus('down'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      const result = await syncBcvRates();
      setBcv(result);
      setStatus('ok');
      toast.add({ title: t(result.created > 0 ? 'catalog.exchangeRates.bcvSynced' : 'catalog.exchangeRates.bcvUnchanged'), type: 'success' });
      if (result.created > 0) onSynced();
    } catch (e: any) {
      setStatus('down');
      toast.add({ title: t('catalog.exchangeRates.bcvSyncFailed'), description: e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  }

  // Tal cual la publica el BCV (hasta 8 decimales, ej. 973,30967507).
  const bolivars = (value: number) => formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 8 });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="bcv-title">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="bcv-title" className="text-lg font-semibold text-slate-900">{t('catalog.exchangeRates.bcvTitle')}</h2>
              <span
                role="status"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  status === 'ok' && 'bg-emerald-50 text-emerald-700',
                  status === 'down' && 'bg-amber-50 text-amber-700',
                  status === 'loading' && 'bg-slate-100 text-slate-500',
                )}
              >
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  status === 'ok' && 'animate-pulse bg-emerald-500',
                  status === 'down' && 'bg-amber-500',
                  status === 'loading' && 'bg-slate-400',
                )} />
                {status === 'ok' ? t('catalog.exchangeRates.bcvLive') : status === 'down' ? t('catalog.exchangeRates.bcvOffline') : t('catalog.exchangeRates.bcvLoading')}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {t('catalog.exchangeRates.bcvAuto')}
              {status === 'ok' && bcv && (
                <> · {t('catalog.exchangeRates.bcvPublished', { time: formatDistanceToNow(new Date(bcv.updatedAt), { addSuffix: true, locale: dateLocale }) })}</>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? t('catalog.exchangeRates.bcvSyncing') : t('catalog.exchangeRates.bcvSync')}
        </button>
      </div>

      <div className="p-5">
        {status === 'loading' && !bcv ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : status === 'down' ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t('catalog.exchangeRates.bcvUnavailable')}</p>
          </div>
        ) : bcv ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bcv.official.map((r) => (
              <div key={r.currency} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {CURRENCY_LABELS[r.currency] ?? r.currency}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-slate-900">
                  <span className="text-sm text-slate-500">1 {r.currency} =</span>
                  <span className="text-3xl font-bold tabular-nums">{bolivars(r.bs)}</span>
                  <span className="text-sm font-semibold text-slate-600">Bs</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  1 Bs = {formatNumber(1 / r.bs, { maximumSignificantDigits: 4 })} {r.currency}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('catalog.exchangeRates.bcvManualHint')}
        </p>
      </div>
    </section>
  );
}
