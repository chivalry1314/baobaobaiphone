export interface IndexedDbEntry {
  dbName: string;
  storeName: string;
  key: IDBValidKey;
  value: unknown;
}

const openDatabase = (dbName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

const listDatabaseNames = async (): Promise<string[]> => {
  const factory = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  if (typeof factory.databases !== 'function') {
    throw new Error('当前浏览器不支持 indexedDB.databases()，无法遍历所有数据库');
  }

  const dbInfos = await factory.databases();
  return dbInfos
    .map((item) => item.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
};

const readStoreEntries = (
  db: IDBDatabase,
  dbName: string,
  storeName: string
): Promise<IndexedDbEntry[]> =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.openCursor();
    const result: IndexedDbEntry[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(result);
        return;
      }

      result.push({
        dbName,
        storeName,
        key: cursor.key,
        value: cursor.value,
      });
      cursor.continue();
    };
  });

export const listIndexedDbEntries = async (): Promise<IndexedDbEntry[]> => {
  const dbNames = await listDatabaseNames();
  const allEntries: IndexedDbEntry[] = [];

  for (const dbName of dbNames) {
    const db = await openDatabase(dbName);
    try {
      const storeNames = Array.from(db.objectStoreNames);
      for (const storeName of storeNames) {
        const entries = await readStoreEntries(db, dbName, storeName);
        allEntries.push(...entries);
      }
    } finally {
      db.close();
    }
  }

  return allEntries;
};

export const readIndexedDbValue = async (
  dbName: string,
  storeName: string,
  key: IDBValidKey
): Promise<unknown> => {
  const db = await openDatabase(dbName);
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } finally {
    db.close();
  }
};

export const writeIndexedDbValue = async (
  dbName: string,
  storeName: string,
  key: IDBValidKey,
  value: unknown
): Promise<void> => {
  const db = await openDatabase(dbName);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } finally {
    db.close();
  }
};
