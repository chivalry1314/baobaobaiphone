import { useDesktopCoreStore } from './desktop/store';
import { useSettingsCoreStore } from './settings/store';

export const hasCoreStoresHydrated = (): boolean =>
  useSettingsCoreStore.persist.hasHydrated() &&
  useDesktopCoreStore.persist.hasHydrated();

export const onCoreStoresHydrated = (listener: () => void): (() => void) => {
  if (hasCoreStoresHydrated()) {
    listener();
    return () => {};
  }

  let disposed = false;
  let unsubs: Array<() => void> = [];

  const cleanup = () => {
    unsubs.forEach((unsubscribe) => unsubscribe());
    unsubs = [];
  };

  const checkHydration = () => {
    if (disposed) return;
    if (!hasCoreStoresHydrated()) return;
    disposed = true;
    cleanup();
    listener();
  };

  unsubs = [
    useSettingsCoreStore.persist.onFinishHydration(checkHydration),
    useDesktopCoreStore.persist.onFinishHydration(checkHydration),
  ];

  checkHydration();

  return () => {
    if (disposed) return;
    disposed = true;
    cleanup();
  };
};
