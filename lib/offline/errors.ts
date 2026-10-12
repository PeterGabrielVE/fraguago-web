import { tActive } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/translate';
import type { OutboxError } from './db';

const KNOWN = [
  'NO_ACTIVE_MEMBERSHIP', 'MEMBER_NOT_FOUND', 'CAPACITY_FULL', 'DUPLICATE_MEMBER',
  'TOO_OLD', 'FORBIDDEN', 'TENANT_MISMATCH', 'VALIDATION', 'SERVER_ERROR',
] as const;

// Texto para mostrar por qué el servidor no aplicó una operación. Los códigos
// conocidos se traducen; del resto se usa el mensaje del API.
export function describeOutboxError(error: OutboxError | undefined): string {
  if (!error) return tActive('offline.errors.UNKNOWN');
  const known = (KNOWN as readonly string[]).includes(error.code);
  // El detalle de una validación solo lo trae el mensaje del API.
  if (error.code === 'VALIDATION' && error.message) return error.message;
  if (known) return tActive(`offline.errors.${error.code}` as MessageKey);
  return error.message || tActive('offline.errors.UNKNOWN');
}
