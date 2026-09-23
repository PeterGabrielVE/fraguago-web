'use client';
import { ScrollText, X } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';

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

function userLabel(user: AuditLogUser | null): string {
  if (!user) return 'Sistema';
  return `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || user.email;
}

export default function Page() {
  return (
    <ResourceManager
      title="Auditoría"
      icon={ScrollText}
      endpoint="/audit-logs"
      disableCreate
      disableEdit
      disableDelete
      fields={[]}
      columns={[
        { key: 'createdAt', label: 'Fecha', render: (r: AuditLog) => new Date(r.createdAt).toLocaleString('es-MX') },
        { key: 'user', label: 'Usuario', render: (r: AuditLog) => userLabel(r.user) },
        { key: 'action', label: 'Acción' },
        { key: 'entity', label: 'Entidad' },
        { key: 'entityId', label: 'ID afectado', render: (r: AuditLog) => r.entityId || '—' },
      ]}
      renderDetails={(rawRow, onClose) => {
        const row = rawRow as AuditLog;
        return (
          <div className="min-h-full" aria-labelledby="audit-log-details-title">
            <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Detalle de auditoría</p>
                  <h2 id="audit-log-details-title" className="mt-1 text-2xl font-bold text-slate-900">
                    {row.action}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Volver al listado de auditoría"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                  Volver
                </button>
              </header>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <DetailItem label="Fecha y hora" value={new Date(row.createdAt).toLocaleString('es-MX')} />
                <DetailItem label="Usuario" value={userLabel(row.user)} />
                <DetailItem label="Acción" value={row.action} />
                <DetailItem label="Entidad" value={row.entity} />
                <DetailItem label="ID afectado" value={row.entityId || '—'} />
              </div>

              <div className="border-t border-slate-200 p-6">
                <p className="mb-2 text-sm font-medium text-slate-700">Detalle (meta)</p>
                <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs font-mono text-slate-700">
                  {row.meta ? JSON.stringify(row.meta, null, 2) : 'Sin datos adicionales.'}
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
