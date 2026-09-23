'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Trophy } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { AsyncBoundary } from '@/components/async-boundary';
import ChallengeLeaderboard from '@/components/ChallengeLeaderboard';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatPoints } from '@/lib/gamification';
import {
  METRIC_LABELS,
  STATUS_BADGES,
  STATUS_LABELS,
  formatRange,
  metricUnit,
  timeLeftLabel,
  type Challenge,
} from '@/lib/challenges';

// COM-F02 (staff) — clasificación en vivo de un reto, con nombres completos.
export default function ChallengeLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const { status, data, error, refetch } = useAsync<Challenge>(
    () => api.get(`/challenges/${id}`) as Promise<Challenge>,
    [id],
  );

  return (
    <div className="space-y-6 p-6">
      <Link href="/challenges" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Volver a retos
      </Link>

      <AsyncBoundary
        status={status}
        data={data}
        error={error}
        onRetry={refetch}
        isEmpty={() => false}
        loading={<div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />}
        errorFallback={
          <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-12 text-center">
            <AlertCircle className="h-7 w-7 text-red-500" />
            <p className="text-sm text-slate-600">{error?.message ?? 'No se pudo cargar el reto.'}</p>
            <button onClick={refetch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Reintentar</button>
          </div>
        }
      >
        {(challenge) => (
          <>
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{challenge.name}</h1>
                  <Badge variant="outline" className={STATUS_BADGES[challenge.status]}>{STATUS_LABELS[challenge.status]}</Badge>
                  {!challenge.active && <Badge variant="outline" className="border-transparent bg-red-100 text-red-700">Oculto</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {METRIC_LABELS[challenge.metric]} · meta {challenge.goal} {metricUnit(challenge.metric, challenge.goal)} · {formatRange(challenge)} · {timeLeftLabel(challenge)}
                  {challenge.pointsReward > 0 && ` · premio ${formatPoints(challenge.pointsReward)} pts`}
                </p>
              </div>
            </div>
            <ChallengeLeaderboard basePath={`/challenges/${challenge.id}`} />
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
