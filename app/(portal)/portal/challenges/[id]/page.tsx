'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CalendarDays, CircleCheck, Gift, Target, Trophy } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import ChallengeLeaderboard from '@/components/ChallengeLeaderboard';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
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
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatPoints } from '@/lib/gamification';
import {
  METRIC_LABELS,
  STATUS_BADGES,
  STATUS_LABELS,
  formatRange,
  isFull,
  metricUnit,
  progressPercent,
  timeLeftLabel,
  type Leaderboard,
  type MemberChallenge,
} from '@/lib/challenges';

// COM-F02 — detalle de un reto con su leaderboard en tiempo real.
export default function PortalChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status, data, error, refetch } = useAsync<MemberChallenge>(
    () => api.get(`/me/challenges/${id}`) as Promise<MemberChallenge>,
    [id],
  );

  return (
    <div className="space-y-6 p-8">
      <Link href="/portal/challenges" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Volver a retos
      </Link>

      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        isEmpty={() => false}
        loading={<div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />}
        errorFallback={
          <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudo cargar el reto.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Reintentar</button>
          </div>
        }
      >
        {(challenge) => <ChallengeDetail challenge={challenge} onChanged={refetch} />}
      </AsyncBoundary>
    </div>
  );
}

function ChallengeDetail({ challenge, onChanged }: { challenge: MemberChallenge; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Mi progreso se actualiza en vivo con cada versión del leaderboard.
  const [live, setLive] = useState<{ progress: number; completedAt: string | null } | null>(null);
  const handleBoard = useCallback((board: Leaderboard) => {
    setLive(board.me ? { progress: board.me.progress, completedAt: board.me.completedAt } : null);
  }, []);

  const mine = challenge.myParticipation;
  const progress = live?.progress ?? mine?.progress ?? 0;
  const completedAt = live?.completedAt ?? mine?.completedAt ?? null;
  const finished = challenge.status === 'FINISHED';
  const percent = progressPercent(progress, challenge.goal);

  async function join() {
    setBusy(true);
    try {
      await api.post(`/me/challenges/${challenge.id}/join`, {});
      toast.add({ title: `Te uniste a "${challenge.name}"`, type: 'success' });
      onChanged();
    } catch (e: any) {
      toast.add({ title: 'No pudiste unirte', description: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await api.del(`/me/challenges/${challenge.id}/join`);
      toast.add({ title: 'Saliste del reto', type: 'success' });
      setConfirmLeave(false);
      setLive(null);
      onChanged();
    } catch (e: any) {
      toast.add({ title: 'No pudiste salir del reto', description: e.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{challenge.name}</h1>
                <Badge variant="outline" className={STATUS_BADGES[challenge.status]}>{STATUS_LABELS[challenge.status]}</Badge>
              </div>
              {challenge.description && <p className="mt-1 max-w-2xl text-slate-600">{challenge.description}</p>}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                <li className="inline-flex items-center gap-1.5"><Target className="h-4 w-4" />{challenge.goal} {metricUnit(challenge.metric, challenge.goal)} ({METRIC_LABELS[challenge.metric].toLowerCase()})</li>
                <li className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatRange(challenge)} · {timeLeftLabel(challenge)}</li>
                {challenge.pointsReward > 0 && (
                  <li className="inline-flex items-center gap-1.5 font-medium text-amber-700"><Gift className="h-4 w-4" />{formatPoints(challenge.pointsReward)} pts de premio</li>
                )}
              </ul>
            </div>
          </div>

          <div className="shrink-0">
            {!mine && !finished && (
              isFull(challenge)
                ? <span className="inline-block rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">Sin cupos</span>
                : (
                  <button
                    type="button"
                    onClick={join}
                    disabled={busy}
                    className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {busy ? 'Uniéndote…' : 'Unirme al reto'}
                  </button>
                )
            )}
            {mine && !completedAt && !finished && (
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Salir del reto
              </button>
            )}
          </div>
        </div>

        {mine && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                {completedAt
                  ? <><CircleCheck className="h-4 w-4 text-emerald-600" /> ¡Reto completado!</>
                  : 'Tu progreso'}
              </span>
              <span>{progress}/{challenge.goal} {metricUnit(challenge.metric, challenge.goal)}</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Tu progreso en el reto"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={cn('h-full rounded-full transition-all duration-500', completedAt ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${percent}%` }} />
            </div>
            {challenge.status === 'UPCOMING' && (
              <p className="mt-2 text-xs text-slate-500">El progreso empieza a contar cuando inicie el reto.</p>
            )}
          </div>
        )}
      </div>

      <ChallengeLeaderboard
        key={mine?.id ?? 'not-joined'}
        basePath={`/me/challenges/${challenge.id}`}
        onData={handleBoard}
      />

      <AlertDialog open={confirmLeave} onOpenChange={(open) => !open && !busy && setConfirmLeave(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salir del reto</AlertDialogTitle>
            <AlertDialogDescription>
              Dejarás de aparecer en la clasificación de <span className="font-medium text-foreground">{challenge.name}</span>.
              Si vuelves a unirte, tu progreso se recalcula desde el inicio del reto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={leave} disabled={busy}>
              {busy ? 'Saliendo…' : 'Salir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
