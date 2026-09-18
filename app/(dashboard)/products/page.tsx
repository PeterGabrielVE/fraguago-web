'use client';
import { Package } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';

export default function Page() {
  return (
    <ResourceManager
      title="Productos"
      subtitle="Inventario."
      icon={Package}
      endpoint="/products"
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'price', label: 'Precio', render: (row) => formatMoney(row.price, row.currency) },
        { key: 'stock', label: 'Stock' },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'price', label: 'Precio', type: 'number', required: true },
        { name: 'currency', label: 'Moneda', type: 'select', options: CURRENCY_OPTIONS },
        { name: 'stock', label: 'Stock', type: 'number', required: true },
        { name: 'sku', label: 'SKU' },
      ]}
    />
  );
}
