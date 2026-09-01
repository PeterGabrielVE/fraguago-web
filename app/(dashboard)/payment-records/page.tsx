'use client';
import ResourceManager from '@/components/ResourceManager';

export default function Page() {
  return (
    <ResourceManager
      title="Registro de Pagos"
      endpoint="/payment-records"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => r.member?.user?.profile?.firstName || 'Anónimo' },
        { key: 'amount', label: 'Monto' },
        { key: 'method', label: 'Método' },
        { key: 'date', label: 'Fecha', render: (r) => new Date(r.date).toLocaleDateString('es-MX') },
      ]}
      fields={[
        { name: 'memberId', label: 'ID del socio (opcional)' },
        { name: 'amount', label: 'Monto', type: 'number', required: true },
        { name: 'method', label: 'Método de pago', type: 'select', options: ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER'], required: true },
        { name: 'date', label: 'Fecha', type: 'date' },
        { name: 'planName', label: 'Plan pagado' },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
    />
  );
}
