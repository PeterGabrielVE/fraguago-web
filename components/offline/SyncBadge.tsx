'use client';

import { CloudUpload, TriangleAlert } from 'lucide-react';
import { useT } from '@/components/I18nProvider';
import type { OutboxStatus } from '@/lib/offline/db';

// Marca en una fila que el registro se creó sin conexión y todavía no está en
// el servidor (`_sync` lo ponen los overlays de lib/offline). Sin `state` (fila
// que vino del servidor) no pinta nada.
export default function SyncBadge({ state }: { state?: OutboxStatus }) {
  const t = useT();
  if (!state || state === 'synced') return null;

  const attention = state === 'needs_attention';
  const Icon = attention ? TriangleAlert : CloudUpload;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        attention ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-800'
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(attention ? 'offline.data.attentionBadge' : 'offline.data.pendingBadge')}
    </span>
  );
}
