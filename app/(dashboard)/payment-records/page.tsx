'use client';
import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import ResourceManager, { type SelectOption } from '@/components/ResourceManager';
import { api } from '@/lib/api';
import { CURRENCY_OPTIONS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, formatMoney } from '@/lib/currency';
import ReceiptButton from '@/components/ReceiptButton';
import BankSelect from '@/components/BankSelect';
import { METHOD_FIELDS, REFERENCE_REQUIRED, emptyPayment, referencePlaceholder, validatePayment, type PaymentMethod } from '@/lib/payments';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useI18n } from '@/components/I18nProvider';

const TYPE_KEYS = { INCOME: 'labels.conceptKind.INCOME', EXPENSE: 'labels.conceptKind.EXPENSE' } as const;
const TYPE_LABELS: Record<string, string> = localizedRecord(TYPE_KEYS);
const TYPE_OPTIONS = localizedOptions(TYPE_KEYS);
const METHOD_LABELS = PAYMENT_METHOD_LABELS;

// Campos del comprobante que aplican al método elegido (ninguno hasta elegirlo).
const methodOf = (form: Record<string, any>) => form.paymentMethod as PaymentMethod | '' | undefined;
const methodFields = (form: Record<string, any>) => {
  const method = methodOf(form);
  return method ? METHOD_FIELDS[method] : undefined;
};

export default function Page() {
  const { t, intlLocale } = useI18n();
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
      // group = kind (INCOME/EXPENSE): el select solo muestra los del tipo elegido.
      setConceptOptions(concepts.map((c: any) => ({ value: String(c.id), label: c.name, group: c.kind })));
    }).catch(() => {});
  }, []);

  return (
    <ResourceManager
      title={t('payments.records.title')}
      subtitle={t('payments.records.subtitle')}
      icon={Receipt}
      endpoint="/transactions"
      formVariant="modal"
      validate={(form) => {
        const method = methodOf(form);
        if (!method) return null;
        return validatePayment({ ...emptyPayment(), paymentMethod: method, paymentReference: form.paymentReference ?? '' });
      }}
      columns={[
        { key: 'type', label: t('payments.records.type'), render: (r) => TYPE_LABELS[r.type] ?? r.type },
        { key: 'amount', label: t('payments.records.amount'), render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'paymentMethod', label: t('payments.records.method'), render: (r) => (r.paymentMethod ? METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod : '—') },
        {
          key: 'paymentReference', label: t('payments.records.reference'),
          render: (r) => (
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-xs">{r.paymentReference ?? '—'}</span>
              {r.receipt?.id && <ReceiptButton id={r.receipt.id} />}
            </span>
          ),
        },
        { key: 'date', label: t('payments.records.date'), render: (r) => new Date(r.date).toLocaleDateString(intlLocale) },
      ]}
      fields={[
        { name: 'type', label: t('payments.records.type'), type: 'select', required: true, options: TYPE_OPTIONS },
        { name: 'amount', label: t('payments.records.amount'), type: 'number', required: true },
        { name: 'currency', label: t('payments.records.currency'), type: 'select', options: CURRENCY_OPTIONS },
        { name: 'paymentMethod', label: t('payments.records.paymentMethod'), type: 'select', options: PAYMENT_METHOD_OPTIONS },
        {
          name: 'paymentReference', label: t('payments.records.referenceField'),
          visibleWhen: (form) => Boolean(methodFields(form)?.reference),
          labelWhen: (form) => methodFields(form)?.reference ?? t('payments.records.referenceField'),
          requiredWhen: (form) => REFERENCE_REQUIRED.includes(form.paymentMethod),
          placeholder: (form) => referencePlaceholder(methodOf(form)),
          hint: (form) => (methodOf(form) === 'CASH' ? t('labels.paymentField.billSerialHint') : undefined),
        },
        {
          name: 'paymentBank', label: t('payments.records.bank'),
          visibleWhen: (form) => Boolean(methodFields(form)?.bank),
          renderInput: (props) => <BankSelect {...props} />,
        },
        {
          name: 'payerPhone', label: t('payments.fields.payerPhone'),
          visibleWhen: (form) => Boolean(methodFields(form)?.phone),
          placeholder: '0414-1234567',
        },
        { name: 'payerName', label: t('payments.records.payer'), visibleWhen: (form) => Boolean(methodFields(form)?.payer) },
        { name: 'memberId', label: t('payments.records.memberOptional'), type: 'select', options: memberOptions },
        { name: 'conceptId', label: t('payments.records.conceptOptional'), type: 'select', options: conceptOptions, dependsOn: 'type' },
        { name: 'date', label: t('payments.records.date'), type: 'date' },
        { name: 'note', label: t('payments.records.note'), type: 'textarea' },
      ]}
    />
  );
}
