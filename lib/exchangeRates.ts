import { api } from '@/lib/api';

// Tasas de cambio. Convención del API: `rate` = cuántas unidades de `currency`
// equivalen a 1 unidad de la moneda base del gym (ej. VES 859.06 = Bs por USD).
// El backend sincroniza la tasa oficial del BCV cada 12 horas (source "BCV"); la
// tasa manual queda como respaldo si el servicio externo se cae.

export const BCV_SOURCE = 'BCV';

export type ExchangeRate = {
  id: string;
  currency: string;
  rate: number | string;
  source?: string | null;
  effectiveAt: string;
};

export type BcvRates = {
  source: string;
  baseCurrency: string;
  updatedAt: string;
  rates: { currency: string; rate: number }[];
  // Como la publica el BCV: bolívares por 1 unidad de cada divisa (USD, EUR).
  official: { currency: string; bs: number }[];
};

export type BcvSyncResult = BcvRates & { created: number };

export function isBcvRate(rate: Pick<ExchangeRate, 'source'>): boolean {
  return rate.source === BCV_SOURCE;
}

// Tasa oficial del BCV ahora mismo (sin guardarla). Falla con 503 si el servicio está caído.
export function fetchBcvRates(): Promise<BcvRates> {
  return api.get('/exchange-rates/bcv') as Promise<BcvRates>;
}

// Guarda la tasa oficial si cambió (created = filas nuevas).
export function syncBcvRates(): Promise<BcvSyncResult> {
  return api.post('/exchange-rates/bcv/sync', {}) as Promise<BcvSyncResult>;
}

export function fetchLatestRates(): Promise<ExchangeRate[]> {
  return api.list('/exchange-rates/latest') as Promise<ExchangeRate[]>;
}
