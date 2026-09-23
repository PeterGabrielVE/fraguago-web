export const CURRENCY_LABELS: Record<string, string> = {
  USD: 'Dólares (USD)',
  VES: 'Bolívares (VES)',
  EUR: 'Euros (EUR)',
};

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_LABELS).map(([value, label]) => ({ value, label }));

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  VES: 'Bs.',
  EUR: '€',
};

export function formatMoney(amount: number | string, currency?: string) {
  const value = Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = currency ? CURRENCY_SYMBOLS[currency] ?? currency : '';
  return symbol ? `${symbol} ${value}` : value;
}
