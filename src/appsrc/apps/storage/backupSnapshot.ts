import {
  clearIndexedDbStore,
  ensureIndexedDbStore,
  listIndexedDbEntries,
  listIndexedDbStores,
  writeIndexedDbValue,
} from './indexedDb';
import type { IndexedDbEntry } from './indexedDb';

export const BACKUP_SNAPSHOT_SCHEMA = 'baobaobaiphone.storage.backup';
export const BACKUP_SNAPSHOT_VERSION = 1;
export type BackupSnapshotMode = 'full' | 'category';

type SerializedNumber = 'NaN' | 'Infinity' | '-Infinity' | `${number}`;

interface SerializedStringKey {
  type: 'string';
  value: string;
}

interface SerializedNumberKey {
  type: 'number';
  value: SerializedNumber;
}

interface SerializedDateKey {
  type: 'date';
  value: string;
}

interface SerializedArrayKey {
  type: 'array';
  value: SerializedIdbKey[];
}

interface SerializedBinaryKey {
  type: 'binary';
  encoding: 'base64';
  value: string;
}

export type SerializedIdbKey =
  | SerializedStringKey
  | SerializedNumberKey
  | SerializedDateKey
  | SerializedArrayKey
  | SerializedBinaryKey;

export interface BackupSnapshotEntry {
  key: SerializedIdbKey;
  value: unknown;
}

export interface BackupSnapshotStore {
  dbName: string;
  storeName: string;
  entries: BackupSnapshotEntry[];
}

export interface BackupSnapshotPayload {
  stores: BackupSnapshotStore[];
}

export interface BackupSnapshot {
  schema: string;
  version: number;
  createdAt: string;
  mode?: BackupSnapshotMode;
  sourceCategoryId?: string;
  sourceCategoryName?: string;
  storeCount: number;
  entryCount: number;
  checksum: string;
  payload: BackupSnapshotPayload;
}

export interface BackupSnapshotSummary {
  storeCount: number;
  entryCount: number;
}

export interface ApplyBackupSnapshotOptions {
  clearUnknownStores?: boolean;
  clearTargetStores?: boolean;
}

export interface ApplyBackupSnapshotResult {
  storesCleared: number;
  entriesWritten: number;
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const encodeBase64 = (bytes: Uint8Array): string => {
  if (bytes.length === 0) return '';
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const normalizeNumber = (value: number): SerializedNumber => {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  return String(value) as SerializedNumber;
};

const reviveNumber = (value: string): number => {
  if (value === 'NaN') return Number.NaN;
  if (value === 'Infinity') return Number.POSITIVE_INFINITY;
  if (value === '-Infinity') return Number.NEGATIVE_INFINITY;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric key value: ${value}`);
  }
  return parsed;
};

const sha256Hex = async (raw: string): Promise<string> => {
  const bytes = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
};

const storeToken = (dbName: string, storeName: string) => `${dbName}\u0000${storeName}`;

const parseStoreToken = (token: string): { dbName: string; storeName: string } => {
  const splitAt = token.indexOf('\u0000');
  if (splitAt <= 0 || splitAt >= token.length - 1) {
    throw new Error(`Invalid store token: ${token}`);
  }
  return {
    dbName: token.slice(0, splitAt),
    storeName: token.slice(splitAt + 1),
  };
};

const keySortToken = (key: SerializedIdbKey): string => JSON.stringify(key);

const serializeIdbKey = (key: IDBValidKey): SerializedIdbKey => {
  if (typeof key === 'string') {
    return { type: 'string', value: key };
  }

  if (typeof key === 'number') {
    return { type: 'number', value: normalizeNumber(key) };
  }

  if (key instanceof Date) {
    const iso = key.toISOString();
    if (!iso) {
      throw new Error('Failed to serialize Date key');
    }
    return { type: 'date', value: iso };
  }

  if (Array.isArray(key)) {
    return { type: 'array', value: key.map((item) => serializeIdbKey(item as IDBValidKey)) };
  }

  if (key instanceof ArrayBuffer) {
    return {
      type: 'binary',
      encoding: 'base64',
      value: encodeBase64(new Uint8Array(key)),
    };
  }

  if (ArrayBuffer.isView(key)) {
    const view = key as ArrayBufferView;
    const binary = new Uint8Array(view.byteLength);
    binary.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return {
      type: 'binary',
      encoding: 'base64',
      value: encodeBase64(binary),
    };
  }

  throw new Error(`Unsupported IDB key type: ${Object.prototype.toString.call(key)}`);
};

const deserializeIdbKey = (key: SerializedIdbKey): IDBValidKey => {
  if (key.type === 'string') {
    return key.value;
  }
  if (key.type === 'number') {
    return reviveNumber(key.value);
  }
  if (key.type === 'date') {
    const parsed = new Date(key.value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date key value: ${key.value}`);
    }
    return parsed;
  }
  if (key.type === 'array') {
    return key.value.map((item) => deserializeIdbKey(item));
  }
  const bytes = decodeBase64(key.value);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const ensureSerializedKey = (value: unknown): SerializedIdbKey => {
  if (!isObject(value) || typeof value.type !== 'string') {
    throw new Error('Invalid backup key payload');
  }

  if (value.type === 'string') {
    if (typeof value.value !== 'string') throw new Error('Invalid string key payload');
    return { type: 'string', value: value.value };
  }

  if (value.type === 'number') {
    if (typeof value.value !== 'string') throw new Error('Invalid number key payload');
    const normalized = value.value as SerializedNumber;
    return { type: 'number', value: normalized };
  }

  if (value.type === 'date') {
    if (typeof value.value !== 'string') throw new Error('Invalid date key payload');
    return { type: 'date', value: value.value };
  }

  if (value.type === 'array') {
    if (!Array.isArray(value.value)) throw new Error('Invalid array key payload');
    return {
      type: 'array',
      value: value.value.map((item) => ensureSerializedKey(item)),
    };
  }

  if (value.type === 'binary') {
    if (value.encoding !== 'base64' || typeof value.value !== 'string') {
      throw new Error('Invalid binary key payload');
    }
    return {
      type: 'binary',
      encoding: 'base64',
      value: value.value,
    };
  }

  throw new Error(`Unsupported key type in backup payload: ${value.type}`);
};

