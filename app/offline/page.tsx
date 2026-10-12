'use client';

import { WifiOff } from 'lucide-react';
import { useT } from '@/components/I18nProvider';

// Respaldo del service worker: se muestra al abrir sin conexión una pantalla
// que nunca se había cargado en este dispositivo.
export default function OfflinePage() {
  const t = useT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t('offline.page.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('offline.page.desc')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
          >
            {t('offline.page.retry')}
          </button>
          <a href="/attendance" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
            {t('offline.page.goAttendance')}
          </a>
        </div>
      </div>
    </main>
  );
}
