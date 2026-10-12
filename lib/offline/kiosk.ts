import Dexie, { type Table } from 'dexie';
import { api, ApiError } from '@/lib/api';
import { newId } from './outbox';
import { runExclusive } from './sync-engine';

// Cola del kiosko público (/check-in/<slug>) para cuando no hay internet.
//
// El kiosko no tiene sesión ni datos de socios, así que sin conexión no puede
// validar nada: guarda la cédula y la hora ("a ciegas") y el servidor valida
// al recibirlas. Las que rechace quedan a la vista de recepción en el panel.
// En el dispositivo solo vive lo pendiente: cada entrada se borra al enviarse.

export type KioskEntry = {
  // Clave de idempotencia; el servidor la usa también como id de la asistencia.
  id: string;
  identificationNumber: string;
  createdAt: string;
};

class KioskDb extends Dexie {
  entries!: Table<KioskEntry, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ entries: 'id, createdAt' });
  }
}

// Mismo tope que el API (KIOSK_SYNC_MAX_BATCH).
const BATCH = 50;
// Un segundo toque del mismo socio dentro de esta ventana es la misma visita
// (igual que el check-in en línea del kiosko).
const DUPLICATE_WINDOW_MS = 10 * 60_000;

const open = new Map<string, KioskDb>();

// Una base por gimnasio (el slug de la URL).
function db(slug: string): KioskDb {
  const name = `fg-kiosk-${slug.toLowerCase()}`;
  let instance = open.get(name);
  if (!instance) {
    instance = new KioskDb(name);
    open.set(name, instance);
  }
  return instance;
}

export function listKioskEntries(slug: string): Promise<KioskEntry[]> {
  return db(slug).entries.orderBy('createdAt').toArray();
}

// Guarda una entrada para enviarla después. `duplicate`: ese socio ya tenía
// una guardada hace instantes y no se agrega otra.
export async function queueKioskEntry(slug: string, identificationNumber: string, now = new Date()): Promise<{ duplicate: boolean; createdAt: string }> {
  const table = db(slug).entries;
  return db(slug).transaction('rw', table, async () => {
    const since = new Date(now.getTime() - DUPLICATE_WINDOW_MS).toISOString();
    const recent = await table
      .where('createdAt').above(since)
      .filter((entry) => entry.identificationNumber === identificationNumber)
      .first();
    if (recent) return { duplicate: true, createdAt: recent.createdAt };

    const entry: KioskEntry = { id: newId(), identificationNumber, createdAt: now.toISOString() };
    await table.add(entry);
    return { duplicate: false, createdAt: entry.createdAt };
  });
}

function send(slug: string, entries: KioskEntry[]) {
  return api.post(`/public/attendance/${encodeURIComponent(slug)}/sync-check-in`, {
    sentAt: new Date().toISOString(),
    entries,
  });
}

// Envía lo guardado, en orden y por lotes. Devuelve true si la cola quedó
// vacía. Reintentar es seguro: el servidor ignora los ids que ya procesó.
export async function flushKiosk(slug: string): Promise<boolean> {
  const table = db(slug).entries;
  const done = await runExclusive(`fg-kiosk-sync:${slug.toLowerCase()}`, async () => {
    for (;;) {
      const batch = await table.orderBy('createdAt').limit(BATCH).toArray();
      if (batch.length === 0) return true;
      try {
        await send(slug, batch);
        await table.bulkDelete(batch.map((entry) => entry.id));
      } catch (err) {
        // Sin red, límite de peticiones o error del servidor: más tarde.
        if (!(err instanceof ApiError && err.status === 400)) return false;
        // El API rechazó el lote por un dato inválido: se envían de una en una
        // y solo se descarta la que nunca podrá aplicarse.
        for (const entry of batch) {
          try {
            await send(slug, [entry]);
          } catch (single) {
            if (!(single instanceof ApiError && single.status === 400)) return false;
          }
          await table.delete(entry.id);
        }
      }
    }
  });
  return done ?? false;
}
