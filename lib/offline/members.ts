import { api } from '@/lib/api';
import { tActive } from '@/lib/i18n/client';
import { isBackendUp } from './connectivity';
import { describeOutboxError } from './errors';
import { discardOp, enqueue, newId } from './outbox';
import { listResource } from './resources';
import { getOfflineScope } from './scope';
import { flushOp } from './sync';

// Alta de socios con soporte offline. Datos, ficha médica y contacto de
// emergencia viajan en una sola operación de la cola (el API los guarda en una
// transacción). La contraseña no se guarda aquí: el API usa la cédula.

export type MemberDraft = {
  firstName: string;
  lastName: string;
  email: string;
  identificationNumber: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  activityLevel?: string;
  preferredTime?: string;
  medicalProfile?: Record<string, unknown>;
  emergencyContact?: { name: string; phone: string; relationship: string };
};

export type CreateMemberResult = { id: string; outcome: 'synced' | 'queued' };

// Sin conexión el servidor no puede avisar de un duplicado: se compara contra
// los socios descargados y los que esperan en la cola.
async function assertNoLocalDuplicate(draft: MemberDraft) {
  let members: Record<string, any>[];
  try {
    members = await listResource('/members');
  } catch {
    return; // Sin copia local: el servidor lo validará al sincronizar.
  }
  const id = draft.identificationNumber.trim().toLowerCase();
  const email = draft.email.trim().toLowerCase();
  for (const member of members) {
    if (String(member.identificationNumber ?? '').trim().toLowerCase() === id) {
      throw new Error(tActive('offline.rules.duplicateId'));
    }
    if (String(member.user?.email ?? '').trim().toLowerCase() === email) {
      throw new Error(tActive('offline.rules.duplicateEmail'));
    }
  }
}

export async function createMember(draft: MemberDraft): Promise<CreateMemberResult> {
  const scope = getOfflineScope();
  const payload = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>; // sin claves undefined
  const label = `${draft.firstName} ${draft.lastName}`.trim();

  // Sin almacenamiento local no hay cola: la operación se envía directa.
  if (!scope) {
    const entityId = newId();
    const now = new Date().toISOString();
    const res = await api.post('/sync/operations', {
      id: newId(), type: 'member.create', entityId, createdAt: now, sentAt: now, payload,
    });
    if (res?.status !== 'applied' && res?.status !== 'duplicate') {
      throw new Error(describeOutboxError({ code: res?.code, message: res?.message, kind: 'rejected' }));
    }
    return { id: res.entityId ?? entityId, outcome: 'synced' };
  }

  if (!isBackendUp()) await assertNoLocalDuplicate(draft);

  const op = await enqueue(scope, { type: 'member.create', entity: 'member', payload, label });
  if (!isBackendUp()) return { id: op.entityId, outcome: 'queued' };

  const settled = await flushOp(scope, op.id);
  if (settled?.status === 'needs_attention') {
    // Rechazo inmediato (p. ej. cédula repetida): el formulario sigue abierto
    // para corregir, así que no queda en la cola.
    await discardOp(scope, op.id);
    throw new Error(describeOutboxError(settled.error));
  }
  return settled?.status === 'synced'
    ? { id: settled.serverEntityId ?? op.entityId, outcome: 'synced' }
    : { id: op.entityId, outcome: 'queued' };
}
