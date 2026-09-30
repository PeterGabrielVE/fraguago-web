'use client';
import { UserCog } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { useT } from '@/components/I18nProvider';

export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.trainers.title')}
      icon={UserCog}
      endpoint="/trainers"
      formVariant="modal"
      columns={[
        { key: 'user', label: t('catalog.field.name'), render: (r) => `${r.user?.profile?.firstName ?? ''} ${r.user?.profile?.lastName ?? ''}`.trim() || '—' },
        { key: 'identificationNumber', label: t('catalog.field.idNumber'), render: (r) => r.identificationNumber || '—' },
        { key: 'email', label: t('catalog.field.email'), render: (r) => r.user?.email || '—' },
        { key: 'specialty', label: t('catalog.trainers.specialty'), render: (r) => r.specialty || '—' },
      ]}
      // La contraseña es solo de alta: no se puede cambiar desde este formulario.
      getEditValues={(row) => ({
        firstName: row.user?.profile?.firstName ?? '',
        lastName: row.user?.profile?.lastName ?? '',
        email: row.user?.email ?? '',
        identificationNumber: row.identificationNumber ?? '',
        specialty: row.specialty ?? '',
      })}
      fields={[
        { name: 'firstName', label: t('catalog.field.firstName'), required: true, requiredOnEdit: true },
        { name: 'lastName', label: t('catalog.field.lastName'), requiredOnEdit: false },
        { name: 'identificationNumber', label: t('catalog.field.idNumber'), required: true, requiredOnEdit: true },
        { name: 'email', label: t('catalog.field.email'), type: 'email', required: true, requiredOnEdit: true },
        { name: 'password', label: t('catalog.trainers.passwordField'), required: true, readOnly: true, mirrorFrom: 'identificationNumber', createOnly: true },
        { name: 'specialty', label: t('catalog.trainers.specialty') },
      ]}
    />
  );
}
