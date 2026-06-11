import type { DesktopLayoutConfig, GlobalSettings } from '../sdk/types';

export const THEME_MANAGED_SETTING_KEYS = [
  'wallpaper',
  'wallpaperOpacity',
  'fontFamily',
  'customFontData',
  'customFontName',
  'customFontFormat',
  'customIcons',
  'iconSize',
  'iconRadius',
  'iconFrosted',
  'iconShadow',
  'showAppName',
] as const;

export type ThemeManagedSettingKey = (typeof THEME_MANAGED_SETTING_KEYS)[number];

export type ThemeSettingsPatch = Partial<Pick<GlobalSettings, ThemeManagedSettingKey>>;

export type ThemeSource = 'builtin' | 'imported';

export interface ThemeVisualTokens {
  desktopOverlay?: string;
  systemBg?: string;
  surface?: string;
  surfaceStrong?: string;
  surfaceText?: string;
  mutedText?: string;
  border?: string;
  shadowColor?: string;
  accent?: string;
  accentText?: string;
  accentSoft?: string;
  accentMuted?: string;
  danger?: string;
  dangerText?: string;
  dangerSoft?: string;
  glassBg?: string;
  glassBorder?: string;
  glassIconBg?: string;
  dockItemMode?: string;
  dockBg?: string;
  dockBorder?: string;
  dockBorderWidth?: string;
  dockRadius?: string;
  dockBlur?: string;
  dockShadow?: string;
  dockActiveBg?: string;
  dockActiveFg?: string;
  dockActiveBorder?: string;
  iconBg?: string;
  iconBorder?: string;
  iconBorderWidth?: string;
  iconInnerBg?: string;
  iconInnerInset?: string;
  iconTexture?: string;
  iconLabel?: string;
  iconGlyph?: string;
  iconShadowColor?: string;
  badgeBg?: string;
  badgeText?: string;
  badgeRing?: string;
  statusFg?: string;
  statusMuted?: string;
  statusChipBg?: string;
  statusChipBorder?: string;
  statusChipBorderWidth?: string;
  statusBatteryBg?: string;
  statusBatteryCap?: string;
  statusBatteryBorderWidth?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  source: ThemeSource;
  coverImage: string;
  previewImages: string[];
  settingsPatch: ThemeSettingsPatch;
  tokens?: ThemeVisualTokens;
  desktopLayout?: DesktopLayoutConfig;
  desktopIcons?: ThemeDesktopIconSnapshot[];
  sizeLabel?: string;
  importedAt?: number;
}

export interface ThemePackageFontRef {
  file: string;
  name?: string;
  format?: string;
}

export interface ThemeDesktopIconSnapshot {
  appId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  customIcon?: string | null;
  source: 'desktop' | 'dock';
  page?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  order?: number;
}

export interface ThemePackageDescriptor {
  id?: string;
  name?: string;
  author?: string;
  version?: string;
  description?: string;
  tags?: string[];
  coverImage?: string;
  previewImages?: string[];
  wallpaper?: string;
  iconPack?: Record<string, string>;
  customFont?: ThemePackageFontRef;
  settingsPatch?: ThemeSettingsPatch;
  themeTokens?: ThemeVisualTokens;
  desktopLayout?: DesktopLayoutConfig;
  desktopIcons?: ThemeDesktopIconSnapshot[];
  tokens?: string;
}

export const extractThemeManagedSettings = (
  settings: GlobalSettings
): ThemeSettingsPatch => ({
  wallpaper: settings.wallpaper,
  wallpaperOpacity: settings.wallpaperOpacity,
  fontFamily: settings.fontFamily,
  customFontData: settings.customFontData ?? null,
  customFontName: settings.customFontName ?? null,
  customFontFormat: settings.customFontFormat ?? null,
  customIcons: { ...(settings.customIcons || {}) },
  iconSize: settings.iconSize,
  iconRadius: settings.iconRadius,
  iconFrosted: settings.iconFrosted,
  iconShadow: settings.iconShadow,
  showAppName: settings.showAppName,
});

export const slugifyThemeId = (input: string): string => {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'theme';
};

export const formatBytesLabel = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
