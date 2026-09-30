'use client';
import { ArrowLeftRight } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_LABELS } from '@/lib/currency';
import { useI18n } from '@/components/I18nProvider';

export default function Page() {
  const { t, intlLocale } = useI18n();
  const nonBaseCurrencyOptions = [
    { value: 'VES', label: CURRENCY_LABELS.VES },
    { value: 'EUR', label: CURRENCY_LABELS.EUR },
  ];
  return (
    <ResourceManager
      title={t('catalog.exchangeRates.title')}
      subtitle={t('catalog.exchangeRates.subtitle')}
      icon={ArrowLeftRight}
      endpoint="/exchange-rates"
      disableEdit
      columns={[
        { key: 'currency', label: t('catalog.field.currency'), render: (row) => CURRENCY_LABELS[row.currency] ?? row.currency },
        { key: 'rate', label: t('catalog.exchangeRates.rate'), render: (row) => t('catalog.exchangeRates.perUsd', { rate: row.rate, currency: row.currency }) },
        { key: 'source', label: t('catalog.exchangeRates.source'), render: (row) => row.source || '—' },
        { key: 'effectiveAt', label: t('catalog.exchangeRates.effectiveAt'), render: (row) => new Date(row.effectiveAt).toLocaleString(intlLocale) },
      ]}
      fields={[
        { name: 'currency', label: t('catalog.field.currency'), type: 'select', required: true, options: nonBaseCurrencyOptions },
        { name: 'rate', label: t('catalog.exchangeRates.rateField'), type: 'number', required: true },
        { name: 'source', label: t('catalog.exchangeRates.sourceField') },
      ]}
    />
  );
}
