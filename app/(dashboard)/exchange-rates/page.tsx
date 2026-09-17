'use client';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_LABELS } from '@/lib/currency';

const NON_BASE_CURRENCY_OPTIONS = [
  { value: 'VES', label: CURRENCY_LABELS.VES },
  { value: 'EUR', label: CURRENCY_LABELS.EUR },
];

export default function Page() {
  return (
    <ResourceManager
      title="Tasas de cambio"
      subtitle="Cuánto equivale 1 dólar (moneda base del gym) en la otra moneda — la misma forma en que se dice 'la tasa de hoy'. Ej. VES: 900 significa 900 Bs. por USD. Los pagos usan la última tasa registrada de cada moneda."
      endpoint="/exchange-rates"
      disableEdit
      columns={[
        { key: 'currency', label: 'Moneda', render: (row) => CURRENCY_LABELS[row.currency] ?? row.currency },
        { key: 'rate', label: 'Tasa', render: (row) => `${row.rate} ${row.currency} por USD` },
        { key: 'source', label: 'Fuente', render: (row) => row.source || '—' },
        { key: 'effectiveAt', label: 'Vigente desde', render: (row) => new Date(row.effectiveAt).toLocaleString('es-VE') },
      ]}
      fields={[
        { name: 'currency', label: 'Moneda', type: 'select', required: true, options: NON_BASE_CURRENCY_OPTIONS },
        { name: 'rate', label: 'Tasa (cuántas unidades equivalen a 1 USD, ej. 900 para VES)', type: 'number', required: true },
        { name: 'source', label: 'Fuente (ej. BCV, paralelo)' },
      ]}
    />
  );
}
