import { getRegisteredApps } from '../../../core/registry';
import { resolveOnlineMarketApps } from './constants';
import type { OnlineMarketApp, RuntimeMarketApp, UploadedMarketApp } from './types';

const hasRuntimeHtml = (app: OnlineMarketApp): app is OnlineMarketApp & { html: string } => {
  return typeof app.html === 'string' && app.html.trim().length > 0;
};

const getOnlineRuntimeAppMap = () => {
  return new Map(
    resolveOnlineMarketApps(getRegisteredApps())
      .filter(hasRuntimeHtml)
      .map((app) => [app.id, app])
  );
};

export const isMarketAppId = (appId: string): boolean => {
  return appId.startsWith('online-') || appId.startsWith('offline-');
};

export const getInstalledRuntimeMarketApps = (
  installedAppIds: string[],
  uploadedApps: UploadedMarketApp[]
): RuntimeMarketApp[] => {
  const offlineMap = new Map(uploadedApps.map((app) => [app.id, app]));
  const onlineRuntimeAppMap = getOnlineRuntimeAppMap();

  return installedAppIds
    .map((appId) => {
      const onlineRuntimeApp = onlineRuntimeAppMap.get(appId);
      if (onlineRuntimeApp) {
        return {
          id: onlineRuntimeApp.id,
          name: onlineRuntimeApp.name,
          icon: onlineRuntimeApp.icon,
          version: onlineRuntimeApp.version,
          description: onlineRuntimeApp.description,
          html: onlineRuntimeApp.html,
          source: 'online' as const,
        };
      }

      const offlineApp = offlineMap.get(appId);
      if (offlineApp) {
        return {
          id: offlineApp.id,
          name: offlineApp.name,
          icon: offlineApp.icon,
          version: offlineApp.version,
          description: offlineApp.description,
          html: offlineApp.html,
          source: 'offline' as const,
        };
      }

      return null;
    })
    .filter((app): app is RuntimeMarketApp => app !== null);
};
