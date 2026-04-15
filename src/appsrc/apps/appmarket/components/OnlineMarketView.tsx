import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { TEXT } from '../constants';
import type { OnlineMarketApp } from '../types';
import { MarketAppCard } from './MarketAppCard';

interface OnlineMarketViewProps {
  apps: OnlineMarketApp[];
  installedAppIds: string[];
  onInstall: (appId: string) => void;
  onUninstall: (appId: string, appName: string) => void;
}

const INSTALL_FEEDBACK_DELAY = 280;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const OnlineMarketView: React.FC<OnlineMarketViewProps> = ({
  apps,
  installedAppIds,
  onInstall,
  onUninstall,
}) => {
  const [keyword, setKeyword] = useState('');
  const [installingIds, setInstallingIds] = useState<string[]>([]);

  useEffect(() => {
    setInstallingIds((current) => current.filter((id) => !installedAppIds.includes(id)));
  }, [installedAppIds]);

  const filteredApps = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return apps;

    return apps.filter((app) => {
      const searchable = `${app.name} ${app.author} ${app.description} ${app.tags.join(' ')}`.toLowerCase();
      return searchable.includes(normalizedKeyword);
    });
  }, [apps, keyword]);

  const handleInstall = async (appId: string) => {
    if (installingIds.includes(appId) || installedAppIds.includes(appId)) return;
    setInstallingIds((current) => (current.includes(appId) ? current : [...current, appId]));

    try {
      await wait(INSTALL_FEEDBACK_DELAY);
      onInstall(appId);
    } finally {
      setInstallingIds((current) => current.filter((id) => id !== appId));
    }
  };

  return (
    <section className="space-y-4">
      <p className="text-[12px] text-slate-500">{TEXT.simulationNote}</p>

      <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 bg-white">
        <Search size={16} className="text-slate-400" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={TEXT.searchPlaceholder}
          className="flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-slate-500 text-[14px]">
          {TEXT.onlineEmpty}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => {
            const isInstalled = installedAppIds.includes(app.id);
            const isBusy = installingIds.includes(app.id);
            return (
              <MarketAppCard
                key={app.id}
                icon={app.icon}
                name={app.name}
                description={app.description}
                version={app.version}
                meta={`${TEXT.sourceOnline} | ${app.author} | ${app.size}`}
                tags={app.tags}
                isInstalled={isInstalled}
                isBusy={isBusy}
                onInstall={() => void handleInstall(app.id)}
                onUninstall={() => onUninstall(app.id, app.name)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
