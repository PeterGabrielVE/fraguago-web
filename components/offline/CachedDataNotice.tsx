'use client';

import { useSyncExternalStore } from 'react';
import { DatabaseBackup } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { getResourceInfo, subscribeResourceInfo } from '@/lib/offline/resources';

// Si lo último que se leyó de `path` salió de la copia local.
export function useIsCached(path: string): boolean {
  const info = useSyncExternalStore(subscribeResourceInfo, () => getResourceInfo(path), () => undefined);
  return info?.source === 'cache';
}

// Aviso de que la lista en pantalla no viene del servidor sino de la copia
// guardada en el dispositivo, con la fecha de esa copia.
export default function CachedDataNotice({ path }: { path: string }) {
  const { t, intlLocale } = useI18n();
  const info = useSyncExternalStore(subscribeResourceInfo, () => getResourceInfo(path), () => undefined);
  if (info?.source !== 'cache') return null;

  const time = new Date(info.savedAt).toLocaleString(intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <DatabaseBackup className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t('offline.data.cachedNotice', { time })}
    </div>
  );
}
