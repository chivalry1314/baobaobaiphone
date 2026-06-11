import JSZip from 'jszip';

import { readCustomWidgetLibrary } from '../customWidgetLibrary';
import { localApps } from '../registry';
import type { DesktopLayoutConfig, GlobalSettings } from '../sdk/types';
import { BUILTIN_THEME_CATALOG } from './presetThemes';
import { resolveThemeTokens } from './runtimeTokens';
import {
  extractThemeManagedSettings,
  slugifyThemeId,
  type ThemeDesktopIconSnapshot,
  type ThemeDefinition,
  type ThemeSettingsPatch,
} from './types';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/gif': '.gif',
  'font/woff2': '.woff2',
  'font/woff': '.woff',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
  'application/font-woff': '.woff',
  'application/font-woff2': '.woff2',
  'application/x-font-ttf': '.ttf',
  'application/x-font-otf': '.otf',
};

const FONT_FORMAT_EXTENSION_MAP: Record<string, string> = {
  woff2: '.woff2',
  woff: '.woff',
  truetype: '.ttf',
  opentype: '.otf',
};

const THEME_PACKAGE_SCHEMA_VERSION = 'baobaobaiphone-theme@1';
const DEFAULT_DOCK_ICONS = [
  { appId: 'phone', name: 'Phone', icon: 'Phone' },
  { appId: 'safari', name: 'Safari', icon: 'Compass' },
  { appId: 'messages', name: 'Messages', icon: 'MessageCircle' },
  { appId: 'camera', name: 'Camera', icon: 'Camera' },
] as const;

export interface ExportCurrentThemePackageOptions {
  settings: GlobalSettings;
  desktopLayout: DesktopLayoutConfig;
  activeThemeId: string | null;
  uploadedThemes: ThemeDefinition[];
  themeName?: string;
  author?: string;
  description?: string;
  version?: string;
  now?: Date;
}

export interface ExportCurrentThemePackageResult {
  blob: Blob;
  fileName: string;
  manifest: Record<string, unknown>;
}

const findThemeById = (
  themeId: string | null,
  uploadedThemes: ThemeDefinition[]
): ThemeDefinition | null => {
  if (!themeId) return null;
  return (
    uploadedThemes.find((theme) => theme.id === themeId) ||
    BUILTIN_THEME_CATALOG.find((theme) => theme.id === themeId) ||
    null
  );
};

const formatTimestamp = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  const seconds = `${value.getSeconds()}`.padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const fileNameFromPath = (input: string): string => {
  const normalized = input.split('?')[0].split('#')[0];
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
};

const extensionFromPath = (input: string): string | null => {
  const fileName = fileNameFromPath(input);
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return null;
  return fileName.slice(dotIndex).toLowerCase();
};

const inferExtension = (
  source: string,
  mimeType: string,
  fallbackExtension?: string
): string => {
  if (fallbackExtension) return fallbackExtension;
  const pathExtension = extensionFromPath(source);
  if (pathExtension) return pathExtension;
  return MIME_EXTENSION_MAP[mimeType] || '.bin';
};

const normalizeTags = (activeTheme: ThemeDefinition | null): string[] =>
  Array.from(
    new Set([
      ...(activeTheme?.tags || []),
      'exported',
      'current-system',
    ])
  );

const buildThemeName = (
  activeTheme: ThemeDefinition | null,
  override?: string
): string => {
  const normalizedOverride = override?.trim();
  if (normalizedOverride) return normalizedOverride;
  if (activeTheme?.name?.trim()) return `${activeTheme.name} Snapshot`;
  return 'Current System Theme';
};

const buildEffectiveSettingsPatch = (
  settings: GlobalSettings,
  activeTheme: ThemeDefinition | null
): ThemeSettingsPatch => {
  const settingsPatch = extractThemeManagedSettings(settings);
  if (!activeTheme?.settingsPatch.customIcons) {
    return settingsPatch;
  }

  return {
    ...settingsPatch,
    customIcons: {
      ...(settingsPatch.customIcons || {}),
      ...activeTheme.settingsPatch.customIcons,
    },
  };
};

const stripEmbeddedAssets = (settingsPatch: ThemeSettingsPatch): ThemeSettingsPatch => {
  const {
    wallpaper,
    customIcons,
    customFontData,
    customFontName,
    customFontFormat,
    ...plainSettings
  } = settingsPatch;

  return plainSettings;
};

const cloneDesktopLayout = (desktopLayout: DesktopLayoutConfig): DesktopLayoutConfig => ({
  rows: desktopLayout.rows,
  cols: desktopLayout.cols,
  pageCount: desktopLayout.pageCount,
  layoutMode: desktopLayout.layoutMode,
  items: (desktopLayout.items || []).map((item) => ({
    ...item,
    data: item.data ? { ...item.data } : undefined,
  })),
  customWidgets: (desktopLayout.customWidgets || []).map((widget) => ({
    ...widget,
    data: widget.data ? { ...widget.data } : undefined,
  })),
});

const mergeDesktopCustomWidgets = (
  desktopLayout: DesktopLayoutConfig
): DesktopLayoutConfig => {
  const localCustomWidgets = readCustomWidgetLibrary();
  if (!localCustomWidgets.length) {
    return cloneDesktopLayout(desktopLayout);
  }

  const clonedLayout = cloneDesktopLayout(desktopLayout);
  const mergedCustomWidgets = [...(clonedLayout.customWidgets || []), ...localCustomWidgets].filter(
    (widget, index, array) =>
      array.findIndex(
        (item) =>
          item.id === widget.id ||
          (item.name === widget.name && item.widgetCode === widget.widgetCode)
      ) === index
  );

  return {
    ...clonedLayout,
    customWidgets: mergedCustomWidgets,
  };
};

