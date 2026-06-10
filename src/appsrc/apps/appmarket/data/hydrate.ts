import type { AppMarketState } from '../types';
import { listInstalledApps } from './repositories/installedRepo';
import { getShareThemeSourcePreference } from './repositories/preferencesRepo';
import { listUploadedApps } from './repositories/uploadedRepo';

export const loadAppMarketPersistedState = async (): Promise<AppMarketState> => {
  const [installedApps, uploadedApps, shareThemeSourceBaseUrl] = await Promise.all([
    listInstalledApps(),
    listUploadedApps(),
    getShareThemeSourcePreference(),
  ]);

  return {
    installedAppIds: installedApps.map((item) => item.appId),
    uploadedApps,
    shareThemeSourceBaseUrl,
  };
};
