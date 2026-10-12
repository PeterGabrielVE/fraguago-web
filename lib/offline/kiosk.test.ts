import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
  }
  return { api: { post: (...args: unknown[]) => post(...args) }, ApiError };
});

import { ApiError } from '@/lib/api';
import { flushKiosk, listKioskEntries, queueKioskEntry } from './kiosk';

let slug: string;
let counter = 0;

beforeEach(() => {
  slug = `gym-${++counter}`;
  post.mockReset();
});

describe('cola del kiosko', () => {
  it('guarda la cédula y la hora, y no duplica un segundo toque del mismo socio', async () => {
    const first = await queueKioskEntry(slug, '12345678');
    const again = await queueKioskEntry(slug, '12345678');
    await queueKioskEntry(slug, '87654321');

    expect(first.duplicate).toBe(false);
    expect(again).toEqual({ duplicate: true, createdAt: first.createdAt });
    expect((await listKioskEntries(slug)).map((e) => e.identificationNumber).sort()).toEqual(['12345678', '87654321']);
  });

  it('el mismo socio más tarde sí cuenta como otra visita', async () => {
    const morning = new Date('2026-10-12T08:00:00');
    await queueKioskEntry(slug, '12345678', morning);
    const evening = await queueKioskEntry(slug, '12345678', new Date('2026-10-12T18:00:00'));

    expect(evening.duplicate).toBe(false);
    expect(await listKioskEntries(slug)).toHaveLength(2);
  });

  it('al enviar borra lo guardado del dispositivo', async () => {
    await queueKioskEntry(slug, '12345678');
    post.mockResolvedValue({ received: 1 });

    expect(await flushKiosk(slug)).toBe(true);

    const [path, body] = post.mock.calls[0];
    expect(path).toBe(`/public/attendance/${slug}/sync-check-in`);
    expect(body.entries).toMatchObject([{ identificationNumber: '12345678' }]);
    expect(body.entries[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await listKioskEntries(slug)).toEqual([]);
  });

  it('sin red conserva todo y reintenta con los mismos ids', async () => {
    await queueKioskEntry(slug, '12345678');
    post.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue({ received: 1 });

    expect(await flushKiosk(slug)).toBe(false);
    expect(await listKioskEntries(slug)).toHaveLength(1);

    expect(await flushKiosk(slug)).toBe(true);
    expect(post.mock.calls[0][1].entries[0].id).toBe(post.mock.calls[1][1].entries[0].id);
  });

  it('envía en lotes de 50', async () => {
    for (let i = 0; i < 120; i++) await queueKioskEntry(slug, `id-${i}`);
    post.mockResolvedValue({});

    await flushKiosk(slug);

    expect(post.mock.calls.map(([, body]) => body.entries.length)).toEqual([50, 50, 20]);
  });

  it('una entrada inválida no bloquea a las demás', async () => {
    await queueKioskEntry(slug, 'buena');
    await queueKioskEntry(slug, 'mala');
    post.mockImplementation(async (_path: string, body: { entries: { identificationNumber: string }[] }) => {
      if (body.entries.some((e) => e.identificationNumber === 'mala')) throw new ApiError('inválida', 400);
      return {};
    });

    expect(await flushKiosk(slug)).toBe(true);
    expect(await listKioskEntries(slug)).toEqual([]);
    // La válida llegó al servidor en un envío propio.
    expect(post.mock.calls.some(([, body]) => body.entries.length === 1 && body.entries[0].identificationNumber === 'buena')).toBe(true);
  });

  it('la cola de un gimnasio no se mezcla con la de otro', async () => {
    await queueKioskEntry(slug, '12345678');
    expect(await listKioskEntries(`${slug}-otro`)).toEqual([]);
  });
});
