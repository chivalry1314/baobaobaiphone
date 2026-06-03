import { createCorePersistOptions } from '../../persistOptions';

const THEME_STORAGE_KEY = 'theme-storage';

export const createThemePersistOptions = <TState>() =>
  createCorePersistOptions<TState>({
    storageKey: THEME_STORAGE_KEY,
    storeName: 'theme_state',
  });

