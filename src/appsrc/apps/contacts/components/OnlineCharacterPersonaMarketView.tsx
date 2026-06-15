import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  PackageOpen,
  RefreshCw,
  User,
} from 'lucide-react';

import { ONLINE_CHARACTER_PERSONA_SOURCE_BASE_URL } from '../onlineCharacterPersonaSourceConfig';
import {
  buildRemoteShareCharacterPersonaAbsoluteUrl,
  buildRemoteShareCharacterPersonaCardUrl,
  discoverRemoteCharacterPersonas,
  downloadRemoteCharacterPersonaPackage,
  normalizeShareCharacterPersonaSourceBaseUrl,
} from '../shareCharacterPersonaClient';
import type { DiscoverRemoteCharacterPersonasResponse, RemoteCharacterPersonaItem } from '../shareCharacterPersonaClient';
import { installRemoteCharacterPersonaPackage, isRemoteCharacterPersonaInstalled } from '../characterPersonaInstaller';

const REMOTE_CHARACTER_PERSONA_PAGE_SIZE = 24;

const getRemoteCharacterPersonaDisplayName = (item: RemoteCharacterPersonaItem): string =>
  item.characterPersona.name.trim() || item.card.title.trim() || '未命名角色人设';

const getRemoteCharacterPersonaDisplayDescription = (item: RemoteCharacterPersonaItem): string =>
  item.card.description.trim() || item.characterPersona.description.trim() || '该卡片下挂载了一个可安装的角色人设。';

const getRemoteCharacterPersonaDisplayTags = (item: RemoteCharacterPersonaItem): string[] =>
  item.characterPersona.tags.length ? item.characterPersona.tags : item.card.tags;

const mergeRemoteCharacterPersonaItems = (
  currentItems: RemoteCharacterPersonaItem[],
  nextItems: RemoteCharacterPersonaItem[]
): RemoteCharacterPersonaItem[] => {
  if (!currentItems.length) return nextItems;
  if (!nextItems.length) return currentItems;

  const itemMap = new Map(currentItems.map((item) => [item.card.id, item]));
  nextItems.forEach((item) => {
    itemMap.set(item.card.id, item);
  });
  return Array.from(itemMap.values());
};

const getRemoteCharacterPersonaCreatorName = (item: RemoteCharacterPersonaItem): string => {
  const nickname = item.creator.nickname.trim();
  if (nickname) return nickname;
  const username = item.creator.username.trim();
  if (username) return username;
  return '未知作者';
};

const RemoteCharacterPersonaCard: React.FC<{
  item: RemoteCharacterPersonaItem;
  remoteBaseUrl: string;
  remoteInstallingId: string;
  accessCodeDrafts: Record<string, string>;
  setAccessCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleInstallRemoteCharacterPersona: (item: RemoteCharacterPersonaItem) => Promise<void>;
}> = ({
  item,
  remoteBaseUrl,
  remoteInstallingId,
  accessCodeDrafts,
  setAccessCodeDrafts,
  handleInstallRemoteCharacterPersona,
}) => {
  const displayName = getRemoteCharacterPersonaDisplayName(item);
  const displayDescription = getRemoteCharacterPersonaDisplayDescription(item);
  const displayTags = getRemoteCharacterPersonaDisplayTags(item);
  const creatorName = getRemoteCharacterPersonaCreatorName(item);
  const isInstalled = isRemoteCharacterPersonaInstalled(item.card.id);
  const pending = remoteInstallingId === item.card.id;
  const requiresCode = item.accessCodeStatus === 'required';
  const canInstall = item.accessCodeStatus === 'none' || item.accessCodeStatus === 'required';
  const persona = item.characterPersona;

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
            src={buildRemoteShareCharacterPersonaAbsoluteUrl(remoteBaseUrl, item.card.previewUrl)}
            alt={displayName}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-40 w-full items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 70%, white)' }}
          >
            <User size={48} style={{ color: 'var(--sys-muted-text)' }} />
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
            在线角色人设
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
                {creatorName} · {persona.contactCount} 位联系人
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
            onClick={() => void handleInstallRemoteCharacterPersona(item)}
            disabled={!canInstall || pending || isInstalled}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold transition disabled:opacity-50"
            style={{
              backgroundColor: 'var(--sys-accent)',
              color: 'var(--sys-on-accent)',
              boxShadow: '0 10px 24px -12px var(--sys-accent)',
            }}
          >
            {pending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isInstalled ? '已安装' : pending ? '安装中…' : '安装'}
          </button>

          <a
            href={buildRemoteShareCharacterPersonaCardUrl(remoteBaseUrl, item.card.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-[13px] font-semibold transition"
            style={{
              borderColor: 'color-mix(in srgb, var(--sys-border) 60%, transparent)',
              color: 'var(--sys-muted-text)',
            }}
          >
            <ExternalLink size={16} />
            详情
          </a>
        </div>
      </div>
    </div>
  );
};

