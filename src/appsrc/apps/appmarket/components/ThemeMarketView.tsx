import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  Download,
  ExternalLink,
  KeyRound,
  PackageOpen,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';

import { BUILTIN_THEME_CATALOG } from '../../../../core/theme/presetThemes';
import { importThemePackage } from '../../../../core/theme/importThemePackage';
import { useThemeStore } from '../../../../core/stores/theme/store';
import { slugifyThemeId } from '../../../../core/theme/types';
import type { ThemeDefinition } from '../../../../core/theme/types';
import { ONLINE_THEME_SOURCE_BASE_URL } from '../onlineThemeSourceConfig';
import {
  buildRemoteShareThemeAbsoluteUrl,
  buildRemoteShareThemeCardUrl,
  discoverRemoteShareThemes,
  downloadRemoteShareThemePackage,
  normalizeShareThemeSourceBaseUrl,
} from '../shareThemeClient';
import type { DiscoverRemoteShareThemesResponse } from '../shareThemeClient';
import type { RemoteShareThemeItem } from '../types';

const REMOTE_THEME_PAGE_SIZE = 24;
const REMOTE_THEME_LOAD_AHEAD = 4;
const REMOTE_THEME_CARD_ESTIMATED_HEIGHT = 520;

const mergeThemeCatalog = (
  builtinThemes: ThemeDefinition[],
  uploadedThemes: ThemeDefinition[]
): ThemeDefinition[] => {
  const uploadedIds = new Set(uploadedThemes.map((theme) => theme.id));
  return [...uploadedThemes, ...builtinThemes.filter((theme) => !uploadedIds.has(theme.id))];
};

const getRemoteThemeLocalId = (item: RemoteShareThemeItem): string =>
  slugifyThemeId(item.systemTheme.id || item.systemTheme.name || item.card.id);

const getRemoteThemeDisplayName = (item: RemoteShareThemeItem): string =>
  item.card.title.trim() || item.systemTheme.name.trim() || '未命名主题';

const getRemoteThemeDisplayDescription = (item: RemoteShareThemeItem): string =>
  item.card.description.trim() ||
  item.systemTheme.description.trim() ||
  '该卡片下挂载了一个可安装的系统主题包。';

const getRemoteThemeDisplayTags = (item: RemoteShareThemeItem): string[] =>
  item.card.tags.length ? item.card.tags : item.systemTheme.tags;

const mergeRemoteThemeItems = (
  currentItems: RemoteShareThemeItem[],
  nextItems: RemoteShareThemeItem[]
): RemoteShareThemeItem[] => {
  if (!currentItems.length) return nextItems;
  if (!nextItems.length) return currentItems;

  const itemMap = new Map(currentItems.map((item) => [item.card.id, item]));
  nextItems.forEach((item) => {
    itemMap.set(item.card.id, item);
  });
  return Array.from(itemMap.values());
};

const isMeaningfulRemoteThemeAuthor = (author: string): boolean => {
  const normalized = author.trim().toLowerCase();
  return Boolean(normalized) && normalized !== 'user' && normalized !== 'unknown';
};

const isMeaningfulRemoteThemeVersion = (version: string): boolean => {
  const normalized = version.trim().toLowerCase();
  return Boolean(normalized) && normalized !== '1.0.0';
};

const getRemoteThemeCreatorName = (item: RemoteShareThemeItem): string => {
  const nickname = item.creator.nickname.trim();
  if (nickname) {
    return nickname;
  }

  const username = item.creator.username.trim();
  if (username) {
    return username;
  }

  if (isMeaningfulRemoteThemeAuthor(item.systemTheme.author)) {
    return item.systemTheme.author.trim();
  }

  return '未知作者';
};

