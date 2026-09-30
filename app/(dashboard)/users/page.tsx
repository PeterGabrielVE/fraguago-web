'use client';
import { useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useI18n } from '@/components/I18nProvider';

const ROLE_KEYS = {
  OWNER: 'labels.role.OWNER',
  ADMIN: 'labels.role.ADMIN',
  TRAINER: 'labels.role.TRAINER',
  STAFF: 'labels.role.STAFF',
  MEMBER: 'labels.role.MEMBER',
} as const;
const ROLE_LABELS: Record<string, string> = localizedRecord(ROLE_KEYS);
const ROLE_OPTIONS = localizedOptions(ROLE_KEYS);

const PREFERRED_TIME_OPTIONS = localizedOptions({
  MAÑANA: 'labels.preferredTime.MAÑANA',
  TARDE: 'labels.preferredTime.TARDE',
  NOCHE: 'labels.preferredTime.NOCHE',
  OTROS: 'labels.preferredTime.OTROS',
});

export default function Page() {
  const { t, intlLocale } = useI18n();
  // Guarda el rol elegido en el <select> no controlado del diálogo de "Asignar rol", por fila.
  const roleDraft = useRef<Record<string, string>>({});

  return (
    <ResourceManager
      title={t('admin.users.title')}
      icon={ShieldCheck}
      endpoint="/users"
      formVariant="modal"
      columns={[
        { key: 'profile', label: t('admin.users.name'), render: (r) => `${r.profile?.firstName ?? ''} ${r.profile?.lastName ?? ''}`.trim() || '—' },
        { key: 'email', label: t('admin.users.email'), render: (r) => r.email || '—' },
        {
          key: 'role',
          label: t('admin.users.role'),
          render: (r) => (
            <Badge variant={r.role === 'OWNER' || r.role === 'ADMIN' ? 'default' : 'secondary'}>
              {ROLE_LABELS[r.role] ?? r.role}
            </Badge>
          ),
        },
        { key: 'phone', label: t('admin.users.phone'), render: (r) => r.profile?.phone || '—' },
        { key: 'createdAt', label: t('admin.users.created'), render: (r) => new Date(r.createdAt).toLocaleDateString(intlLocale) },
      ]}
      getEditValues={(row) => ({
        firstName: row.profile?.firstName ?? '',
        lastName: row.profile?.lastName ?? '',
        phone: row.profile?.phone ?? '',
        address: row.profile?.address ?? '',
        preferredTime: row.profile?.preferredTime ?? '',
      })}
      fields={[
        { name: 'firstName', label: t('admin.users.firstName'), required: true, requiredOnEdit: true },
        { name: 'lastName', label: t('admin.users.lastName') },
        { name: 'email', label: t('admin.users.emailField'), type: 'email', required: true, createOnly: true },
        { name: 'password', label: t('admin.users.password'), required: true, createOnly: true },
        { name: 'role', label: t('admin.users.role'), type: 'select', options: ROLE_OPTIONS, required: true, createOnly: true },
        { name: 'phone', label: t('admin.users.phone'), type: 'phone' },
        { name: 'address', label: t('admin.users.address'), editOnly: true },
        { name: 'preferredTime', label: t('admin.users.preferredTime'), type: 'select', options: PREFERRED_TIME_OPTIONS, editOnly: true },
      ]}
      extraActions={(row) => [
        {
          label: t('admin.users.assignRole'),
          icon: ShieldCheck,
          confirm: true,
          confirmTitle: t('admin.users.assignRole'),
          confirmDescription: (
            <div className="space-y-2 text-sm">
              <p>
                {t('admin.users.newRoleFor', {
                  name: `${row.profile?.firstName ?? ''} ${row.profile?.lastName ?? ''}`.trim() || row.email,
                })}
              </p>
              <select
                defaultValue={row.role}
                onChange={(e) => { roleDraft.current[row.id] = e.target.value; }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ),
          onClick: async () => {
            const role = roleDraft.current[row.id] ?? row.role;
            await api.patch(`/users/${row.id}/role`, { role });
          },
        },
      ]}
    />
  );
}
