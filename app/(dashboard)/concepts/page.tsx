'use client';
import { Tags } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';

const TYPE_LABELS: Record<string, string> = { INCOME: 'Ingreso', EXPENSE: 'Egreso' };
const TYPE_OPTIONS = [
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Egreso' },
];

export default function Page() {
  return (
    <ResourceManager
      title="Conceptos"
      subtitle="Categorías de ingresos y egresos."
      icon={Tags}
      endpoint="/concepts"
      formVariant="modal"
      columns={[
        { key: 'name', label: 'Nombre' },
        {
          key: 'kind', label: 'Tipo', render: (r) => (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${r.kind === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {TYPE_LABELS[r.kind] ?? r.kind}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'kind', label: 'Tipo', type: 'select', options: TYPE_OPTIONS, required: true },
      ]}
    />
  );
}
