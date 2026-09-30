import { api } from '@/lib/api';

// El backend no guarda notificaciones: se derivan de las alertas operativas que ya
// expone la API (vencimientos, stock, canjes, inactividad, aforo, tasa del día).
// Cada fuente declara qué roles pueden pedirla, porque un 403 redirige a /403.

export type NotificationSeverity = 'critical' | 'warning' | 'info';
export type NotificationCategory = 'membership' | 'stock' | 'redemption' | 'retention' | 'occupancy' | 'exchange';

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  description?: string;
  href: string;
  /** Momento del evento (ISO), para mostrar "hace 2 h" / "en 3 días". Sin fecha = estado actual. */
  date?: string;
  /** Cambia cuando el contenido cambia: una notificación leída vuelve a "no leída" si su dato se actualiza. */
  fingerprint: string;
};

type Row = Record<string, any>;
type Source = { roles: string[]; load: () => Promise<AppNotification[]> };

const STAFF_ROLES = ['OWNER', 'ADMIN', 'STAFF'];
const ALL_STAFF = [...STAFF_ROLES, 'TRAINER'];
const DAY_MS = 24 * 60 * 60 * 1000;

function rows(response: any): Row[] {
  return Array.isArray(response) ? response : response?.data ?? [];
}

function personName(user: Row | undefined, fallback = 'Socio'): string {
  const profile = user?.profile ?? {};
  return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || user?.email || fallback;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysUntil(iso: string): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);
}

