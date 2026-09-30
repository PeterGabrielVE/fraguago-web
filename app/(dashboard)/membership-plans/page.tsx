'use client';
import { Layers } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

const PLAN_TYPE_KEYS = {
  DAILY: 'labels.planType.DAILY',
  MONTHLY: 'labels.planType.MONTHLY',
  QUARTERLY: 'labels.planType.QUARTERLY',
  ANNUAL: 'labels.planType.ANNUAL',
} as const;

const PLAN_TYPE_LABELS: Record<string, string> = localizedRecord(PLAN_TYPE_KEYS);
const PLAN_TYPE_OPTIONS = localizedOptions(PLAN_TYPE_KEYS);

export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.plans.title')} subtitle={t('catalog.plans.subtitle')}
      icon={Layers}
      endpoint="/membership-plans"
      formVariant="modal"
      columns={[
        { key: 'name', label: t('catalog.field.name') },
        { key: 'type', label: t('catalog.field.type'), render: (row) => PLAN_TYPE_LABELS[row.type] ?? row.type },
        { key: 'price', label: t('catalog.field.price'), render: (row) => formatMoney(row.price, row.currency) },
        { key: 'durationDays', label: t('catalog.plans.days') },
      ]}
      fields={[
        { name: 'name', label: t('catalog.field.name'), required: true },
        { name: 'type', label: t('catalog.field.type'), type: 'select', required: true, options: PLAN_TYPE_OPTIONS },
        { name: 'price', label: t('catalog.field.price'), type: 'number', required: true },
        { name: 'currency', label: t('catalog.field.currency'), type: 'select', options: CURRENCY_OPTIONS },
        { name: 'durationDays', label: t('catalog.plans.duration'), type: 'number', required: true },
      ]}
    />
  );
}
