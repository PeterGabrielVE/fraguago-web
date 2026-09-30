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
import { useI18n } from '@/components/I18nProvider';

const LIST = '/retention/messages?pageSize=100';

function memberName(log: MessageLog) {
  const p = log.member?.user?.profile;
  return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
}

// RET-B01 — historial de envíos (automáticos y de prueba).
export default function Page() {
  const { t, intlLocale } = useI18n();
  return (
    <ResourceManager
      title={t('retention.logs.title')} subtitle={t('retention.logs.subtitle')}
      icon={Inbox}
      endpoint="/retention/messages"
      disableCreate
      disableEdit
      disableDelete
      filters={[
        { label: t('retention.logs.all'), endpoint: LIST },
        { label: t('retention.logs.sent'), endpoint: `${LIST}&status=SENT` },
        { label: t('retention.logs.failed'), endpoint: `${LIST}&status=FAILED` },
        { label: t('retention.logs.skipped'), endpoint: `${LIST}&status=SKIPPED` },
      ]}
      columns={[
        { key: 'createdAt', label: t('retention.logs.date'), render: (r: MessageLog) => new Date(r.createdAt).toLocaleString(intlLocale) },
        { key: 'member', label: t('retention.logs.member'), render: (r: MessageLog) => memberName(r) || <span className="text-slate-400">{t('retention.logs.test')}</span> },
        { key: 'automatedMessage', label: t('retention.logs.message'), render: (r: MessageLog) => r.automatedMessage?.name ?? r.subject ?? '—' },
        { key: 'channel', label: t('retention.logs.channel'), render: (r: MessageLog) => `${CHANNEL_LABELS[r.channel]} · ${r.recipient}` },
        {
          key: 'status', label: t('retention.logs.status'),
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
          {row.subject && <p><span className="font-semibold">{t('retention.logs.subject')}</span> {row.subject}</p>}
          <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4">{row.body}</div>
          {row.error && <p className="text-red-600">{row.error}</p>}
        </div>
      )}
    />
  );
}
