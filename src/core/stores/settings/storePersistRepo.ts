import type { PersistOptions } from 'zustand/middleware';
import { createCorePersistOptions } from '../../persistOptions';

const SETTINGS_STORAGE_KEY = 'settings-storage';

type SettingsPersistHooks<TState> = Pick<
  PersistOptions<TState, TState>,
  'partialize' | 'merge' | 'onRehydrateStorage'
>;

export const createSettingsPersistOptions = <TState>(hooks?: SettingsPersistHooks<TState>) =>
  createCorePersistOptions<TState>({
    storageKey: SETTINGS_STORAGE_KEY,
    storeName: 'settings_state',
    ...(hooks ?? {}),
  });
