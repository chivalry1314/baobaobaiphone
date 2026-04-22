export interface IndexedDbEntry {
  dbName: string;
  storeName: string;
  key: IDBValidKey;
  value: unknown;
}

export interface IndexedDbStoreRef {
  dbName: string;
  storeName: string;
}

const KNOWN_DB_NAMES_KEY = 'storage-app-known-idb-names-v1';
const FALLBACK_DATABASE_CANDIDATES = ['keyval-store', 'idb-keyval'];

const hasLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const uniqueStrings = (items: string[]) => {
  return Array.from(
    new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))
  );
};

const loadKnownDatabaseNames = (): string[] => {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KNOWN_DB_NAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return uniqueStrings(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return [];
  }
};

const saveKnownDatabaseNames = (names: string[]) => {
  if (!hasLocalStorage()) return;
  try {
    const next = uniqueStrings(names);
    if (next.length === 0) return;
    window.localStorage.setItem(KNOWN_DB_NAMES_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage write errors.
  }
};

const rememberDatabaseName = (dbName: string) => {
  const name = dbName.trim();
  if (!name) return;
  const known = loadKnownDatabaseNames();
  if (known.includes(name)) return;
  saveKnownDatabaseNames([...known, name]);
};

const databaseExistsWithoutCreating = async (dbName: string): Promise<boolean> => {
  const name = dbName.trim();
  if (!name) return false;

  return new Promise<boolean>((resolve) => {
    let createdInProbe = false;
    const request = indexedDB.open(name);
    request.onerror = () => resolve(false);
    request.onupgradeneeded = () => {
      createdInProbe = true;
    };
    request.onsuccess = () => {
      const db = request.result;
      db.close();

      if (!createdInProbe) {
        resolve(true);
        return;
      }

      const cleanup = indexedDB.deleteDatabase(name);
      cleanup.onsuccess = () => resolve(false);
      cleanup.onerror = () => resolve(false);
      cleanup.onblocked = () => resolve(false);
    };
  });
};

const openDatabase = (dbName: string, version?: number): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = version ? indexedDB.open(dbName, version) : indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      rememberDatabaseName(dbName);
      resolve(request.result);
    };
  });

const listDatabaseNames = async (): Promise<string[]> => {
  const factory = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  if (typeof factory.databases === 'function') {
    const dbInfos = await factory.databases();
    const discovered = dbInfos
      .map((item) => item.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    const merged = uniqueStrings([...discovered, ...loadKnownDatabaseNames()]);
    saveKnownDatabaseNames(merged);
    return merged;
  }

  const candidates = uniqueStrings([...loadKnownDatabaseNames(), ...FALLBACK_DATABASE_CANDIDATES]);
  const existing: string[] = [];
  for (const dbName of candidates) {
    if (await databaseExistsWithoutCreating(dbName)) {
      existing.push(dbName);
    }
  }

  if (existing.length > 0) {
    saveKnownDatabaseNames(existing);
    return existing;
  }

  throw new Error(
    'Current browser does not support indexedDB.databases() and no known IndexedDB names were found.'
  );
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
    if (!(await databaseExistsWithoutCreating(dbName))) continue;
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

const openDatabaseEnsuringStore = async (dbName: string, storeName: string): Promise<IDBDatabase> => {
  const initial = await openDatabase(dbName);
  if (initial.objectStoreNames.contains(storeName)) {
    return initial;
  }

  const nextVersion = initial.version + 1;
  initial.close();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, nextVersion);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => {
      rememberDatabaseName(dbName);
      resolve(request.result);
    };
  });
};

export const ensureIndexedDbStore = async (dbName: string, storeName: string): Promise<void> => {
  const db = await openDatabaseEnsuringStore(dbName, storeName);
  db.close();
};

export const listIndexedDbStores = async (): Promise<IndexedDbStoreRef[]> => {
  const dbNames = await listDatabaseNames();
  const allStores: IndexedDbStoreRef[] = [];

  for (const dbName of dbNames) {
    if (!(await databaseExistsWithoutCreating(dbName))) continue;
    const db = await openDatabase(dbName);
    try {
      Array.from(db.objectStoreNames).forEach((storeName) => {
        allStores.push({ dbName, storeName });
      });
    } finally {
      db.close();
    }
  }

  return allStores;
};

export const clearIndexedDbStore = async (dbName: string, storeName: string): Promise<void> => {
  const db = await openDatabaseEnsuringStore(dbName, storeName);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      const request = tx.objectStore(storeName).clear();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
    });
  } finally {
    db.close();
  }
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
  const db = await openDatabaseEnsuringStore(dbName, storeName);
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