const normalizeSnapshotStores = (stores: BackupSnapshotStore[]): BackupSnapshotStore[] => {
  return stores
    .map((store) => ({
      ...store,
      entries: [...store.entries].sort((left, right) =>
        keySortToken(left.key).localeCompare(keySortToken(right.key))
      ),
    }))
    .sort((left, right) => {
      if (left.dbName === right.dbName) {
        return left.storeName.localeCompare(right.storeName);
      }
      return left.dbName.localeCompare(right.dbName);
    });
};

const normalizeSnapshotPayload = (payload: BackupSnapshotPayload): BackupSnapshotPayload => {
  return {
    stores: normalizeSnapshotStores(payload.stores),
  };
};

const createChecksum = async (payload: BackupSnapshotPayload): Promise<string> => {
  const checksumPayload = JSON.stringify(payload);
  return sha256Hex(checksumPayload);
};

interface BuildSnapshotOptions {
  mode?: BackupSnapshotMode;
  sourceCategoryId?: string;
  sourceCategoryName?: string;
}

const buildSnapshotFromStores = async (
  stores: BackupSnapshotStore[],
  options?: BuildSnapshotOptions
): Promise<BackupSnapshot> => {
  const payload = normalizeSnapshotPayload({ stores });
  const summary = summarizeBackupSnapshot({
    schema: BACKUP_SNAPSHOT_SCHEMA,
    version: BACKUP_SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    mode: options?.mode ?? 'full',
    sourceCategoryId: options?.sourceCategoryId,
    sourceCategoryName: options?.sourceCategoryName,
    storeCount: payload.stores.length,
    entryCount: 0,
    checksum: '',
    payload,
  });
  const createdAt = new Date().toISOString();
  const checksum = await createChecksum(payload);

  return {
    schema: BACKUP_SNAPSHOT_SCHEMA,
    version: BACKUP_SNAPSHOT_VERSION,
    createdAt,
    mode: options?.mode ?? 'full',
    sourceCategoryId: options?.sourceCategoryId,
    sourceCategoryName: options?.sourceCategoryName,
    storeCount: summary.storeCount,
    entryCount: summary.entryCount,
    checksum,
    payload,
  };
};

