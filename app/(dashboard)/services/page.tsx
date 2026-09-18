'use client';
import { Wrench } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';

export default function Page() {
  return (
    <ResourceManager
      title="Servicios"
      icon={Wrench}
      endpoint="/services"
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'price', label: 'Precio', render: (row) => formatMoney(row.price, row.currency) },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'price', label: 'Precio', type: 'number', required: true },
        { name: 'currency', label: 'Moneda', type: 'select', options: CURRENCY_OPTIONS },
        { name: 'description', label: 'Descripción' },
      ]}
    />
  );
}
