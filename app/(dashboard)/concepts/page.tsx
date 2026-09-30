'use client';
import { Tags } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

const TYPE_KEYS = { INCOME: 'labels.conceptKind.INCOME', EXPENSE: 'labels.conceptKind.EXPENSE' } as const;
const TYPE_LABELS: Record<string, string> = localizedRecord(TYPE_KEYS);
const TYPE_OPTIONS = localizedOptions(TYPE_KEYS);

export default function Page() {
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.concepts.title')}
      subtitle={t('catalog.concepts.subtitle')}
      icon={Tags}
      endpoint="/concepts"
      formVariant="modal"
      columns={[
        { key: 'name', label: t('catalog.field.name') },
        {
          key: 'kind', label: t('catalog.field.type'), render: (r) => (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${r.kind === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {TYPE_LABELS[r.kind] ?? r.kind}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: t('catalog.field.name'), required: true },
        { name: 'kind', label: t('catalog.field.type'), type: 'select', options: TYPE_OPTIONS, required: true },
      ]}
    />
  );
}
