import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  Download,
  ExternalLink,
  KeyRound,
  MessageCircleHeart,
  PackageOpen,
  Palette,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { ONLINE_WECHAT_THEME_SOURCE_BASE_URL } from '../onlineWechatThemeSourceConfig';
import {
  buildRemoteShareWechatThemeAbsoluteUrl,
  buildRemoteShareWechatThemeCardUrl,
  discoverRemoteWechatThemes,
  downloadRemoteWechatThemePackage,
  normalizeShareWechatThemeSourceBaseUrl,
} from '../shareWechatThemeClient';
import { createWechatThemePatch, parseWechatThemePackage } from '../wechatThemeParser';
import {
  getInstalledWechatThemes,
  subscribeWechatThemeLibrary,
} from '../installedWechatThemeLibrary';
import type { DiscoverRemoteWechatThemesResponse } from '../shareWechatThemeClient';
import type { RemoteWechatThemeItem, WechatThemeDefinition } from '../onlineThemeTypes';

const REMOTE_THEME_PAGE_SIZE = 24;
const REMOTE_THEME_LOAD_AHEAD = 4;
const REMOTE_THEME_CARD_ESTIMATED_HEIGHT = 520;

const mergeRemoteThemeItems = (
  currentItems: RemoteWechatThemeItem[],
  nextItems: RemoteWechatThemeItem[]
): RemoteWechatThemeItem[] => {
  if (!currentItems.length) return nextItems;
  if (!nextItems.length) return currentItems;

  const itemMap = new Map(currentItems.map((item) => [item.card.id, item]));
  nextItems.forEach((item) => {
    itemMap.set(item.card.id, item);
  });
  return Array.from(itemMap.values());
};

const getRemoteThemeLocalId = (item: RemoteWechatThemeItem): string =>
  `wechat-theme-${item.wechatTheme.id || item.card.id}`;

const getRemoteThemeDisplayName = (item: RemoteWechatThemeItem): string =>
  item.wechatTheme.name.trim() || item.card.title.trim() || '未命名主题';

const getRemoteThemeDisplayDescription = (item: RemoteWechatThemeItem): string =>
  item.card.description.trim() || item.wechatTheme.description.trim() || '该卡片下挂载了一个微信聊天主题包。';

const getRemoteThemeDisplayTags = (item: RemoteWechatThemeItem): string[] =>
  item.card.tags.length ? item.card.tags : item.wechatTheme.tags;

const getRemoteThemeCreatorName = (item: RemoteWechatThemeItem): string => {
  const nickname = item.creator.nickname.trim();
  if (nickname) return nickname;
  const username = item.creator.username.trim();
  if (username) return username;
  const author = item.wechatTheme.author.trim();
  if (author) return author;
  return '未知作者';
};

const RemoteWechatThemeCard: React.FC<{
  item: RemoteWechatThemeItem;
  remoteBaseUrl: string;
  installedThemeSet: Set<string>;
  activeThemeId: string;
  remoteInstallingId: string;
  accessCodeDrafts: Record<string, string>;
  setAccessCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleApplyTheme: (themeId: string, themeName: string) => void;
  handleInstallRemoteTheme: (item: RemoteWechatThemeItem) => Promise<void>;
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
}) => {
  const localThemeId = getRemoteThemeLocalId(item);
  const displayThemeName = getRemoteThemeDisplayName(item);
  const displayThemeDescription = getRemoteThemeDisplayDescription(item);
  const displayThemeTags = getRemoteThemeDisplayTags(item);
  const creatorName = getRemoteThemeCreatorName(item);
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
        {item.card.previewUrl ? (
          <img
            src={buildRemoteShareWechatThemeAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)}
            alt={displayThemeName}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-44 w-full items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, white)' }}
          >
            <MessageCircleHeart size={56} style={{ color: 'var(--sys-muted-text)' }} />
          </div>
        )}
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
            在线微信主题
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
              <div className="mt-1 text-[12px] text-white/78">{creatorName}</div>
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
          <a
            href={buildRemoteShareWechatThemeCardUrl(remoteBaseUrl, item.card.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
              color: 'var(--sys-surface-text)',
            }}
          >
            <ExternalLink size={15} />
            查看卡片
          </a>
        </div>
      </div>
    </div>
  );
};

