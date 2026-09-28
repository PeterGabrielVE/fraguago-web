'use client';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveMode } from '@/hooks/useLiveResource';

// Estado de una vista en tiempo real: en vivo (SSE), conectando o polling.
export default function LiveIndicator({
  mode,
  lastUpdated,
  onRefresh,
  refreshLabel = 'Actualizar',
}: {
  mode: LiveMode;
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshLabel?: string;
}) {
  const label = mode === 'live' ? 'En vivo' : mode === 'connecting' ? 'Conectando…' : 'Actualiza cada 15 s';
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
        <span className="relative flex h-2.5 w-2.5">
          {mode === 'live' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
          <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', mode === 'live' ? 'bg-emerald-500' : 'bg-amber-400')} />
        </span>
        {label}
      </span>
      {lastUpdated && <span className="hidden sm:inline">· {lastUpdated.toLocaleTimeString('es-MX')}</span>}
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={refreshLabel}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
