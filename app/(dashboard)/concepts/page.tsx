'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Conceptos" subtitle="Categorías de ingresos y egresos." endpoint="/concepts" columns={[{ key: 'name', label: 'Nombre' }, { key: 'kind', label: 'Tipo' }]} fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'kind', label: 'Tipo', type: 'select', options: ['INCOME', 'EXPENSE'], required: true }]} />;
}
