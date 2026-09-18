'use client';
import { UserCog } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';

export default function Page() {
  return (
    <ResourceManager
      title="Entrenadores"
      icon={UserCog}
      endpoint="/trainers"
      formVariant="modal"
      columns={[
        { key: 'user', label: 'Nombre', render: (r) => `${r.user?.profile?.firstName ?? ''} ${r.user?.profile?.lastName ?? ''}`.trim() || '—' },
        { key: 'identificationNumber', label: 'Cédula', render: (r) => r.identificationNumber || '—' },
        { key: 'email', label: 'Correo', render: (r) => r.user?.email || '—' },
        { key: 'specialty', label: 'Especialidad', render: (r) => r.specialty || '—' },
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
        { name: 'firstName', label: 'Nombre', required: true, requiredOnEdit: true },
        { name: 'lastName', label: 'Apellido', requiredOnEdit: false },
        { name: 'identificationNumber', label: 'Cédula', required: true, requiredOnEdit: true },
        { name: 'email', label: 'Correo', type: 'email', required: true, requiredOnEdit: true },
        { name: 'password', label: 'Contraseña (= cédula)', required: true, readOnly: true, mirrorFrom: 'identificationNumber', createOnly: true },
        { name: 'specialty', label: 'Especialidad' },
      ]}
    />
  );
}