function whenLabel(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${days} días`;
}

const SOURCES: Source[] = [
  // Membresías que vencen en los próximos 3 días: una por socio, para poder cobrar a tiempo.
  {
    roles: STAFF_ROLES,
    load: async () => rows(await api.get('/memberships/expiring?days=3&pageSize=15')).map((membership) => {
      const days = daysUntil(membership.endDate);
      const name = personName(membership.member?.user);
      return {
        id: `membership-expiring:${membership.id}`,
        category: 'membership',
        severity: days <= 1 ? 'critical' : 'warning',
        title: `La membresía de ${name} vence ${whenLabel(days)}`,
        description: [membership.plan?.name, membership.member?.user?.profile?.phone].filter(Boolean).join(' · ') || undefined,
        href: `/members?id=${membership.memberId}&q=${encodeURIComponent(name)}`,
        date: membership.endDate,
        fingerprint: membership.endDate,
      } satisfies AppNotification;
    }),
  },
  // Productos agotados o con poco stock.
  {
    roles: STAFF_ROLES,
    load: async () => rows(await api.get('/products/low-stock?threshold=5&pageSize=15')).map((product) => {
      const stock = Number(product.stock ?? 0);
      return {
        id: `stock:${product.id}`,
        category: 'stock',
        severity: stock <= 0 ? 'critical' : 'warning',
        title: stock <= 0 ? `${product.name} está agotado` : `Quedan ${stock} unidades de ${product.name}`,
        description: product.sku ? `SKU ${product.sku}` : 'Repón inventario para no perder ventas',
        href: `/products?q=${encodeURIComponent(product.name)}`,
        fingerprint: String(stock),
      } satisfies AppNotification;
    }),
  },
  // Canjes de recompensas que el staff todavía tiene que entregar.
  {
    roles: STAFF_ROLES,
    load: async () => rows(await api.get('/gamification/redemptions?status=PENDING&pageSize=10')).map((redemption) => ({
      id: `redemption:${redemption.id}`,
      category: 'redemption',
      severity: 'info',
      title: `${personName(redemption.member?.user)} canjeó “${redemption.reward?.name ?? 'una recompensa'}”`,
      description: redemption.code ? `Pendiente de entrega · Código ${redemption.code}` : 'Pendiente de entrega',
      href: '/redemptions',
      date: redemption.createdAt,
      fingerprint: redemption.status ?? 'PENDING',
    } satisfies AppNotification)),
  },
  // Socios que llevan una semana sin venir: un solo aviso agregado para no saturar.
  {
    roles: ALL_STAFF,
    load: async () => {
      const response = await api.get('/retention/inactive?days=7');
      const members = rows(response);
      const total = typeof response?.total === 'number' ? response.total : members.length;
      if (total === 0) return [];
      const names = members.slice(0, 3).map((member) => member.name).filter(Boolean);
      return [{
        id: 'retention:inactive',
        category: 'retention',
        severity: 'info',
        title: total === 1 ? '1 socio lleva más de 7 días sin venir' : `${total} socios llevan más de 7 días sin venir`,
        description: names.length ? `${names.join(', ')}${total > names.length ? ' y otros' : ''}` : undefined,
        href: '/inactive-members',
        fingerprint: `${new Date().toDateString()}:${total}`,
      }];
    },
  },
  // Aforo casi lleno o completo en este momento.
  {
    roles: ALL_STAFF,
    load: async () => {
      const occupancy = await api.get('/attendance/occupancy');
      if (!occupancy || !['BUSY', 'FULL'].includes(occupancy.status)) return [];
      const full = occupancy.status === 'FULL';
      return [{
        id: 'occupancy:status',
        category: 'occupancy',
        severity: full ? 'critical' : 'warning',
        title: full ? 'Aforo completo' : `Aforo al ${Math.round(occupancy.percentage ?? 0)}%`,
        description: `${occupancy.current}/${occupancy.capacity} personas dentro${full ? ' · no se permiten más entradas' : ''}`,
        href: '/attendance',
        fingerprint: occupancy.status,
      }];
    },
  },
  // Tasa de cambio sin registrar hoy: los cobros en otra moneda usarían una tasa vieja.
  {
    roles: STAFF_ROLES,
    load: async () => {
      const rates = rows(await api.get('/exchange-rates/latest'));
      const today = startOfDay(new Date()).getTime();
      const stale = rates.filter((rate) => new Date(rate.effectiveAt ?? rate.createdAt).getTime() < today);
      if (rates.length > 0 && stale.length === 0) return [];
      return [{
        id: 'exchange:today',
        category: 'exchange',
        severity: 'warning',
        title: rates.length === 0 ? 'No hay tasas de cambio registradas' : 'Falta registrar la tasa de cambio de hoy',
        description: stale.length ? `Desactualizada: ${stale.map((rate) => rate.currency).join(', ')}` : 'Regístrala para cobrar en otras monedas',
        href: '/exchange-rates',
        fingerprint: new Date().toDateString(),
      }];
    },
  },
];

const SEVERITY_ORDER: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 };

function timeOf(notification: AppNotification) {
  return notification.date ? new Date(notification.date).getTime() : Date.now();
}

export type NotificationsResult = { items: AppNotification[]; failedSources: number; totalSources: number };

export async function loadNotifications(role: string | undefined): Promise<NotificationsResult> {
  const normalized = (role ?? '').toUpperCase();
  const allowed = SOURCES.filter((source) => source.roles.includes(normalized));
  const settled = await Promise.allSettled(allowed.map((source) => source.load()));
  const items = settled
    .flatMap((entry) => (entry.status === 'fulfilled' ? entry.value : []))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || timeOf(b) - timeOf(a));
  return {
    items,
    failedSources: settled.filter((entry) => entry.status === 'rejected').length,
    totalSources: allowed.length,
  };
}

// ---------------------------------------------------------------------------
// Estado leído / no leído (por navegador)
// ---------------------------------------------------------------------------

const READ_KEY = 'fg_notifications_read';

export type ReadMap = Record<string, string>;

export function getReadMap(): ReadMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(READ_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveReadMap(map: ReadMap) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {
    // sin almacenamiento: las notificaciones se verán como no leídas
  }
}

export function isUnread(notification: AppNotification, map: ReadMap): boolean {
  return map[notification.id] !== notification.fingerprint;
}
