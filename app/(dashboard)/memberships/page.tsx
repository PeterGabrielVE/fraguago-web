'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return (
    <ResourceManager
      title="Membresías" subtitle="Asigna un plan a un socio; el vencimiento se calcula solo."
      endpoint="/memberships"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => r.member?.user?.profile?.firstName || r.memberId },
        { key: 'plan', label: 'Plan', render: (r) => r.plan?.name || r.planId },
        { key: 'endDate', label: 'Vence', render: (r) => new Date(r.endDate).toLocaleDateString('es-MX') },
        { key: 'status', label: 'Estado' },
      ]}
      fields={[
        { name: 'memberId', label: 'ID del socio', required: true },
        { name: 'planId', label: 'ID del plan', required: true },
        { name: 'startDate', label: 'Fecha de inicio', type: 'date' },
      ]}
    />
  );
}
