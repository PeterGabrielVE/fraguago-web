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

export const METRIC_LABELS: Record<ChallengeMetric, string> = {
  ATTENDANCE_COUNT: 'Asistencias',
  ATTENDANCE_DAYS: 'Días entrenados',
  ROUTINE_COMPLETIONS: 'Rutinas completadas',
};

export const METRIC_OPTIONS = Object.entries(METRIC_LABELS).map(([value, label]) => ({ value, label }));

const METRIC_UNITS: Record<ChallengeMetric, [string, string]> = {
  ATTENDANCE_COUNT: ['asistencia', 'asistencias'],
  ATTENDANCE_DAYS: ['día', 'días'],
  ROUTINE_COMPLETIONS: ['rutina', 'rutinas'],
};

export function metricUnit(metric: ChallengeMetric, n: number): string {
  const [one, many] = METRIC_UNITS[metric] ?? ['', ''];
  return n === 1 ? one : many;
}

export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  UPCOMING: 'Próximo',
  ACTIVE: 'En curso',
  FINISHED: 'Finalizado',
};

export const STATUS_BADGES: Record<ChallengeStatus, string> = {
  UPCOMING: 'border-transparent bg-sky-100 text-sky-700',
  ACTIVE: 'border-transparent bg-emerald-100 text-emerald-700',
  FINISHED: 'border-transparent bg-slate-100 text-slate-500',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_FMT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

export function formatRange(challenge: Pick<Challenge, 'startsAt' | 'endsAt'>): string {
  return `${DATE_FMT.format(new Date(challenge.startsAt))} – ${DATE_FMT.format(new Date(challenge.endsAt))}`;
}

// "Termina en 3 días", "Empieza mañana", "Finalizó el 12 sept".
export function timeLeftLabel(challenge: Pick<Challenge, 'status' | 'startsAt' | 'endsAt'>, now = new Date()): string {
  if (challenge.status === 'FINISHED') return `Finalizó el ${DATE_FMT.format(new Date(challenge.endsAt))}`;
  const target = new Date(challenge.status === 'UPCOMING' ? challenge.startsAt : challenge.endsAt);
  const days = Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
  const verb = challenge.status === 'UPCOMING' ? 'Empieza' : 'Termina';
  if (days <= 0) return `${verb} hoy`;
  if (days === 1) return `${verb} mañana`;
  return `${verb} en ${days} días`;
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
  if (completed.length) return `¡Completaste ${completed.map((u) => `"${u.name}"`).join(', ')}!`;
  return updates.map((u) => `${u.name}: ${Math.min(u.progress, u.goal)}/${u.goal}`).join(' · ');
}

// Convierte un ISO a valor de <input type="datetime-local"> en hora local.
export function toDatetimeLocal(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
