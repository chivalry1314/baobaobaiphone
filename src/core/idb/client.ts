import { del, entries, get, keys, set, update, values } from 'idb-keyval';

export type IdbKey = IDBValidKey;
export type IdbStore = <T>(
  txMode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => T | PromiseLike<T>
) => Promise<T>;

export interface IdbStoreConfig {
  dbName: string;
  storeName: string;
}

const isRecoverableTransactionError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'NotFoundError' ||
    error.name === 'InvalidStateError' ||
    error.name === 'AbortError'
  );
};

const openIdbDatabase = (
  dbName: string,
  storeName: string,
  version?: number
): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request =
      typeof version === 'number' ? indexedDB.open(dbName, version) : indexedDB.open(dbName);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onerror = () => {
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });

export const createIdbStore = ({ dbName, storeName }: IdbStoreConfig): IdbStore => {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const attachDbLifecycleHandlers = (db: IDBDatabase) => {
    db.onversionchange = () => {
      db.close();
      dbPromise = null;
    };
    db.onclose = () => {
      dbPromise = null;
    };
  };

  const getDb = async (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const db = await openIdbDatabase(dbName, storeName);

        if (!db.objectStoreNames.contains(storeName)) {
          const nextVersion = db.version + 1;
          db.close();
          const upgradedDb = await openIdbDatabase(dbName, storeName, nextVersion);
          attachDbLifecycleHandlers(upgradedDb);
          return upgradedDb;
        }

        attachDbLifecycleHandlers(db);
        return db;
      })().catch((error) => {
        dbPromise = null;
        throw error;
      });
    }

    return dbPromise;
  };

  return async <T>(
    txMode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => T | PromiseLike<T>
  ): Promise<T> => {
    const runTransaction = async (): Promise<T> => {
      const db = await getDb();
      const tx = db.transaction(storeName, txMode);
      return callback(tx.objectStore(storeName));
    };

    try {
      return await runTransaction();
    } catch (error) {
      if (!isRecoverableTransactionError(error)) throw error;
      dbPromise = null;
      return runTransaction();
    }
  };
};

export const getRecord = async <T>(store: IdbStore, key: IdbKey): Promise<T | undefined> => {
  return get<T>(key, store);
};

export const setRecord = async <T>(store: IdbStore, key: IdbKey, value: T): Promise<void> => {
  await set(key, value, store);
};

export const updateRecord = async <TCurrent, TNext = TCurrent>(
  store: IdbStore,
  key: IdbKey,
  updater: (current: TCurrent | undefined) => TNext
): Promise<TNext> => {
  let nextValue: TNext | undefined;
  let hasNextValue = false;

  await update(
    key,
    (current) => {
      const updated = updater(current as TCurrent | undefined);
      nextValue = updated;
      hasNextValue = true;
      return updated;
    },
    store
  );

  if (!hasNextValue) {
    throw new Error('[idb] update callback did not produce a value');
  }

  return nextValue as TNext;
};

export const deleteRecord = async (store: IdbStore, key: IdbKey): Promise<void> => {
  await del(key, store);
};

export const listRecords = async <T>(store: IdbStore): Promise<T[]> => {
  const result = await values<unknown>(store);
  return result as T[];
};

export const listStoreKeys = async (store: IdbStore): Promise<IdbKey[]> => {
  const result = await keys(store);
  return result as IdbKey[];
};

export const listRecordEntries = async <T>(store: IdbStore): Promise<Array<[IdbKey, T]>> => {
  const result = await entries<IdbKey, T>(store);
  return result as Array<[IdbKey, T]>;
};


