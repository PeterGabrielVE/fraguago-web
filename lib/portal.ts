// Tipos y helpers compartidos por las páginas del portal del socio (app/(portal)/portal/**).
// Contrato acordado con el backend (fraguago-api), módulo `/me`.

export type MemberShift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

export const SHIFT_LABELS: Record<MemberShift, string> = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
};

export const preferredTimeOptions = [
  { value: 'MAÑANA', label: 'Mañana' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOCHE', label: 'Noche' },
  { value: 'OTROS', label: 'Otros' },
  { value: 'VARIADO', label: 'Variado' },
];

export type MemberProfile = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  preferredTime?: string | null;
};

export type MeProfile = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  profile: MemberProfile;
};

export type MemberProfileUpdate = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  preferredTime?: string;
};

export type MembershipPlanSummary = {
  name: string;
  type: string;
  price: number;
};

export type Membership = {
  id: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: string;
  plan: MembershipPlanSummary;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type Attendance = {
  id: string;
  checkedInAt: string;
  shift: MemberShift;
  passType?: string | null;
  signature?: string | null;
};

export type RoutineTrainer = {
  id: string;
  user: { profile: { firstName: string; lastName: string } };
};

export type Routine = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  trainer: RoutineTrainer | null;
};

export type Measurement = {
  id: string;
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  bodyFat?: number | string | null;
  chestCm?: number | string | null;
  waistCm?: number | string | null;
  armCm?: number | string | null;
  notes?: string | null;
  date: string;
};

export type MeasurementListResponse = {
  data: Measurement[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

export function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function fmtMeasurement(v: unknown, suffix = ''): string {
  const n = toNum(v);
  return n === undefined ? '—' : `${n}${suffix}`;
}

export function trainerName(trainer: RoutineTrainer | null): string {
  if (!trainer) return '';
  const firstName = trainer.user?.profile?.firstName ?? '';
  const lastName = trainer.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

export function isMembershipActive(membership: Membership | null | undefined): boolean {
  if (!membership) return false;
  if (String(membership.status).toLowerCase() !== 'active') return false;
  if (!membership.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(membership.endDate);
  endDate.setHours(0, 0, 0, 0);
  return endDate >= today;
}
