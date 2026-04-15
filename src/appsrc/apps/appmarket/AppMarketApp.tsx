import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useGlobalDesktopStore } from '@mimisOS/sdk';
import type { DesktopItem } from '@mimisOS/sdk';
import { getRegisteredApps } from '../../../core/registry';
import { isSystemAppId } from '../../../core/systemApps';

import { FONT_STACK, TEXT, resolveOnlineMarketApps } from './constants';
import {
  AppMarketHeader,
  DeveloperPlatformView,
  MarketTabs,
  OfflineMarketView,
  OnlineMarketView,
} from './components';
import { useAppMarketStore } from './store';
import type { AppMarketAppProps, CreateUploadedAppPayload, UploadedMarketApp } from './types';
import type { MarketTab } from './uiTypes';

const ONLINE_MARKET_DESKTOP_SOURCE = 'online-market';

type PendingUninstallApp = {
  id: string;
  name: string;
  source: 'online' | 'offline';
};

const isCellOccupied = (items: DesktopItem[], page: number, x: number, y: number): boolean => {
  return items.some((item) => {
    const itemPage = item.page ?? 0;
    if (itemPage !== page) return false;
    const width = item.w || 1;
    const height = item.h || 1;
    return x >= item.x && x < item.x + width && y >= item.y && y < item.y + height;
  });
};

const findNextAppSlot = (items: DesktopItem[], rows: number, cols: number) => {
  const maxPage = Math.max(0, ...items.map((item) => item.page ?? 0));
  for (let page = 0; page <= maxPage + 1; page += 1) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!isCellOccupied(items, page, x, y)) {
          return { page, x, y };
        }
      }
    }
  }
  return { page: maxPage + 1, x: 0, y: 0 };
};

