'use client';
import { useState } from 'react';
import { PAYMENT_PLATFORMS, VE_BANKS } from '@/lib/payments';
import { useI18n } from '@/components/I18nProvider';

const OTHER = '__other__';
const KNOWN = new Set<string>([...VE_BANKS.map((b) => b.name), ...PAYMENT_PLATFORMS]);

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

// Banco emisor o plataforma: select agrupado (bancos nacionales con su código,
// plataformas digitales) y "Otro" para escribirlo a mano. Un valor que no está
// en la lista (datos viejos, OCR) se conserva y aparece como opción propia.
export default function BankSelect({ value, onChange, className, id, 'aria-label': ariaLabel }: Props) {
  const { t } = useI18n();
  const [typing, setTyping] = useState(false);
  const custom = value && !KNOWN.has(value) ? value : '';

  if (typing) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
          placeholder={t('payments.bankSelect.otherPlaceholder')}
          aria-label={ariaLabel}
          className={className}
        />
        <button
          type="button"
          onClick={() => setTyping(false)}
          className="shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {t('payments.bankSelect.backToList')}
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          onChange('');
          setTyping(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="">{t('common.select')}</option>
      {custom && <option value={custom}>{custom}</option>}
      <optgroup label={t('payments.bankSelect.nationalBanks')}>
        {VE_BANKS.map((b) => <option key={b.code} value={b.name}>{b.code} · {b.name}</option>)}
      </optgroup>
      <optgroup label={t('payments.bankSelect.platforms')}>
        {PAYMENT_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
      </optgroup>
      <option value={OTHER}>{t('payments.bankSelect.other')}</option>
    </select>
  );
}
