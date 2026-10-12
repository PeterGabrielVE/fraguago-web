import Dexie, { type Table } from 'dexie';

// Base local del modo offline (IndexedDB). Hay UNA base por gimnasio y usuario:
// los datos de dos gimnasios, o de dos personas que comparten el mismo
// navegador, nunca conviven en la misma base.

export type OfflineScope = { gymId: string; userId: string };

export type OutboxOpType = 'attendance.checkIn' | 'member.create';

// pending: espera a enviarse · processing: una pestaña la está enviando ·
// synced: el servidor la aplicó · needs_attention: el servidor la rechazó o
// agotó los reintentos y alguien tiene que decidir (reintentar o descartar).
export type OutboxStatus = 'pending' | 'processing' | 'synced' | 'needs_attention';

export type OutboxError = {
  code: string;
  message: string;
  // conflict: choca con datos que ya existen en el servidor.
  kind: 'rejected' | 'conflict' | 'error';
};

export type OutboxOp = {
  // Generado en el cliente. Es también la clave de idempotencia: el servidor
  // aplica una sola vez todas las peticiones que lleguen con este id.
  id: string;
  gymId: string;
  userId: string;
  type: OutboxOpType;
  entity: 'attendance' | 'member';
  // Id (del cliente) del registro que crea la operación.
  entityId: string;
  // Solo lo que el servidor necesita. Nunca contraseñas ni tokens.
  payload: Record<string, unknown>;
  // Texto para mostrar la operación en la interfaz; no se envía.
  label: string;
  createdAt: string;
  status: OutboxStatus;
  attempts: number;
  // Marca de la pestaña que la tomó (para liberar las que quedaron colgadas).
  lockedAt?: number;
  // No reintentar antes de este instante (backoff tras un error del servidor).
  nextAttemptAt?: number;
  error?: OutboxError;
  syncedAt?: string;
  // Lo que devolvió el servidor al aplicarla (el registro definitivo).
  serverEntityId?: string;
  result?: unknown;
};

export type Snapshot = {
  // Ruta completa del API, con query (p. ej. "/attendance?date=2026-10-12").
  path: string;
  data: unknown;
  savedAt: number;
};

export class OfflineDb extends Dexie {
  outbox!: Table<OutboxOp, string>;
  snapshots!: Table<Snapshot, string>;

  constructor(name: string) {
    super(name);
    // Cambios de esquema: agregar .version(n + 1) con su .upgrade(); nunca
    // editar una versión ya publicada.
    this.version(1).stores({
      outbox: 'id, status, createdAt, entityId',
      snapshots: 'path, savedAt',
    });
  }
}

const open = new Map<string, OfflineDb>();

export function dbName(scope: OfflineScope) {
  return `fg-offline-${scope.gymId}-${scope.userId}`;
}

export function getDb(scope: OfflineScope): OfflineDb {
  const name = dbName(scope);
  let db = open.get(name);
  if (!db) {
    db = new OfflineDb(name);
    open.set(name, db);
  }
  return db;
}

// Sin IndexedDB (SSR, navegador muy restringido) la app sigue funcionando
// solo en línea.
export function offlineStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

// Cierra las conexiones abiertas (pruebas: simula cerrar y reabrir el navegador).
export function closeAllDbs() {
  open.forEach((db) => db.close());
  open.clear();
}
