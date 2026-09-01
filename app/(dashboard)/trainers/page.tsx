'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Entrenadores" endpoint="/trainers" columns={[{ key: 'user', label: 'Nombre', render: (r) => r.user?.profile?.firstName }, { key: 'specialty', label: 'Especialidad' }]} fields={[{ name: 'fullName', label: 'Nombre completo', required: true }, { name: 'specialty', label: 'Especialidad' }, { name: 'phone', label: 'Teléfono' }, { name: 'email', label: 'Correo', type: 'email' }]} />;
}
