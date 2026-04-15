import {
  Database,
  File,
  FileArchive,
  FileText,
  Image,
  Music,
  Video,
} from 'lucide-react';
import type { StorageFile } from './types';
import type { IndexedDbEntry } from './indexedDb';
import { STORAGE_APP_MANIFESTS } from './constants';
import { createAppStorageKey } from '../../../core/storage';

export const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const toRawString = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

export const estimateBytes = (value: unknown) => {
  const raw = toRawString(value);
  if (!raw) return 0;
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(raw).length;
  }
  return raw.length;
};

const appManifests = STORAGE_APP_MANIFESTS;
const WECHAT_STORAGE_KEY = createAppStorageKey('wechat');
const SETTINGS_STORAGE_KEY = createAppStorageKey('settings');
const DESKTOP_STORAGE_KEY = createAppStorageKey('desktop');
const WORLDBOOK_STORAGE_KEY = createAppStorageKey('worldbook');
const STORAGE_APP_ID_ALIASES: Record<string, string> = {
  systemscheduler: 'scheduler',
};

const findAppFromKey = (normalized: string, segmentName: string) => {
  if (normalized === SETTINGS_STORAGE_KEY || normalized === DESKTOP_STORAGE_KEY) {
    return appManifests.find((app) => app.id.toLowerCase() === 'settings');
  }

  if (normalized === WORLDBOOK_STORAGE_KEY) {
    return appManifests.find((app) => app.id.toLowerCase() === 'worldbook');
  }

  if (normalized.endsWith('-storage')) {
    const rawAppId = normalized.replace(/-storage$/, '');
    const appId = STORAGE_APP_ID_ALIASES[rawAppId] ?? rawAppId;
    const matched = appManifests.find((app) => app.id.toLowerCase() === appId);
    if (matched) return matched;
  }

  const byKey = appManifests.find((app) => normalized.includes(app.id.toLowerCase()));
  if (byKey) return byKey;

  const bySegment = appManifests.find((app) => segmentName.includes(app.id.toLowerCase()));
  if (bySegment) return bySegment;

  return undefined;
};

export const resolveCategoryFromKey = (keyName: string, segment?: string) => {
  const normalized = keyName.toLowerCase();
  const segmentName = (segment ?? '').toLowerCase();
  const matchedApp = findAppFromKey(normalized, segmentName);
  if (matchedApp) {
    return { id: matchedApp.id, name: matchedApp.name };
  }

  if (normalized.includes('wechat')) return { id: 'wechat', name: '微信通讯' };
  if (
    normalized === WORLDBOOK_STORAGE_KEY ||
    normalized.includes('worldbook') ||
    segmentName.includes('world')
  ) {
    return { id: 'worldbook', name: '世界书' };
  }
  if (
    normalized === SETTINGS_STORAGE_KEY ||
    normalized === DESKTOP_STORAGE_KEY ||
    normalized.includes('settings') ||
    segmentName.includes('settings') ||
    segmentName.includes('desktop')
  ) {
    return { id: 'settings', name: '系统设置' };
  }

  if (normalized.endsWith('-storage')) {
    const rawAppId = normalized.replace(/-storage$/, '');
    const appId = STORAGE_APP_ID_ALIASES[rawAppId] ?? rawAppId;
    const matched = appManifests.find((app) => app.id.toLowerCase() === appId);
    if (matched) {
      return { id: matched.id, name: matched.name };
    }
    if (appId) {
      return { id: appId, name: `未知应用（${appId}）` };
    }
  }

  return { id: 'misc', name: '其他数据' };
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

export const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getFileIcon = (extension: string) => {
  const ext = extension.toLowerCase();
  if (['db', 'sqlite'].includes(ext)) return Database;
  if (['zip', 'rar', '7z'].includes(ext)) return FileArchive;
  if (['mp4', 'mov', 'avi'].includes(ext)) return Video;
  if (['mp3', 'wav', 'aac'].includes(ext)) return Music;
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return Image;
  if (['txt', 'md', 'json'].includes(ext)) return FileText;
  return File;
};

const maxTimestamp = (
  items: Array<Record<string, unknown>> | undefined,
  field: string,
  fallback: number
) => {
  if (!items || items.length === 0) return fallback;
  return items.reduce((max, item) => {
    const value = typeof item[field] === 'number' ? (item[field] as number) : 0;
    return Math.max(max, value);
  }, fallback);
};

const isEmptyData = (data: unknown) => {
  if (data == null) return true;
  if (typeof data === 'string') return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data as Record<string, unknown>).length === 0;
  return false;
};

