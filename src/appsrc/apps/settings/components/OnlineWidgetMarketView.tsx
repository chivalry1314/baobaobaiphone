import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  Download,
  ExternalLink,
  KeyRound,
  PackageOpen,
  Puzzle,
  RefreshCw,
} from 'lucide-react';

import { ONLINE_WIDGET_SOURCE_BASE_URL } from '../onlineWidgetSourceConfig';
import {
  buildRemoteShareWidgetAbsoluteUrl,
  buildRemoteShareWidgetCardUrl,
  discoverRemoteDesktopComponents,
  downloadRemoteDesktopComponentHtml,
  normalizeShareWidgetSourceBaseUrl,
} from '../shareWidgetClient';
import { parseDesktopWidgetHtml, createCustomWidgetDefinition } from '../desktopWidgetParser';
import type { DiscoverRemoteDesktopComponentsResponse } from '../shareWidgetClient';
import type { RemoteDesktopComponentItem } from '../types';
import { upsertCustomWidgetLibraryItem } from '../../../../core/customWidgetLibrary';
import type { CustomWidgetDefinition } from '../../../../core/stores/types';

const REMOTE_WIDGET_PAGE_SIZE = 24;
const REMOTE_WIDGET_LOAD_AHEAD = 4;
const REMOTE_WIDGET_CARD_ESTIMATED_HEIGHT = 420;

const getRemoteWidgetLocalId = (item: RemoteDesktopComponentItem): string =>
  `remote-widget-${item.card.id}`;

const getRemoteWidgetDisplayName = (item: RemoteDesktopComponentItem): string =>
  item.desktopComponent.name.trim() || item.card.title.trim() || '未命名组件';

const getRemoteWidgetDisplayDescription = (item: RemoteDesktopComponentItem): string =>
  item.card.description.trim() || '该卡片下挂载了一个可安装的桌面组件。';

const getRemoteWidgetDisplayTags = (item: RemoteDesktopComponentItem): string[] =>
  item.card.tags.length ? item.card.tags : [];

const mergeRemoteWidgetItems = (
  currentItems: RemoteDesktopComponentItem[],
  nextItems: RemoteDesktopComponentItem[]
): RemoteDesktopComponentItem[] => {
  if (!currentItems.length) return nextItems;
  if (!nextItems.length) return currentItems;

  const itemMap = new Map(currentItems.map((item) => [item.card.id, item]));
  nextItems.forEach((item) => {
    itemMap.set(item.card.id, item);
  });
  return Array.from(itemMap.values());
};

const getRemoteWidgetCreatorName = (item: RemoteDesktopComponentItem): string => {
  const nickname = item.creator.nickname.trim();
  if (nickname) return nickname;
  const username = item.creator.username.trim();
  if (username) return username;
  return '未知作者';
};

