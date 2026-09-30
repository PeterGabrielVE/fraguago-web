'use client';
import { Wrench } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';
import { useT } from '@/components/I18nProvider';

export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.services.title')}
      icon={Wrench}
      endpoint="/services"
      columns={[
        { key: 'name', label: t('catalog.field.name') },
        { key: 'price', label: t('catalog.field.price'), render: (row) => formatMoney(row.price, row.currency) },
      ]}
      fields={[
        { name: 'name', label: t('catalog.field.name'), required: true },
        { name: 'price', label: t('catalog.field.price'), type: 'number', required: true },
        { name: 'currency', label: t('catalog.field.currency'), type: 'select', options: CURRENCY_OPTIONS },
        { name: 'description', label: t('catalog.field.description') },
      ]}
    />
  );
}
