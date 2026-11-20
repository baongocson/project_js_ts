import type { OfflineQueue, QueueStore } from '../types.ts';

const DATABASE_NAME = 'dashboard3d-offline-v1';
const STORE = 'outbox';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('INDEXEDDB_OPEN_FAILED'));
    request.onblocked = () => reject(new Error('INDEXEDDB_BLOCKED'));
  });
}

async function withTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => { /* transaction error handler is authoritative */ };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new Error('INDEXEDDB_TRANSACTION_ABORTED'));
      transaction.onerror = () => reject(transaction.error ?? new Error('INDEXEDDB_TRANSACTION_FAILED'));
    });
  } finally {
    db.close();
  }
}

/** Persistent per-queue checkpoints. Never stores access/refresh tokens. */
export class IndexedDbQueueStore implements QueueStore {
  async load(id: string): Promise<OfflineQueue | undefined> {
    return withTransaction('readonly', store => store.get(id) as IDBRequest<OfflineQueue | undefined>);
  }
  async save(queue: OfflineQueue): Promise<void> {
    await withTransaction('readwrite', store => store.put(structuredClone(queue)) as IDBRequest<IDBValidKey>);
  }
}