const RemoteWidgetCard: React.FC<{
  item: RemoteDesktopComponentItem;
  remoteBaseUrl: string;
  installedWidgetSet: Set<string>;
  remoteInstallingId: string;
  accessCodeDrafts: Record<string, string>;
  setAccessCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleInstallRemoteWidget: (item: RemoteDesktopComponentItem) => Promise<void>;
}> = ({
  item,
  remoteBaseUrl,
  installedWidgetSet,
  remoteInstallingId,
  accessCodeDrafts,
  setAccessCodeDrafts,
  handleInstallRemoteWidget,
}) => {
  const localWidgetId = getRemoteWidgetLocalId(item);
  const displayName = getRemoteWidgetDisplayName(item);
  const displayDescription = getRemoteWidgetDisplayDescription(item);
  const displayTags = getRemoteWidgetDisplayTags(item);
  const creatorName = getRemoteWidgetCreatorName(item);
  const isInstalled = installedWidgetSet.has(localWidgetId);
  const pending = remoteInstallingId === item.card.id;
  const requiresCode = item.accessCodeStatus === 'required';
  const canInstall = item.accessCodeStatus === 'none' || item.accessCodeStatus === 'required';
  const component = item.desktopComponent;

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
            src={buildRemoteShareWidgetAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)}
            alt={displayName}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-40 w-full items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, white)' }}
          >
            <Puzzle size={48} style={{ color: 'var(--sys-muted-text)' }} />
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
            在线组件
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
              <div className="truncate text-[22px] font-semibold text-white">{displayName}</div>
              <div className="mt-1 text-[12px] text-white/78">
                {creatorName} · {component.width}×{component.height}
              </div>
            </div>
            {isInstalled ? (
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
          {displayDescription}
        </div>

        <div className="flex flex-wrap gap-2">
          {displayTags.map((tag) => (
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
          <button
            type="button"
            onClick={() => void handleInstallRemoteWidget(item)}
            disabled={!canInstall || pending || isInstalled}
            className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold disabled:opacity-60"
            style={{
              backgroundColor: isInstalled ? 'var(--sys-surface-strong)' : 'var(--sys-accent)',
              color: isInstalled ? 'var(--sys-surface-text)' : 'var(--sys-accent-text)',
            }}
          >
            <Download size={15} />
            {pending ? '下载安装中...' : isInstalled ? '已安装' : '下载安装'}
          </button>
          <a
            href={buildRemoteShareWidgetCardUrl(remoteBaseUrl, item.card.id)}
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

export interface OnlineWidgetMarketViewProps {
  installedWidgetIds?: string[];
  onInstallWidget?: (widget: CustomWidgetDefinition) => void;
}

export const OnlineWidgetMarketView: React.FC<OnlineWidgetMarketViewProps> = ({
  installedWidgetIds = [],
  onInstallWidget,
}) => {
  const remoteListRef = useRef<HTMLDivElement | null>(null);
  const [remoteWidgets, setRemoteWidgets] = useState<RemoteDesktopComponentItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remotePagination, setRemotePagination] = useState<DiscoverRemoteDesktopComponentsResponse['pagination'] | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const remoteBaseUrl = useMemo(
    () => normalizeShareWidgetSourceBaseUrl(ONLINE_WIDGET_SOURCE_BASE_URL),
    []
  );

  const installedWidgetSet = useMemo(() => new Set(installedWidgetIds), [installedWidgetIds]);

  const remoteVirtualizer = useVirtualizer({
    count: remoteWidgets.length,
    getScrollElement: () => remoteListRef.current,
    estimateSize: () => REMOTE_WIDGET_CARD_ESTIMATED_HEIGHT,
    overscan: 3,
    getItemKey: (index) => remoteWidgets[index]?.card.id ?? `remote-widget-${index}`,
  });

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const loadRemoteWidgets = async (
    targetBaseUrl: string,
    options?: {
      page?: number;
      append?: boolean;
    }
  ) => {
    const normalizedBaseUrl = normalizeShareWidgetSourceBaseUrl(targetBaseUrl);
    const page = options?.page && options.page > 0 ? options.page : 1;
    const append = Boolean(options?.append && page > 1);
    if (!normalizedBaseUrl) {
      setRemoteWidgets([]);
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
      const response = await discoverRemoteDesktopComponents(normalizedBaseUrl, {
        page,
        size: REMOTE_WIDGET_PAGE_SIZE,
      });
      setRemotePagination(response.pagination);
      setRemoteWidgets((current) =>
        append ? mergeRemoteWidgetItems(current, response.items || []) : response.items || []
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线组件加载失败，请稍后重试';
      if (!append) {
        setRemoteWidgets([]);
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
      setRemoteWidgets([]);
      setRemotePagination(null);
      setRemoteError(null);
      return;
    }
    void loadRemoteWidgets(remoteBaseUrl, { page: 1 });
  }, [remoteBaseUrl]);

  useEffect(() => {
    const [lastVisibleItem] = remoteVirtualizer.getVirtualItems().slice(-1);
    if (!lastVisibleItem) return;

    const remoteHasMore = Boolean(remotePagination?.hasMore);
    if (!remoteHasMore || remoteLoading || remoteLoadingMore || !remoteBaseUrl) return;
    if (lastVisibleItem.index < remoteWidgets.length - REMOTE_WIDGET_LOAD_AHEAD) return;

    void loadRemoteWidgets(remoteBaseUrl, {
      page: (remotePagination?.page ?? 1) + 1,
      append: true,
    });
  }, [
    remoteBaseUrl,
    remotePagination,
    remoteLoading,
    remoteLoadingMore,
    remoteWidgets.length,
    remoteVirtualizer,
  ]);

  const handleInstallRemoteWidget = async (item: RemoteDesktopComponentItem) => {
    if (!remoteBaseUrl) {
      window.alert('请先在 onlineWidgetSourceConfig.ts 中配置在线组件源地址');
      return;
    }

    if (!item.desktopComponent.supported) {
      window.alert('当前卡片下的桌面组件还没有通过协议校验，暂时不能直接安装。');
      return;
    }

    const normalizedCode = (accessCodeDrafts[item.card.id] || '').trim().toUpperCase();
    if (item.accessCodeStatus === 'required' && !normalizedCode) {
      window.alert('该组件需要提取码，请先填写后再下载安装。');
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
      const displayName = getRemoteWidgetDisplayName(item);
      const file = await downloadRemoteDesktopComponentHtml({
        baseUrl: remoteBaseUrl,
        item,
        accessCode: normalizedCode,
      });
      const html = await file.text();
      const parsed = parseDesktopWidgetHtml(html, displayName);
      const widget = createCustomWidgetDefinition(parsed, getRemoteWidgetLocalId(item));

      upsertCustomWidgetLibraryItem(widget);
      onInstallWidget?.(widget);
      showMessage(`桌面组件“${widget.name}”已下载并安装到本地组件库`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线组件安装失败，请稍后重试';
      window.alert(message);
    } finally {
      setRemoteInstallingId('');
    }
  };

  const remoteCountLabel = remotePagination?.total ?? remoteWidgets.length;

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

      <div
        className="flex justify-end"
        style={{}}
      >
        <button
          type="button"
          onClick={() => void loadRemoteWidgets(remoteBaseUrl)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
            color: 'var(--sys-surface-text)',
            border: '1px solid color-mix(in srgb, var(--sys-border) 60%, transparent)',
          }}
          disabled={remoteLoading}
          aria-label={remoteLoading ? '刷新中' : '刷新在线组件'}
          title={remoteLoading ? '刷新中' : '刷新在线组件'}
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

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>
            在线桌面组件
          </h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            {remoteCountLabel} 个可查询
          </span>
        </div>

        {!remoteWidgets.length && !remoteLoading ? (
          <div
            className="rounded-[24px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
              还没有查到在线桌面组件
            </div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              先填写分享前端地址并刷新；分享端需要有公开、已发布、已审核通过且挂载了 `desktop_component` 的卡片。
            </div>
          </div>
        ) : null}

        {remoteWidgets.length ? (
          <div ref={remoteListRef} className="max-h-[72vh] overflow-y-auto pr-1">
            <div className="relative" style={{ height: `${remoteVirtualizer.getTotalSize()}px` }}>
              {remoteVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = remoteWidgets[virtualItem.index];
                if (!item) return null;

                return (
                  <div
                    key={virtualItem.key}
                    ref={remoteVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className="absolute left-0 right-0 pb-3"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <RemoteWidgetCard
                      item={item}
                      remoteBaseUrl={remoteBaseUrl}
                      installedWidgetSet={installedWidgetSet}
                      remoteInstallingId={remoteInstallingId}
                      accessCodeDrafts={accessCodeDrafts}
                      setAccessCodeDrafts={setAccessCodeDrafts}
                      handleInstallRemoteWidget={handleInstallRemoteWidget}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {remoteLoadingMore ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            正在加载更多在线组件...
          </div>
        ) : null}

        {Boolean(remotePagination?.hasMore) && !remoteLoadingMore && remoteWidgets.length ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            继续下滑会自动加载更多
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OnlineWidgetMarketView;
