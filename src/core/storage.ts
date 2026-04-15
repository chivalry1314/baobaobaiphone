import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import {
  createIdbStore,
  deleteRecord,
  getRecord,
  setRecord,
  updateRecord,
  type IdbStore,
  type IdbStoreConfig,
} from './idb';

export const createAppStorageKey = (appId: string) => `${appId}-storage`;

export const CORE_OS_DB_NAME = 'mimiphone.core.os.v1';
const APP_DB_PREFIX = 'mimiphone.app';
const DB_SCHEMA_VERSION = 'v1';

const idbStoreCache = new Map<string, IdbStore>();

const createStoreCacheKey = (config: IdbStoreConfig): string =>
  `${config.dbName}::${config.storeName}`;

const getOrCreateIdbStore = (config: IdbStoreConfig): IdbStore => {
  const cacheKey = createStoreCacheKey(config);
  const cached = idbStoreCache.get(cacheKey);
  if (cached) return cached;

  const nextStore = createIdbStore(config);
  idbStoreCache.set(cacheKey, nextStore);
  return nextStore;
};

export const createAppDbName = (appId: string): string => {
  const normalizedAppId = appId.trim().toLowerCase();
  if (!normalizedAppId) {
    throw new Error('[storage] appId is required to create app db name');
  }
  return `${APP_DB_PREFIX}.${normalizedAppId}.${DB_SCHEMA_VERSION}`;
};

export const createAppStoreConfig = (appId: string, storeName = 'state'): IdbStoreConfig => ({
  dbName: createAppDbName(appId),
  storeName,
});

export const createCoreStoreConfig = (storeName: string): IdbStoreConfig => ({
  dbName: CORE_OS_DB_NAME,
  storeName,
});

const createIdbStorage = (config: IdbStoreConfig): StateStorage => {
  const store = getOrCreateIdbStore(config);
  return {
    getItem: async (name: string): Promise<string | null> => {
      const value = await getRecord<unknown>(store, name);
      if (value == null) return null;
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await setRecord(store, name, JSON.parse(value));
    },
    removeItem: async (name: string): Promise<void> => {
      await deleteRecord(store, name);
    },
  };
};

export const createIdbJSONStorage = (config: IdbStoreConfig) => {
  return createJSONStorage(() => createIdbStorage(config));
};

export const readIdbRawValue = async <T>(
  config: IdbStoreConfig,
  key: IDBValidKey
): Promise<T | undefined> => {
  const store = getOrCreateIdbStore(config);
  return getRecord<T>(store, key);
};

export const writeIdbRawValue = async <T>(
  config: IdbStoreConfig,
  key: IDBValidKey,
  value: T
): Promise<void> => {
  const store = getOrCreateIdbStore(config);
  await setRecord(store, key, value);
};

export const deleteIdbRawValue = async (
  config: IdbStoreConfig,
  key: IDBValidKey
): Promise<void> => {
  const store = getOrCreateIdbStore(config);
  await deleteRecord(store, key);
};

export const updateIdbRawValue = async <TCurrent, TNext = TCurrent>(
  config: IdbStoreConfig,
  key: IDBValidKey,
  updater: (current: TCurrent | undefined) => TNext
): Promise<TNext> => {
  const store = getOrCreateIdbStore(config);
  return updateRecord<TCurrent, TNext>(store, key, updater);
};