export const summarizeBackupSnapshot = (snapshot: BackupSnapshot): BackupSnapshotSummary => {
  return {
    storeCount: snapshot.payload.stores.length,
    entryCount: snapshot.payload.stores.reduce((total, store) => total + store.entries.length, 0),
  };
};

export const buildBackupFileName = (now: Date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  return `baobaobaiphone-backup-${timestamp}.json`;
};

export const createBackupSnapshot = async (): Promise<BackupSnapshot> => {
  const [entries, stores] = await Promise.all([listIndexedDbEntries(), listIndexedDbStores()]);
  const groupedStores = new Map<string, BackupSnapshotEntry[]>();

  stores.forEach((store) => {
    groupedStores.set(storeToken(store.dbName, store.storeName), []);
  });

  entries.forEach((entry) => {
    const token = storeToken(entry.dbName, entry.storeName);
    const bucket = groupedStores.get(token) ?? [];
    bucket.push({
      key: serializeIdbKey(entry.key),
      value: entry.value,
    });
    groupedStores.set(token, bucket);
  });

  const snapshotStores: BackupSnapshotStore[] = Array.from(groupedStores.entries()).map(
    ([token, storeEntries]) => {
      const parsed = parseStoreToken(token);
      return {
        dbName: parsed.dbName,
        storeName: parsed.storeName,
        entries: storeEntries,
      };
    }
  );

  return buildSnapshotFromStores(snapshotStores, { mode: 'full' });
};

export const createBackupSnapshotFromEntries = async (
  entries: IndexedDbEntry[],
  options?: BuildSnapshotOptions
): Promise<BackupSnapshot> => {
  const groupedStores = new Map<string, BackupSnapshotEntry[]>();

  entries.forEach((entry) => {
    const token = storeToken(entry.dbName, entry.storeName);
    const bucket = groupedStores.get(token) ?? [];
    bucket.push({
      key: serializeIdbKey(entry.key),
      value: entry.value,
    });
    groupedStores.set(token, bucket);
  });

  const snapshotStores: BackupSnapshotStore[] = Array.from(groupedStores.entries()).map(
    ([token, storeEntries]) => {
      const parsed = parseStoreToken(token);
      return {
        dbName: parsed.dbName,
        storeName: parsed.storeName,
        entries: storeEntries,
      };
    }
  );

  return buildSnapshotFromStores(snapshotStores, options);
};

export const stringifyBackupSnapshot = (snapshot: BackupSnapshot): string => {
  return JSON.stringify(snapshot, null, 2);
};

export const snapshotToBlob = (snapshot: BackupSnapshot): Blob => {
  return new Blob([stringifyBackupSnapshot(snapshot)], {
    type: 'application/json;charset=utf-8',
  });
};