const getRemoteThemeHeroMeta = (item: RemoteShareThemeItem): string => {
  const creatorName = getRemoteThemeCreatorName(item);
  const nickname = item.creator.nickname.trim();
  const username = item.creator.username.trim();

  if (nickname && username && nickname !== username) {
    return `${creatorName} @${username}`;
  }

  if (
    !nickname &&
    !username &&
    isMeaningfulRemoteThemeAuthor(item.systemTheme.author) &&
    isMeaningfulRemoteThemeVersion(item.systemTheme.version)
  ) {
    return `${creatorName} · ${item.systemTheme.version.trim()}`;
  }

  return creatorName;
};

const RemoteThemeCard: React.FC<{
  item: RemoteShareThemeItem;
  remoteBaseUrl: string;
  installedThemeSet: Set<string>;
  activeThemeId: string;
  remoteInstallingId: string;
  accessCodeDrafts: Record<string, string>;
  setAccessCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleApplyTheme: (themeId: string, themeName: string) => void;
  handleInstallRemoteTheme: (item: RemoteShareThemeItem) => Promise<void>;
  handleUninstallTheme: (themeId: string, themeName: string) => void;
}> = ({
  item,
  remoteBaseUrl,
  installedThemeSet,
  activeThemeId,
  remoteInstallingId,
  accessCodeDrafts,
  setAccessCodeDrafts,
  handleApplyTheme,
  handleInstallRemoteTheme,
  handleUninstallTheme,
}) => {
  const localThemeId = getRemoteThemeLocalId(item);
  const displayThemeName = getRemoteThemeDisplayName(item);
  const displayThemeDescription = getRemoteThemeDisplayDescription(item);
  const displayThemeTags = getRemoteThemeDisplayTags(item);
  const displayThemeHeroMeta = getRemoteThemeHeroMeta(item);
  const isInstalled = installedThemeSet.has(localThemeId);
  const isActive = activeThemeId === localThemeId;
  const pending = remoteInstallingId === item.card.id;
  const requiresCode = item.accessCodeStatus === 'required';
  const canInstall = item.accessCodeStatus === 'none' || item.accessCodeStatus === 'required';

  return (
    <div
      className="overflow-hidden rounded-[28px]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--sys-surface) 90%, white)',
        boxShadow: '0 18px 38px -28px var(--sys-shadow-color)',
        border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
      }}
    >
      <div className="relative">
        <img
          src={buildRemoteShareThemeAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)}
          alt={displayThemeName}
          className="h-44 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, transparent)',
              color: 'var(--sys-status-fg)',
            }}
          >
            <PackageOpen size={13} />
            在线卡片
          </span>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
            style={{
              backgroundColor:
                item.card.accessMode === 'paid'
                  ? 'color-mix(in srgb, var(--sys-danger-soft) 88%, white)'
                  : 'color-mix(in srgb, var(--sys-accent-soft) 88%, white)',
              color: item.card.accessMode === 'paid' ? 'var(--sys-danger)' : 'var(--sys-accent-muted)',
            }}
          >
            {item.card.accessMode === 'paid' ? '需提取码' : '免费'}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-[22px] font-semibold text-white">{displayThemeName}</div>
              <div className="mt-1 text-[12px] text-white/78">{displayThemeHeroMeta}</div>
            </div>
            {isActive ? (
              <div
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: 'var(--sys-accent)',
                  color: 'var(--sys-accent-text)',
                }}
              >
                启用中
              </div>
            ) : isInstalled ? (
              <div
                className="rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 72%, transparent)',
                  color: 'var(--sys-status-fg)',
                }}
              >
                已安装
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>
          {displayThemeDescription}
        </div>

        <div className="flex flex-wrap gap-2">
          {displayThemeTags.map((tag) => (
            <span
              key={`${item.card.id}-${tag}`}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                color: 'var(--sys-muted-text)',
              }}
            >
              {tag}
            </span>
          ))}

        </div>

        {requiresCode ? (
          <div
            className="rounded-[20px] p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, #f59e0b 12%, white)',
              border: '1px solid color-mix(in srgb, #f59e0b 26%, transparent)',
            }}
          >
            <input
              value={accessCodeDrafts[item.card.id] || ''}
              onChange={(event) =>
                setAccessCodeDrafts((current) => ({
                  ...current,
                  [item.card.id]: event.target.value.toUpperCase(),
                }))
              }
              placeholder="请输入提取码"
              className="min-w-0 w-full rounded-[16px] px-4 py-3 text-[13px] font-medium outline-none transition"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 98%, white)',
                color: 'var(--sys-surface-text)',
                border: '2px solid color-mix(in srgb, #f59e0b 58%, white)',
                boxShadow: '0 10px 22px -18px color-mix(in srgb, #f59e0b 48%, transparent)',
              }}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {isInstalled ? (
            <button
              type="button"
              onClick={() => handleApplyTheme(localThemeId, displayThemeName)}
              className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
              style={{
                backgroundColor: isActive ? 'var(--sys-accent)' : 'var(--sys-surface-strong)',
                color: isActive ? 'var(--sys-accent-text)' : 'var(--sys-surface-text)',
              }}
            >
              <Palette size={15} />
              {isActive ? '当前主题' : '立即应用'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleInstallRemoteTheme(item)}
              disabled={!canInstall || pending}
              className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold disabled:opacity-60"
              style={{
                backgroundColor: 'var(--sys-accent)',
                color: 'var(--sys-accent-text)',
              }}
            >
              <Download size={15} />
              {pending ? '下载安装中...' : '下载安装'}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              isInstalled
                ? handleUninstallTheme(localThemeId, displayThemeName)
                : handleApplyTheme(localThemeId, displayThemeName)
            }
            disabled={!isInstalled}
            className="rounded-[18px] px-4 py-3 text-[13px] font-semibold disabled:opacity-50"
            style={{
              backgroundColor: isInstalled
                ? 'color-mix(in srgb, var(--sys-danger-soft) 88%, white)'
                : 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
              color: isInstalled ? 'var(--sys-danger)' : 'var(--sys-muted-text)',
            }}
          >
            {isInstalled ? '移除' : '安装后可移除'}
          </button>
        </div>
      </div>
    </div>
  );
};

