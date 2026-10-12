import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeAllDbs, getDb, type OfflineScope, type OutboxOp } from './db';
import { claimNext, discardOp, enqueue, listOps, retryOp } from './outbox';
import { overlayAttendance, overlayMembers, toLocalISODate } from './overlays';
import { MAX_SERVER_ATTEMPTS, drainOutbox, type Transport, type TransportResult } from './sync-engine';

let scope: OfflineScope;
let counter = 0;

beforeEach(() => {
  // Base nueva por prueba (una por gimnasio + usuario).
  scope = { gymId: `gym-${++counter}`, userId: 'user-1' };
});

const checkIn = (s: OfflineScope, memberId: string) =>
  enqueue(s, { type: 'attendance.checkIn', entity: 'attendance', payload: { memberId }, label: memberId });

// Servidor simulado: idempotente por id de operación, como el API real.
function fakeServer(respond: (op: OutboxOp) => TransportResult = () => ({ kind: 'applied' })) {
  const applied = new Map<string, OutboxOp>();
  const calls: string[] = [];
  const transport: Transport = async (op) => {
    calls.push(op.id);
    const res = respond(op);
    if (res.kind === 'applied') applied.set(op.id, op);
    return res.kind === 'applied' ? { ...res, entityId: op.entityId, result: { id: op.entityId } } : res;
  };
  return { transport, applied, calls };
}

describe('cola de operaciones', () => {
  it('sincroniza en el orden en que se crearon', async () => {
    const a = await checkIn(scope, 'a');
    await new Promise((r) => setTimeout(r, 2));
    const b = await checkIn(scope, 'b');
    const server = fakeServer();

    const result = await drainOutbox(scope, server.transport);

    expect(server.calls).toEqual([a.id, b.id]);
    expect(result.applied).toHaveLength(2);
    expect((await listOps(scope)).map((op) => op.status)).toEqual(['synced', 'synced']);
  });

  it('sobrevive a cerrar y reabrir el navegador', async () => {
    const op = await checkIn(scope, 'a');
    closeAllDbs();

    const [restored] = await listOps(scope);
    expect(restored).toMatchObject({ id: op.id, status: 'pending', payload: { memberId: 'a' } });
  });

  it('sin red deja todo pendiente y en orden, sin contar el intento', async () => {
    await checkIn(scope, 'a');
    await checkIn(scope, 'b');
    const server = fakeServer(() => ({ kind: 'retry', reason: 'network' }));

    const result = await drainOutbox(scope, server.transport);

    expect(result.stopped).toBe('network');
    expect(server.calls).toHaveLength(1); // no insiste con el resto de la cola
    expect((await listOps(scope)).map((op) => [op.status, op.attempts])).toEqual([['pending', 0], ['pending', 0]]);
  });

  it('un fallo del transporte (excepción) se trata como falta de red', async () => {
    await checkIn(scope, 'a');
    const result = await drainOutbox(scope, async () => { throw new TypeError('Failed to fetch'); });

    expect(result.stopped).toBe('network');
    expect((await listOps(scope))[0].status).toBe('pending');
  });

  it('no duplica si la respuesta se pierde: reintenta con la misma clave', async () => {
    const op = await checkIn(scope, 'a');
    const server = fakeServer();
    // 1er envío: el servidor lo aplica pero la respuesta no llega.
    let first = true;
    const flaky: Transport = async (sent) => {
      const res = await server.transport(sent);
      if (first) { first = false; return { kind: 'retry', reason: 'network' }; }
      return res;
    };

    await drainOutbox(scope, flaky);
    await drainOutbox(scope, flaky);

    expect(server.calls).toEqual([op.id, op.id]); // misma clave de idempotencia
    expect(server.applied.size).toBe(1);
    expect((await listOps(scope))[0].status).toBe('synced');
  });

  it('un rechazo del servidor requiere intervención y no bloquea a las demás', async () => {
    const bad = await checkIn(scope, 'sin-membresia');
    await new Promise((r) => setTimeout(r, 2));
    const good = await checkIn(scope, 'ok');
    const server = fakeServer((op) => op.id === bad.id
      ? { kind: 'rejected', error: { code: 'NO_ACTIVE_MEMBERSHIP', message: 'sin membresía', kind: 'rejected' } }
      : { kind: 'applied' });

    await drainOutbox(scope, server.transport);

    const ops = await listOps(scope);
    expect(ops.find((op) => op.id === bad.id)).toMatchObject({ status: 'needs_attention', error: { code: 'NO_ACTIVE_MEMBERSHIP' } });
    expect(ops.find((op) => op.id === good.id)?.status).toBe('synced');

    // No se reenvía sola: espera a que alguien decida.
    await drainOutbox(scope, server.transport);
    expect(server.calls.filter((id) => id === bad.id)).toHaveLength(1);
  });

  it('reintentar devuelve la operación a la cola; descartar la borra', async () => {
    const op = await checkIn(scope, 'a');
    const reject = fakeServer(() => ({ kind: 'rejected', error: { code: 'X', message: '', kind: 'rejected' } }));
    await drainOutbox(scope, reject.transport);

    await retryOp(scope, op.id);
    expect((await listOps(scope))[0]).toMatchObject({ status: 'pending', attempts: 0 });

    await drainOutbox(scope, reject.transport);
    await discardOp(scope, op.id);
    expect(await listOps(scope)).toEqual([]);
  });

  it('no descarta una operación que el servidor ya aplicó', async () => {
    const op = await checkIn(scope, 'a');
    await drainOutbox(scope, fakeServer().transport);

    await discardOp(scope, op.id);
    expect(await listOps(scope)).toHaveLength(1);
  });

  it('ante errores del servidor reintenta con espera y al agotarse pide intervención', async () => {
    const op = await checkIn(scope, 'a');
    const server = fakeServer(() => ({ kind: 'retry', reason: 'server', message: 'HTTP 500' }));

    await drainOutbox(scope, server.transport);
    let [current] = await listOps(scope);
    expect(current).toMatchObject({ status: 'pending', attempts: 1 });
    expect(current.nextAttemptAt).toBeGreaterThan(Date.now());

    // Todavía no toca: no se reenvía.
    await drainOutbox(scope, server.transport);
    expect(server.calls).toHaveLength(1);

    for (let i = 1; i < MAX_SERVER_ATTEMPTS; i++) {
      await getDb(scope).outbox.update(op.id, { nextAttemptAt: 0 });
      await drainOutbox(scope, server.transport);
    }
    [current] = await listOps(scope);
    expect(current).toMatchObject({ status: 'needs_attention', error: { code: 'SERVER_ERROR' } });
  });

  it('dos pestañas a la vez no envían dos veces la misma operación', async () => {
    for (const id of ['a', 'b', 'c', 'd']) await checkIn(scope, id);
    const server = fakeServer();
    const slow: Transport = async (op) => {
      await new Promise((r) => setTimeout(r, 5));
      return server.transport(op);
    };

    await Promise.all([drainOutbox(scope, slow), drainOutbox(scope, slow)]);

    expect(server.calls).toHaveLength(4);
    expect(new Set(server.calls).size).toBe(4);
  });

  it('libera una operación que quedó "enviando" al cerrarse la pestaña', async () => {
    const op = await checkIn(scope, 'a');
    await claimNext(scope); // la toma una pestaña que luego se cierra
    expect(await claimNext(scope)).toBeNull(); // el candado sigue vigente

    const later = Date.now() + 61_000;
    expect(await claimNext(scope, later)).toMatchObject({ id: op.id, attempts: 2 });
  });

  it('la cola de un gimnasio o usuario no se mezcla con la de otro', async () => {
    const other: OfflineScope = { gymId: `${scope.gymId}-otro`, userId: 'user-1' };
    const sameGymOtherUser: OfflineScope = { gymId: scope.gymId, userId: 'user-2' };
    await checkIn(scope, 'a');

    expect(await listOps(other)).toEqual([]);
    expect(await listOps(sameGymOtherUser)).toEqual([]);

    const server = fakeServer();
    await drainOutbox(other, server.transport);
    expect(server.calls).toEqual([]);
    expect((await listOps(scope))[0]).toMatchObject({ status: 'pending', gymId: scope.gymId, userId: 'user-1' });
  });
});

