'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return (
    <ResourceManager
      title="Planes de membresía" subtitle="Mensual, anual, familiar…"
      endpoint="/membership-plans"
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'price', label: 'Precio' },
        { key: 'durationDays', label: 'Días' },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'price', label: 'Precio', type: 'number', required: true },
        { name: 'durationDays', label: 'Duración (días)', type: 'number', required: true },
      ]}
    />
  );
}
