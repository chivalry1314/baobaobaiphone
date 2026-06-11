import JSZip from 'jszip';

import type { ThemeDefinition, ThemePackageDescriptor, ThemeSettingsPatch } from './types';
import { formatBytesLabel, slugifyThemeId } from './types';

const MAX_THEME_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_THEME_PACKAGE_FILES = 200;
const DEFAULT_FONT_FALLBACK = 'ui-sans-serif, system-ui, sans-serif';

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

const FONT_FORMAT_BY_EXT: Record<string, string> = {
  '.woff2': 'woff2',
  '.woff': 'woff',
  '.ttf': 'truetype',
  '.otf': 'opentype',
};

const FONT_MIME_BY_EXT: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const normalizePath = (input: string): string =>
  input
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');

const dirname = (input: string): string => {
  const normalized = normalizePath(input);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
};

const joinPath = (baseDir: string, target: string): string => {
  const rawSegments = `${baseDir ? `${baseDir}/` : ''}${target}`
    .split('/')
    .filter(Boolean);
  const resolved: string[] = [];

  rawSegments.forEach((segment) => {
    if (segment === '.') return;
    if (segment === '..') {
      if (!resolved.length) {
        throw new Error('主题包资源路径无效，不能越级访问上级目录。');
      }
      resolved.pop();
      return;
    }
    resolved.push(segment);
  });

  return resolved.join('/');
};

const getFileExtension = (fileName: string): string => {
  const normalized = normalizePath(fileName).toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(dotIndex) : '';
};

const fileToText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });

const buildDataUrl = async (entry: JSZip.JSZipObject, mimeType: string): Promise<string> => {
  const base64 = await entry.async('base64');
  return `data:${mimeType};base64,${base64}`;
};

const pickMimeByPath = (filePath: string): string | null => {
  const extension = getFileExtension(filePath);
  return IMAGE_MIME_BY_EXT[extension] || FONT_MIME_BY_EXT[extension] || null;
};

