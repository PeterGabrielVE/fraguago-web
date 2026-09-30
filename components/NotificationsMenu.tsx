'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Coins,
  CreditCard,
  Gift,
  Package,
  RefreshCw,
  UserX,
  Users,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/I18nProvider';
import type { AppNotification, NotificationCategory, NotificationSeverity } from '@/lib/notifications';

const CATEGORY_ICON: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  membership: CreditCard,
  stock: Package,
  redemption: Gift,
  retention: UserX,
  occupancy: Users,
  exchange: Coins,
};

const SEVERITY_STYLE: Record<NotificationSeverity, string> = {
  critical: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  info: 'bg-primary/15 text-primary',
};

function timeLabel(iso: string | undefined, locale: DateFnsLocale): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // Fechas futuras (vencimientos): la fecha exacta es más útil que "en 2 días", que ya dice el título.
  if (date.getTime() > Date.now()) return format(date, 'PP', { locale });
  return formatDistanceToNow(date, { addSuffix: true, locale });
}

function NotificationRow({
  notification,
  unread,
  onOpen,
  onMarkRead,
}: {
  notification: AppNotification;
  unread: boolean;
  onOpen: (notification: AppNotification) => void;
  onMarkRead: (notification: AppNotification) => void;
}) {
  const { t, dateLocale } = useI18n();
  const Icon = notification.severity === 'critical' && notification.category === 'occupancy' ? AlertTriangle : CATEGORY_ICON[notification.category];
  const time = timeLabel(notification.date, dateLocale);
  const title = notification.title(t);
  const description = notification.description?.(t);
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={cn(
          'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 pr-10 text-left transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
          !unread && 'opacity-70',
        )}
      >
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', SEVERITY_STYLE[notification.severity])}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">{t(`notifications.severity.${notification.severity}`)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm leading-snug text-foreground', unread && 'font-semibold')}>{title}</span>
          {description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>}
          {time && <span className="mt-1 block text-[11px] text-muted-foreground">{time}</span>}
        </span>
        {unread && <span className="absolute right-3.5 top-4 h-2 w-2 rounded-full bg-primary group-hover:hidden" aria-label={t('notifications.unreadDot')} />}
      </button>
      {unread && (
        <button
          type="button"
          onClick={() => onMarkRead(notification)}
          title={t('notifications.markRead')}
          aria-label={t('notifications.markReadLabel', { title })}
          className="absolute right-2 top-2.5 hidden rounded-md p-1 text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:block group-hover:block"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export default function NotificationsMenu() {
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { items, unreadCount, loading, error, partial, lastUpdated, isUnread, markRead, markAllRead, refresh } = useNotifications();

  const visible = filter === 'unread' ? items.filter(isUnread) : items;
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      refresh();
      track('notifications_opened', { unread: unreadCount });
    }
  }

  function openNotification(notification: AppNotification) {
    markRead(notification);
    track('notification_clicked', { category: notification.category, severity: notification.severity });
    setOpen(false);
    router.push(notification.href);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={unreadCount > 0 ? t('notifications.triggerLabelUnread', { count: unreadCount }) : t('notifications.triggerLabel')}
        className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-popup-open:bg-muted data-popup-open:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
            {badge}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] gap-0 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('notifications.title')}</h2>
            <p className="text-xs text-muted-foreground">{unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.upToDate')}</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {t('notifications.markAllRead')}
          </button>
        </div>

        <div role="tablist" aria-label={t('notifications.filterLabel')} className="flex gap-1 border-b border-border px-3 py-2">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                filter === value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'all' ? t('notifications.tabAll', { count: items.length }) : t('notifications.tabUnread', { count: unreadCount })}
            </button>
          ))}
        </div>

        <div className="fraguago-scrollbar max-h-[min(28rem,60vh)] overflow-y-auto p-1.5">
          {loading && items.length === 0 ? (
            <ul aria-label={t('notifications.loadingLabel')} className="space-y-1 p-1">
              {[0, 1, 2].map((key) => (
                <li key={key} className="flex animate-pulse gap-3 px-2 py-2">
                  <span className="h-8 w-8 rounded-full bg-muted" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-3/4 rounded bg-muted" />
                    <span className="block h-2.5 w-1/2 rounded bg-muted" />
                  </span>
                </li>
              ))}
            </ul>
          ) : error && items.length === 0 ? (
            <div role="alert" className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">{t('notifications.loadError')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('notifications.loadErrorHint')}</p>
              <button type="button" onClick={refresh} className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                <RefreshCw className="h-3.5 w-3.5" /> {t('common.retry')}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">{filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('notifications.emptyHint')}</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {visible.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  unread={isUnread(notification)}
                  onOpen={openNotification}
                  onMarkRead={markRead}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            {partial ? t('notifications.partial') : lastUpdated ? t('notifications.updated', { time: formatDistanceToNow(lastUpdated, { addSuffix: true, locale: dateLocale }) }) : ' '}
          </span>
          <button type="button" onClick={refresh} aria-label={t('notifications.refresh')} className="rounded-md p-1 transition hover:bg-muted hover:text-foreground">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
