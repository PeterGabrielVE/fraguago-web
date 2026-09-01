'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Rutinas" endpoint="/routines" columns={[{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripción' }]} fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'description', label: 'Descripción' }, { name: 'memberId', label: 'Socio' }, { name: 'trainerId', label: 'Entrenador' }]} />;
}