export const parseBackupSnapshotText = async (raw: string): Promise<BackupSnapshot> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }

  if (!isObject(parsed)) {
    throw new Error('Backup payload must be an object');
  }

  if (parsed.schema !== BACKUP_SNAPSHOT_SCHEMA) {
    throw new Error('Unsupported backup schema');
  }

  if (parsed.version !== BACKUP_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported backup version: ${String(parsed.version)}`);
  }

  if (typeof parsed.createdAt !== 'string' || Number.isNaN(new Date(parsed.createdAt).getTime())) {
    throw new Error('Backup createdAt is invalid');
  }

  if (typeof parsed.checksum !== 'string' || parsed.checksum.trim() === '') {
    throw new Error('Backup checksum is missing');
  }

  if (!isObject(parsed.payload) || !Array.isArray(parsed.payload.stores)) {
    throw new Error('Backup payload.stores is invalid');
  }

  const normalizedStores: BackupSnapshotStore[] = parsed.payload.stores.map((rawStore) => {
    if (!isObject(rawStore)) {
      throw new Error('Backup store entry must be an object');
    }
    if (typeof rawStore.dbName !== 'string' || rawStore.dbName.trim() === '') {
      throw new Error('Backup store dbName is invalid');
    }
    if (typeof rawStore.storeName !== 'string' || rawStore.storeName.trim() === '') {
      throw new Error('Backup store storeName is invalid');
    }
    if (!Array.isArray(rawStore.entries)) {
      throw new Error('Backup store entries must be an array');
    }

    const entries: BackupSnapshotEntry[] = rawStore.entries.map((rawEntry) => {
      if (!isObject(rawEntry)) {
        throw new Error('Backup entry must be an object');
      }
      return {
        key: ensureSerializedKey(rawEntry.key),
        value: rawEntry.value,
      };
    });

    return {
      dbName: rawStore.dbName,
      storeName: rawStore.storeName,
      entries,
    };
  });

  const payload = normalizeSnapshotPayload({ stores: normalizedStores });
  const expectedChecksum = await createChecksum(payload);
  if (expectedChecksum.toLowerCase() !== parsed.checksum.toLowerCase()) {
    throw new Error('Backup checksum mismatch');
  }

  const summary = summarizeBackupSnapshot({
    schema: BACKUP_SNAPSHOT_SCHEMA,
    version: BACKUP_SNAPSHOT_VERSION,
    createdAt: parsed.createdAt,
    mode: parsed.mode === 'category' ? 'category' : 'full',
    sourceCategoryId: typeof parsed.sourceCategoryId === 'string' ? parsed.sourceCategoryId : undefined,
    sourceCategoryName:
      typeof parsed.sourceCategoryName === 'string' ? parsed.sourceCategoryName : undefined,
    storeCount: payload.stores.length,
    entryCount: 0,
    checksum: parsed.checksum,
    payload,
  });

  if (typeof parsed.storeCount === 'number' && parsed.storeCount !== summary.storeCount) {
    throw new Error('Backup storeCount does not match payload');
  }

  if (typeof parsed.entryCount === 'number' && parsed.entryCount !== summary.entryCount) {
    throw new Error('Backup entryCount does not match payload');
  }

  return {
    schema: BACKUP_SNAPSHOT_SCHEMA,
    version: BACKUP_SNAPSHOT_VERSION,
    createdAt: parsed.createdAt,
    mode: parsed.mode === 'category' ? 'category' : 'full',
    sourceCategoryId: typeof parsed.sourceCategoryId === 'string' ? parsed.sourceCategoryId : undefined,
    sourceCategoryName:
      typeof parsed.sourceCategoryName === 'string' ? parsed.sourceCategoryName : undefined,
    storeCount: summary.storeCount,
    entryCount: summary.entryCount,
    checksum: parsed.checksum,
    payload,
  };
};

export const parseBackupSnapshotFile = async (file: Blob): Promise<BackupSnapshot> => {
  const raw = await file.text();
  return parseBackupSnapshotText(raw);
};

export const applyBackupSnapshot = async (
  snapshot: BackupSnapshot,
  options?: ApplyBackupSnapshotOptions
): Promise<ApplyBackupSnapshotResult> => {
  const isCategorySnapshot = snapshot.mode === 'category';
  const clearUnknownStores = options?.clearUnknownStores ?? !isCategorySnapshot;
  const clearTargetStores = options?.clearTargetStores ?? !isCategorySnapshot;
  const snapshotStores = snapshot.payload.stores;
  const storesToClearMap = new Map<string, { dbName: string; storeName: string }>();

  if (clearTargetStores) {
    snapshotStores.forEach((store) => {
      storesToClearMap.set(storeToken(store.dbName, store.storeName), {
        dbName: store.dbName,
        storeName: store.storeName,
      });
    });
  }

  if (clearUnknownStores) {
    const currentStores = await listIndexedDbStores();
    currentStores.forEach((store) => {
      storesToClearMap.set(storeToken(store.dbName, store.storeName), {
        dbName: store.dbName,
        storeName: store.storeName,
      });
    });
  }

  const storesToClear = Array.from(storesToClearMap.values()).sort((left, right) => {
    if (left.dbName === right.dbName) {
      return left.storeName.localeCompare(right.storeName);
    }
    return left.dbName.localeCompare(right.dbName);
  });

  for (const store of storesToClear) {
    await ensureIndexedDbStore(store.dbName, store.storeName);
    await clearIndexedDbStore(store.dbName, store.storeName);
  }

  let entriesWritten = 0;
  for (const store of snapshotStores) {
    await ensureIndexedDbStore(store.dbName, store.storeName);
    for (const entry of store.entries) {
      const key = deserializeIdbKey(entry.key);
      await writeIndexedDbValue(store.dbName, store.storeName, key, entry.value);
      entriesWritten += 1;
    }
  }

  return {
    storesCleared: storesToClear.length,
    entriesWritten,
  };
};
