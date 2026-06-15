import JSZip from 'jszip';

import type { WeChatBubblePreset, WeChatUiSettings } from './types';
import type { WechatThemeDefinition, WechatThemePackageDescriptor } from './onlineThemeTypes';

const MAX_THEME_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_THEME_PACKAGE_FILES = 50;

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

const VALID_BUBBLE_PRESETS: WeChatBubblePreset[] = ['wechat', 'rounded', 'glass', 'outline'];

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

const pickMimeByPath = (filePath: string): string | null => {
  const extension = getFileExtension(filePath);
  return IMAGE_MIME_BY_EXT[extension] || null;
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

const parseJson = <T>(input: string, errorMessage: string): T => {
  try {
    return JSON.parse(input) as T;
  } catch {
    throw new Error(errorMessage);
  }
};

const normalizeBubblePreset = (value: string | undefined): WeChatBubblePreset => {
  const preset = (value || 'wechat').trim().toLowerCase() as WeChatBubblePreset;
  if (VALID_BUBBLE_PRESETS.includes(preset)) return preset;
  return 'wechat';
};

const normalizeDescriptor = (input: WechatThemePackageDescriptor): WechatThemePackageDescriptor => ({
  ...input,
  tags: Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [],
});

const buildDataUrl = async (entry: JSZip.JSZipObject, mimeType: string): Promise<string> => {
  const base64 = await entry.async('base64');
  return `data:${mimeType};base64,${base64}`;
};

const resolveInlineTheme = (descriptor: WechatThemePackageDescriptor): WechatThemeDefinition => {
  const normalized = normalizeDescriptor(descriptor);
  const name = normalized.name?.trim();
  if (!name) {
    throw new Error('微信主题配置缺少 name 字段。');
  }

  return {
    id: (normalized.id?.trim() || name).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'wechat-theme',
    name,
    author: normalized.author?.trim() || 'Unknown',
    version: normalized.version?.trim() || '1.0.0',
    description: normalized.description?.trim() || '微信主题包',
    tags: normalized.tags || [],
    chatBackgroundImage: normalized.chatBackgroundImage?.trim() || '',
    chatBackgroundOpacity: Math.max(0, Math.min(1, normalized.chatBackgroundOpacity ?? 0)),
    selfBubblePreset: normalizeBubblePreset(normalized.selfBubblePreset),
    peerBubblePreset: normalizeBubblePreset(normalized.peerBubblePreset),
    rendererSource: normalized.rendererSource?.trim() || '',
    source: 'online',
    importedAt: Date.now(),
  };
};

const resolveZippedTheme = async (zip: JSZip, fileSize: number): Promise<WechatThemeDefinition> => {
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
  const descriptor = normalizeDescriptor(
    parseJson<WechatThemePackageDescriptor>(manifestText, 'manifest.json 不是有效的 JSON。')
  );
  const manifestDir = dirname(manifestEntry.name);

  const name = descriptor.name?.trim();
  if (!name) {
    throw new Error('微信主题配置缺少 name 字段。');
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
      throw new Error('微信主题包不允许引用外部远程资源。');
    }

    const resolvedPath = joinPath(manifestDir, trimmed).toLowerCase();
    const entry = entryMap.get(resolvedPath);
    if (!entry) {
      throw new Error(`未找到主题资源：${trimmed}`);
    }

    const mimeType = pickMimeByPath(resolvedPath);
    if (!mimeType) {
      throw new Error(`不支持的主题资源格式：${trimmed}`);
    }

    return buildDataUrl(entry, mimeType);
  };

  let chatBackgroundImage = descriptor.chatBackgroundImage?.trim() || '';
  if (chatBackgroundImage) {
    chatBackgroundImage = await readAssetAsDataUrl(chatBackgroundImage);
  }

  return {
    id: (descriptor.id?.trim() || name).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'wechat-theme',
    name,
    author: descriptor.author?.trim() || 'Unknown',
    version: descriptor.version?.trim() || '1.0.0',
    description: descriptor.description?.trim() || '微信主题包',
    tags: descriptor.tags || [],
    chatBackgroundImage,
    chatBackgroundOpacity: Math.max(0, Math.min(1, descriptor.chatBackgroundOpacity ?? 0)),
    selfBubblePreset: normalizeBubblePreset(descriptor.selfBubblePreset),
    peerBubblePreset: normalizeBubblePreset(descriptor.peerBubblePreset),
    rendererSource: descriptor.rendererSource?.trim() || '',
    source: 'online',
    importedAt: Date.now(),
  };
};

export const parseWechatThemePackage = async (file: File): Promise<WechatThemeDefinition> => {
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
    const descriptor = parseJson<WechatThemePackageDescriptor>(
      jsonText,
      '主题 JSON 不是有效的配置文件。'
    );
    return resolveInlineTheme(descriptor);
  }

  if (!normalizedName.endsWith('.zip')) {
    throw new Error('目前仅支持导入 .zip 或 .json 格式的微信主题包。');
  }

  const buffer = await fileToArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);
  return resolveZippedTheme(zip, file.size);
};

export const createWechatThemePatch = (
  theme: WechatThemeDefinition
): Partial<WeChatUiSettings> => {
  const patch: Partial<WeChatUiSettings> = {
    selfBubblePreset: theme.selfBubblePreset,
    peerBubblePreset: theme.peerBubblePreset,
    customRendererSource: theme.rendererSource,
    customRendererEnabled: theme.rendererSource.trim().length > 0,
  };

  if (theme.chatBackgroundImage) {
    patch.chatBackgroundImage = theme.chatBackgroundImage;
    patch.chatBackgroundOpacity = theme.chatBackgroundOpacity;
  }

  return patch;
};
