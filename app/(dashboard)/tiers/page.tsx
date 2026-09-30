'use client';
import { Crown } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { formatPoints, tierColor, type TierInfo } from '@/lib/gamification';
import { useT } from '@/components/I18nProvider';

// Niveles del programa de puntos. Mientras el gym no defina ninguno, el
// backend usa Bronce (0) / Plata (500) / Oro (1500) / Platino (3000).
export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.tiers.title')}
      subtitle={t('catalog.tiers.subtitle')}
      icon={Crown}
      endpoint="/gamification/tiers"
      filters={[{ label: t('catalog.tiers.gymTiers'), endpoint: '/gamification/tiers?custom=true' }]}
      formVariant="modal"
      columns={[
        {
          key: 'name', label: t('catalog.tiers.tier'),
          render: (row: TierInfo) => (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tierColor(row) }} aria-hidden />
              {row.name}
            </span>
          ),
        },
        { key: 'minPoints', label: t('catalog.tiers.from'), render: (row: TierInfo) => t('catalog.tiers.points', { points: formatPoints(row.minPoints) }) },
        { key: 'benefits', label: t('catalog.tiers.benefits'), render: (row: TierInfo) => row.benefits || '—' },
      ]}
      fields={[
        { name: 'name', label: t('catalog.field.name'), required: true },
        { name: 'minPoints', label: t('catalog.tiers.minPoints'), type: 'number', required: true },
        { name: 'color', label: t('catalog.tiers.color') },
        { name: 'benefits', label: t('catalog.tiers.benefits'), type: 'textarea', fullWidth: true },
      ]}
      validate={(form) => (
        form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color) ? t('catalog.tiers.colorInvalid') : null
      )}
    />
  );
}
