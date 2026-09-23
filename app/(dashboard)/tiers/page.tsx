'use client';
import { Crown } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { formatPoints, tierColor, type TierInfo } from '@/lib/gamification';

// Niveles del programa de puntos. Mientras el gym no defina ninguno, el
// backend usa Bronce (0) / Plata (500) / Oro (1500) / Platino (3000).
export default function Page() {
  return (
    <ResourceManager
      title="Niveles"
      subtitle="Tiers por puntos acumulados. Sin niveles propios se usan Bronce (0), Plata (500), Oro (1500) y Platino (3000)."
      icon={Crown}
      endpoint="/gamification/tiers"
      filters={[{ label: 'Niveles del gym', endpoint: '/gamification/tiers?custom=true' }]}
      formVariant="modal"
      columns={[
        {
          key: 'name', label: 'Nivel',
          render: (row: TierInfo) => (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tierColor(row) }} aria-hidden />
              {row.name}
            </span>
          ),
        },
        { key: 'minPoints', label: 'Desde', render: (row: TierInfo) => `${formatPoints(row.minPoints)} pts` },
        { key: 'benefits', label: 'Beneficios', render: (row: TierInfo) => row.benefits || '—' },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'minPoints', label: 'Puntos acumulados mínimos', type: 'number', required: true },
        { name: 'color', label: 'Color (hex, ej. #D4AF37)' },
        { name: 'benefits', label: 'Beneficios', type: 'textarea', fullWidth: true },
      ]}
      validate={(form) => (
        form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color) ? 'El color debe tener el formato #RRGGBB.' : null
      )}
    />
  );
}
