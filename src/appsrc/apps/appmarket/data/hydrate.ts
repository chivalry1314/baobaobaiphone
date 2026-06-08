import type { AppMarketState } from '../types';
import { listInstalledApps } from './repositories/installedRepo';
import { listUploadedApps } from './repositories/uploadedRepo';

export const loadAppMarketPersistedState = async (): Promise<AppMarketState> => {
  const installedApps = await listInstalledApps();
  const uploadedApps = await listUploadedApps();

  return {
    installedAppIds: installedApps.map((item) => item.appId),
    uploadedApps,
  };
};
