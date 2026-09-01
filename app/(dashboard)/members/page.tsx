'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return (
    <ResourceManager
      title="Socios" subtitle="Los clientes de tu gimnasio."
      endpoint="/members"
      columns={[
        { key: 'user', label: 'Nombre', render: (r) => `${r.user?.profile?.firstName} ${r.user?.profile?.lastName}` },
        { key: 'phone', label: 'Teléfono', render: (r) => r.user?.profile?.phone || '—' },
        { key: 'email', label: 'Email', render: (r) => r.user?.email || '—' },
        { key: 'activityLevel', label: 'Nivel' },
      ]}
      fields={[
        { name: 'fullName', label: 'Nombre completo', required: true },
        { name: 'phone', label: 'Teléfono' },
        { name: 'email', label: 'Correo', type: 'email' },
        { name: 'idCard', label: 'CI / Cédula' },
        { name: 'address', label: 'Dirección' },
        { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
        { name: 'activityLevel', label: 'Nivel de actividad', type: 'select', options: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
        { name: 'preferredTime', label: 'Horario preferido (Mañana/Tarde/Noche)' },
      ]}
    />
  );
}