const createFallbackCover = (themeName: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg width="900" height="620" viewBox="0 0 900 620" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#E2E8F0" />
          <stop offset="100%" stop-color="#F8FAFC" />
        </linearGradient>
      </defs>
      <rect width="900" height="620" rx="36" fill="url(#bg)" />
      <rect x="54" y="54" width="792" height="512" rx="28" fill="rgba(255,255,255,0.72)" />
      <text x="96" y="202" fill="#0F172A" font-size="56" font-family="Arial, sans-serif" font-weight="700">${themeName}</text>
      <text x="96" y="254" fill="#475569" font-size="24" font-family="Arial, sans-serif">Imported theme package</text>
      <rect x="96" y="330" width="188" height="188" rx="42" fill="rgba(15,23,42,0.08)" />
      <rect x="320" y="330" width="188" height="188" rx="42" fill="rgba(15,23,42,0.12)" />
      <rect x="544" y="330" width="216" height="74" rx="26" fill="rgba(15,23,42,0.14)" />
      <rect x="544" y="428" width="168" height="48" rx="24" fill="rgba(15,23,42,0.08)" />
    </svg>
  `)}`;

const parseJson = <T>(input: string, errorMessage: string): T => {
  try {
    return JSON.parse(input) as T;
  } catch {
    throw new Error(errorMessage);
  }
};

const normalizeDescriptor = (input: ThemePackageDescriptor): ThemePackageDescriptor => ({
  ...input,
  tags: Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [],
  previewImages: Array.isArray(input.previewImages)
    ? input.previewImages.map((item) => String(item).trim()).filter(Boolean)
    : [],
  iconPack:
    input.iconPack && typeof input.iconPack === 'object'
      ? Object.fromEntries(
          Object.entries(input.iconPack)
            .map(([appId, filePath]) => [String(appId).trim(), String(filePath).trim()])
            .filter(([appId, filePath]) => Boolean(appId && filePath))
        )
      : {},
  settingsPatch:
    input.settingsPatch && typeof input.settingsPatch === 'object'
      ? { ...input.settingsPatch }
      : {},
  themeTokens:
    input.themeTokens && typeof input.themeTokens === 'object'
      ? { ...input.themeTokens }
      : {},
});

const resolveInlineThemeDefinition = (
  descriptor: ThemePackageDescriptor,
  fileSize: number
): ThemeDefinition => {
  const normalized = normalizeDescriptor(descriptor);
  const themeName = normalized.name?.trim();
  if (!themeName) {
    throw new Error('主题配置缺少 name 字段。');
  }

  const basePatch = { ...(normalized.settingsPatch || {}) };
  const themeId = slugifyThemeId(normalized.id || themeName);
  const coverImage =
    normalized.coverImage?.trim() ||
    (typeof basePatch.wallpaper === 'string' ? basePatch.wallpaper : '') ||
    createFallbackCover(themeName);

  return {
    id: themeId,
    name: themeName,
    author: normalized.author?.trim() || 'Unknown',
    version: normalized.version?.trim() || '1.0.0',
    description: normalized.description?.trim() || 'Imported theme package',
    tags: normalized.tags || [],
    source: 'imported',
    coverImage,
    previewImages:
      normalized.previewImages && normalized.previewImages.length
        ? normalized.previewImages
        : coverImage
          ? [coverImage]
          : [],
    settingsPatch: basePatch,
    tokens: normalized.themeTokens,
    desktopLayout: normalized.desktopLayout,
    desktopIcons: normalized.desktopIcons,
    sizeLabel: formatBytesLabel(fileSize),
    importedAt: Date.now(),
  };
};

const resolveZippedThemeDefinition = async (
  zip: JSZip,
  fileSize: number
): Promise<ThemeDefinition> => {
  const zipEntries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (!zipEntries.length) {
    throw new Error('主题包为空，未找到任何文件。');
  }
  if (zipEntries.length > MAX_THEME_PACKAGE_FILES) {
    throw new Error('主题包文件数量过多，请精简后重试。');
  }

  const manifestEntry =
    zip.file(/(^|\/)manifest\.json$/i)[0] || zip.file(/(^|\/)theme\.json$/i)[0];
  if (!manifestEntry) {
    throw new Error('未找到 manifest.json，请检查主题包格式。');
  }

  const manifestText = await manifestEntry.async('string');
  const manifest = normalizeDescriptor(
    parseJson<ThemePackageDescriptor>(manifestText, 'manifest.json 不是有效的 JSON。')
  );
  const manifestDir = dirname(manifestEntry.name);

  let mergedDescriptor = manifest;
  if (manifest.tokens?.trim()) {
    const tokenPath = joinPath(manifestDir, manifest.tokens.trim());
    const tokenEntry = zip.file(tokenPath);
    if (!tokenEntry) {
      throw new Error(`未找到 tokens 文件：${manifest.tokens}`);
    }
    const tokenText = await tokenEntry.async('string');
    const tokenDescriptor = normalizeDescriptor(
      parseJson<ThemePackageDescriptor>(tokenText, 'tokens.json 不是有效的 JSON。')
    );
    mergedDescriptor = {
      ...tokenDescriptor,
      ...manifest,
      tags: manifest.tags?.length ? manifest.tags : tokenDescriptor.tags,
      previewImages: manifest.previewImages?.length
        ? manifest.previewImages
        : tokenDescriptor.previewImages,
      iconPack: {
        ...(tokenDescriptor.iconPack || {}),
        ...(manifest.iconPack || {}),
      },
      settingsPatch: {
        ...(tokenDescriptor.settingsPatch || {}),
        ...(manifest.settingsPatch || {}),
      },
      themeTokens: {
        ...(tokenDescriptor.themeTokens || {}),
        ...(manifest.themeTokens || {}),
      },
    };
  }

  const themeName = mergedDescriptor.name?.trim();
  if (!themeName) {
    throw new Error('主题配置缺少 name 字段。');
  }

  const entryMap = new Map<string, JSZip.JSZipObject>();
  zipEntries.forEach((entry) => {
    entryMap.set(normalizePath(entry.name).toLowerCase(), entry);
  });

  const readAssetAsDataUrl = async (assetPath: string): Promise<string> => {
    const trimmed = assetPath.trim();
    if (!trimmed) {
      throw new Error('资源路径不能为空。');
    }
    if (/^data:/i.test(trimmed)) {
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      throw new Error('主题包不允许引用外部远程资源。');
    }

    const resolvedPath = joinPath(manifestDir, trimmed);
    const entry = entryMap.get(resolvedPath.toLowerCase());
    if (!entry) {
      throw new Error(`未找到主题资源：${trimmed}`);
    }

    const mimeType = pickMimeByPath(resolvedPath);
    if (!mimeType) {
      throw new Error(`不支持的主题资源格式：${trimmed}`);
    }

    return buildDataUrl(entry, mimeType);
  };

  const basePatch: ThemeSettingsPatch = {
    ...(mergedDescriptor.settingsPatch || {}),
  };

  if (mergedDescriptor.wallpaper?.trim()) {
    basePatch.wallpaper = await readAssetAsDataUrl(mergedDescriptor.wallpaper.trim());
  }

  const iconEntries = Object.entries(mergedDescriptor.iconPack || {});
  if (iconEntries.length) {
    const resolvedIcons = await Promise.all(
      iconEntries.map(async ([appId, assetPath]) => [appId, await readAssetAsDataUrl(assetPath)] as const)
    );
    basePatch.customIcons = {
      ...(basePatch.customIcons || {}),
      ...Object.fromEntries(resolvedIcons),
    };
  }

  if (mergedDescriptor.customFont?.file?.trim()) {
    const fontFilePath = mergedDescriptor.customFont.file.trim();
    const fontData = await readAssetAsDataUrl(fontFilePath);
    const fontName =
      mergedDescriptor.customFont.name?.trim() ||
      mergedDescriptor.settingsPatch?.customFontName ||
      themeName;
    const fontFormat =
      mergedDescriptor.customFont.format?.trim() ||
      mergedDescriptor.settingsPatch?.customFontFormat ||
      FONT_FORMAT_BY_EXT[getFileExtension(fontFilePath)] ||
      'woff2';

    basePatch.customFontData = fontData;
    basePatch.customFontName = fontName;
    basePatch.customFontFormat = fontFormat;
    basePatch.fontFamily =
      mergedDescriptor.settingsPatch?.fontFamily || `"${fontName}", ${DEFAULT_FONT_FALLBACK}`;
  }

  const coverImage = mergedDescriptor.coverImage?.trim()
    ? await readAssetAsDataUrl(mergedDescriptor.coverImage.trim())
    : typeof basePatch.wallpaper === 'string' && basePatch.wallpaper
      ? basePatch.wallpaper
      : createFallbackCover(themeName);

  const previewImages = mergedDescriptor.previewImages?.length
    ? await Promise.all(mergedDescriptor.previewImages.map((assetPath) => readAssetAsDataUrl(assetPath)))
    : coverImage
      ? [coverImage]
      : [];

  return {
    id: slugifyThemeId(mergedDescriptor.id || themeName),
    name: themeName,
    author: mergedDescriptor.author?.trim() || 'Unknown',
    version: mergedDescriptor.version?.trim() || '1.0.0',
    description: mergedDescriptor.description?.trim() || 'Imported theme package',
    tags: mergedDescriptor.tags || [],
    source: 'imported',
    coverImage,
    previewImages,
    settingsPatch: basePatch,
    tokens: mergedDescriptor.themeTokens,
    desktopLayout: mergedDescriptor.desktopLayout,
    desktopIcons: mergedDescriptor.desktopIcons,
    sizeLabel: formatBytesLabel(fileSize),
    importedAt: Date.now(),
  };
};

export const importThemePackage = async (file: File): Promise<ThemeDefinition> => {
  const normalizedName = file.name.trim().toLowerCase();
  if (!normalizedName) {
    throw new Error('未读取到主题文件名。');
  }
  if (file.size <= 0) {
    throw new Error('主题文件为空。');
  }
  if (file.size > MAX_THEME_PACKAGE_BYTES) {
    throw new Error('主题包过大，请控制在 20MB 以内。');
  }

  if (normalizedName.endsWith('.json')) {
    const jsonText = await fileToText(file);
    const descriptor = parseJson<ThemePackageDescriptor>(
      jsonText,
      '主题 JSON 不是有效的配置文件。'
    );
    return resolveInlineThemeDefinition(descriptor, file.size);
  }

  if (!normalizedName.endsWith('.zip')) {
    throw new Error('目前仅支持导入 .zip 或 .json 格式的主题包。');
  }

  const buffer = await fileToArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);
  return resolveZippedThemeDefinition(zip, file.size);
};
