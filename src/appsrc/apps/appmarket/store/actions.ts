import { isSystemAppId } from '../../../../core/systemApps';
import {
  ensureInstalledApp,
  removeInstalledApp as removeInstalledAppEntity,
} from '../data/repositories/installedRepo';
import {
  removeUploadedApp as removeUploadedAppEntity,
  upsertUploadedApp,
} from '../data/repositories/uploadedRepo';
import { setShareThemeSourcePreference } from '../data/repositories/preferencesRepo';
import { normalizeUploadedApp } from './utils';
import type { AppMarketStore } from './types';

type SetAppMarketState = (
  partial:
    | AppMarketStore
    | Partial<AppMarketStore>
    | ((state: AppMarketStore) => AppMarketStore | Partial<AppMarketStore>)
) => void;

interface CreateAppMarketActionsInput {
  set: SetAppMarketState;
  get: () => AppMarketStore;
}

export const createAppMarketActions = ({
  set,
  get,
}: CreateAppMarketActionsInput): Pick<
  AppMarketStore,
  'installApp' | 'uninstallApp' | 'addUploadedApp' | 'removeUploadedApp' | 'setShareThemeSourceBaseUrl'
> => ({
  installApp: (appId) => {
    const normalizedId = appId.trim();
    if (!normalizedId || isSystemAppId(normalizedId)) return;

    let didInstall = false;
    set((state) => {
      if (state.installedAppIds.includes(normalizedId)) return state;
      didInstall = true;
      return { installedAppIds: [...state.installedAppIds, normalizedId] };
    });

    if (!didInstall) return;

    void ensureInstalledApp(normalizedId).catch((error) => {
      console.error('[AppMarketStore] 安装状态持久化失败：', error);
      set((state) => {
        if (!state.installedAppIds.includes(normalizedId)) return state;
        return {
          installedAppIds: state.installedAppIds.filter((id) => id !== normalizedId),
        };
      });
    });
  },

  uninstallApp: (appId) => {
    const normalizedId = appId.trim();
    if (!normalizedId || isSystemAppId(normalizedId)) return;

    const previousInstalledIds = get().installedAppIds;
    set((state) => ({
      installedAppIds: state.installedAppIds.filter((id) => id !== normalizedId),
    }));

    void removeInstalledAppEntity(normalizedId).catch((error) => {
      console.error('[AppMarketStore] 卸载状态持久化失败：', error);
      set({ installedAppIds: previousInstalledIds });
    });
  },

  addUploadedApp: (payload) => {
    const nextApp = normalizeUploadedApp(payload);

    set((state) => ({
      uploadedApps: [nextApp, ...state.uploadedApps],
    }));

    void upsertUploadedApp(nextApp).catch((error) => {
      console.error('[AppMarketStore] 上传应用持久化失败：', error);
      set((state) => ({
        uploadedApps: state.uploadedApps.filter((app) => app.id !== nextApp.id),
      }));
    });

    return nextApp;
  },

  removeUploadedApp: (appId) => {
    const normalizedId = appId.trim();
    if (!normalizedId) return;

    let removedApp = null as AppMarketStore['uploadedApps'][number] | null;
    let wasInstalled = false;

    set((state) => {
      removedApp = state.uploadedApps.find((app) => app.id === normalizedId) || null;
      wasInstalled = state.installedAppIds.includes(normalizedId);

      if (!removedApp && !wasInstalled) return state;

      return {
        uploadedApps: state.uploadedApps.filter((app) => app.id !== normalizedId),
        installedAppIds: state.installedAppIds.filter((id) => id !== normalizedId),
      };
    });

    if (!removedApp && !wasInstalled) return;

    void Promise.all([
      removeUploadedAppEntity(normalizedId),
      removeInstalledAppEntity(normalizedId),
    ]).catch((error) => {
      console.error('[AppMarketStore] 删除上传应用持久化失败：', error);
      set((state) => ({
        uploadedApps:
          removedApp && !state.uploadedApps.some((app) => app.id === removedApp!.id)
            ? [removedApp!, ...state.uploadedApps]
            : state.uploadedApps,
        installedAppIds:
          wasInstalled && !state.installedAppIds.includes(normalizedId)
            ? [...state.installedAppIds, normalizedId]
            : state.installedAppIds,
      }));
    });
  },

  setShareThemeSourceBaseUrl: (value) => {
    const normalizedValue = value.trim();
    const previousValue = get().shareThemeSourceBaseUrl;
    set({ shareThemeSourceBaseUrl: normalizedValue });

    void setShareThemeSourcePreference(normalizedValue).catch((error) => {
      console.error('[AppMarketStore] 远程主题地址持久化失败：', error);
      set({ shareThemeSourceBaseUrl: previousValue });
    });
  },
});

