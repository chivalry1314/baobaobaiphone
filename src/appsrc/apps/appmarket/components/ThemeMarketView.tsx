import React, { useMemo, useRef, useState } from 'react';
import { Check, Download, PackageOpen, Palette, Sparkles, Trash2, Upload } from 'lucide-react';

import { BUILTIN_THEME_CATALOG } from '../../../../core/theme/presetThemes';
import { importThemePackage } from '../../../../core/theme/importThemePackage';
import { useThemeStore } from '../../../../core/stores/theme/store';
import type { ThemeDefinition } from '../../../../core/theme/types';

const mergeThemeCatalog = (
  builtinThemes: ThemeDefinition[],
  uploadedThemes: ThemeDefinition[]
): ThemeDefinition[] => {
  const uploadedIds = new Set(uploadedThemes.map((theme) => theme.id));
  return [...uploadedThemes, ...builtinThemes.filter((theme) => !uploadedIds.has(theme.id))];
};

export const ThemeMarketView: React.FC = () => {
  const importThemeInputRef = useRef<HTMLInputElement>(null);
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const {
    installedThemeIds,
    uploadedThemes,
    activeThemeId,
    installTheme,
    uninstallTheme,
    addUploadedTheme,
    removeUploadedTheme,
    applyTheme,
  } = useThemeStore();

  const allThemes = useMemo(
    () => mergeThemeCatalog(BUILTIN_THEME_CATALOG, uploadedThemes),
    [uploadedThemes]
  );
  const installedThemeSet = useMemo(() => new Set(installedThemeIds), [installedThemeIds]);
  const installedThemes = useMemo(
    () => allThemes.filter((theme) => installedThemeSet.has(theme.id)),
    [allThemes, installedThemeSet]
  );
  const activeTheme = useMemo(
    () => allThemes.find((theme) => theme.id === activeThemeId) || null,
    [allThemes, activeThemeId]
  );

  const showMessage = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? null : current));
    }, 2200);
  };

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

  const handleInstallTheme = (themeId: string, themeName: string) => {
    installTheme(themeId);
    showMessage(`已将“${themeName}”加入主题库`);
  };

  const handleUninstallTheme = (themeId: string, themeName: string) => {
    const confirmed = window.confirm(`确定要从主题库移除“${themeName}”吗？`);
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
            <p className="mt-2 max-w-[340px] text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>
              在这里浏览、导入、安装和启用主题。启用后会同步切换壁纸、图标包、字体和图标样式参数。
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

        {statusMessage ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-[12px] font-medium"
            style={{
              backgroundColor: 'var(--sys-accent-soft)',
              color: 'var(--sys-accent-muted)',
              border: '1px solid color-mix(in srgb, var(--sys-accent) 20%, transparent)',
            }}
          >
            {statusMessage}
          </div>
        ) : null}
      </div>

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
                  你可以从下方主题频道直接安装，也可以导入自己的主题包。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>主题市场</h3>
          <span className="text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>{allThemes.length} 套可选</span>
        </div>
        {allThemes.map((theme) => {
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
                      onClick={() => handleInstallTheme(theme.id, theme.name)}
                      className="flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                      style={{
                        backgroundColor: 'var(--sys-accent)',
                        color: 'var(--sys-accent-text)',
                      }}
                    >
                      <Download size={15} />
                      安装到主题库
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
                    {isInstalled ? '移除' : '直接试用'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
