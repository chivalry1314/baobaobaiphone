import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  KeyRound,
  PackageOpen,
  Palette,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import { BUILTIN_THEME_CATALOG } from '../../../../core/theme/presetThemes';
import { importThemePackage } from '../../../../core/theme/importThemePackage';
import { useThemeStore } from '../../../../core/stores/theme/store';
import { slugifyThemeId } from '../../../../core/theme/types';
import type { ThemeDefinition } from '../../../../core/theme/types';
import { useAppMarketStore } from '../store';
import {
  buildRemoteShareThemeAbsoluteUrl,
  buildRemoteShareThemeCardUrl,
  discoverRemoteShareThemes,
  downloadRemoteShareThemePackage,
  normalizeShareThemeSourceBaseUrl,
} from '../shareThemeClient';
import type { RemoteShareThemeItem } from '../types';

const mergeThemeCatalog = (
  builtinThemes: ThemeDefinition[],
  uploadedThemes: ThemeDefinition[]
): ThemeDefinition[] => {
  const uploadedIds = new Set(uploadedThemes.map((theme) => theme.id));
  return [...uploadedThemes, ...builtinThemes.filter((theme) => !uploadedIds.has(theme.id))];
};

const getRemoteThemeLocalId = (item: RemoteShareThemeItem): string =>
  slugifyThemeId(item.systemTheme.id || item.systemTheme.name || item.card.id);

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
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [remoteThemes, setRemoteThemes] = useState<RemoteShareThemeItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteInstallingId, setRemoteInstallingId] = useState('');
  const [remoteBaseUrlDraft, setRemoteBaseUrlDraft] = useState('');
  const [accessCodeDrafts, setAccessCodeDrafts] = useState<Record<string, string>>({});
  const [activeSourceTab, setActiveSourceTab] = useState<ThemeSourceTab>('online');

  const {
    installedThemeIds,
    uploadedThemes,
    activeThemeId,
    uninstallTheme,
    addUploadedTheme,
    removeUploadedTheme,
    applyTheme,
  } = useThemeStore();
  const { shareThemeSourceBaseUrl, setShareThemeSourceBaseUrl } = useAppMarketStore();

  const remoteBaseUrl = useMemo(
    () => normalizeShareThemeSourceBaseUrl(shareThemeSourceBaseUrl),
    [shareThemeSourceBaseUrl]
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

  useEffect(() => {
    setRemoteBaseUrlDraft(remoteBaseUrl);
  }, [remoteBaseUrl]);

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const loadRemoteThemes = async (targetBaseUrl: string) => {
    const normalizedBaseUrl = normalizeShareThemeSourceBaseUrl(targetBaseUrl);
    if (!normalizedBaseUrl) {
      setRemoteThemes([]);
      setRemoteError(null);
      return;
    }

    try {
      setRemoteLoading(true);
      setRemoteError(null);
      const response = await discoverRemoteShareThemes(normalizedBaseUrl);
      setRemoteThemes(response.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : '在线主题加载失败，请稍后重试';
      setRemoteThemes([]);
      setRemoteError(message);
    } finally {
      setRemoteLoading(false);
    }
  };

  useEffect(() => {
    if (!remoteBaseUrl) {
      setRemoteThemes([]);
      setRemoteError(null);
      return;
    }
    void loadRemoteThemes(remoteBaseUrl);
  }, [remoteBaseUrl]);

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

  const handleSaveRemoteSource = async () => {
    const normalized = normalizeShareThemeSourceBaseUrl(remoteBaseUrlDraft);
    setShareThemeSourceBaseUrl(normalized);
    if (!normalized) {
      setRemoteThemes([]);
      setRemoteError(null);
      showMessage('已清空在线主题源');
      return;
    }
    await loadRemoteThemes(normalized);
    showMessage('在线主题源已更新');
  };

  const handleInstallRemoteTheme = async (item: RemoteShareThemeItem) => {
    if (!remoteBaseUrl) {
      window.alert('请先填写分享前端地址');
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
      const file = await downloadRemoteShareThemePackage({
        baseUrl: remoteBaseUrl,
        item,
        accessCode: normalizedCode,
      });
      const importedTheme = await importThemePackage(file);
      const storedTheme = addUploadedTheme(importedTheme);
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
        className="rounded-[28px] p-5"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
          boxShadow: '0 14px 40px -28px var(--sys-shadow-color)',
          border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>在线系统主题源</div>
            <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              填写 `sharefrontend` 地址后，这里会读取卡片下挂载的 `system_theme` 资源并展示为可安装主题。
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadRemoteThemes(remoteBaseUrlDraft)}
            className="flex items-center gap-2 rounded-[16px] px-4 py-2.5 text-[12px] font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
              color: 'var(--sys-surface-text)',
            }}
            disabled={remoteLoading}
          >
            <RefreshCw size={14} className={remoteLoading ? 'animate-spin' : ''} />
            {remoteLoading ? '刷新中...' : '刷新在线主题'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={remoteBaseUrlDraft}
            onChange={(event) => setRemoteBaseUrlDraft(event.target.value)}
            placeholder="例如：https://share.example.com"
            className="min-w-0 flex-1 rounded-[18px] px-4 py-3 text-[13px] outline-none"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
              color: 'var(--sys-surface-text)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 60%, transparent)',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSaveRemoteSource()}
            className="rounded-[18px] px-5 py-3 text-[13px] font-semibold"
            style={{
              backgroundColor: 'var(--sys-accent)',
              color: 'var(--sys-accent-text)',
            }}
          >
            保存并连接
          </button>
        </div>

        <div className="mt-3 text-[12px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
          本地联调建议使用 `http://127.0.0.1:3001`。如果线上部署为不同域名，需要让分享后端的 CORS 允许当前站点访问。
        </div>

        {remoteError ? (
          <div
            className="mt-4 rounded-[18px] px-4 py-3 text-[12px] font-medium"
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
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>{remoteThemes.length} 套可查询</span>
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

        {remoteThemes.map((item) => {
          const localThemeId = getRemoteThemeLocalId(item);
          const isInstalled = installedThemeSet.has(localThemeId);
          const isActive = activeThemeId === localThemeId;
          const pending = remoteInstallingId === item.card.id;
          const requiresCode = item.accessCodeStatus === 'required';
          const canInstall = item.accessCodeStatus === 'none' || item.accessCodeStatus === 'required';

          return (
            <div
              key={item.card.id}
              className="overflow-hidden rounded-[28px]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sys-surface) 90%, white)',
                boxShadow: '0 18px 38px -28px var(--sys-shadow-color)',
                border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
              }}
            >
              <div className="relative">
                <img
                  src={buildRemoteShareThemeAbsoluteUrl(remoteBaseUrl || remoteBaseUrlDraft, item.card.previewUrl)}
                  alt={item.systemTheme.name}
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
                      <div className="truncate text-[22px] font-semibold text-white">{item.systemTheme.name}</div>
                      <div className="mt-1 text-[12px] text-white/78">
                        {item.systemTheme.author || item.creator.nickname || '未知作者'}
                        {item.systemTheme.version ? ` · ${item.systemTheme.version}` : ''}
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
                <div className="text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>
                  {item.systemTheme.description || item.card.description || '该卡片下挂载了一个可安装的系统主题包。'}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.systemTheme.tags.map((tag) => (
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
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--sys-accent-soft)',
                      color: 'var(--sys-accent-muted)',
                    }}
                  >
                    {item.systemTheme.protocol}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                      color: 'var(--sys-muted-text)',
                    }}
                  >
                    {item.systemTheme.fileName}
                  </span>
                </div>

                <div
                  className="rounded-[20px] p-4"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>
                        {item.creator.nickname || item.creator.username}
                      </div>
                      <div className="mt-1 text-[11px]" style={{ color: 'var(--sys-muted-text)' }}>
                        卡片下载 {item.stats.downloadCount} 次 · 包格式 {item.systemTheme.format.toUpperCase()}
                      </div>
                    </div>
                    <a
                      href={buildRemoteShareThemeCardUrl(remoteBaseUrl || remoteBaseUrlDraft, item.card.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-[12px] font-semibold"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
                        color: 'var(--sys-surface-text)',
                      }}
                    >
                      <ExternalLink size={14} />
                      查看卡片
                    </a>
                  </div>

                  {requiresCode ? (
                    <div
                      className="mt-3 flex flex-col gap-3 rounded-[18px] p-3"
                      style={{
                        backgroundColor: 'color-mix(in srgb, #f59e0b 12%, white)',
                        border: '1px solid color-mix(in srgb, #f59e0b 26%, transparent)',
                      }}
                    >
                      <div className="inline-flex items-center gap-2 text-[12px] font-semibold" style={{ color: '#b45309' }}>
                        <KeyRound size={15} />
                        需要先输入提取码
                      </div>
                      <label
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em]"
                        style={{ color: '#b45309' }}
                      >
                        <AlertCircle size={13} />
                        提取码
                      </label>
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
                      <div className="text-[11px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
                        这个卡片需要提取码。输入正确后会直接下载主题包并导入本地主题库。
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {isInstalled ? (
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(localThemeId, item.systemTheme.name)}
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
                        ? handleUninstallTheme(localThemeId, item.systemTheme.name)
                        : handleApplyTheme(localThemeId, item.systemTheme.name)
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
        })}
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
                <div
                  className="grid h-9 w-9 place-items-center rounded-2xl"
                  style={
                    isUploaded
                      ? { backgroundColor: 'var(--sys-danger-soft)', color: 'var(--sys-danger)' }
                      : { backgroundColor: 'var(--sys-accent-soft)', color: 'var(--sys-accent-muted)' }
                  }
                >
                  {isUploaded ? <Trash2 size={16} /> : <Check size={16} />}
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
