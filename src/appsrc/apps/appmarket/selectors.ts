import { useAppMarketStore } from './store';
import type { UploadedMarketApp } from './types';

export interface AppMarketInstallSnapshot {
  installedAppIds: string[];
  uploadedApps: UploadedMarketApp[];
}

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

const selectAppMarketInstallSnapshot = createCachedSelector(
  (state: ReturnType<typeof useAppMarketStore.getState>): AppMarketInstallSnapshot => ({
    installedAppIds: state.installedAppIds,
    uploadedApps: state.uploadedApps,
  })
);

export const useAppMarketInstallSnapshot = (): AppMarketInstallSnapshot => {
  return useAppMarketStore(selectAppMarketInstallSnapshot);
};

export const useInstalledAppIds = (): string[] => {
  return useAppMarketStore((state) => state.installedAppIds);
};