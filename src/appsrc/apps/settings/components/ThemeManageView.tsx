import React, { useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Compass, Image as ImageIcon, Palette, Sparkles, Trash2 } from 'lucide-react';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';

import { BUILTIN_THEME_CATALOG } from '../../../../core/theme/presetThemes';
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
  const { settings, updateSettings } = useGlobalSettingsStore();
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
          <div
            className="overflow-hidden rounded-[30px] p-5"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--sys-surface-strong) 92%, white) 0%, color-mix(in srgb, var(--sys-surface) 86%, white) 100%)',
              boxShadow: '0 18px 48px -30px var(--sys-shadow-color)',
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
                  主题管理
                </div>
                <h2 className="mt-3 text-[24px] font-semibold tracking-tight" style={{ color: 'var(--sys-surface-text)' }}>
                  当前系统外观
                </h2>
                <p className="mt-2 max-w-[320px] text-[13px] leading-6" style={{ color: 'var(--sys-muted-text)' }}>
                  这里主要负责查看当前主题、恢复默认、手动改壁纸。想浏览更多主题，请前往应用市场的主题频道。
                </p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface) 88%, white)',
                  color: 'var(--sys-muted-text)',
                  boxShadow: '0 8px 22px -16px var(--sys-shadow-color)',
                  border: '1px solid color-mix(in srgb, var(--sys-border) 56%, transparent)',
                }}
                aria-label="返回"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onOpenThemeMarket}
                className="flex items-center gap-3 rounded-[22px] px-4 py-4 text-left"
                style={{
                  backgroundColor: 'var(--sys-accent)',
                  color: 'var(--sys-accent-text)',
                  boxShadow: '0 16px 30px -22px var(--sys-shadow-color)',
                }}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--sys-accent-text) 14%, transparent)' }}
                >
                  <Compass size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">前往主题市场</div>
                  <div
                    className="mt-0.5 text-[11px]"
                    style={{ color: 'color-mix(in srgb, var(--sys-accent-text) 74%, transparent)' }}
                  >
                    应用市场 · 主题频道
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => wallpaperInputRef.current?.click()}
                className="flex items-center gap-3 rounded-[22px] px-4 py-4 text-left"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-surface) 88%, white)',
                  color: 'var(--sys-surface-text)',
                  boxShadow: '0 16px 30px -24px var(--sys-shadow-color)',
                  border: '1px solid color-mix(in srgb, var(--sys-border) 56%, transparent)',
                }}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{
                    backgroundColor: 'var(--sys-accent-soft)',
                    color: 'var(--sys-accent-muted)',
                  }}
                >
                  <ImageIcon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">手动更换壁纸</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--sys-muted-text)' }}>会解除当前主题绑定</div>
                </div>
              </button>
            </div>
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
                <span className="text-[15px] font-medium" style={{ color: 'var(--sys-surface-text)' }}>壁纸透明度</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--sys-muted-text)' }}>{settings.wallpaperOpacity}%</span>
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
                  <div className="absolute inset-0 grid place-items-center text-sm" style={{ color: 'var(--sys-muted-text)' }}>
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

export default ThemeManageView;
