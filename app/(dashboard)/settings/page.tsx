'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { useT } from '@/components/I18nProvider';
import type { MessageKey } from '@/lib/i18n/translate';

type Gym = {
  id: string;
  name: string;
  baseCurrency: 'USD' | 'VES' | 'EUR';
  maxCapacity: number | null;
  avgVisitMinutes: number;
  createdAt: string;
  _count: { members: number; users: number; trainers: number };
};

const CURRENCY_OPTIONS: { value: Gym['baseCurrency']; label: MessageKey }[] = [
  { value: 'USD', label: 'setup.settings.currencyUSD' },
  { value: 'VES', label: 'setup.settings.currencyVES' },
  { value: 'EUR', label: 'setup.settings.currencyEUR' },
];

export default function Page() {
  const t = useT();
  const { status, data, error, refetch } = useAsync<Gym>(() => api.get('/gym'), []);

  return (
    <div className="space-y-6 p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <Settings className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('setup.settings.title')}</h1>
            <p className="mt-1 text-slate-600">{t('setup.settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AsyncBoundary
          status={status}
          data={data}
          error={error}
          onRetry={refetch}
          isEmpty={() => false}
          loading={
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          }
          errorFallback={
            <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">{error?.message ?? t('setup.settings.loadError')}</p>
              <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 transition">
                {t('common.retry')}
              </button>
            </div>
          }
        >
          {(gym) => <GymForm gym={gym} onSaved={refetch} />}
        </AsyncBoundary>
      </div>
    </div>
  );
}

function GymForm({ gym, onSaved }: { gym: Gym; onSaved: () => void }) {
  const t = useT();
  const [name, setName] = useState(gym.name);
  const [baseCurrency, setBaseCurrency] = useState<Gym['baseCurrency']>(gym.baseCurrency);
  // Vacío = sin límite de aforo.
  const [maxCapacity, setMaxCapacity] = useState(gym.maxCapacity?.toString() ?? '');
  const [avgVisitMinutes, setAvgVisitMinutes] = useState(String(gym.avgVisitMinutes));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setName(gym.name);
    setBaseCurrency(gym.baseCurrency);
    setMaxCapacity(gym.maxCapacity?.toString() ?? '');
    setAvgVisitMinutes(String(gym.avgVisitMinutes));
  }, [gym.id, gym.name, gym.baseCurrency, gym.maxCapacity, gym.avgVisitMinutes]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.patch('/gym', {
        name,
        baseCurrency,
        maxCapacity: maxCapacity.trim() ? Number(maxCapacity) : null,
        avgVisitMinutes: Number(avgVisitMinutes),
      });
      toast.add({ title: t('setup.settings.updated'), type: 'success' });
      onSaved();
    } catch (e: any) {
      setFormError(e.message);
      toast.add({ title: t('setup.settings.saveFailed'), description: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
    'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        {formError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('setup.settings.gymName')}<span className="text-red-500"> *</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('setup.settings.baseCurrency')}</label>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value as Gym['baseCurrency'])}
            className={inputClass}
          >
            {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('setup.settings.maxCapacity')}</label>
          <input
            type="number"
            min={1}
            step={1}
            placeholder={t('setup.settings.noLimit')}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('setup.settings.maxCapacityHint')}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('setup.settings.avgVisit')}</label>
          <input
            type="number"
            required
            min={10}
            max={720}
            step={1}
            value={avgVisitMinutes}
            onChange={(e) => setAvgVisitMinutes(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('setup.settings.avgVisitHint')}
          </p>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
          >
            {saving ? t('setup.settings.saving') : t('setup.settings.saveChanges')}
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('setup.settings.members')} value={gym._count.members} />
        <StatCard label={t('setup.settings.users')} value={gym._count.users} />
        <StatCard label={t('setup.settings.trainers')} value={gym._count.trainers} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
