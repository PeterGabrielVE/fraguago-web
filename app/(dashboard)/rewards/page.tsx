'use client';
import { Gift, Power } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  REWARD_TYPE_OPTIONS,
  formatPoints,
  rewardValueLabel,
  type Reward,
} from '@/lib/gamification';
import { useI18n } from '@/components/I18nProvider';

// GAM-01 (staff) — catálogo de recompensas canjeables con puntos.
export default function Page() {
  const { t, intlLocale } = useI18n();
  return (
    <ResourceManager
      title={t('gamification.rewards.title')} subtitle={t('gamification.rewards.subtitle')}
      icon={Gift}
      endpoint="/gamification/rewards"
      formVariant="modal"
      columns={[
        { key: 'name', label: t('gamification.rewards.name') },
        { key: 'type', label: t('gamification.rewards.benefit'), render: (row: Reward) => rewardValueLabel(row) },
        { key: 'pointsCost', label: t('gamification.rewards.cost'), render: (row: Reward) => t('gamification.pts', { points: formatPoints(row.pointsCost) }) },
        { key: 'stock', label: t('gamification.rewards.stock'), render: (row: Reward) => (row.stock === null ? t('gamification.rewards.unlimited') : row.stock) },
        {
          key: 'validUntil', label: t('gamification.rewards.validity'),
          render: (row: Reward) => (row.validUntil ? new Date(row.validUntil).toLocaleDateString(intlLocale) : t('gamification.rewards.noExpiry')),
        },
        {
          key: 'active', label: t('gamification.rewards.status'),
          render: (row: Reward) => (
            <Badge variant="outline" className={row.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
              {row.active ? t('gamification.rewards.active') : t('gamification.rewards.inactive')}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: t('gamification.rewards.name'), required: true },
        { name: 'type', label: t('gamification.rewards.type'), type: 'select', required: true, options: REWARD_TYPE_OPTIONS },
        { name: 'value', label: t('gamification.rewards.value'), type: 'number' },
        { name: 'pointsCost', label: t('gamification.rewards.pointsCost'), type: 'number', required: true },
        { name: 'stock', label: t('gamification.rewards.stockField'), type: 'number' },
        { name: 'minLifetimePoints', label: t('gamification.rewards.minLifetime'), type: 'number' },
        { name: 'validUntil', label: t('gamification.rewards.validUntil'), type: 'date' },
        { name: 'description', label: t('gamification.rewards.description'), type: 'textarea', fullWidth: true },
      ]}
      getEditValues={(row) => ({
        name: row.name,
        type: row.type,
        value: row.value ?? '',
        pointsCost: row.pointsCost,
        stock: row.stock ?? '',
        minLifetimePoints: row.minLifetimePoints ?? '',
        validUntil: row.validUntil ? String(row.validUntil).slice(0, 10) : '',
        description: row.description ?? '',
      })}
      validate={(form) => {
        if (form.type === 'DISCOUNT_PERCENT') {
          const v = Number(form.value);
          if (!form.value || v < 1 || v > 100) return t('gamification.rewards.errPercent');
        }
        if (form.type === 'DISCOUNT_AMOUNT' && !(Number(form.value) > 0)) {
          return t('gamification.rewards.errAmount');
        }
        return null;
      }}
      extraActions={(row) => [
        {
          label: row.active ? t('gamification.rewards.deactivate') : t('gamification.rewards.activate'),
          icon: Power,
          confirm: true,
          confirmTitle: row.active ? t('gamification.rewards.deactivateTitle') : t('gamification.rewards.activateTitle'),
          confirmDescription: row.active
            ? t('gamification.rewards.deactivateDesc', { name: row.name })
            : t('gamification.rewards.activateDesc', { name: row.name }),
          onClick: () => api.patch(`/gamification/rewards/${row.id}`, { active: !row.active }),
        },
      ]}
    />
  );
}
