'use client';
import { useEffect } from 'react';
import { AlertCircle, CircleCheck, Crown, Medal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveLeaderboard } from '@/hooks/useLiveLeaderboard';
import LiveIndicator from '@/components/LiveIndicator';
import { metricUnit, type Leaderboard, type LeaderboardEntry } from '@/lib/challenges';
import { useT } from '@/components/I18nProvider';

const PODIUM_STYLES = [
  'bg-amber-100 text-amber-700 ring-amber-300',   // 1°
  'bg-slate-100 text-slate-600 ring-slate-300',   // 2°
  'bg-orange-100 text-orange-700 ring-orange-300', // 3°
];

// COM-F02 — leaderboard en tiempo real de un reto. `basePath` es la ruta del
// reto en el API: `/me/challenges/:id` (portal) o `/challenges/:id` (staff).
export default function ChallengeLeaderboard({
  basePath,
  onData,
}: {
  basePath: string;
  onData?: (board: Leaderboard) => void;
}) {
  const t = useT();
  const { data, error, loading, mode, lastUpdated, refresh } = useLiveLeaderboard(basePath);

  // Avisa al padre de cada versión nueva (p. ej. para refrescar "mi progreso").
  useEffect(() => {
    if (data) onData?.(data);
  }, [data, onData]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="leaderboard-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id="leaderboard-title" className="text-lg font-semibold text-slate-900">{t('challenges.board.title')}</h2>
          {data && (
            <p className="text-xs text-slate-500">
              {t('challenges.board.summary', { participants: data.totalParticipants, completed: data.completedCount })}
            </p>
          )}
        </div>
        <LiveIndicator mode={mode} lastUpdated={lastUpdated} onRefresh={refresh} refreshLabel={t('challenges.board.refresh')} />
      </header>

      {loading && !data ? (
        <div className="space-y-2 p-5" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : error && !data ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-slate-600">{error.message}</p>
          <button onClick={refresh} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">{t('common.retry')}</button>
        </div>
      ) : data && data.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <Users className="h-7 w-7 text-slate-300" />
          <p className="text-sm text-slate-500">{t('challenges.board.empty')}</p>
        </div>
      ) : data ? (
        <LeaderboardTable board={data} />
      ) : null}
    </section>
  );
}

function LeaderboardTable({ board }: { board: Leaderboard }) {
  const { challenge, entries, me } = board;
  const meOutside = me && !entries.some((e) => e.isMe);

  return (
    <ol className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <LeaderboardRow key={entry.memberId} entry={entry} goal={challenge.goal} metric={challenge.metric} />
      ))}
      {meOutside && (
        <>
          <li className="px-5 py-1 text-center text-xs text-slate-400" aria-hidden>···</li>
          <LeaderboardRow entry={me} goal={challenge.goal} metric={challenge.metric} />
        </>
      )}
    </ol>
  );
}

function LeaderboardRow({ entry, goal, metric }: { entry: LeaderboardEntry; goal: number; metric: Leaderboard['challenge']['metric'] }) {
  const t = useT();
  const podium = entry.rank <= 3 ? PODIUM_STYLES[entry.rank - 1] : null;
  return (
    <li
      className={cn('flex items-center gap-4 px-5 py-3 transition-colors', entry.isMe && 'bg-amber-50')}
      aria-current={entry.isMe ? 'true' : undefined}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          podium ? `ring-2 ${podium}` : 'text-slate-500',
        )}
        aria-label={t('challenges.board.position', { rank: entry.rank })}
      >
        {entry.rank === 1 ? <Crown className="h-4 w-4" /> : entry.rank <= 3 ? <Medal className="h-4 w-4" /> : entry.rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
          {entry.name}
          {entry.isMe && <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{t('challenges.board.you')}</span>}
          {entry.completedAt && <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label={t('challenges.board.completed')} />}
        </p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', entry.completedAt ? 'bg-emerald-500' : 'bg-amber-500')}
            style={{ width: `${entry.percent}%` }}
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-slate-900">{entry.progress}<span className="font-normal text-slate-400">/{goal}</span></p>
        <p className="text-[11px] text-slate-500">{metricUnit(metric, entry.progress)}</p>
      </div>
    </li>
  );
}
