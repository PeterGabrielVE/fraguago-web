'use client';
import { useState } from 'react';
import { AlertCircle, Gift, Lock, Package, Ticket } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PointsHistory } from '@/components/MemberPointsPanel';
import {
  REDEMPTION_STATUS_BADGES,
  REDEMPTION_STATUS_LABELS,
  formatPoints,
  rewardValueLabel,
  type CatalogReward,
  type PointsTransaction,
  type Redemption,
  type RewardCatalog,
} from '@/lib/gamification';
import type { PaginatedResponse } from '@/lib/portal';

type RewardsData = {
  catalog: RewardCatalog;
  redemptions: Redemption[];
  history: PointsTransaction[];
};

async function loadRewards(): Promise<RewardsData> {
  const [catalog, redemptions, history] = await Promise.all([
    api.get('/me/rewards') as Promise<RewardCatalog>,
    api.list('/me/redemptions') as Promise<Redemption[]>,
    api.get('/me/points?pageSize=10') as Promise<PaginatedResponse<PointsTransaction>>,
  ]);
  return { catalog, redemptions, history: history.data ?? [] };
}

// GAM-01 — catálogo de recompensas canjeables del socio, sus canjes (con el
// código a mostrar en recepción) y sus últimos movimientos de puntos.
export default function PortalRewardsPage() {
  const { status, data, error, refetch } = useAsync<RewardsData>(loadRewards, []);

  return (
    <div className="space-y-6 p-8">
      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        isEmpty={() => false}
        loading={
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        }
        errorFallback={
          <div role="alert" className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudieron cargar las recompensas.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-50">
              Reintentar
            </button>
          </div>
        }
      >
        {(d) => <RewardsContent data={d} onChanged={refetch} />}
      </AsyncBoundary>
    </div>
  );
}

function RewardsContent({ data, onChanged }: { data: RewardsData; onChanged: () => void }) {
  const { catalog, redemptions, history } = data;
  const [target, setTarget] = useState<CatalogReward | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  async function redeem() {
    if (!target) return;
    setRedeeming(true);
    try {
      const redemption = (await api.post(`/me/rewards/${target.id}/redeem`, {})) as Redemption;
      toast.add({
        title: '¡Recompensa canjeada!',
        description: `Muestra el código ${redemption.code} en recepción.`,
        type: 'success',
      });
      setTarget(null);
      onChanged();
    } catch (e: any) {
      toast.add({ title: 'No se pudo canjear', description: e.message, type: 'error' });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Gift className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Recompensas</h1>
              <p className="mt-1 text-slate-600">Canjea tus puntos por descuentos y premios.</p>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Tu saldo</p>
            <p className="text-3xl font-bold text-amber-600">{formatPoints(catalog.pointsBalance)} <span className="text-base font-medium">pts</span></p>
          </div>
        </div>
      </div>

      {catalog.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Tu gimnasio todavía no publicó recompensas. ¡Sigue sumando puntos!
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {catalog.data.map((reward) => (
            <RewardCard key={reward.id} reward={reward} onRedeem={() => setTarget(reward)} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
            <Ticket className="h-4 w-4 text-amber-600" />
            Mis canjes
          </h2>
          {redemptions.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500">Todavía no canjeaste recompensas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{r.reward.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString('es-MX')} · {formatPoints(r.pointsSpent)} pts
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-white">
                      {r.code}
                    </span>
                    <Badge variant="outline" className={REDEMPTION_STATUS_BADGES[r.status]}>
                      {REDEMPTION_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white">
          <PointsHistory items={history} />
        </div>
      </div>

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && !redeeming && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Canjear recompensa</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a canjear <span className="font-medium text-foreground">{target?.name}</span> por{' '}
              <span className="font-medium text-foreground">{formatPoints(target?.pointsCost ?? 0)} puntos</span>.
              Te quedarán {formatPoints(catalog.pointsBalance - (target?.pointsCost ?? 0))} puntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={redeeming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={redeem} disabled={redeeming}>
              {redeeming ? 'Canjeando…' : 'Canjear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RewardCard({ reward, onRedeem }: { reward: CatalogReward; onRedeem: () => void }) {
  return (
    <div className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${reward.canRedeem ? 'border-slate-200' : 'border-slate-200 opacity-80'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{rewardValueLabel(reward)}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{reward.name}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
          {formatPoints(reward.pointsCost)} pts
        </span>
      </div>
      {reward.description && <p className="mt-2 text-sm text-slate-600">{reward.description}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {reward.stock !== null && (
          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{reward.stock} disponibles</span>
        )}
        {reward.validUntil && <span>Válido hasta {new Date(reward.validUntil).toLocaleDateString('es-MX')}</span>}
        {reward.minLifetimePoints ? <span>Nivel: {formatPoints(reward.minLifetimePoints)} pts acumulados</span> : null}
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onRedeem}
          disabled={!reward.canRedeem}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {reward.canRedeem ? <Gift className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {reward.canRedeem ? 'Canjear' : reward.unavailableReason}
        </button>
      </div>
    </div>
  );
}
