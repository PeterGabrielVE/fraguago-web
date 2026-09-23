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

type PanelData = { summary: GamificationSummary; history: PointsTransaction[] };

// GAM-F01 (staff) — nivel, puntos e insignias del socio dentro de su ficha,
// con ajuste manual de puntos (GAM-B02) e historial de movimientos.
export default function MemberPointsPanel({ memberId }: { memberId: string }) {
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
      loading={<p className="py-10 text-center text-sm text-slate-500">Cargando información...</p>}
      errorFallback={
        <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar los puntos.'}</p>
          <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Reintentar</button>
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
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState<'award' | 'deduct' | null>(null);

  async function submit(kind: 'award' | 'deduct') {
    const amount = Number(points);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.add({ title: 'Ingresa una cantidad entera mayor a 0', type: 'error' });
      return;
    }
    if (kind === 'deduct' && amount > balance) {
      toast.add({ title: 'Saldo insuficiente', description: `El socio tiene ${formatPoints(balance)} pts.`, type: 'error' });
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
        title: kind === 'award' ? `+${formatPoints(amount)} pts otorgados` : `-${formatPoints(amount)} pts deducidos`,
        type: 'success',
      });
      setPoints('');
      setReason('');
      onDone();
    } catch (e: any) {
      toast.add({ title: 'No se pudo ajustar los puntos', description: e.message, type: 'error' });
    } finally {
      setSaving(null);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h4 className="mb-4 text-sm font-semibold text-slate-900">Ajustar puntos</h4>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Puntos</span>
          <input type="number" min={1} step={1} value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1.5 block">Motivo (opcional)</span>
          <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Ej. reto del mes" className={inputClass} />
        </label>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit('award')}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {saving === 'award' ? 'Otorgando…' : 'Otorgar'}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => submit('deduct')}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Minus className="h-4 w-4" />
          {saving === 'deduct' ? 'Deduciendo…' : 'Deducir'}
        </button>
      </div>
    </div>
  );
}

export function PointsHistory({ items }: { items: PointsTransaction[] }) {
  return (
    <div className="rounded-xl border border-slate-200">
      <h4 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
        <History className="h-4 w-4 text-amber-600" />
        Movimientos recientes
      </h4>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-slate-500">Sin movimientos de puntos todavía.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{t.reason || POINTS_SOURCE_LABELS[t.source]}</p>
                <p className="text-xs text-slate-500">
                  {POINTS_SOURCE_LABELS[t.source] ?? t.source} · {new Date(t.createdAt).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-semibold ${t.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.points >= 0 ? '+' : ''}{formatPoints(t.points)}
                </p>
                <p className="text-xs text-slate-400">Saldo {formatPoints(t.balanceAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