export const AppMarketApp: React.FC<AppMarketAppProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<MarketTab>('online');
  const [pendingDeleteApp, setPendingDeleteApp] = useState<UploadedMarketApp | null>(null);
  const [pendingUninstallApp, setPendingUninstallApp] = useState<PendingUninstallApp | null>(null);

  const {
    installedAppIds,
    uploadedApps,
    installApp,
    uninstallApp,
    addUploadedApp,
    removeUploadedApp,
  } = useAppMarketStore();

  const { desktopLayout, addDesktopItem, removeDesktopItem } = useGlobalDesktopStore();
  const rows = desktopLayout.rows || 6;
  const cols = desktopLayout.cols || 4;
  const items = desktopLayout.items || [];

  const onlineMarketApps = useMemo(() => resolveOnlineMarketApps(getRegisteredApps()), []);

  const onlineAppIdSet = useMemo(() => new Set(onlineMarketApps.map((app) => app.id)), [onlineMarketApps]);

  const effectiveInstalledOnlineAppIds = useMemo(() => {
    const installedSet = new Set(installedAppIds);

    items.forEach((item) => {
      if (item.type !== 'app') return;
      if (!onlineAppIdSet.has(item.componentId)) return;
      installedSet.add(item.componentId);
    });

    return [...installedSet];
  }, [installedAppIds, items, onlineAppIdSet]);

  const handleInstallOnlineApp = useCallback(
    (appId: string) => {
      if (isSystemAppId(appId)) return;

      installApp(appId);
      if (!onlineAppIdSet.has(appId)) return;

      const alreadyOnDesktop = items.some(
        (item) => item.type === 'app' && item.componentId === appId
      );
      if (alreadyOnDesktop) return;

      const slot = findNextAppSlot(items, rows, cols);
      addDesktopItem({
        componentId: appId,
        type: 'app',
        page: slot.page,
        x: slot.x,
        y: slot.y,
        w: 1,
        h: 1,
        data: { marketSource: ONLINE_MARKET_DESKTOP_SOURCE },
      });
    },
    [installApp, onlineAppIdSet, items, rows, cols, addDesktopItem]
  );

  const handleUninstallOnlineApp = useCallback(
    (appId: string) => {
      if (isSystemAppId(appId)) return;

      uninstallApp(appId);

      items
        .filter((item) => item.type === 'app' && item.componentId === appId)
        .forEach((item) => removeDesktopItem(item.instanceId));
    },
    [uninstallApp, items, removeDesktopItem]
  );

  const handleRequestOnlineUninstall = useCallback((appId: string, appName: string) => {
    if (isSystemAppId(appId)) return;
    setPendingUninstallApp({ id: appId, name: appName, source: 'online' });
  }, []);

  const handleRequestOfflineUninstall = useCallback((appId: string, appName: string) => {
    setPendingUninstallApp({ id: appId, name: appName, source: 'offline' });
  }, []);

  const handleConfirmUninstall = useCallback(() => {
    if (!pendingUninstallApp) return;

    if (pendingUninstallApp.source === 'online') {
      handleUninstallOnlineApp(pendingUninstallApp.id);
    } else {
      uninstallApp(pendingUninstallApp.id);
    }

    setPendingUninstallApp(null);
  }, [pendingUninstallApp, handleUninstallOnlineApp, uninstallApp]);

  const handleCreateApp = useCallback(
    (payload: CreateUploadedAppPayload): UploadedMarketApp => {
      return addUploadedApp(payload);
    },
    [addUploadedApp]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteApp) return;
    removeUploadedApp(pendingDeleteApp.id);
    setPendingDeleteApp(null);
  }, [pendingDeleteApp, removeUploadedApp]);

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-gradient-to-br from-[#F6F8FF] via-[#F7FAFF] to-[#F7FDFF] flex flex-col text-slate-800"
      style={{ fontFamily: FONT_STACK }}
    >
      <AppMarketHeader onClose={onClose} />

      <div className="flex-1 min-h-0 px-4 pb-8 overflow-y-auto">
        <MarketTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-4">
          {activeTab === 'online' && (
            <OnlineMarketView
              apps={onlineMarketApps}
              installedAppIds={effectiveInstalledOnlineAppIds}
              onInstall={handleInstallOnlineApp}
              onUninstall={handleRequestOnlineUninstall}
            />
          )}

          {activeTab === 'offline' && (
            <OfflineMarketView
              apps={uploadedApps}
              installedAppIds={installedAppIds}
              onInstall={installApp}
              onUninstall={handleRequestOfflineUninstall}
              onDeletePermanent={setPendingDeleteApp}
            />
          )}

          {activeTab === 'developer' && (
            <DeveloperPlatformView
              totalUploadedApps={uploadedApps.length}
              onCreateApp={handleCreateApp}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {pendingUninstallApp && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="absolute left-4 right-4 bottom-16 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl px-4 py-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-amber-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">
                  {TEXT.uninstallConfirmTitle}“{pendingUninstallApp.name}”？
                </p>
                <p className="text-[12px] text-slate-300 mt-1">{TEXT.uninstallConfirmHint}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingUninstallApp(null)}
                    className="h-8 px-3 rounded-lg bg-white/10 text-[12px] text-slate-100"
                  >
                    {TEXT.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUninstall}
                    className="h-8 px-3 rounded-lg bg-amber-500 text-[12px] text-white font-medium"
                  >
                    {TEXT.confirmUninstall}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteApp && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="absolute left-4 right-4 bottom-16 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl px-4 py-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-amber-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">
                  {TEXT.deleteConfirmTitle}“{pendingDeleteApp.name}”？
                </p>
                <p className="text-[12px] text-slate-300 mt-1">{TEXT.deleteConfirmHint}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteApp(null)}
                    className="h-8 px-3 rounded-lg bg-white/10 text-[12px] text-slate-100"
                  >
                    {TEXT.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="h-8 px-3 rounded-lg bg-rose-500 text-[12px] text-white font-medium"
                  >
                    {TEXT.confirmDelete}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pb-4 text-[11px] text-slate-400 text-center">{TEXT.subtitle}</div>
    </motion.div>
  );
};

export type { AppMarketAppProps };
