import type { IdbStoreConfig } from './idb';
import { readIdbRawValue, updateIdbRawValue, writeIdbRawValue } from './storage';

export interface PersistEnvelope<T> {
  state: T;
  version?: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parsePersistEnvelope = <T>(raw: unknown): PersistEnvelope<T> | null => {
  if (raw == null) return null;
  if (!isPlainObject(raw) || !('state' in raw)) return null;

  const state = raw.state as T | undefined;
  if (state === undefined) return null;

  const version = raw.version;
  return typeof version === 'number' ? { state, version } : { state };
};

export const readPersistEnvelope = async <T>(
  config: IdbStoreConfig,
  key: IDBValidKey
): Promise<PersistEnvelope<T> | null> => {
  const raw = await readIdbRawValue<unknown>(config, key);
  return parsePersistEnvelope<T>(raw);
};

export const writePersistEnvelope = async <T>(
  config: IdbStoreConfig,
  key: IDBValidKey,
  envelope: PersistEnvelope<T>
): Promise<void> => {
  await writeIdbRawValue<PersistEnvelope<T>>(config, key, envelope);
};

export const updatePersistEnvelope = async <T>(
  config: IdbStoreConfig,
  key: IDBValidKey,
  updater: (current: PersistEnvelope<T> | null) => PersistEnvelope<T>
): Promise<PersistEnvelope<T>> => {
  return updateIdbRawValue<unknown, PersistEnvelope<T>>(config, key, (raw) => {
    const current = parsePersistEnvelope<T>(raw);
    return updater(current);
  });
};