const buildDesktopIconSnapshots = (
  desktopLayout: DesktopLayoutConfig,
  iconPack: Record<string, string>
): ThemeDesktopIconSnapshot[] => {
  const localAppMap = new Map(localApps.map((app) => [app.id, app]));

  const desktopItems = (desktopLayout.items || [])
    .filter((item) => item.type === 'app')
    .map((item) => {
      const app = localAppMap.get(item.componentId);
      return {
        appId: item.componentId,
        name: item.data?.name || app?.name || item.componentId,
        icon: app?.icon || null,
        color: app?.color || null,
        customIcon: iconPack[item.componentId] || null,
        source: 'desktop' as const,
        page: item.page,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
    });

  const dockItems = DEFAULT_DOCK_ICONS.map((item, index) => ({
    appId: item.appId,
    name: item.name,
    icon: item.icon,
    color: null,
    customIcon: iconPack[item.appId] || null,
    source: 'dock' as const,
    order: index,
  }));

  return [...desktopItems, ...dockItems];
};

const fetchAssetBlob = async (source: string): Promise<Blob> => {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to read asset: ${response.status}`);
  }
  return response.blob();
};

const appendBlobAsset = async (
  zip: JSZip,
  source: string,
  basePath: string,
  fallbackExtension?: string
): Promise<string> => {
  const blob = await fetchAssetBlob(source);
  const extension = inferExtension(source, blob.type, fallbackExtension);
  const assetPath = `${basePath}${extension}`;
  zip.file(assetPath, blob);
  return assetPath;
};

export const exportCurrentThemePackage = async (
  options: ExportCurrentThemePackageOptions
): Promise<ExportCurrentThemePackageResult> => {
  const now = options.now || new Date();
  const activeTheme = findThemeById(options.activeThemeId, options.uploadedThemes);
  const themeName = buildThemeName(activeTheme, options.themeName);
  const timestamp = formatTimestamp(now);
  const themeId = slugifyThemeId(
    `${activeTheme?.id || 'current-system-theme'}-snapshot-${timestamp}`
  );
  const effectiveSettingsPatch = buildEffectiveSettingsPatch(options.settings, activeTheme);
  const exportSettingsPatch = stripEmbeddedAssets(effectiveSettingsPatch);
  const resolvedThemeTokens = resolveThemeTokens(activeTheme);
  const desktopLayoutSnapshot = mergeDesktopCustomWidgets(options.desktopLayout);
  const zip = new JSZip();

  const manifest: Record<string, unknown> = {
    schemaVersion: THEME_PACKAGE_SCHEMA_VERSION,
    id: themeId,
    name: themeName,
    author: options.author?.trim() || 'User',
    version: options.version?.trim() || '1.0.0',
    description:
      options.description?.trim() ||
      'Exported from the current baobaobaiphone system appearance.',
    tags: normalizeTags(activeTheme),
    settingsPatch: exportSettingsPatch,
    tokens: 'tokens.json',
    desktopLayout: desktopLayoutSnapshot,
    meta: {
      exportedAt: now.toISOString(),
      sourceThemeId: activeTheme?.id || null,
      sourceThemeName: activeTheme?.name || null,
    },
  };

  if (effectiveSettingsPatch.wallpaper?.trim()) {
    manifest.wallpaper = await appendBlobAsset(
      zip,
      effectiveSettingsPatch.wallpaper,
      'wallpaper'
    );
  }

  const effectiveIcons = effectiveSettingsPatch.customIcons || {};
  const iconEntries = Object.entries(effectiveIcons).filter(([, value]) => Boolean(value?.trim()));
  const iconPack: Record<string, string> = {};
  if (iconEntries.length) {
    await Promise.all(
      iconEntries.map(async ([appId, assetSource]) => {
        const safeAppId = slugifyThemeId(appId) || 'app-icon';
        iconPack[appId] = await appendBlobAsset(zip, assetSource, `icons/${safeAppId}`);
      })
    );
    manifest.iconPack = iconPack;
  }

  manifest.desktopIcons = buildDesktopIconSnapshots(desktopLayoutSnapshot, iconPack);

  if (effectiveSettingsPatch.customFontData?.trim() && effectiveSettingsPatch.customFontName?.trim()) {
    const fontFormat = effectiveSettingsPatch.customFontFormat?.trim() || 'woff2';
    const fontExtension = FONT_FORMAT_EXTENSION_MAP[fontFormat] || '.woff2';
    const fontPath = await appendBlobAsset(
      zip,
      effectiveSettingsPatch.customFontData,
      `fonts/${slugifyThemeId(effectiveSettingsPatch.customFontName) || 'custom-font'}`,
      fontExtension
    );

    manifest.customFont = {
      file: fontPath,
      name: effectiveSettingsPatch.customFontName,
      format: fontFormat,
    };
  }

  zip.file(
    'manifest.json',
    JSON.stringify(manifest, null, 2)
  );
  zip.file(
    'tokens.json',
    JSON.stringify({ themeTokens: resolvedThemeTokens }, null, 2)
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    blob,
    fileName: `${themeId}.zip`,
    manifest,
  };
};
