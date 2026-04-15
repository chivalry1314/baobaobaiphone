import { createAppPersistOptions } from '../../../../core/persistOptions';

const WORLDBOOK_STORAGE_KEY = 'worldbook-storage';

export const createWorldBookPersistOptions = <TState>() =>
  createAppPersistOptions<TState>({
    appId: 'worldbook',
    storageKey: WORLDBOOK_STORAGE_KEY,
  });
