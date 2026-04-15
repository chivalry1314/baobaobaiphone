import type { AppMarketState } from '../types';
import { listInstalledApps } from './repositories/installedRepo';
import { listUploadedApps } from './repositories/uploadedRepo';

export const loadAppMarketPersistedState = async (): Promise<AppMarketState> => {
  const [installedApps, uploadedApps] = await Promise.all([
    listInstalledApps(),
    listUploadedApps(),
  ]);

  return {
    installedAppIds: installedApps.map((item) => item.appId),
    uploadedApps,
  };
};