describe('listas con cambios locales', () => {
  it('muestra el socio creado sin conexión y deja de duplicarlo al sincronizar', async () => {
    const op = await enqueue(scope, {
      type: 'member.create', entity: 'member', label: 'Ana Pérez',
      payload: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@x.com', identificationNumber: '12345678' },
    });
    const server = [{ id: 'm1', identificationNumber: '1' }];

    const offline = overlayMembers(server, await listOps(scope));
    expect(offline).toHaveLength(2);
    expect(offline[0]).toMatchObject({ id: op.entityId, _sync: 'pending', user: { email: 'ana@x.com', profile: { firstName: 'Ana' } } });
    expect(JSON.stringify(op.payload)).not.toMatch(/password/i);

    await drainOutbox(scope, fakeServer().transport);
    const ops = await listOps(scope);
    // Lista vieja: usa la fila que devolvió el servidor. Lista nueva: ya la trae.
    expect(overlayMembers(server, ops)).toHaveLength(2);
    expect(overlayMembers([...server, { id: op.entityId }], ops)).toHaveLength(2);
  });

  it('muestra la entrada pendiente solo en su día y turno', async () => {
    await checkIn(scope, 'a');
    const ops = await listOps(scope);
    const today = toLocalISODate(new Date());

    expect(overlayAttendance([], ops, { date: today })).toMatchObject([{ memberId: 'a', _sync: 'pending' }]);
    expect(overlayAttendance([], ops, { date: '2000-01-01' })).toEqual([]);
    const shift = overlayAttendance([], ops, { date: today })[0].shift;
    const otherShift = shift === 'MORNING' ? 'NIGHT' : 'MORNING';
    expect(overlayAttendance([], ops, { date: today, shift: otherShift })).toEqual([]);
  });
});
