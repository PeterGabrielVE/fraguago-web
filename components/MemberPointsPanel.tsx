'use client';
import { useState } from 'react';
import { AlertCircle, History, Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { toast } from '@/components/ui/toast';
import GamificationCard from '@/components/GamificationCard';
import {
  POINTS_SOURCE_LABELS,
  formatPoints,
  type GamificationSummary,
  type PointsTransaction,
} from '@/lib/gamification';
import type { PaginatedResponse } from '@/lib/portal';
import { activeIntlLocale } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

type PanelData = { summary: GamificationSummary; history: PointsTransaction[] };

// GAM-F01 (staff) — nivel, puntos e insignias del socio dentro de su ficha,
// con ajuste manual de puntos (GAM-B02) e historial de movimientos.
export default function MemberPointsPanel({ memberId }: { memberId: string }) {
  const t = useT();
  const { status, data, error, refetch } = useAsync<PanelData>(async () => {
    const [summary, history] = await Promise.all([
      api.get(`/gamification/members/${memberId}`) as Promise<GamificationSummary>,
      api.get(`/gamification/members/${memberId}/points?pageSize=20`) as Promise<PaginatedResponse<PointsTransaction>>,
    ]);
    return { summary, history: history.data ?? [] };
  }, [memberId]);

  return (
    <AsyncBoundary
      status={status}
      data={data}
      error={error}
      onRetry={refetch}
      isEmpty={() => false}
      loading={<p className="py-10 text-center text-sm text-slate-500">{t('members.details.loading')}</p>}
      errorFallback={
        <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-slate-600">{error?.message ?? t('members.points.loadError')}</p>
          <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">{t('common.retry')}</button>
        </div>
      }
    >
      {(d) => (
        <div className="space-y-5">
          <GamificationCard summary={d.summary} />
          <AdjustPointsForm memberId={memberId} balance={d.summary.pointsBalance} onDone={refetch} />
          <PointsHistory items={d.history} />
        </div>
      )}
    </AsyncBoundary>
  );
}

function AdjustPointsForm({ memberId, balance, onDone }: { memberId: string; balance: number; onDone: () => void }) {
  const t = useT();
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState<'award' | 'deduct' | null>(null);

  async function submit(kind: 'award' | 'deduct') {
    const amount = Number(points);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.add({ title: t('members.points.invalidAmount'), type: 'error' });
      return;
    }
    if (kind === 'deduct' && amount > balance) {
      toast.add({ title: t('members.points.insufficient'), description: t('members.points.insufficientDesc', { points: formatPoints(balance) }), type: 'error' });
      return;
    }
    setSaving(kind);
    try {
      const path = kind === 'award' ? 'points' : 'points/deduct';
      await api.post(`/gamification/members/${memberId}/${path}`, {
        points: amount,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.add({
        title: t(kind === 'award' ? 'members.points.awarded' : 'members.points.deducted', { points: formatPoints(amount) }),
        type: 'success',
      });
      setPoints('');
      setReason('');
      onDone();
    } catch (e: any) {
      toast.add({ title: t('members.points.adjustFailed'), description: e.message, type: 'error' });
    } finally {
      setSaving(null);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h4 className="mb-4 text-sm font-semibold text-slate-900">{t('members.points.adjustTitle')}</h4>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">{t('members.points.pointsLabel')}</span>
          <input type="number" min={1} step={1} value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">{t('members.points.reasonLabel')}</span>
          <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={t('members.points.reasonPlaceholder')} className={inputClass} />
        </label>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit('award')}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {saving === 'award' ? t('members.points.awarding') : t('members.points.award')}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit('deduct')}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Minus className="h-4 w-4" />
          {saving === 'deduct' ? t('members.points.deducting') : t('members.points.deduct')}
        </button>
      </div>
    </div>
  );
}

export function PointsHistory({ items }: { items: PointsTransaction[] }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200">
      <h4 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
        <History className="h-4 w-4 text-amber-600" />
        {t('members.points.history')}
      </h4>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-slate-500">{t('members.points.noHistory')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{tx.reason || POINTS_SOURCE_LABELS[tx.source]}</p>
                <p className="text-xs text-slate-500">
                  {POINTS_SOURCE_LABELS[tx.source] ?? tx.source} · {new Date(tx.createdAt).toLocaleString(activeIntlLocale())}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-semibold ${tx.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.points >= 0 ? '+' : ''}{formatPoints(tx.points)}
                </p>
                <p className="text-xs text-slate-400">{t('members.points.balance', { points: formatPoints(tx.balanceAfter) })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
