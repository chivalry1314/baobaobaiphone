import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  ExternalLink,
  PackageOpen,
  RefreshCw,
} from 'lucide-react';

import { ONLINE_WORLDBOOK_SOURCE_BASE_URL } from '../onlineWorldBookSourceConfig';
import {
  buildRemoteShareWorldBookAbsoluteUrl,
  buildRemoteShareWorldBookCardUrl,
  discoverRemoteWorldBooks,
  downloadRemoteWorldBookPackage,
  normalizeShareWorldBookSourceBaseUrl,
} from '../shareWorldBookClient';
import type { DiscoverRemoteWorldBooksResponse, RemoteWorldBookItem } from '../shareWorldBookClient';
import { installRemoteWorldBookPackage, isRemoteWorldBookInstalled } from '../worldBookInstaller';

const REMOTE_WORLDBOOK_PAGE_SIZE = 24;

const getRemoteWorldBookDisplayName = (item: RemoteWorldBookItem): string =>
  item.worldBook.name.trim() || item.card.title.trim() || '未命名世界书';

const getRemoteWorldBookDisplayDescription = (item: RemoteWorldBookItem): string =>
  item.card.description.trim() || item.worldBook.description.trim() || '该卡片下挂载了一个可安装的世界书。';

const getRemoteWorldBookDisplayTags = (item: RemoteWorldBookItem): string[] =>
  item.worldBook.tags.length ? item.worldBook.tags : item.card.tags;

const mergeRemoteWorldBookItems = (
  currentItems: RemoteWorldBookItem[],
  nextItems: RemoteWorldBookItem[]
): RemoteWorldBookItem[] => {
  if (!currentItems.length) return nextItems;
  if (!nextItems.length) return currentItems;

  const itemMap = new Map(currentItems.map((item) => [item.card.id, item]));
  nextItems.forEach((item) => {
    itemMap.set(item.card.id, item);
  });
  return Array.from(itemMap.values());
};

const getRemoteWorldBookCreatorName = (item: RemoteWorldBookItem): string => {
  const nickname = item.creator.nickname.trim();
  if (nickname) return nickname;
  const username = item.creator.username.trim();
  if (username) return username;
  return '未知作者';
};

const RemoteWorldBookCard: React.FC<{
  item: RemoteWorldBookItem;
  remoteBaseUrl: string;
  remoteInstallingId: string;
  accessCodeDrafts: Record<string, string>;
  setAccessCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleInstallRemoteWorldBook: (item: RemoteWorldBookItem) => Promise<void>;
}> = ({
  item,
  remoteBaseUrl,
  remoteInstallingId,
  accessCodeDrafts,
  setAccessCodeDrafts,
  handleInstallRemoteWorldBook,
}) => {
  const displayName = getRemoteWorldBookDisplayName(item);
  const displayDescription = getRemoteWorldBookDisplayDescription(item);
  const displayTags = getRemoteWorldBookDisplayTags(item);
  const creatorName = getRemoteWorldBookCreatorName(item);
  const isInstalled = isRemoteWorldBookInstalled(item.card.id);
  const pending = remoteInstallingId === item.card.id;
  const requiresCode = item.accessCodeStatus === 'required';
  const canInstall = item.accessCodeStatus === 'none' || item.accessCodeStatus === 'required';
  const worldBook = item.worldBook;

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
            src={buildRemoteShareWorldBookAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)}
            alt={displayName}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-40 w-full items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, white)' }}
          >
            <BookOpen size={48} style={{ color: 'var(--sys-muted-text)' }} />
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
            在线世界书
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
                {creatorName} · {worldBook.entryCount} 条条目
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
            onClick={() => void handleInstallRemoteWorldBook(item)}
            disabled={!canInstall || pending}
            className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold disabled:opacity-60"
            style={{
              backgroundColor: isInstalled ? 'var(--sys-surface-strong)' : 'var(--sys-accent)',
              color: isInstalled ? 'var(--sys-surface-text)' : 'var(--sys-accent-text)',
            }}
          >
            <Download size={15} />
            {pending ? '下载安装中...' : isInstalled ? '再次安装' : '下载安装'}
          </button>
          <a
            href={buildRemoteShareWorldBookCardUrl(remoteBaseUrl, item.card.id)}
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

