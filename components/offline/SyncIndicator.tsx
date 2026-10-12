'use client';

import { useState } from 'react';
import { CircleCheck, CloudUpload, RefreshCw, TriangleAlert, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/I18nProvider';
import { useOfflineStatus, type OfflineStatus } from '@/hooks/useOfflineStatus';
import { checkBackend } from '@/lib/offline/connectivity';
import type { OutboxOp } from '@/lib/offline/db';
import { describeOutboxError } from '@/lib/offline/errors';
import { discardOp, retryOp } from '@/lib/offline/outbox';
import { getOfflineScope } from '@/lib/offline/scope';
import { syncNow } from '@/lib/offline/sync';
import { cn } from '@/lib/utils';

const ICONS: Record<OfflineStatus, LucideIcon> = {
  online: Wifi,
  offline: WifiOff,
  syncing: RefreshCw,
  pending: CloudUpload,
  synced: CircleCheck,
  error: TriangleAlert,
};

// El color nunca es la única señal: cada estado tiene icono y texto propios.
const TONES: Record<OfflineStatus, string> = {
  online: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  offline: 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-200',
  syncing: 'bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-200',
  pending: 'bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-200',
  synced: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200',
  error: 'bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-200',
};

const DESCRIPTIONS = {
  online: 'offline.indicator.descOnline',
  offline: 'offline.indicator.descOffline',
  syncing: 'offline.indicator.descSyncing',
  pending: 'offline.indicator.descPending',
  synced: 'offline.indicator.descSynced',
  error: 'offline.indicator.descError',
} as const;

// Indicador de conexión y sincronización (cabecera). Al abrirlo muestra la
// cola de cambios guardados en el dispositivo y permite reintentar o descartar
// los que el servidor rechazó.
export default function SyncIndicator() {
  const { t, intlLocale } = useI18n();
  const { status, queue, pending, lastSyncedAt } = useOfflineStatus();
  const [checking, setChecking] = useState(false);

  const waiting = queue.length;
  const label = status === 'pending' ? t('offline.status.pending', { count: pending }) : t(`offline.status.${status}`);
  const Icon = ICONS[status];

  async function refresh() {
    setChecking(true);
    try {
      if (await checkBackend()) await syncNow();
    } finally {
      setChecking(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t('offline.indicator.label', { status: label })}
        title={t('offline.indicator.title')}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          TONES[status],
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', status === 'syncing' && 'animate-spin')} aria-hidden="true" />
        {/* En línea solo el icono; cualquier otro estado se lee sin abrir nada. */}
        {status !== 'online' && <span className="hidden whitespace-nowrap sm:inline">{label}</span>}
        {status === 'offline' && waiting > 0 && (
          <span className="rounded-full bg-amber-900/15 px-1.5 text-xs tabular-nums dark:bg-amber-200/20">{waiting}</span>
        )}
      </PopoverTrigger>
      {/* Anuncia los cambios de estado a lectores de pantalla. */}
      <span className="sr-only" role="status" aria-live="polite">{label}</span>

      <PopoverContent align="end" className="w-80 gap-3 p-4">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </PopoverTitle>
          <PopoverDescription>{t(DESCRIPTIONS[status])}</PopoverDescription>
        </PopoverHeader>

        {waiting > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('offline.indicator.queueTitle')}</p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {queue.map((op) => <QueueItem key={op.id} op={op} />)}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {lastSyncedAt ? t('offline.indicator.lastSync', { time: new Date(lastSyncedAt).toLocaleTimeString(intlLocale) }) : ''}
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={checking || status === 'syncing'}>
            <RefreshCw className={cn(checking && 'animate-spin')} aria-hidden="true" />
            {checking ? t('offline.indicator.checking') : t('offline.indicator.syncNow')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function QueueItem({ op }: { op: OutboxOp }) {
  const { t, intlLocale } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const needsAttention = op.status === 'needs_attention';
  const title = t(op.type === 'attendance.checkIn' ? 'offline.op.checkIn' : 'offline.op.memberCreate', { name: op.label });

  async function retry() {
    const scope = getOfflineScope();
    if (!scope) return;
    await retryOp(scope, op.id);
    void syncNow();
  }

  async function discard() {
    const scope = getOfflineScope();
    if (scope) await discardOp(scope, op.id);
  }

  return (
    <li className={cn('rounded-lg border p-2.5 text-sm', needsAttention ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-medium text-foreground">{title}</span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', needsAttention ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200' : 'bg-muted text-muted-foreground')}>
          {t(`offline.opStatus.${op.status}`)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {new Date(op.createdAt).toLocaleString(intlLocale, { dateStyle: 'short', timeStyle: 'short' })}
        {op.attempts > 0 && ` · ${t('offline.indicator.attempts', { count: op.attempts })}`}
      </p>

      {needsAttention && (
        <>
          <p className="mt-1.5 text-xs text-red-800 dark:text-red-200">{describeOutboxError(op.error)}</p>
          {confirming ? (
            <div className="mt-2" role="alertdialog" aria-label={t('offline.indicator.discardTitle')}>
              <p className="text-xs text-foreground">{t('offline.indicator.discardDesc', { label: title })}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="destructive" size="xs" onClick={discard}>{t('offline.indicator.discard')}</Button>
                <Button variant="outline" size="xs" onClick={() => setConfirming(false)} autoFocus>{t('offline.indicator.keep')}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="xs" onClick={retry}>{t('offline.indicator.retry')}</Button>
              <Button variant="ghost" size="xs" onClick={() => setConfirming(true)}>{t('offline.indicator.discard')}</Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
