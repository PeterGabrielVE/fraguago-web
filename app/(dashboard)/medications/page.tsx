'use client';
import ResourceManager from '@/components/ResourceManager';

export default function Page() {
  return (
    <ResourceManager
      title="Medicamentos" subtitle="Medicamentos de uso continuo de los socios."
      endpoint="/medications"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => r.member?.user?.profile?.firstName || '—' },
        { key: 'name', label: 'Medicamento' },
        { key: 'dosage', label: 'Dosis' },
        { key: 'frequency', label: 'Frecuencia' },
      ]}
      fields={[
        { name: 'memberId', label: 'ID del socio', required: true },
        { name: 'name', label: 'Nombre del medicamento', required: true },
        { name: 'dosage', label: 'Dosis (ej: 100mg)' },
        { name: 'frequency', label: 'Frecuencia (ej: 2 veces diarias)' },
        { name: 'reason', label: 'Razón/Condición', type: 'textarea' },
      ]}
    />
  );
}
