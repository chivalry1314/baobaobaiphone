import type { PersistOptions } from 'zustand/middleware';
import type { IdbStoreConfig } from './idb';
import {
  createAppStorageKey,
  createAppStoreConfig,
  createCoreStoreConfig,
  createIdbJSONStorage,
} from './storage';

type PersistOptionHooks<TState, TPersistedState> = Pick<
  PersistOptions<TState, TPersistedState>,
  'partialize' | 'merge' | 'onRehydrateStorage'
>;

interface CreatePersistOptionsInput<TState, TPersistedState>
  extends PersistOptionHooks<TState, TPersistedState> {
  storageKey: string;
  idbConfig: IdbStoreConfig;
}

interface CreateAppPersistOptionsInput<TState, TPersistedState>
  extends PersistOptionHooks<TState, TPersistedState> {
  appId: string;
  storageKey?: string;
  storeName?: string;
}

interface CreateCorePersistOptionsInput<TState, TPersistedState>
  extends PersistOptionHooks<TState, TPersistedState> {
  storageKey: string;
  storeName: string;
}

const createPersistOptions = <TState, TPersistedState>({
  storageKey,
  idbConfig,
  partialize,
  merge,
  onRehydrateStorage,
}: CreatePersistOptionsInput<TState, TPersistedState>) => ({
  name: storageKey,
  storage: createIdbJSONStorage(idbConfig),
  ...(partialize ? { partialize } : {}),
  ...(merge ? { merge } : {}),
  ...(onRehydrateStorage ? { onRehydrateStorage } : {}),
});

export const createAppPersistOptions = <TState, TPersistedState = TState>({
  appId,
  storageKey = createAppStorageKey(appId),
  storeName = 'state',
  partialize,
  merge,
  onRehydrateStorage,
}: CreateAppPersistOptionsInput<TState, TPersistedState>) =>
  createPersistOptions<TState, TPersistedState>({
    storageKey,
    idbConfig: createAppStoreConfig(appId, storeName),
    partialize,
    merge,
    onRehydrateStorage,
  });

export const createCorePersistOptions = <TState, TPersistedState = TState>({
  storageKey,
  storeName,
  partialize,
  merge,
  onRehydrateStorage,
}: CreateCorePersistOptionsInput<TState, TPersistedState>) =>
  createPersistOptions<TState, TPersistedState>({
    storageKey,
    idbConfig: createCoreStoreConfig(storeName),
    partialize,
    merge,
    onRehydrateStorage,
  });
