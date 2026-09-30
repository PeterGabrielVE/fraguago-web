'use client';
import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_LABELS } from '@/lib/currency';
import { isBcvRate, type ExchangeRate } from '@/lib/exchangeRates';
import BcvRateCard from '@/components/BcvRateCard';
import { useI18n } from '@/components/I18nProvider';

export default function Page() {
  const { t, intlLocale } = useI18n();
  const [reloadKey, setReloadKey] = useState(0);
  const nonBaseCurrencyOptions = [
    { value: 'VES', label: CURRENCY_LABELS.VES },
    { value: 'EUR', label: CURRENCY_LABELS.EUR },
  ];
  return (
    <ResourceManager
      key={reloadKey}
      title={t('catalog.exchangeRates.title')}
      subtitle={t('catalog.exchangeRates.subtitle')}
      icon={ArrowLeftRight}
      endpoint="/exchange-rates"
      disableEdit
      intro={<BcvRateCard onSynced={() => setReloadKey((k) => k + 1)} />}
      columns={[
        { key: 'currency', label: t('catalog.field.currency'), render: (row) => CURRENCY_LABELS[row.currency] ?? row.currency },
        { key: 'rate', label: t('catalog.exchangeRates.rate'), render: (row) => `${Number(row.rate)} ${row.currency}` },
        {
          key: 'source', label: t('catalog.exchangeRates.source'),
          render: (row: ExchangeRate) => (
            isBcvRate(row)
              ? <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-700">{t('catalog.exchangeRates.sourceBcv')}</Badge>
              : <span>{row.source || t('catalog.exchangeRates.sourceManual')}</span>
          ),
        },
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
