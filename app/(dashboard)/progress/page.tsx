'use client';
import ResourceManager from '@/components/ResourceManager';
export default function Page() {
  return <ResourceManager title="Progreso" subtitle="Medidas y peso." endpoint="/progress" columns={[{ key: 'memberId', label: 'Socio' }, { key: 'weightKg', label: 'Peso (kg)' }, { key: 'date', label: 'Fecha', render: (r) => new Date(r.date).toLocaleDateString('es-MX') }]} fields={[{ name: 'memberId', label: 'Socio', required: true }, { name: 'weightKg', label: 'Peso (kg)', type: 'number' }, { name: 'heightCm', label: 'Estatura (cm)', type: 'number' }, { name: 'bodyFat', label: '% grasa', type: 'number' }, { name: 'waistCm', label: 'Cintura (cm)', type: 'number' }, { name: 'notes', label: 'Notas' }]} />;
}
