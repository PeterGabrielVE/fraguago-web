'use client';
import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { CURRENCY_OPTIONS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, formatMoney } from '@/lib/currency';
import ReceiptButton from '@/components/ReceiptButton';

const TYPE_LABELS: Record<string, string> = { INCOME: 'Ingreso', EXPENSE: 'Egreso' };
const METHOD_LABELS = PAYMENT_METHOD_LABELS;

export default function Page() {
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([]);
  const [conceptOptions, setConceptOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    api.list('/members').then((members) => {
      setMemberOptions(members.map((m: any) => ({
        value: String(m.id),
        label: `${m.user?.profile?.firstName ?? ''} ${m.user?.profile?.lastName ?? ''}`.trim() || m.user?.email || m.id,
      })));
    }).catch(() => {});
    api.list('/concepts').then((concepts) => {
      setConceptOptions(concepts.map((c: any) => ({ value: String(c.id), label: c.name })));
    }).catch(() => {});
  }, []);

  return (
    <ResourceManager
      title="Registro de Pagos"
      subtitle="Ingresos y egresos registrados."
      icon={Receipt}
      endpoint="/transactions"
      formVariant="modal"
      columns={[
        { key: 'type', label: 'Tipo', render: (r) => TYPE_LABELS[r.type] ?? r.type },
        { key: 'amount', label: 'Monto', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'paymentMethod', label: 'Método', render: (r) => (r.paymentMethod ? METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod : '—') },
        {
          key: 'paymentReference', label: 'Referencia',
          render: (r) => (
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-xs">{r.paymentReference ?? '—'}</span>
              {r.receipt?.id && <ReceiptButton id={r.receipt.id} />}
            </span>
          ),
        },
        { key: 'date', label: 'Fecha', render: (r) => new Date(r.date).toLocaleDateString('es-MX') },
      ]}
      fields={[
        {
          name: 'type', label: 'Tipo', type: 'select', required: true,
          options: [
            { value: 'INCOME', label: 'Ingreso' },
            { value: 'EXPENSE', label: 'Egreso' },
          ],
        },
        { name: 'amount', label: 'Monto', type: 'number', required: true },
        { name: 'currency', label: 'Moneda', type: 'select', options: CURRENCY_OPTIONS },
        { name: 'paymentMethod', label: 'Método de pago', type: 'select', options: PAYMENT_METHOD_OPTIONS },
        { name: 'paymentReference', label: 'Referencia (pago móvil, transferencia, Zelle…)' },
        { name: 'paymentBank', label: 'Banco emisor' },
        { name: 'payerName', label: 'Titular / quien paga' },
        { name: 'memberId', label: 'Socio (opcional)', type: 'select', options: memberOptions },
        { name: 'conceptId', label: 'Concepto (opcional)', type: 'select', options: conceptOptions },
        { name: 'date', label: 'Fecha', type: 'date' },
        { name: 'note', label: 'Nota', type: 'textarea' },
      ]}
    />
  );
}