export const buildFilesFromEntries = (entries: IndexedDbEntry[]) => {
  const files: StorageFile[] = [];
  const now = Date.now();

  entries.forEach(({ dbName, storeName, key, value }) => {
    const keyName = String(key);
    const normalizedKeyName = keyName.toLowerCase();
    const source = `${dbName}/${storeName}`;
    const makeFileId = (suffix: string) => `${dbName}::${storeName}::${keyName}::${suffix}`;
    const rawValue = typeof value === 'string' ? value : toRawString(value);
    const parsed = rawValue ? safeJsonParse(rawValue) : null;
    const state = parsed && typeof parsed === 'object' && 'state' in parsed ? (parsed as any).state : parsed;
    const hasStructuredState = Boolean(state && typeof state === 'object');
    const segmentCandidates =
      state && typeof state === 'object'
        ? new Set(Object.keys(state as Record<string, unknown>))
        : new Set<string>();
    let hasDerivedFile = false;

    const pushFile = (payload: Omit<StorageFile, 'source' | 'dbName' | 'storeName' | 'originKey' | 'originKeyValue'>) => {
      hasDerivedFile = true;
      files.push({
        source,
        dbName,
        storeName,
        originKey: keyName,
        originKeyValue: key,
        ...payload,
      });
    };

    if (state && typeof state === 'object') {
      if (
        normalizedKeyName === SETTINGS_STORAGE_KEY &&
        'settings' in state
      ) {
        pushFile({
          id: makeFileId('settings'),
          name: '系统设置',
          extension: 'json',
          size: estimateBytes((state as any).settings),
          categoryId: 'settings',
          updatedAt: now,
          segment: 'settings',
          readOnly: true,
        });
        segmentCandidates.delete('settings');
      }

      if (
        normalizedKeyName === DESKTOP_STORAGE_KEY &&
        'desktopLayout' in state
      ) {
        pushFile({
          id: makeFileId('desktopLayout'),
          name: '桌面布局',
          extension: 'json',
          size: estimateBytes((state as any).desktopLayout),
          categoryId: 'settings',
          updatedAt: now,
          segment: 'desktopLayout',
          readOnly: true,
        });
        segmentCandidates.delete('desktopLayout');
      }

      if (
        normalizedKeyName === WORLDBOOK_STORAGE_KEY &&
        'worldBook' in state
      ) {
        pushFile({
          id: makeFileId('worldBook'),
          name: '世界书条目',
          extension: 'json',
          size: estimateBytes((state as any).worldBook),
          categoryId: 'worldbook',
          updatedAt: now,
          segment: 'worldBook',
          resetValue: [],
        });
        segmentCandidates.delete('worldBook');
      }
    }

    if (normalizedKeyName === WECHAT_STORAGE_KEY && state && typeof state === 'object') {
      const sessions = Array.isArray((state as any).wechatSessions) ? (state as any).wechatSessions : [];
      const moments = Array.isArray((state as any).wechatMoments) ? (state as any).wechatMoments : [];

      pushFile({
        id: makeFileId('wechatSessions'),
        name: '会话记录',
        extension: 'json',
        size: estimateBytes(sessions),
        categoryId: 'wechat',
        updatedAt: maxTimestamp(sessions, 'lastUpdated', now),
        segment: 'wechatSessions',
        resetValue: [],
      });

      pushFile({
        id: makeFileId('wechatMoments'),
        name: '朋友圈动态',
        extension: 'json',
        size: estimateBytes(moments),
        categoryId: 'wechat',
        updatedAt: maxTimestamp(moments, 'timestamp', now),
        segment: 'wechatMoments',
        resetValue: [],
      });

      if ('wechatUserProfile' in state) {
        pushFile({
          id: makeFileId('wechatUserProfile'),
          name: '个人资料',
          extension: 'json',
          size: estimateBytes((state as any).wechatUserProfile),
          categoryId: 'wechat',
          updatedAt: now,
          segment: 'wechatUserProfile',
          readOnly: true,
        });
        segmentCandidates.delete('wechatUserProfile');
      }

      segmentCandidates.delete('wechatSessions');
      segmentCandidates.delete('wechatMoments');
    }

    if (state && typeof state === 'object') {
      segmentCandidates.forEach((segment) => {
        const data = (state as Record<string, unknown>)[segment];
        if (data === undefined) return;
        if (isEmptyData(data)) return;

        const category = resolveCategoryFromKey(keyName, segment);
        const isObject = typeof data === 'object' && data !== null;
        const resetValue = Array.isArray(data) ? [] : isObject ? {} : undefined;
        const readOnly = !Array.isArray(data) && !isObject;
        const displayName = category.id === 'misc' ? '数据项' : `${category.name}数据`;

        pushFile({
          id: makeFileId(segment),
          name: displayName,
          extension: 'json',
          size: estimateBytes(data),
          categoryId: category.id,
          categoryName: category.name,
          updatedAt: now,
          segment,
          resetValue,
          readOnly,
        });
      });
    }

    if (rawValue && !hasDerivedFile && !hasStructuredState) {
      const category = resolveCategoryFromKey(keyName);
      const displayName = category.id === 'misc' ? '原始数据' : `${category.name}原始数据`;
      pushFile({
        id: makeFileId('raw'),
        name: displayName,
        extension: 'idb',
        size: estimateBytes(rawValue),
        categoryId: category.id,
        categoryName: category.name,
        updatedAt: now,
      });
    }
  });

  return files;
};

export const sanitizeFileName = (name: string) => {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || '导出文件';
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const extractFileData = (file: StorageFile, raw: unknown) => {
  if (raw == null) {
    return { data: null, fileExtension: 'json' };
  }

  const parsed = typeof raw === 'string' ? safeJsonParse(raw) : raw;
  const hasStateWrapper = parsed && typeof parsed === 'object' && 'state' in (parsed as Record<string, unknown>);
  const state = hasStateWrapper ? (parsed as any).state : parsed;
  let data = state;

  if (file.segment && state && typeof state === 'object') {
    data = (state as Record<string, unknown>)[file.segment];
  }

  if (data === undefined) {
    data = parsed ?? raw;
  }

  const isText = typeof data === 'string';
  return { data, fileExtension: isText ? file.extension || 'txt' : 'json' };
};
