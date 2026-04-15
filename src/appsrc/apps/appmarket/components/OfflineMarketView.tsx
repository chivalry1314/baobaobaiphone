import React from 'react';

import { TEXT } from '../constants';
import type { UploadedMarketApp } from '../types';
import { MarketAppCard } from './MarketAppCard';

interface OfflineMarketViewProps {
  apps: UploadedMarketApp[];
  installedAppIds: string[];
  onInstall: (appId: string) => void;
  onUninstall: (appId: string, appName: string) => void;
  onDeletePermanent: (app: UploadedMarketApp) => void;
}

const formatDateTime = (timestamp: number): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
};

export const OfflineMarketView: React.FC<OfflineMarketViewProps> = ({
  apps,
  installedAppIds,
  onInstall,
  onUninstall,
  onDeletePermanent,
}) => {
  if (apps.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center text-slate-500 text-[14px]">
        {TEXT.offlineEmpty}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {apps.map((app) => {
        const isInstalled = installedAppIds.includes(app.id);
        const htmlSizeKb = Math.max(1, Math.round(app.html.length / 1024));

        return (
          <MarketAppCard
            key={app.id}
            icon={app.icon}
            name={app.name}
            description={app.description || `本地 HTML 应用（${htmlSizeKb}KB）`}
            version={app.version}
            meta={`${TEXT.sourceOffline} · ${TEXT.uploadedAt} ${formatDateTime(app.createdAt)}`}
            isInstalled={isInstalled}
            onInstall={() => onInstall(app.id)}
            onUninstall={() => onUninstall(app.id, app.name)}
            onDeletePermanent={() => onDeletePermanent(app)}
          />
        );
      })}
    </section>
  );
};
