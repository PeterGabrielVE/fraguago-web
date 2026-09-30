import { activeIntlLocale, localizedOptions, localizedRecord, tActive } from '@/lib/i18n/client';

const CURRENCY_KEYS = {
  USD: 'labels.currency.USD',
  VES: 'labels.currency.VES',
  EUR: 'labels.currency.EUR',
} as const;

export const CURRENCY_LABELS: Record<string, string> = localizedRecord(CURRENCY_KEYS);
export const CURRENCY_OPTIONS = localizedOptions(CURRENCY_KEYS);

const PAYMENT_METHOD_KEYS = {
  CASH: 'labels.paymentMethod.CASH',
  PAGO_MOVIL: 'labels.paymentMethod.PAGO_MOVIL',
  TRANSFER: 'labels.paymentMethod.TRANSFER',
  ZELLE: 'labels.paymentMethod.ZELLE',
  CARD: 'labels.paymentMethod.CARD',
  OTHER: 'labels.paymentMethod.OTHER',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = localizedRecord(PAYMENT_METHOD_KEYS);
export const PAYMENT_METHOD_OPTIONS = localizedOptions(PAYMENT_METHOD_KEYS);

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  VES: 'Bs.',
  EUR: '€',
};

export function formatMoney(amount: number | string, currency?: string) {
  const value = Number(amount).toLocaleString(activeIntlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = currency ? CURRENCY_SYMBOLS[currency] ?? currency : '';
  return symbol ? `${symbol} ${value}` : value;
}
