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
      subtitle="Valor de 1 unidad de la moneda en la moneda base del gym (normalmente USD). Los pagos usan la última tasa registrada de cada moneda."
      endpoint="/exchange-rates"
      disableEdit
      columns={[
        { key: 'currency', label: 'Moneda', render: (row) => CURRENCY_LABELS[row.currency] ?? row.currency },
        { key: 'rate', label: 'Tasa' },
        { key: 'source', label: 'Fuente', render: (row) => row.source || '—' },
        { key: 'effectiveAt', label: 'Vigente desde', render: (row) => new Date(row.effectiveAt).toLocaleString('es-VE') },
      ]}
      fields={[
        { name: 'currency', label: 'Moneda', type: 'select', required: true, options: NON_BASE_CURRENCY_OPTIONS },
        { name: 'rate', label: 'Tasa (valor de 1 unidad en la moneda base)', type: 'number', required: true },
        { name: 'source', label: 'Fuente (ej. BCV, paralelo)' },
      ]}
    />
  );
}