export interface OnlineWechatThemeMarketViewProps {
  installedThemeIds?: string[];
  activeThemeId?: string;
  activeThemeName?: string;
  onInstallTheme?: (theme: WechatThemeDefinition) => void;
  onApplyTheme?: (themeId: string, themeName: string) => void;
  onUninstallTheme?: (themeId: string) => void;
}

export const OnlineWechatThemeMarketView: React.FC<OnlineWechatThemeMarketViewProps> = ({
  installedThemeIds = [],
  activeThemeId = '',
  activeThemeName = '',
  onInstallTheme,
  onApplyTheme,
  onUninstallTheme,
}) => {
  const remoteListRef = useRef<HTMLDivElement | null>(null);
  const [remoteThemes, setRemoteThemes] = useState<RemoteWechatThemeItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remotePagination, setRemotePagination] = useState<DiscoverRemoteWechatThemesResponse['pagination'] | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installedThemes, setInstalledThemes] = useState<WechatThemeDefinition[]>(() =>
    getInstalledWechatThemes()
  );

  useEffect(() => {
    const sync = () => setInstalledThemes(getInstalledWechatThemes());
    sync();
    return subscribeWechatThemeLibrary(sync);
  }, []);

  const remoteBaseUrl = useMemo(
    () => normalizeShareWechatThemeSourceBaseUrl(ONLINE_WECHAT_THEME_SOURCE_BASE_URL),
    []
  );

  const installedThemeSet = useMemo(() => new Set(installedThemeIds), [installedThemeIds]);

  const remoteVirtualizer = useVirtualizer({
    count: remoteThemes.length,
    getScrollElement: () => remoteListRef.current,
    estimateSize: () => REMOTE_THEME_CARD_ESTIMATED_HEIGHT,
    overscan: 3,
    getItemKey: (index) => remoteThemes[index]?.card.id ?? `remote-wechat-theme-${index}`,
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
    const normalizedBaseUrl = normalizeShareWechatThemeSourceBaseUrl(targetBaseUrl);
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
      const response = await discoverRemoteWechatThemes(normalizedBaseUrl, {
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

    const remoteHasMore = Boolean(remotePagination?.hasMore);
    if (!remoteHasMore || remoteLoading || remoteLoadingMore || !remoteBaseUrl) return;
    if (lastVisibleItem.index < remoteThemes.length - REMOTE_THEME_LOAD_AHEAD) return;

    void loadRemoteThemes(remoteBaseUrl, {
      page: (remotePagination?.page ?? 1) + 1,
      append: true,
    });
  }, [
    remoteBaseUrl,
    remotePagination,
    remoteLoading,
    remoteLoadingMore,
    remoteThemes.length,
    remoteVirtualizer,
  ]);

  const handleInstallRemoteTheme = async (item: RemoteWechatThemeItem) => {
    if (!remoteBaseUrl) {
      window.alert('请先在 onlineWechatThemeSourceConfig.ts 中配置在线主题源地址');
      return;
    }

    const isKnownFormat = item.wechatTheme.format === 'json' || item.wechatTheme.format === 'zip';
    if (!item.wechatTheme.supported && !isKnownFormat) {
      window.alert('当前卡片下的微信主题格式未知，暂时不能直接安装。');
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
      const file = await downloadRemoteWechatThemePackage({
        baseUrl: remoteBaseUrl,
        item,
        accessCode: normalizedCode,
      });
      const theme = await parseWechatThemePackage(file);
      const localThemeId = getRemoteThemeLocalId(item);
      const cardTags = Array.isArray(item.card.tags) ? item.card.tags : [];
      const creatorName = item.creator.nickname.trim() || item.creator.username.trim() || '';
      const installedTheme: WechatThemeDefinition = {
        ...theme,
        id: localThemeId,
        name: theme.name.trim() || item.card.title.trim() || '未命名主题',
        author: theme.author === 'Unknown' ? creatorName || 'Unknown' : theme.author,
        description: theme.description.trim() || item.card.description.trim() || '微信主题包',
        tags: theme.tags.length ? theme.tags : cardTags,
        source: 'online',
      };
      onInstallTheme?.(installedTheme);
      showMessage(`微信主题“${installedTheme.name}”已下载并安装`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线主题安装失败，请稍后重试';
      window.alert(message);
    } finally {
      setRemoteInstallingId('');
    }
  };

  const handleApplyTheme = (themeId: string, themeName: string) => {
    onApplyTheme?.(themeId, themeName);
  };

  const remoteCountLabel = remotePagination?.total ?? remoteThemes.length;

  return (
    <div className="space-y-4">
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

      {activeThemeName ? (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[12px] font-medium"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--sys-accent-soft) 70%, white)',
            color: 'var(--sys-accent-muted)',
            border: '1px solid color-mix(in srgb, var(--sys-accent) 20%, transparent)',
          }}
        >
          <div className="min-w-0">
            <span className="font-semibold">当前微信主题：</span>
            <span className="truncate">{activeThemeName}</span>
          </div>
          <button
            type="button"
            onClick={() => onUninstallTheme?.(activeThemeId)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold active:opacity-60"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-danger-soft) 80%, white)',
              color: 'var(--sys-danger)',
              border: '1px solid color-mix(in srgb, var(--sys-danger) 18%, transparent)',
            }}
          >
            <Trash2 size={12} />
            卸载
          </button>
        </div>
      ) : null}

      <div className="flex justify-end">
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

      {installedThemes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>
              已安装主题
            </h3>
            <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
              {installedThemes.length} 个
            </span>
          </div>
          <div className="space-y-2">
            {installedThemes.map((theme) => {
              const isActive = activeThemeId === theme.id;
              return (
                <div
                  key={theme.id}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
                    border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
                      {theme.name}
                    </div>
                    {isActive ? (
                      <div className="mt-0.5 text-[11px]" style={{ color: 'var(--sys-accent-muted)' }}>
                        启用中
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => onApplyTheme?.(theme.id, theme.name)}
                        className="rounded-full px-3 py-1.5 text-[11px] font-semibold active:opacity-60"
                        style={{
                          backgroundColor: 'var(--sys-accent-soft)',
                          color: 'var(--sys-accent-muted)',
                        }}
                      >
                        应用
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onUninstallTheme?.(theme.id)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold active:opacity-60"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--sys-danger-soft) 80%, white)',
                        color: 'var(--sys-danger)',
                        border: '1px solid color-mix(in srgb, var(--sys-danger) 18%, transparent)',
                      }}
                    >
                      <Trash2 size={12} />
                      卸载
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>
            在线微信主题
          </h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            {remoteCountLabel} 个可查询
          </span>
        </div>

        {!remoteThemes.length && !remoteLoading ? (
          <div
            className="rounded-[24px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
              还没有查到在线微信主题
            </div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              先填写分享前端地址并刷新；分享端需要有公开、已发布、已审核通过且挂载了 `wechat_theme` 的卡片。
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
                    <RemoteWechatThemeCard
                      item={item}
                      remoteBaseUrl={remoteBaseUrl}
                      installedThemeSet={installedThemeSet}
                      activeThemeId={activeThemeId}
                      remoteInstallingId={remoteInstallingId}
                      accessCodeDrafts={accessCodeDrafts}
                      setAccessCodeDrafts={setAccessCodeDrafts}
                      handleApplyTheme={handleApplyTheme}
                      handleInstallRemoteTheme={handleInstallRemoteTheme}
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

        {Boolean(remotePagination?.hasMore) && !remoteLoadingMore && remoteThemes.length ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            继续下滑会自动加载更多
          </div>
        ) : null}
      </div>
    </div>
  );
};
