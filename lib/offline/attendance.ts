import { api, NetworkError } from '@/lib/api';
import { tActive } from '@/lib/i18n/client';
import { isBackendUp } from './connectivity';
import { describeOutboxError } from './errors';
import { discardOp, enqueue, listOps } from './outbox';
import { overlayAttendance } from './overlays';
import { listResource } from './resources';
import { getOfflineScope } from './scope';
import { flushOp } from './sync';

// Asistencia con soporte offline: las entradas pasan siempre por la cola (con
// conexión se envían en el momento; sin ella quedan guardadas).

type Member = Record<string, any>;

export type CheckInOutcome = 'synced' | 'queued';

export function memberFullName(member: Member | null | undefined) {
  const firstName = member?.user?.profile?.firstName ?? '';
  const lastName = member?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

// Misma regla que el API (membresía ACTIVE que cubre este momento), aplicada
// sobre los datos descargados.
export function hasActiveMembership(member: Member, at = new Date()): boolean {
  return (member.memberships ?? []).some((m: Record<string, any>) =>
    String(m.status).toUpperCase() === 'ACTIVE' && new Date(m.startDate) <= at && new Date(m.endDate) >= at,
  );
}

// Entradas de un día (YYYY-MM-DD), incluidas las marcadas sin conexión.
export async function listDayEntries(date: string, shift?: string): Promise<any[]> {
  const params = new URLSearchParams({ page: '1', pageSize: '500', date });
  if (shift) params.set('shift', shift);
  try {
    return await listResource(`/attendance?${params}`);
  } catch (err) {
    // Sin conexión y sin copia de ese día: al menos lo registrado aquí.
    const scope = getOfflineScope();
    if (!(err instanceof NetworkError) || !scope) throw err;
    return overlayAttendance([], await listOps(scope), { date, shift });
  }
}

export async function checkInMember(member: Member): Promise<CheckInOutcome> {
  const scope = getOfflineScope();
  // Sin almacenamiento local: comportamiento de siempre, solo en línea.
  if (!scope) {
    await api.post('/attendance/check-in', { memberId: member.id });
    return 'synced';
  }

  // Sin conexión el servidor no puede validar: se aplica aquí la misma regla,
  // con lo último que se descargó. Al sincronizar el servidor vuelve a validar.
  if (!isBackendUp() && !hasActiveMembership(member)) {
    throw new Error(tActive('offline.rules.noActiveMembership'));
  }

  const op = await enqueue(scope, {
    type: 'attendance.checkIn',
    entity: 'attendance',
    payload: { memberId: member.id },
    label: memberFullName(member) || String(member.id),
  });
  if (!isBackendUp()) return 'queued';

  const settled = await flushOp(scope, op.id);
  if (settled?.status === 'needs_attention') {
    // Rechazo inmediato, con el usuario delante: se muestra como error y no
    // queda en la cola.
    await discardOp(scope, op.id);
    throw new Error(describeOutboxError(settled.error));
  }
  if (settled?.status === 'synced') return 'synced';

  // La conexión se cayó justo ahora y el envío no salió: vale la regla local.
  if (!isBackendUp() && !hasActiveMembership(member)) {
    await discardOp(scope, op.id);
    throw new Error(tActive('offline.rules.noActiveMembership'));
  }
  return 'queued';
}
