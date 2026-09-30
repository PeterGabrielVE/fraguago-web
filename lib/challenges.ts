import { activeIntlLocale, localizedOptions, localizedRecord, tActive } from '@/lib/i18n/client';

// Tipos y helpers de retos (Comunidad). Contrato con fraguago-api:
// `/challenges/**` (staff) y `/me/challenges/**` (portal del socio).

export type ChallengeMetric = 'ATTENDANCE_COUNT' | 'ATTENDANCE_DAYS' | 'ROUTINE_COMPLETIONS';
export type ChallengeStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED';

export type Challenge = {
  id: string;
  name: string;
  description?: string | null;
  metric: ChallengeMetric;
  goal: number;
  startsAt: string;
  endsAt: string;
  pointsReward: number;
  maxParticipants: number | null;
  active: boolean;
  status: ChallengeStatus;
  participantsCount: number;
};

export type ChallengeParticipation = {
  id: string;
  progress: number;
  completedAt: string | null;
  joinedAt: string;
};

export type MemberChallenge = Challenge & { myParticipation: ChallengeParticipation | null };

export type LeaderboardEntry = {
  rank: number;
  memberId: string;
  name: string;
  progress: number;
  percent: number;
  completedAt: string | null;
  joinedAt: string;
  isMe: boolean;
};

export type Leaderboard = {
  challenge: Challenge;
  totalParticipants: number;
  completedCount: number;
  generatedAt: string;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

// Lo que devuelven el check-in y "rutina completada" sobre los retos afectados.
export type ChallengeProgressUpdate = {
  challengeId: string;
  name: string;
  progress: number;
  goal: number;
  completed: boolean;
};

const METRIC_KEYS = {
  ATTENDANCE_COUNT: 'labels.challengeMetric.ATTENDANCE_COUNT',
  ATTENDANCE_DAYS: 'labels.challengeMetric.ATTENDANCE_DAYS',
  ROUTINE_COMPLETIONS: 'labels.challengeMetric.ROUTINE_COMPLETIONS',
} as const;

export const METRIC_LABELS: Record<ChallengeMetric, string> = localizedRecord(METRIC_KEYS);
export const METRIC_OPTIONS = localizedOptions(METRIC_KEYS);

const METRIC_UNIT_KEYS = {
  ATTENDANCE_COUNT: 'labels.challengeUnit.ATTENDANCE_COUNT',
  ATTENDANCE_DAYS: 'labels.challengeUnit.ATTENDANCE_DAYS',
  ROUTINE_COMPLETIONS: 'labels.challengeUnit.ROUTINE_COMPLETIONS',
} as const;

export function metricUnit(metric: ChallengeMetric, n: number): string {
  const key = METRIC_UNIT_KEYS[metric];
  return key ? tActive(key, { count: n }) : '';
}

export const STATUS_LABELS: Record<ChallengeStatus, string> = localizedRecord({
  UPCOMING: 'labels.challengeStatus.UPCOMING',
  ACTIVE: 'labels.challengeStatus.ACTIVE',
  FINISHED: 'labels.challengeStatus.FINISHED',
});

export const STATUS_BADGES: Record<ChallengeStatus, string> = {
  UPCOMING: 'border-transparent bg-sky-100 text-sky-700',
  ACTIVE: 'border-transparent bg-emerald-100 text-emerald-700',
  FINISHED: 'border-transparent bg-slate-100 text-slate-500',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFmt = () => new Intl.DateTimeFormat(activeIntlLocale(), { day: 'numeric', month: 'short' });

export function formatRange(challenge: Pick<Challenge, 'startsAt' | 'endsAt'>): string {
  const fmt = dateFmt();
  return `${fmt.format(new Date(challenge.startsAt))} – ${fmt.format(new Date(challenge.endsAt))}`;
}

// "Termina en 3 días", "Empieza mañana", "Finalizó el 12 sept".
export function timeLeftLabel(challenge: Pick<Challenge, 'status' | 'startsAt' | 'endsAt'>, now = new Date()): string {
  if (challenge.status === 'FINISHED') return tActive('labels.challengeTime.finishedOn', { date: dateFmt().format(new Date(challenge.endsAt)) });
  const target = new Date(challenge.status === 'UPCOMING' ? challenge.startsAt : challenge.endsAt);
  const days = Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
  const starts = challenge.status === 'UPCOMING';
  if (days <= 0) return tActive(starts ? 'labels.challengeTime.startsToday' : 'labels.challengeTime.endsToday');
  if (days === 1) return tActive(starts ? 'labels.challengeTime.startsTomorrow' : 'labels.challengeTime.endsTomorrow');
  return tActive(starts ? 'labels.challengeTime.startsIn' : 'labels.challengeTime.endsIn', { count: days });
}

export function progressPercent(progress: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((progress / goal) * 100)) : 0;
}

export function isFull(challenge: Pick<Challenge, 'maxParticipants' | 'participantsCount'>): boolean {
  return challenge.maxParticipants !== null && challenge.participantsCount >= challenge.maxParticipants;
}

// Texto corto para el toast después de un check-in o una rutina completada.
export function challengeUpdatesMessage(updates: ChallengeProgressUpdate[] | undefined): string | undefined {
  if (!updates?.length) return undefined;
  const completed = updates.filter((u) => u.completed);
  if (completed.length) return tActive('labels.challengeTime.completed', { names: completed.map((u) => `"${u.name}"`).join(', ') });
  return updates.map((u) => `${u.name}: ${Math.min(u.progress, u.goal)}/${u.goal}`).join(' · ');
}

// Convierte un ISO a valor de <input type="datetime-local"> en hora local.
export function toDatetimeLocal(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
