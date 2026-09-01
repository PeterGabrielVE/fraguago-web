'use client';
import ResourceManager from '@/components/ResourceManager';

export default function Page() {
  return (
    <ResourceManager
      title="Contactos de Emergencia"
      endpoint="/emergency-contacts"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => r.member?.user?.profile?.firstName || '—' },
        { key: 'name', label: 'Contacto' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'relationship', label: 'Relación' },
      ]}
      fields={[
        { name: 'memberId', label: 'ID del socio', required: true },
        { name: 'name', label: 'Nombre del contacto', required: true },
        { name: 'phone', label: 'Teléfono', required: true },
        { name: 'relationship', label: 'Parentesco (padre, hijo, hermano, etc.)', required: true },
      ]}
    />
  );
}
