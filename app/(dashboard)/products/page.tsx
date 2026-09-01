'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Productos" subtitle="Inventario." endpoint="/products" columns={[{ key: 'name', label: 'Nombre' }, { key: 'price', label: 'Precio' }, { key: 'stock', label: 'Stock' }]} fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'price', label: 'Precio', type: 'number', required: true }, { name: 'stock', label: 'Stock', type: 'number', required: true }, { name: 'sku', label: 'SKU' }]} />;
}
