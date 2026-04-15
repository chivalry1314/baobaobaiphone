import {
  useSettingsCoreStore,
  type SettingsStoreState,
} from '../../../core/stores/settings/store';

export type SettingsAppStore = Pick<SettingsStoreState, 'settings' | 'updateSettings'>;

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

const selectSettingsAppStore = createCachedSelector((state: SettingsStoreState): SettingsAppStore => ({
  settings: state.settings,
  updateSettings: state.updateSettings,
}));

export const useSettingsStore = <T = SettingsAppStore>(
  selector?: (state: SettingsAppStore) => T
): T => {
  if (!selector) {
    return useSettingsCoreStore(selectSettingsAppStore as (state: SettingsStoreState) => T);
  }

  return useSettingsCoreStore((state) => selector(selectSettingsAppStore(state)));
};
