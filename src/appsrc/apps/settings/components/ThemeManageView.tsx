import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Download, Image as ImageIcon, Palette, Sparkles, Trash2 } from 'lucide-react';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';

import { exportCurrentThemePackage } from '../../../../core/theme/exportCurrentThemePackage';
import { BUILTIN_THEME_CATALOG } from '../../../../core/theme/presetThemes';
import { useDesktopCoreStore } from '../../../../core/stores/desktop/store';
import { useThemeStore } from '../../../../core/stores/theme/store';

export interface ThemeManageViewProps {
  onBack: () => void;
  onOpenThemeMarket?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

export const ThemeManageView: React.FC<ThemeManageViewProps> = ({
  onBack,
  onOpenThemeMarket,
}) => {
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { settings, updateSettings } = useGlobalSettingsStore();
  const desktopLayout = useDesktopCoreStore((state) => state.desktopLayout);
  const { activeThemeId, resetToDefaultTheme, detachFromTheme, installedThemeIds, uploadedThemes } =
    useThemeStore();

  const activeTheme = useMemo(
    () =>
      [...uploadedThemes, ...BUILTIN_THEME_CATALOG].find((theme) => theme.id === activeThemeId) ||
      null,
    [activeThemeId, uploadedThemes]
  );

  const commitManualSettings = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    if (activeThemeId) {
      detachFromTheme();
    }
  };

  const handleExportCurrentTheme = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const { blob, fileName } = await exportCurrentThemePackage({
        settings,
        desktopLayout,
        activeThemeId,
        uploadedThemes,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      window.alert('当前系统主题已导出。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出当前系统主题失败。';
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWallpaperSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      window.alert('请选择 JPG、PNG 或 WebP 格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      commitManualSettings({ wallpaper: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      className="flex-1 overflow-y-auto font-sans"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--sys-system-bg) 88%, white) 0%, var(--sys-system-bg) 42%, color-mix(in srgb, var(--sys-system-bg) 78%, white) 100%)',
        color: 'var(--sys-surface-text)',
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28 }}
    >
      <input
        ref={wallpaperInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleWallpaperSelect}
        className="hidden"
      />

      <motion.main
        className="min-h-full space-y-8 px-5 pb-12 pt-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="space-y-1">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: 'var(--sys-accent-soft)',
                color: 'var(--sys-accent-muted)',
              }}
            >
              <Sparkles size={13} />
              主题管理
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--sys-surface-text)' }}>
              当前系统外观
            </h2>
            <p className="text-[13px] leading-5" style={{ color: 'var(--sys-muted-text)' }}>
              查看当前主题、恢复默认或手动改壁纸。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={<Compass size={18} />}
              label="主题市场"
              onClick={onOpenThemeMarket}
              primary
            />
            <ActionButton
              icon={<ImageIcon size={18} />}
              label="换壁纸"
              onClick={() => wallpaperInputRef.current?.click()}
            />
            <ActionButton
              icon={<Download size={18} />}
              label={isExporting ? '导出中' : '导出主题'}
              onClick={() => void handleExportCurrentTheme()}
              disabled={isExporting}
            />
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="pl-1 text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>当前主题</h3>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetToDefaultTheme}
                    className="flex-1 rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                    style={{
                      backgroundColor: 'var(--sys-accent)',
                      color: 'var(--sys-accent-text)',
                    }}
                  >
                    恢复默认外观
                  </button>
                  <button
                    type="button"
                    onClick={() => detachFromTheme()}
                    className="rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--sys-surface) 72%, transparent)',
                      color: 'var(--sys-muted-text)',
                    }}
                  >
                    解除绑定
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-4 rounded-[24px] p-5"
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
                    <div className="text-[16px] font-semibold" style={{ color: 'var(--sys-surface-text)' }}>当前未启用主题</div>
                    <div className="mt-1 text-[12px]" style={{ color: 'var(--sys-muted-text)' }}>
                      现在是默认外观或手动自定义状态。已安装主题 {installedThemeIds.length} 套。
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenThemeMarket}
                  className="rounded-[18px] px-4 py-3 text-[13px] font-semibold"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
                    color: 'var(--sys-surface-text)',
                    boxShadow: '0 12px 24px -18px var(--sys-shadow-color)',
                    border: '1px solid color-mix(in srgb, var(--sys-border) 56%, transparent)',
                  }}
                >
                  去应用市场挑一套主题
                </button>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="pl-1 text-[11px] font-bold tracking-[0.28em]" style={{ color: 'var(--sys-muted-text)' }}>手动微调</h3>
          {settings.wallpaper ? (
            <div className="relative overflow-hidden rounded-[26px] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.38)]">
              <img src={settings.wallpaper} alt="当前壁纸" className="h-48 w-full object-cover" />
              <button
                type="button"
                onClick={() => commitManualSettings({ wallpaper: null })}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 82%, transparent)',
                  color: 'var(--sys-surface-text)',
                }}
                aria-label="删除壁纸"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : null}

          <div
            className="rounded-[28px] p-5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--sys-surface) 92%, white)',
              boxShadow: '0 14px 40px -28px var(--sys-shadow-color)',
              border: '1px solid color-mix(in srgb, var(--sys-border) 68%, transparent)',
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: 'var(--sys-surface-text)' }}>壁纸透明度</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--sys-muted-text)' }}>{settings.wallpaperOpacity}%</span>
              </div>
              <div
                className="relative h-24 overflow-hidden rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--sys-surface-strong) 84%, black) 0%, color-mix(in srgb, var(--sys-accent) 22%, var(--sys-surface-strong)) 100%)',
                }}
              >
                {settings.wallpaper ? (
                  <img
                    src={settings.wallpaper}
                    alt="壁纸预览"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ opacity: settings.wallpaperOpacity / 100 }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs" style={{ color: 'var(--sys-muted-text)' }}>
                    暂无壁纸
                  </div>
                )}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.wallpaperOpacity}
                onChange={(event) => commitManualSettings({ wallpaperOpacity: Number(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface) 70%, transparent)',
                  accentColor: 'var(--sys-accent)',
                }}
              />
            </div>
          </div>
        </motion.section>
      </motion.main>
    </motion.div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, primary, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-2 rounded-[20px] px-2 py-4 text-center transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
    style={{
      backgroundColor: primary
        ? 'var(--sys-accent)'
        : 'color-mix(in srgb, var(--sys-surface) 92%, white)',
      color: primary ? 'var(--sys-accent-text)' : 'var(--sys-surface-text)',
      boxShadow: primary
        ? '0 12px 24px -18px var(--sys-shadow-color)'
        : '0 8px 20px -18px var(--sys-shadow-color)',
      border: primary
        ? 'none'
        : '1px solid color-mix(in srgb, var(--sys-border) 56%, transparent)',
    }}
  >
    <div
      className="grid h-10 w-10 place-items-center rounded-xl"
      style={{
        backgroundColor: primary
          ? 'color-mix(in srgb, var(--sys-accent-text) 14%, transparent)'
          : 'var(--sys-accent-soft)',
        color: primary ? 'var(--sys-accent-text)' : 'var(--sys-accent-muted)',
      }}
    >
      {icon}
    </div>
    <span className="text-[11px] font-semibold whitespace-nowrap">{label}</span>
  </button>
);

export default ThemeManageView;
