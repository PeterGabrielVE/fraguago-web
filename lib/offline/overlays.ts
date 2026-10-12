import type { OutboxOp } from './db';

// Mezcla las operaciones de la cola con lo último que se descargó del API,
// para que lo hecho sin conexión se vea en las listas antes de sincronizar.
// Las filas locales llevan `_sync` con el estado de su operación.

type Row = Record<string, any>;

export type AttendanceShift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

// Mismo corte de turnos que el API (AttendanceService.shiftFromHour).
export function shiftFromDate(date: Date): AttendanceShift {
  const hour = date.getHours();
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'NIGHT';
}

export function toLocalISODate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Fila con la forma de GET /members para un socio creado sin conexión.
function pendingMemberRow(op: OutboxOp): Row {
  const p = op.payload as Row;
  return {
    id: op.entityId,
    identificationNumber: p.identificationNumber,
    birthDate: p.birthDate ?? null,
    activityLevel: p.activityLevel ?? null,
    status: 'ACTIVE',
    joinedAt: op.createdAt,
    createdAt: op.createdAt,
    user: {
      email: p.email,
      profile: {
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone ?? null,
        address: p.address ?? null,
        preferredTime: p.preferredTime ?? null,
      },
    },
    memberships: [],
    _sync: op.status,
  };
}

export function overlayMembers(rows: Row[], ops: OutboxOp[]): Row[] {
  const known = new Set(rows.map((row) => String(row.id)));
  const local: Row[] = [];
  for (const op of ops) {
    if (op.type !== 'member.create') continue;
    if (known.has(op.serverEntityId ?? op.entityId)) continue;
    // Ya sincronizado pero la lista guardada es anterior: se usa la fila que devolvió el servidor.
    if (op.status === 'synced') {
      if (op.result) local.push(op.result as Row);
    } else {
      local.push(pendingMemberRow(op));
    }
  }
  // La lista viene con los más recientes primero.
  return local.length ? [...local.reverse(), ...rows] : rows;
}

// Fila con la forma de GET /attendance para una entrada marcada sin conexión.
function pendingAttendanceRow(op: OutboxOp): Row {
  const p = op.payload as Row;
  return {
    id: op.entityId,
    memberId: p.memberId,
    checkedInAt: op.createdAt,
    shift: shiftFromDate(new Date(op.createdAt)),
    // La etiqueta de la operación es el nombre completo del socio.
    member: { id: p.memberId, user: { profile: { firstName: op.label, lastName: '' } } },
    _sync: op.status,
  };
}

export function overlayAttendance(rows: Row[], ops: OutboxOp[], filter: { date: string; shift?: string }): Row[] {
  const known = new Set(rows.map((row) => String(row.id)));
  const local: Row[] = [];
  for (const op of ops) {
    if (op.type !== 'attendance.checkIn') continue;
    if (known.has(op.serverEntityId ?? op.entityId)) continue;
    const row = op.status === 'synced' ? (op.result as Row | undefined) : pendingAttendanceRow(op);
    if (!row) continue;
    const at = new Date(row.checkedInAt);
    if (toLocalISODate(at) !== filter.date) continue;
    if (filter.shift && row.shift !== filter.shift) continue;
    local.push(row);
  }
  if (!local.length) return rows;
  return [...rows, ...local].sort((a, b) => +new Date(b.checkedInAt) - +new Date(a.checkedInAt));
}
