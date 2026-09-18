'use client';
import { Layers } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { CURRENCY_OPTIONS, formatMoney } from '@/lib/currency';

const PLAN_TYPE_LABELS: Record<string, string> = {
  DAILY: 'Diario',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  ANNUAL: 'Anual',
};

export default function Page() {
  return (
    <ResourceManager
      title="Planes de membresía" subtitle="Mensual, anual, familiar…"
      icon={Layers}
      endpoint="/membership-plans"
      formVariant="modal"
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'type', label: 'Tipo', render: (row) => PLAN_TYPE_LABELS[row.type] ?? row.type },
        { key: 'price', label: 'Precio', render: (row) => formatMoney(row.price, row.currency) },
        { key: 'durationDays', label: 'Días' },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        {
          name: 'type', label: 'Tipo', type: 'select', required: true,
          options: [
            { value: 'DAILY', label: 'Diario' },
            { value: 'MONTHLY', label: 'Mensual' },
            { value: 'QUARTERLY', label: 'Trimestral' },
            { value: 'ANNUAL', label: 'Anual' },
          ],
        },
        { name: 'price', label: 'Precio', type: 'number', required: true },
        { name: 'currency', label: 'Moneda', type: 'select', options: CURRENCY_OPTIONS },
        { name: 'durationDays', label: 'Duración (días)', type: 'number', required: true },
      ]}
    />
  );
}
