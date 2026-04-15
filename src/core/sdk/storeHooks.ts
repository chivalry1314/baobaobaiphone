import { useDesktopCoreStore, type DesktopStoreState } from '../stores/desktop/store';
import { useSettingsCoreStore } from '../stores/settings/store';
import type { GlobalSettings, WorldInfoEntry } from './types';

export type GlobalSettingsStore = Pick<
  ReturnType<typeof useSettingsCoreStore.getState>,
  'settings' | 'updateSettings'
>;

export type GlobalDesktopStore = Pick<
  DesktopStoreState,
  | 'desktopLayout'
  | 'updateDesktopLayout'
  | 'addDesktopItem'
  | 'updateDesktopItem'
  | 'removeDesktopItem'
>;

export interface GlobalWorldBookStore {
  worldBook: WorldInfoEntry[];
  setWorldBook: (entries: WorldInfoEntry[]) => void;
  addWorldEntry: (entry: Omit<WorldInfoEntry, 'id'>) => void;
  updateWorldEntry: (id: string, entry: Partial<WorldInfoEntry>) => void;
  deleteWorldEntry: (id: string) => void;
}

type GlobalWorldBookStoreSelector<T> = (state: GlobalWorldBookStore) => T;
type UseGlobalWorldBookStoreHook = <T>(selector: GlobalWorldBookStoreSelector<T>) => T;

const defaultGlobalWorldBookStore: GlobalWorldBookStore = {
  worldBook: [],
  setWorldBook: () => {},
  addWorldEntry: () => {},
  updateWorldEntry: () => {},
  deleteWorldEntry: () => {},
};

let useRegisteredGlobalWorldBookStore: UseGlobalWorldBookStoreHook = (selector) =>
  selector(defaultGlobalWorldBookStore);

export const registerGlobalWorldBookStoreHook = (
  hook: UseGlobalWorldBookStoreHook | null | undefined
): void => {
  useRegisteredGlobalWorldBookStore = hook ?? ((selector) => selector(defaultGlobalWorldBookStore));
};

const createCachedSelector = <TSource, TResult>(
  selector: (state: TSource) => TResult
): ((state: TSource) => TResult) => {
  let hasLast = false;
  let lastState: TSource | null = null;
  let lastResult: TResult;

  return (state: TSource): TResult => {
    if (hasLast && lastState === state) {
      return lastResult;
    }

    const next = selector(state);
    hasLast = true;
    lastState = state;
    lastResult = next;
    return next;
  };
};

const selectGlobalSettingsStore = createCachedSelector(
  (state: ReturnType<typeof useSettingsCoreStore.getState>): GlobalSettingsStore => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
  })
);

const selectGlobalDesktopStore = createCachedSelector((state: DesktopStoreState): GlobalDesktopStore => ({
  desktopLayout: state.desktopLayout,
  updateDesktopLayout: state.updateDesktopLayout,
  addDesktopItem: state.addDesktopItem,
  updateDesktopItem: state.updateDesktopItem,
  removeDesktopItem: state.removeDesktopItem,
}));

const identityWorldBookSelector = (state: GlobalWorldBookStore): GlobalWorldBookStore => state;

export const useGlobalSettingsStore = <T = GlobalSettingsStore>(
  selector?: (state: GlobalSettingsStore) => T
): T => {
  if (!selector) {
    return useSettingsCoreStore(selectGlobalSettingsStore as (state: ReturnType<typeof useSettingsCoreStore.getState>) => T);
  }

  return useSettingsCoreStore((state) => selector(selectGlobalSettingsStore(state)));
};

export const useGlobalDesktopStore = <T = GlobalDesktopStore>(
  selector?: (state: GlobalDesktopStore) => T
): T => {
  if (!selector) {
    return useDesktopCoreStore(selectGlobalDesktopStore as (state: DesktopStoreState) => T);
  }

  return useDesktopCoreStore((state) => selector(selectGlobalDesktopStore(state)));
};

export const useGlobalWorldBookStore = <T = GlobalWorldBookStore>(
  selector?: (state: GlobalWorldBookStore) => T
): T => {
  if (!selector) {
    return useRegisteredGlobalWorldBookStore(
      identityWorldBookSelector as (state: GlobalWorldBookStore) => T
    );
  }

  return useRegisteredGlobalWorldBookStore((state) => selector(state));
};

export const getGlobalSettingsSnapshot = (): GlobalSettings => {
  return useSettingsCoreStore.getState().settings;
};

/**
 * Global system settings hooks for SDK consumers.
 */
export const useGlobalSettings = (): {
  settings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
} => {
  const settings = useGlobalSettingsStore((state) => state.settings);
  const updateSettings = useGlobalSettingsStore((state) => state.updateSettings);
  return { settings, updateSettings };
};

/**
 * World book hooks for SDK consumers.
 */
export const useWorldBook = (): {
  worldBook: WorldInfoEntry[];
  setWorldBook: (entries: WorldInfoEntry[]) => void;
  addWorldEntry: (entry: Omit<WorldInfoEntry, 'id'>) => void;
  updateWorldEntry: (id: string, entry: Partial<WorldInfoEntry>) => void;
  deleteWorldEntry: (id: string) => void;
} => {
  const worldBook = useGlobalWorldBookStore((state) => state.worldBook);
  const setWorldBook = useGlobalWorldBookStore((state) => state.setWorldBook);
  const addWorldEntry = useGlobalWorldBookStore((state) => state.addWorldEntry);
  const updateWorldEntry = useGlobalWorldBookStore((state) => state.updateWorldEntry);
  const deleteWorldEntry = useGlobalWorldBookStore((state) => state.deleteWorldEntry);

  return {
    worldBook,
    setWorldBook,
    addWorldEntry,
    updateWorldEntry,
    deleteWorldEntry,
  };
};
