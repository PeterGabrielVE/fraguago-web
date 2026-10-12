import { api } from '@/lib/api';
import { activeIntlLocale } from '@/lib/i18n/client';

export const REPORT_TABS = ['finances', 'members', 'attendance', 'sales'] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export const RANGE_PRESETS = ['thisMonth', 'lastMonth', 'last7', 'last30', 'last90', 'thisYear'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

// Igual que el tope del API (reports/report-range.ts).
export const MAX_RANGE_DAYS = 366;

export type DateRange = { from: string; to: string }; // YYYY-MM-DD, ambos incluidos
export type Granularity = 'day' | 'month';

type ReportBase = {
  range: DateRange & { days: number };
  granularity: Granularity;
};

type PaymentMethodRow = { method: string | null; total: number; count: number };
type ConceptRow = { concept: string | null; total: number; count: number };

export type FinanceReport = ReportBase & {
  currency: string;
  totals: { income: number; expense: number; balance: number; count: number };
  previous: { income: number; expense: number; balance: number };
  series: { date: string; income: number; expense: number }[];
  incomeByConcept: ConceptRow[];
  expenseByConcept: ConceptRow[];
  byPaymentMethod: PaymentMethodRow[];
};

export type MembersReport = ReportBase & {
  newMembers: { total: number; previous: number };
  membershipsStarted: { total: number; previous: number };
  series: { date: string; value: number }[];
  byPlan: { plan: string; count: number }[];
  renewal: {
    expired: number;
    renewed: number;
    lapsed: number;
    lapsedMembers: { memberId: string; name: string; plan: string; endDate: string }[];
  };
  current: {
    total: number;
    byStatus: { ACTIVE: number; INACTIVE: number; SUSPENDED: number };
    activeMemberships: number;
    expiringSoon: number;
  };
};

export type AttendanceReport = ReportBase & {
  totals: { visits: number; uniqueMembers: number };
  previous: { visits: number; uniqueMembers: number };
  series: { date: string; value: number }[];
  heatmap: number[][]; // [día de la semana 0=domingo][hora 0-23]
  byShift: { MORNING: number; AFTERNOON: number; NIGHT: number };
  topMembers: { memberId: string; name: string; visits: number }[];
};

export type SalesReport = ReportBase & {
  currency: string;
  totals: { revenue: number; count: number; units: number };
  previous: { revenue: number; count: number };
  series: { date: string; value: number }[];
  topProducts: { productId: string; product: string; revenue: number; units: number }[];
  byPaymentMethod: PaymentMethodRow[];
};

export function getReport<T>(tab: ReportTab, range: DateRange): Promise<T> {
  return api.get(`/reports/${tab}?from=${range.from}&to=${range.to}`) as Promise<T>;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function toYmd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function presetRange(preset: RangePreset, today = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const daysBack = (n: number) => new Date(y, m, today.getDate() - n);
  switch (preset) {
    case 'thisMonth': return { from: toYmd(new Date(y, m, 1)), to: toYmd(today) };
    // Día 0 del mes actual = último día del mes anterior.
    case 'lastMonth': return { from: toYmd(new Date(y, m - 1, 1)), to: toYmd(new Date(y, m, 0)) };
    case 'last7': return { from: toYmd(daysBack(6)), to: toYmd(today) };
    case 'last30': return { from: toYmd(daysBack(29)), to: toYmd(today) };
    case 'last90': return { from: toYmd(daysBack(89)), to: toYmd(today) };
    case 'thisYear': return { from: toYmd(new Date(y, 0, 1)), to: toYmd(today) };
  }
}

// Motivo por el que un rango escrito a mano no se puede consultar (null = válido).
export function rangeError(range: Partial<DateRange>): 'incomplete' | 'inverted' | 'tooLong' | null {
  if (!range.from || !range.to || !YMD.test(range.from) || !YMD.test(range.to)) return 'incomplete';
  const days = Math.round((parseYmd(range.to).getTime() - parseYmd(range.from).getTime()) / 86_400_000) + 1;
  if (Number.isNaN(days)) return 'incomplete';
  if (days < 1) return 'inverted';
  return days > MAX_RANGE_DAYS ? 'tooLong' : null;
}

// Variación porcentual frente al periodo anterior; null si no hay base para comparar.
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Etiqueta de un tramo de la serie ("2026-09-04" o "2026-09"). short: para el eje.
export function formatBucket(key: string, granularity: Granularity, short = false) {
  const locale = activeIntlLocale();
  if (granularity === 'month') {
    const date = parseYmd(`${key}-01`);
    return new Intl.DateTimeFormat(locale, short ? { month: 'short' } : { month: 'long', year: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, short ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' })
    .format(parseYmd(key));
}

export function formatRange(range: DateRange) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { dateStyle: 'medium' }).formatRange(parseYmd(range.from), parseYmd(range.to));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(activeIntlLocale(), { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat(activeIntlLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

// Nombre del día de la semana (0 = domingo).
export function weekdayName(weekday: number, format: 'short' | 'long' = 'short') {
  // El 7 de enero de 2024 fue domingo.
  return new Intl.DateTimeFormat(activeIntlLocale(), { weekday: format }).format(new Date(2024, 0, 7 + weekday));
}
