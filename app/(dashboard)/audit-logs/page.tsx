'use client';
import { ScrollText, X } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { useI18n } from '@/components/I18nProvider';
import type { Translate } from '@/lib/i18n/translate';

type AuditLogUser = {
  id: string;
  email: string;
  profile: { firstName: string; lastName: string } | null;
};

type AuditLog = {
  id: string;
  gymId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
  user: AuditLogUser | null;
};

function userLabel(user: AuditLogUser | null, t: Translate): string {
  if (!user) return t('admin.audit.system');
  return `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.email;
}

export default function Page() {
  const { t, intlLocale } = useI18n();
  return (
    <ResourceManager
      title={t('admin.audit.title')}
      icon={ScrollText}
      endpoint="/audit-logs"
      disableCreate
      disableEdit
      disableDelete
      fields={[]}
      columns={[
        { key: 'createdAt', label: t('admin.audit.date'), render: (r: AuditLog) => new Date(r.createdAt).toLocaleString(intlLocale) },
        { key: 'user', label: t('admin.audit.user'), render: (r: AuditLog) => userLabel(r.user, t) },
        { key: 'action', label: t('admin.audit.action') },
        { key: 'entity', label: t('admin.audit.entity') },
        { key: 'entityId', label: t('admin.audit.entityId'), render: (r: AuditLog) => r.entityId || '—' },
      ]}
      renderDetails={(rawRow, onClose) => {
        const row = rawRow as AuditLog;
        return (
          <div className="min-h-full" aria-labelledby="audit-log-details-title">
            <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">{t('admin.audit.eyebrow')}</p>
                  <h2 id="audit-log-details-title" className="mt-1 text-2xl font-bold text-slate-900">
                    {row.action}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('admin.audit.backLabel')}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                  {t('admin.audit.back')}
                </button>
              </header>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <DetailItem label={t('admin.audit.dateTime')} value={new Date(row.createdAt).toLocaleString(intlLocale)} />
                <DetailItem label={t('admin.audit.user')} value={userLabel(row.user, t)} />
                <DetailItem label={t('admin.audit.action')} value={row.action} />
                <DetailItem label={t('admin.audit.entity')} value={row.entity} />
                <DetailItem label={t('admin.audit.entityId')} value={row.entityId || '—'} />
              </div>

              <div className="border-t border-slate-200 p-6">
                <p className="mb-2 text-sm font-medium text-slate-700">{t('admin.audit.meta')}</p>
                <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs font-mono text-slate-700">
                  {row.meta ? JSON.stringify(row.meta, null, 2) : t('admin.audit.noMeta')}
                </pre>
              </div>
            </section>
          </div>
        );
      }}
    />
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{value}</p>
    </div>
  );
}
