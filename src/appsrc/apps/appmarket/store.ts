import { create } from 'zustand';
import { loadAppMarketPersistedState } from './data/hydrate';
import { createAppMarketActions } from './store/actions';
import type { AppMarketStore } from './store/types';

const hydrationListeners = new Set<() => void>();
let hydrationPromise: Promise<void> | null = null;

const emitHydrated = () => {
  hydrationListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[AppMarketStore] hydrate listener failed:', error);
    }
  });
};

export const useAppMarketStore = create<AppMarketStore>()((set, get) => ({
  installedAppIds: [],
  uploadedApps: [],
  shareThemeSourceBaseUrl: '',
  isHydrated: false,
  ...createAppMarketActions({
    set,
    get,
  }),
}));

export const hasAppMarketHydrated = (): boolean => useAppMarketStore.getState().isHydrated;

export const onAppMarketHydrated = (listener: () => void): (() => void) => {
  if (hasAppMarketHydrated()) {
    listener();
    return () => {};
  }

  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
};

export const hydrateAppMarketStore = async (): Promise<void> => {
  if (hasAppMarketHydrated()) return;
  if (hydrationPromise) {
    await hydrationPromise;
    return;
  }

  hydrationPromise = (async () => {
    try {
      const persistedState = await loadAppMarketPersistedState();
      useAppMarketStore.setState((state) => ({
        ...state,
        installedAppIds: persistedState.installedAppIds,
        uploadedApps: persistedState.uploadedApps,
        isHydrated: true,
      }));
    } catch (error) {
      console.error('[AppMarketStore] hydrate failed:', error);
      useAppMarketStore.setState({ isHydrated: true });
    } finally {
      emitHydrated();
    }
  })();

  try {
    await hydrationPromise;
  } finally {
    hydrationPromise = null;
  }
};

void hydrateAppMarketStore();
