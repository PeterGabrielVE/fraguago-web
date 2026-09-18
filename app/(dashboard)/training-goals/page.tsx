'use client';
import { Target } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';

export default function Page() {
  return (
    <ResourceManager
      title="Objetivos de Entrenamiento"
      icon={Target}
      endpoint="/training-goals"
      columns={[
        { key: 'member', label: 'Socio', render: (r) => r.member?.user?.profile?.firstName || '—' },
        { key: 'goal', label: 'Objetivo' },
        { key: 'description', label: 'Descripción' },
      ]}
      fields={[
        { name: 'memberId', label: 'ID del socio', required: true },
        { name: 'goal', label: 'Objetivo principal', type: 'select', options: ['MUSCLE_GAIN', 'WEIGHT_LOSS', 'HEALTH_WELLNESS', 'PERFORMANCE_REHAB', 'OTHER'], required: true },
        { name: 'description', label: 'Descripción detallada', type: 'textarea' },
      ]}
    />
  );
}