export const OnlineWorldBookMarketView: React.FC = () => {
  const [remoteWorldBooks, setRemoteWorldBooks] = useState<RemoteWorldBookItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remotePagination, setRemotePagination] = useState<DiscoverRemoteWorldBooksResponse['pagination'] | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const remoteBaseUrl = useMemo(
    () => normalizeShareWorldBookSourceBaseUrl(ONLINE_WORLDBOOK_SOURCE_BASE_URL),
    []
  );

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const loadRemoteWorldBooks = async (
    targetBaseUrl: string,
    options?: {
      page?: number;
      append?: boolean;
    }
  ) => {
    const normalizedBaseUrl = normalizeShareWorldBookSourceBaseUrl(targetBaseUrl);
    const page = options?.page && options.page > 0 ? options.page : 1;
    const append = Boolean(options?.append && page > 1);
    if (!normalizedBaseUrl) {
      setRemoteWorldBooks([]);
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
      const response = await discoverRemoteWorldBooks(normalizedBaseUrl, {
        page,
        size: REMOTE_WORLDBOOK_PAGE_SIZE,
      });
      setRemotePagination(response.pagination);
      setRemoteWorldBooks((current) =>
        append ? mergeRemoteWorldBookItems(current, response.items || []) : response.items || []
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线世界书加载失败，请稍后重试';
      if (!append) {
        setRemoteWorldBooks([]);
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
      setRemoteWorldBooks([]);
      setRemotePagination(null);
      setRemoteError(null);
      return;
    }
    void loadRemoteWorldBooks(remoteBaseUrl, { page: 1 });
  }, [remoteBaseUrl]);

  const handleLoadMore = () => {
    if (!remoteBaseUrl || remoteLoading || remoteLoadingMore || !remotePagination?.hasMore) return;
    void loadRemoteWorldBooks(remoteBaseUrl, {
      page: (remotePagination?.page ?? 1) + 1,
      append: true,
    });
  };

  const handleInstallRemoteWorldBook = async (item: RemoteWorldBookItem) => {
    if (!remoteBaseUrl) {
      window.alert('请先在 onlineWorldBookSourceConfig.ts 中配置在线世界书源地址');
      return;
    }

    if (!item.worldBook.supported) {
      window.alert('当前卡片下的世界书还没有通过协议校验，暂时不能直接安装。');
      return;
    }

    const normalizedCode = (accessCodeDrafts[item.card.id] || '').trim().toUpperCase();
    if (item.accessCodeStatus === 'required' && !normalizedCode) {
      window.alert('该世界书需要提取码，请先填写后再下载安装。');
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
      const displayName = getRemoteWorldBookDisplayName(item);
      const file = await downloadRemoteWorldBookPackage({
        baseUrl: remoteBaseUrl,
        item,
        accessCode: normalizedCode,
      });
      const result = await installRemoteWorldBookPackage(file, item.card.id);
      showMessage(`世界书“${displayName}”已下载，成功追加 ${result.installedCount} 条条目`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线世界书安装失败，请稍后重试';
      window.alert(message);
    } finally {
      setRemoteInstallingId('');
    }
  };

  const remoteCountLabel = remotePagination?.total ?? remoteWorldBooks.length;

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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void loadRemoteWorldBooks(remoteBaseUrl)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
            color: 'var(--sys-surface-text)',
            border: '1px solid color-mix(in srgb, var(--sys-border) 60%, transparent)',
          }}
          disabled={remoteLoading}
          aria-label={remoteLoading ? '刷新中' : '刷新在线世界书'}
          title={remoteLoading ? '刷新中' : '刷新在线世界书'}
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
            在线世界书
          </h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            {remoteCountLabel} 个可查询
          </span>
        </div>

        {!remoteWorldBooks.length && !remoteLoading ? (
          <div
            className="rounded-[24px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="text-[14px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
              还没有查到在线世界书
            </div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              先填写分享前端地址并刷新；分享端需要有公开、已发布、已审核通过且挂载了 `world_book` 的卡片。
            </div>
          </div>
        ) : null}

        {remoteWorldBooks.length ? (
          <div className="space-y-3">
            {remoteWorldBooks.map((item) => (
              <RemoteWorldBookCard
                key={item.card.id}
                item={item}
                remoteBaseUrl={remoteBaseUrl}
                remoteInstallingId={remoteInstallingId}
                accessCodeDrafts={accessCodeDrafts}
                setAccessCodeDrafts={setAccessCodeDrafts}
                handleInstallRemoteWorldBook={handleInstallRemoteWorldBook}
              />
            ))}
          </div>
        ) : null}

        {remoteLoadingMore ? (
          <div className="px-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
            正在加载更多在线世界书...
          </div>
        ) : null}

        {Boolean(remotePagination?.hasMore) && !remoteLoadingMore && remoteWorldBooks.length ? (
          <button
            type="button"
            onClick={handleLoadMore}
            className="w-full rounded-[18px] px-4 py-3 text-[13px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
              color: 'var(--sys-surface-text)',
            }}
          >
            加载更多
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default OnlineWorldBookMarketView;
