'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Servicios" endpoint="/services" columns={[{ key: 'name', label: 'Nombre' }, { key: 'price', label: 'Precio' }]} fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'price', label: 'Precio', type: 'number', required: true }, { name: 'description', label: 'Descripción' }]} />;
}
