'use client';
import { Inbox } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import {
  CHANNEL_LABELS,
  MESSAGE_STATUS_BADGES,
  MESSAGE_STATUS_LABELS,
  type MessageLog,
} from '@/lib/retention';

const LIST = '/retention/messages?pageSize=100';

function memberName(log: MessageLog) {
  const p = log.member?.user?.profile;
  return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
}

// RET-B01 — historial de envíos (automáticos y de prueba).
export default function Page() {
  return (
    <ResourceManager
      title="Envíos" subtitle="Historial de mensajes enviados por el sistema."
      icon={Inbox}
      endpoint="/retention/messages"
      disableCreate
      disableEdit
      disableDelete
      filters={[
        { label: 'Todos', endpoint: LIST },
        { label: 'Enviados', endpoint: `${LIST}&status=SENT` },
        { label: 'Fallidos', endpoint: `${LIST}&status=FAILED` },
        { label: 'Omitidos', endpoint: `${LIST}&status=SKIPPED` },
      ]}
      columns={[
        { key: 'createdAt', label: 'Fecha', render: (r: MessageLog) => new Date(r.createdAt).toLocaleString('es-MX') },
        { key: 'member', label: 'Socio', render: (r: MessageLog) => memberName(r) || <span className="text-slate-400">Prueba</span> },
        { key: 'automatedMessage', label: 'Mensaje', render: (r: MessageLog) => r.automatedMessage?.name ?? r.subject ?? '—' },
        { key: 'channel', label: 'Canal', render: (r: MessageLog) => `${CHANNEL_LABELS[r.channel]} · ${r.recipient}` },
        {
          key: 'status', label: 'Estado',
          render: (r: MessageLog) => (
            <span title={r.error ?? undefined}>
              <Badge variant="outline" className={MESSAGE_STATUS_BADGES[r.status]}>{MESSAGE_STATUS_LABELS[r.status]}</Badge>
              {r.error && <span className="mt-1 block max-w-xs truncate text-xs text-slate-500">{r.error}</span>}
            </span>
          ),
        },
      ]}
      fields={[]}
      renderDetails={(row) => (
        <div className="space-y-3 p-6 text-sm">
          {row.subject && <p><span className="font-semibold">Asunto:</span> {row.subject}</p>}
          <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4">{row.body}</div>
          {row.error && <p className="text-red-600">{row.error}</p>}
        </div>
      )}
    />
  );
}
