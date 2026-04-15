import { createCorePersistOptions } from '../../persistOptions';

const DESKTOP_STORAGE_KEY = 'desktop-storage';

export const createDesktopPersistOptions = <TState>() =>
  createCorePersistOptions<TState>({
    storageKey: DESKTOP_STORAGE_KEY,
    storeName: 'desktop_state',
  });