export const OnlineCharacterPersonaMarketView: React.FC = () => {
  const [baseUrl] = useState(() => normalizeShareCharacterPersonaSourceBaseUrl(ONLINE_CHARACTER_PERSONA_SOURCE_BASE_URL));
  const [items, setItems] = useState<RemoteCharacterPersonaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2400);
  };

  const loadItems = async (targetPage: number, isRefresh: boolean) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await discoverRemoteCharacterPersonas(baseUrl, {
        page: targetPage,
        size: REMOTE_CHARACTER_PERSONA_PAGE_SIZE,
      });

      setItems((current) =>
        isRefresh || targetPage === 1
          ? response.items
          : mergeRemoteCharacterPersonaItems(current, response.items)
      );
      setPage(response.pagination.page);
      setHasMore(response.pagination.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadItems(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadItems(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    void loadItems(page + 1, false);
  };

  const handleInstallRemoteCharacterPersona = async (item: RemoteCharacterPersonaItem) => {
    if (remoteInstallingId) return;

    setRemoteInstallingId(item.card.id);
    setError(null);

    try {
      const file = await downloadRemoteCharacterPersonaPackage({
        baseUrl,
        item,
        accessCode: accessCodeDrafts[item.card.id],
      });
      const result = await installRemoteCharacterPersonaPackage(file, item.card.id);
      showMessage(`已安装 ${result.installedCount} 位联系人`);
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : '安装失败');
    } finally {
      setRemoteInstallingId('');
    }
  };

  const containerStyle = useMemo(
    () => ({
      backgroundColor: 'color-mix(in srgb, var(--sys-background) 97%, white)',
      color: 'var(--sys-surface-text)',
    }),
    []
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={containerStyle}>
      <div className="shrink-0 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
              在线角色人设
            </h2>
            <p className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
              从分享平台发现并安装角色人设
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 80%, white)',
              color: 'var(--sys-muted-text)',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {error ? (
          <div
            className="rounded-[20px] p-4 text-[13px] font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-danger-soft) 90%, white)',
              color: 'var(--sys-danger)',
            }}
          >
            {error}
          </div>
        ) : null}

        {message ? (
          <div
            className="mb-4 rounded-[20px] p-4 text-[13px] font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-accent-soft) 90%, white)',
              color: 'var(--sys-accent-muted)',
            }}
          >
            {message}
          </div>
        ) : null}

        <div className="space-y-4">
          {items.map((item) => (
            <RemoteCharacterPersonaCard
              key={item.card.id}
              item={item}
              remoteBaseUrl={baseUrl}
              remoteInstallingId={remoteInstallingId}
              accessCodeDrafts={accessCodeDrafts}
              setAccessCodeDrafts={setAccessCodeDrafts}
              handleInstallRemoteCharacterPersona={handleInstallRemoteCharacterPersona}
            />
          ))}

          {loading && items.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-48 animate-pulse rounded-[28px]"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--sys-surface) 80%, white)' }}
                />
              ))}
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-[28px] py-12 text-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 90%, white)',
                border: '1px solid color-mix(in srgb, var(--sys-border) 50%, transparent)',
              }}
            >
              <PackageOpen size={40} style={{ color: 'var(--sys-muted-text)' }} />
              <p className="mt-3 text-[14px] font-medium" style={{ color: 'var(--sys-muted-text)' }}>
                暂无可安装的角色人设
              </p>
            </div>
          ) : null}

          {hasMore && items.length > 0 ? (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full rounded-[18px] py-3 text-[13px] font-semibold transition active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 80%, white)',
                color: 'var(--sys-muted-text)',
              }}
            >
              {loading ? '加载中…' : '加载更多'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
