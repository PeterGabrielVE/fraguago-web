// Tipos y helpers de gamificación (puntos, niveles, insignias y recompensas).
// Contrato con fraguago-api: `/gamification/**` (staff) y `/me/gamification`,
// `/me/rewards`, `/me/badges/**` (portal del socio).
import {
  Award,
  Crown,
  Flame,
  Footprints,
  Heart,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type TierInfo = {
  id: string | null;
  name: string;
  minPoints: number;
  color: string | null;
  benefits: string | null;
};

export type BadgeSummary = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  pointsReward: number;
};

export type MemberBadge = {
  id: string;
  badgeId: string;
  awardedAt: string;
  seenAt: string | null;
  badge: BadgeSummary;
};

export type GamificationSummary = {
  memberId: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: TierInfo | null;
  nextTier: TierInfo | null;
  pointsToNextTier: number;
  progress: number;
  tiers: TierInfo[];
  badges: MemberBadge[];
};

export type PointsSource = 'MANUAL' | 'ATTENDANCE' | 'BADGE' | 'REDEMPTION' | 'REDEMPTION_REFUND' | 'CHALLENGE' | 'REFERRAL';

export type PointsTransaction = {
  id: string;
  points: number;
  balanceAfter: number;
  source: PointsSource;
  reason?: string | null;
  createdAt: string;
};

export type RewardType = 'DISCOUNT_PERCENT' | 'DISCOUNT_AMOUNT' | 'PRODUCT' | 'SERVICE' | 'OTHER';

export type Reward = {
  id: string;
  name: string;
  description?: string | null;
  type: RewardType;
  value?: string | number | null;
  pointsCost: number;
  stock: number | null;
  minLifetimePoints: number | null;
  validUntil: string | null;
  active: boolean;
};

export type CatalogReward = Reward & { canRedeem: boolean; unavailableReason: string | null };

export type RewardCatalog = {
  pointsBalance: number;
  lifetimePoints: number;
  data: CatalogReward[];
};

export type RedemptionStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED';

export type Redemption = {
  id: string;
  code: string;
  status: RedemptionStatus;
  pointsSpent: number;
  createdAt: string;
  resolvedAt: string | null;
  reward: Pick<Reward, 'id' | 'name' | 'type' | 'value'>;
  member?: { id: string; user?: { profile?: { firstName?: string; lastName?: string } } };
};

export const POINTS_SOURCE_LABELS: Record<PointsSource, string> = {
  MANUAL: 'Ajuste del staff',
  ATTENDANCE: 'Asistencia',
  BADGE: 'Insignia',
  REDEMPTION: 'Canje',
  REDEMPTION_REFUND: 'Devolución de canje',
  CHALLENGE: 'Reto completado',
  REFERRAL: 'Programa de referidos',
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  DISCOUNT_PERCENT: 'Descuento %',
  DISCOUNT_AMOUNT: 'Descuento fijo',
  PRODUCT: 'Producto',
  SERVICE: 'Servicio',
  OTHER: 'Otro',
};

export const REWARD_TYPE_OPTIONS = Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: 'Pendiente',
  FULFILLED: 'Entregado',
  CANCELLED: 'Anulado',
};

export const REDEMPTION_STATUS_BADGES: Record<RedemptionStatus, string> = {
  PENDING: 'border-transparent bg-amber-100 text-amber-700',
  FULFILLED: 'border-transparent bg-emerald-100 text-emerald-700',
  CANCELLED: 'border-transparent bg-slate-100 text-slate-500',
};

export const BADGE_CRITERIA_LABELS: Record<string, string> = {
  MANUAL: 'Manual (la otorga el staff)',
  ATTENDANCE_COUNT: 'Cantidad de asistencias',
  LIFETIME_POINTS: 'Puntos acumulados',
};

// Claves de ícono que el backend guarda en Badge.icon.
export const BADGE_ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  trophy: Trophy,
  star: Star,
  medal: Medal,
  award: Award,
  target: Target,
  heart: Heart,
};

export const BADGE_ICON_OPTIONS = Object.keys(BADGE_ICONS).map((key) => ({ value: key, label: key }));

export function badgeIcon(key?: string | null): LucideIcon {
  return (key && BADGE_ICONS[key]) || Award;
}

// Color del nivel con un fallback neutro cuando el gym no definió uno.
export function tierColor(tier: TierInfo | null | undefined): string {
  return tier?.color || '#94a3b8';
}

export function formatPoints(points: number): string {
  return points.toLocaleString('es-VE');
}

export function rewardValueLabel(reward: Pick<Reward, 'type' | 'value'>): string {
  const value = reward.value === null || reward.value === undefined ? undefined : Number(reward.value);
  if (reward.type === 'DISCOUNT_PERCENT' && value !== undefined) return `${value}% de descuento`;
  if (reward.type === 'DISCOUNT_AMOUNT' && value !== undefined) return `${value.toLocaleString('es-VE')} de descuento`;
  return REWARD_TYPE_LABELS[reward.type] ?? reward.type;
}

export function redemptionMemberName(redemption: Redemption): string {
  const profile = redemption.member?.user?.profile;
  return `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
}

// Evento global para que el notificador de insignias revise si hay nuevas
// (p. ej. después de marcar asistencia desde el portal).
export const BADGES_REFRESH_EVENT = 'fg:badges-refresh';

export function requestBadgesRefresh() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BADGES_REFRESH_EVENT));
}
