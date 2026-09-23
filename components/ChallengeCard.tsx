'use client';
import Link from 'next/link';
import { CalendarDays, CircleCheck, Gift, Target, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  type MemberChallenge,
} from '@/lib/challenges';

// COM-F01 — tarjeta de un reto en el portal: reglas, fechas, premio y el
// progreso del socio si participa.
export default function ChallengeCard({
  challenge,
  href,
  onJoin,
  joining,
}: {
  challenge: MemberChallenge;
  href: string;
  onJoin?: () => void;
  joining?: boolean;
}) {
  const mine = challenge.myParticipation;
  const finished = challenge.status === 'FINISHED';
  const canJoin = !mine && !finished && !isFull(challenge);
  const percent = mine ? progressPercent(mine.progress, challenge.goal) : 0;

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{METRIC_LABELS[challenge.metric]}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{challenge.name}</h3>
        </div>
        <Badge variant="outline" className={STATUS_BADGES[challenge.status]}>{STATUS_LABELS[challenge.status]}</Badge>
      </div>

      {challenge.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{challenge.description}</p>}

      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        <li className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Meta: {challenge.goal} {metricUnit(challenge.metric, challenge.goal)}
        </li>
        <li className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatRange(challenge)} · {timeLeftLabel(challenge)}
        </li>
        <li className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {challenge.participantsCount}
          {challenge.maxParticipants ? ` / ${challenge.maxParticipants}` : ''} participantes
        </li>
        {challenge.pointsReward > 0 && (
          <li className="flex items-center gap-1.5 font-medium text-amber-700">
            <Gift className="h-3.5 w-3.5" />
            Premio: {formatPoints(challenge.pointsReward)} pts
          </li>
        )}
      </ul>

      {mine && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1">
              {mine.completedAt ? <><CircleCheck className="h-3.5 w-3.5 text-emerald-600" /> ¡Completado!</> : 'Tu progreso'}
            </span>
            <span>{mine.progress}/{challenge.goal}</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={`Progreso en ${challenge.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className={cn('h-full rounded-full transition-all', mine.completedAt ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {finished && !mine && <p className="mt-4 text-xs text-slate-400">No participaste en este reto.</p>}

      <div className="mt-auto flex gap-2 pt-4">
        {canJoin && onJoin && (
          <button
            type="button"
            onClick={onJoin}
            disabled={joining}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {joining ? 'Uniéndote…' : 'Unirme'}
          </button>
        )}
        {!mine && !finished && isFull(challenge) && (
          <span className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-500">Sin cupos</span>
        )}
        <Link
          href={href}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Ver clasificación
        </Link>
      </div>
    </article>
  );
}