type ThemeSourceTab = 'online' | 'builtin' | 'uploaded';

const THEME_SOURCE_TABS: Array<{
  id: ThemeSourceTab;
  label: string;
  description: string;
}> = [
  { id: 'online', label: '在线主题', description: '来自 sharefrontend 卡片' },
  { id: 'builtin', label: '系统内置', description: '随系统预置的主题' },
  { id: 'uploaded', label: '我的上传', description: '你手动导入的主题包' },
];

export const ThemeMarketView: React.FC = () => {
  const importThemeInputRef = useRef<HTMLInputElement>(null);
  const remoteListRef = useRef<HTMLDivElement | null>(null);
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [remoteThemes, setRemoteThemes] = useState<RemoteShareThemeItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remotePagination, setRemotePagination] = useState<DiscoverRemoteShareThemesResponse['pagination'] | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [activeSourceTab, setActiveSourceTab] = useState<ThemeSourceTab>('online');

  const {
    installedThemeIds,
    uploadedThemes,
    activeThemeId,
    uninstallTheme,
    addUploadedTheme,
    updateUploadedThemeMetadata,
    removeUploadedTheme,
    applyTheme,
  } = useThemeStore();

  const remoteBaseUrl = useMemo(
    () => normalizeShareThemeSourceBaseUrl(ONLINE_THEME_SOURCE_BASE_URL),
    []
  );

  const allThemes = useMemo(
    () => mergeThemeCatalog(BUILTIN_THEME_CATALOG, uploadedThemes),
    [uploadedThemes]
  );
  const builtinThemes = useMemo(() => BUILTIN_THEME_CATALOG, []);
  const installedThemeSet = useMemo(() => new Set(installedThemeIds), [installedThemeIds]);
  const installedThemes = useMemo(
    () => allThemes.filter((theme) => installedThemeSet.has(theme.id)),
    [allThemes, installedThemeSet]
  );
  const activeTheme = useMemo(
    () => allThemes.find((theme) => theme.id === activeThemeId) || null,
    [allThemes, activeThemeId]
  );
  const activeSourceMeta = useMemo(
    () => THEME_SOURCE_TABS.find((tab) => tab.id === activeSourceTab) || THEME_SOURCE_TABS[0],
    [activeSourceTab]
  );
  const sourceTabCountMap = useMemo(
    () => ({
      online: remoteThemes.length,
      builtin: builtinThemes.length,
      uploaded: uploadedThemes.length,
    }),
    [builtinThemes.length, remoteThemes.length, uploadedThemes.length]
  );
  const remoteHasMore = Boolean(remotePagination?.hasMore);
  const remoteCountLabel = remotePagination?.total ?? remoteThemes.length;

  const remoteVirtualizer = useVirtualizer({
    count: remoteThemes.length,
    getScrollElement: () => remoteListRef.current,
    estimateSize: () => REMOTE_THEME_CARD_ESTIMATED_HEIGHT,
    overscan: 3,
    getItemKey: (index) => remoteThemes[index]?.card.id ?? `remote-theme-${index}`,
  });

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const loadRemoteThemes = async (
    targetBaseUrl: string,
    options?: {
      page?: number;
      append?: boolean;
    }
  ) => {
    const normalizedBaseUrl = normalizeShareThemeSourceBaseUrl(targetBaseUrl);
    const page = options?.page && options.page > 0 ? options.page : 1;
    const append = Boolean(options?.append && page > 1);
    if (!normalizedBaseUrl) {
      setRemoteThemes([]);
      setRemotePagination(null);
      setRemoteError(null);
      setRemoteLoading(false);
      setRemoteLoadingMore(false);
      return;
    }

    try {
      if (append) {
        setRemoteLoadingMore(true);
      } else {
        setRemoteLoading(true);
      }
      setRemoteError(null);
      const response = await discoverRemoteShareThemes(normalizedBaseUrl, {
        page,
        size: REMOTE_THEME_PAGE_SIZE,
      });
      setRemotePagination(response.pagination);
      setRemoteThemes((current) =>
        append ? mergeRemoteThemeItems(current, response.items || []) : response.items || []
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线主题加载失败，请稍后重试';
      if (!append) {
        setRemoteThemes([]);
        setRemotePagination(null);
      } else {
        setRemotePagination((current) => (current ? { ...current, hasMore: false } : current));
      }
      setRemoteError(message);
    } finally {
      if (append) {
        setRemoteLoadingMore(false);
      } else {
        setRemoteLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!remoteBaseUrl) {
      setRemoteThemes([]);
      setRemotePagination(null);
      setRemoteError(null);
      return;
    }
    void loadRemoteThemes(remoteBaseUrl, { page: 1 });
  }, [remoteBaseUrl]);

  useEffect(() => {
    const [lastVisibleItem] = remoteVirtualizer.getVirtualItems().slice(-1);
    if (!lastVisibleItem) return;
    if (!remoteHasMore || remoteLoading || remoteLoadingMore || !remoteBaseUrl) return;
    if (lastVisibleItem.index < remoteThemes.length - REMOTE_THEME_LOAD_AHEAD) return;

    void loadRemoteThemes(remoteBaseUrl, {
      page: (remotePagination?.page ?? 1) + 1,
      append: true,
    });
  }, [
    remoteBaseUrl,
    remoteHasMore,
    remoteLoading,
    remoteLoadingMore,
    remotePagination,
    remoteThemes.length,
    remoteVirtualizer,
  ]);

  useEffect(() => {
    if (!remoteBaseUrl || !remoteThemes.length || !uploadedThemes.length) return;
    const uploadedThemeIds = new Set(uploadedThemes.map((theme) => theme.id));
    remoteThemes.forEach((item) => {
      const localThemeId = getRemoteThemeLocalId(item);
      if (!uploadedThemeIds.has(localThemeId)) return;
      updateUploadedThemeMetadata(localThemeId, {
        name: getRemoteThemeDisplayName(item),
        description: getRemoteThemeDisplayDescription(item),
        tags: getRemoteThemeDisplayTags(item),
        coverImage: item.card.previewUrl
          ? buildRemoteShareThemeAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)
          : undefined,
      });
    });
  }, [remoteBaseUrl, remoteThemes, updateUploadedThemeMetadata, uploadedThemes]);

  const handleImportThemePackage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setIsImportingTheme(true);
      const importedTheme = await importThemePackage(file);
      const storedTheme = addUploadedTheme(importedTheme);
      applyTheme(storedTheme.id);
      showMessage(`主题“${storedTheme.name}”已导入并启用`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '主题导入失败，请稍后重试';
      window.alert(message);
    } finally {
      setIsImportingTheme(false);
    }
  };

  const handleUninstallTheme = (themeId: string, themeName: string) => {
    const confirmed = window.confirm(`确定要移除“${themeName}”吗？`);
    if (!confirmed) return;

    const isUploaded = uploadedThemes.some((theme) => theme.id === themeId);
    if (isUploaded) {
      removeUploadedTheme(themeId);
    } else {
      uninstallTheme(themeId);
    }
    showMessage(`已移除“${themeName}”`);
  };

  const handleApplyTheme = (themeId: string, themeName: string) => {
    applyTheme(themeId);
    showMessage(`已启用“${themeName}”`);
  };

  const handleInstallRemoteTheme = async (item: RemoteShareThemeItem) => {
    if (!remoteBaseUrl) {
      window.alert('请先在 onlineThemeSourceConfig.ts 中配置在线主题源地址');
      return;
    }

    if (!item.systemTheme.supported) {
      window.alert('当前卡片下的系统主题包还没有通过协议校验，暂时不能直接安装。');
      return;
    }

    const normalizedCode = (accessCodeDrafts[item.card.id] || '').trim().toUpperCase();
    if (item.accessCodeStatus === 'required' && !normalizedCode) {
      window.alert('该主题需要提取码，请先填写后再下载安装。');
      return;
    }
    if (item.accessCodeStatus === 'expired') {
      window.alert('当前提取码已过期，暂时无法下载安装。');
      return;
    }
    if (item.accessCodeStatus === 'exhausted') {
      window.alert('当前提取码已达到使用上限，暂时无法下载安装。');
      return;
    }

    try {
      setRemoteInstallingId(item.card.id);
      const displayThemeName = getRemoteThemeDisplayName(item);
      const displayThemeDescription = getRemoteThemeDisplayDescription(item);
      const displayThemeTags = getRemoteThemeDisplayTags(item);
      const file = await downloadRemoteShareThemePackage({
        baseUrl: remoteBaseUrl,
        item,
        accessCode: normalizedCode,
      });
      const importedTheme = await importThemePackage(file);
      const storedTheme = addUploadedTheme({
        ...importedTheme,
        name: displayThemeName,
        description: displayThemeDescription,
        tags: displayThemeTags,
        coverImage: item.card.previewUrl
          ? buildRemoteShareThemeAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)
          : importedTheme.coverImage,
      });
      applyTheme(storedTheme.id);
      showMessage(`系统主题“${storedTheme.name}”已下载、安装并启用`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线主题安装失败，请稍后重试';
      window.alert(message);
    } finally {
      setRemoteInstallingId('');
    }
  };

  return (
    <section className="space-y-4">
      <input
        ref={importThemeInputRef}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        onChange={handleImportThemePackage}
        className="hidden"
      />

      <div
        className="rounded-[28px] p-3"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
          boxShadow: '0 14px 40px -28px var(--sys-shadow-color)',
          border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
        }}
      >
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/80 p-1">
          {THEME_SOURCE_TABS.map((tab) => {
            const isActive = activeSourceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSourceTab(tab.id)}
                className={`h-11 rounded-xl text-[13px] font-medium transition ${
                  isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            {activeSourceMeta.description}
          </span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--sys-muted-text)' }}>
            {sourceTabCountMap[activeSourceTab]} 套
          </span>
        </div>
      </div>

      {activeSourceTab === 'uploaded' ? (
      <div
        className="overflow-hidden rounded-[30px] p-5"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--sys-surface-strong) 92%, white) 0%, color-mix(in srgb, var(--sys-surface) 86%, white) 100%)',
          boxShadow: '0 18px 48px -32px var(--sys-shadow-color)',
          border: '1px solid color-mix(in srgb, var(--sys-border) 78%, transparent)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: 'var(--sys-accent-soft)',
                color: 'var(--sys-accent-muted)',
              }}
            >
              <Sparkles size={13} />
              主题频道
            </div>
            <h2 className="mt-3 text-[24px] font-semibold tracking-tight" style={{ color: 'var(--sys-surface-text)' }}>
              安装整套桌面外观
            </h2>
            <p className="mt-2 max-w-[360px] text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>
              这里既能导入本地主题包，也能从分享卡片在线查询系统主题。远程主题下载时会继续遵循卡片的提取码规则。
            </p>
          </div>
          <button
            type="button"
            onClick={() => importThemeInputRef.current?.click()}
            className="flex shrink-0 items-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
            style={{
              backgroundColor: 'var(--sys-accent)',
              color: 'var(--sys-accent-text)',
              boxShadow: '0 16px 32px -24px var(--sys-shadow-color)',
            }}
          >
            <Upload size={16} />
            {isImportingTheme ? '导入中...' : '导入主题包'}
          </button>
        </div>

      </div>
      ) : null}

      {activeSourceTab === 'builtin' ? (
      <div
        className="overflow-hidden rounded-[28px] p-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
          boxShadow: '0 14px 42px -28px var(--sys-shadow-color)',
          border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
        }}
      >
        {activeTheme ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[24px]">
              <img src={activeTheme.coverImage} alt={activeTheme.name} className="h-44 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                    Active Theme
                  </div>
                  <div className="mt-1 truncate text-[22px] font-semibold text-white">
                    {activeTheme.name}
                  </div>
                  <div className="mt-1 text-[12px] text-white/80">
                    {activeTheme.author} · {activeTheme.version}
                  </div>
                </div>
                <div
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: 'var(--sys-accent)',
                    color: 'var(--sys-accent-text)',
                  }}
                >
                  启用中
                </div>
              </div>
            </div>
            <div
              className="rounded-[22px] px-4 py-3 text-[13px] leading-6"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                color: 'var(--sys-muted-text)',
              }}
            >
              {activeTheme.description}
            </div>
          </div>
        ) : (
          <div
            className="rounded-[24px] p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--sys-surface) 72%, white) 0%, color-mix(in srgb, var(--sys-accent-soft) 34%, white) 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface) 88%, white)',
                  color: 'var(--sys-muted-text)',
                }}
              >
                <Palette size={20} />
              </div>
              <div>
                <div className="text-[16px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>当前使用默认外观</div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
                  你可以从下方直接下载安装主题，也可以手动导入本地主题包。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      ) : null}

      {activeSourceTab === 'online' ? (
      <div
        className="flex justify-end"
        style={{
        }}
      >
        <button
          type="button"
          onClick={() => void loadRemoteThemes(remoteBaseUrl)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
            color: 'var(--sys-surface-text)',
            border: '1px solid color-mix(in srgb, var(--sys-border) 60%, transparent)',
          }}
          disabled={remoteLoading}
          aria-label={remoteLoading ? '刷新中' : '刷新在线主题'}
          title={remoteLoading ? '刷新中' : '刷新在线主题'}
        >
          <RefreshCw size={16} className={remoteLoading ? 'animate-spin' : ''} />
        </button>

        {remoteError ? (
          <div
            className="ml-3 rounded-[18px] px-4 py-3 text-[12px] font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-danger-soft) 88%, white)',
              color: 'var(--sys-danger)',
              border: '1px solid color-mix(in srgb, var(--sys-danger) 22%, transparent)',
            }}
          >
            {remoteError}
          </div>
        ) : null}
      </div>
      ) : null}

      {statusMessage ? (
        <div
          className="rounded-2xl px-4 py-3 text-[12px] font-medium"
          style={{
            backgroundColor: 'var(--sys-accent-soft)',
            color: 'var(--sys-accent-muted)',
            border: '1px solid color-mix(in srgb, var(--sys-accent) 20%, transparent)',
          }}
        >
          {statusMessage}
        </div>
      ) : null}

      {activeSourceTab === 'online' ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>在线系统主题</h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>{remoteCountLabel} 套可查询</span>
        </div>

        {!remoteThemes.length && !remoteLoading ? (
          <div
            className="rounded-[24px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>还没有查到在线系统主题</div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              先填写分享前端地址并刷新；分享端需要有公开、已发布、已审核通过且挂载了 `system_theme` 的卡片。
            </div>
          </div>
        ) : null}

        {remoteThemes.length ? (
          <div ref={remoteListRef} className="max-h-[72vh] overflow-y-auto pr-1">
            <div className="relative" style={{ height: `${remoteVirtualizer.getTotalSize()}px` }}>
              {remoteVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = remoteThemes[virtualItem.index];
                if (!item) return null;

                return (
                  <div
                    key={virtualItem.key}
                    ref={remoteVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className="absolute left-0 right-0 pb-3"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <RemoteThemeCard
                      item={item}
                      remoteBaseUrl={remoteBaseUrl}
                      installedThemeSet={installedThemeSet}
                      activeThemeId={activeThemeId}
                      remoteInstallingId={remoteInstallingId}
                      accessCodeDrafts={accessCodeDrafts}
                      setAccessCodeDrafts={setAccessCodeDrafts}
                      handleApplyTheme={handleApplyTheme}
                      handleInstallRemoteTheme={handleInstallRemoteTheme}
                      handleUninstallTheme={handleUninstallTheme}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {remoteLoadingMore ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            正在加载更多在线主题...
          </div>
        ) : null}

        {remoteHasMore && !remoteLoadingMore && remoteThemes.length ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            继续下滑会自动加载更多
          </div>
        ) : null}
      </div>
      ) : null}

      {installedThemes.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>已安装主题</h3>
            <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>{installedThemes.length} 套</span>
          </div>
          {installedThemes.map((theme) => {
            const isActive = activeThemeId === theme.id;
            const isUploaded = uploadedThemes.some((item) => item.id === theme.id);
            return (
              <div
                key={theme.id}
                className="flex items-center gap-3 rounded-[24px] p-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface) 90%, white)',
                  boxShadow: '0 12px 30px -24px var(--sys-shadow-color)',
                  border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
                }}
              >
                <img src={theme.coverImage} alt={theme.name} className="h-20 w-20 rounded-[18px] object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[15px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>{theme.name}</div>
                    {isActive ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'var(--sys-accent-soft)',
                          color: 'var(--sys-accent-muted)',
                        }}
                      >
                        当前
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
                    {theme.author} · {theme.sizeLabel || (theme.source === 'builtin' ? 'Built-in' : 'Imported')}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(theme.id, theme.name)}
                      className="rounded-[14px] px-3 py-2 text-[12px] font-semibold"
                      style={{
                        backgroundColor: isActive ? 'var(--sys-accent)' : 'var(--sys-surface-strong)',
                        color: isActive ? 'var(--sys-accent-text)' : 'var(--sys-surface-text)',
                      }}
                    >
                      {isActive ? '已启用' : '应用'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUninstallTheme(theme.id, theme.name)}
                      className="rounded-[14px] px-3 py-2 text-[12px] font-semibold"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                        color: 'var(--sys-muted-text)',
                      }}
                    >
                      {isUploaded ? '删除' : '移出主题库'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {activeSourceTab !== 'online' ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>
            {activeSourceTab === 'builtin' ? '系统内置主题' : '我的上传主题'}
          </h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            {activeSourceTab === 'builtin' ? `${builtinThemes.length} 套可选` : `${uploadedThemes.length} 套已导入`}
          </span>
        </div>
        {(activeSourceTab === 'builtin' ? builtinThemes : uploadedThemes).map((theme) => {
          const isInstalled = installedThemeSet.has(theme.id);
          const isActive = activeThemeId === theme.id;
          const isUploaded = uploadedThemes.some((item) => item.id === theme.id);

          return (
            <div
              key={theme.id}
              className="overflow-hidden rounded-[28px]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 90%, white)',
                boxShadow: '0 18px 38px -28px var(--sys-shadow-color)',
                border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
              }}
            >
              <div className="relative">
                <img src={theme.coverImage} alt={theme.name} className="h-44 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/56 via-black/8 to-transparent" />
                <div
                  className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, transparent)',
                    color: 'var(--sys-status-fg)',
                  }}
                >
                  {isUploaded ? <PackageOpen size={13} /> : <Sparkles size={13} />}
                  {isUploaded ? '导入主题' : '精选主题'}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-[22px] font-semibold text-white">{theme.name}</div>
                      <div className="mt-1 text-[12px] text-white/75">
                        {theme.author} · {theme.version}
                      </div>
                    </div>
                    {isActive ? (
                      <div
                        className="rounded-full px-3 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: 'var(--sys-accent)',
                          color: 'var(--sys-accent-text)',
                        }}
                      >
                        启用中
                      </div>
                    ) : isInstalled ? (
                      <div
                        className="rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 72%, transparent)',
                          color: 'var(--sys-status-fg)',
                        }}
                      >
                        已安装
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <p className="text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>{theme.description}</p>
                <div className="flex flex-wrap gap-2">
                  {theme.tags.map((tag) => (
                    <span
                      key={`${theme.id}-${tag}`}
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                        color: 'var(--sys-muted-text)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {theme.sizeLabel ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: 'var(--sys-accent-soft)',
                        color: 'var(--sys-accent-muted)',
                      }}
                    >
                      {theme.sizeLabel}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {isInstalled ? (
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(theme.id, theme.name)}
                      className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                      style={{
                        backgroundColor: isActive ? 'var(--sys-accent)' : 'var(--sys-surface-strong)',
                        color: isActive ? 'var(--sys-accent-text)' : 'var(--sys-surface-text)',
                      }}
                    >
                      <Palette size={15} />
                      {isActive ? '当前主题' : '立即应用'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(theme.id, theme.name)}
                      className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                      style={{
                        backgroundColor: 'var(--sys-accent)',
                        color: 'var(--sys-accent-text)',
                      }}
                    >
                      <Download size={15} />
                      直接试用
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      isInstalled
                        ? handleUninstallTheme(theme.id, theme.name)
                        : handleApplyTheme(theme.id, theme.name)
                    }
                    className="rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                    style={{
                      backgroundColor: isInstalled
                        ? 'color-mix(in srgb, var(--sys-danger-soft) 88%, white)'
                        : 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                      color: isInstalled ? 'var(--sys-danger)' : 'var(--sys-muted-text)',
                    }}
                  >
                    {isInstalled ? '移除' : '安装后可移除'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {activeSourceTab === 'uploaded' && uploadedThemes.length === 0 ? (
          <div
            className="rounded-[24px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>你还没有上传主题</div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              可以使用顶部的“导入主题包”按钮，把自己的 `.zip` 或 `.json` 主题包加入主题库。
            </div>
          </div>
        ) : null}
      </div>
      ) : null}
    </section>
  );
};
