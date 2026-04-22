import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { CATEGORY_DEFINITIONS } from './constants';
import { StorageDetail, StorageHeader, StorageOverview } from './components';
import {
  applyBackupSnapshot,
  buildBackupFileName,
  createBackupSnapshot,
  createBackupSnapshotFromEntries,
  parseBackupSnapshotFile,
  snapshotToBlob,
} from './backupSnapshot';
import type { BackupSnapshot } from './backupSnapshot';
import { listIndexedDbEntries, readIndexedDbValue, writeIndexedDbValue } from './indexedDb';
import type { IndexedDbEntry } from './indexedDb';
import type { StorageAppProps, StorageCategoryStat, StorageFile, SortKey } from './types';
import {
  buildFilesFromEntries,
  downloadBlob,
  extractFileData,
  sanitizeFileName,
  safeJsonParse,
} from './utils';
import {
  deleteBaiduBackup,
  disconnectBaiduConnector,
  downloadBaiduBackup,
  getBaiduConnectorAuthURL,
  getBaiduConnectorStatus,
  listBaiduBackups,
  uploadBaiduBackup,
} from './baiduClient';
import type { BaiduBackupItem, BaiduConnectorStatus } from './baiduClient';
import { shareBackupToBaiduQuickly } from './baiduQuickShare';
import {
  deleteVaultObject,
  downloadVaultObject,
  listVaultNamespaces,
  listVaultObjects,
  uploadVaultObject,
  vaultLogin,
} from './vaultClient';
import type {
  VaultNamespace,
  VaultObjectItem,
  VaultSession,
  VaultTenantOption,
} from './vaultClient';

type BackupProvider = 'vault' | 'baidu_quick' | 'baidu_direct';
type BackupPanelPage = 'actions' | 'settings';

interface BackupSettings {
  backupProvider: BackupProvider;
  vaultUrl: string;
  tenantCode: string;
  email: string;
  namespaceId: string;
  objectPrefix: string;
  baiduPathPrefix: string;
  backupCurrentCategoryOnly: boolean;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
}

const BACKUP_SETTINGS_KEY = 'storage-app-backup-settings-v2';
const AUTO_BACKUP_INTERVAL_OPTIONS = [5, 15, 30, 60, 120];

const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  backupProvider: 'vault',
  vaultUrl: 'http://127.0.0.1:8080',
  tenantCode: '',
  email: '',
  namespaceId: '',
  objectPrefix: 'baobaobaiphone/backups',
  baiduPathPrefix: '/apps/baobaobaiphone/backups',
  backupCurrentCategoryOnly: false,
  autoBackupEnabled: false,
  autoBackupIntervalMinutes: 30,
};

const BACKUP_PROVIDER_LABEL: Record<BackupProvider, string> = {
  vault: 'Vault 云端',
  baidu_quick: '百度网盘快捷分享',
  baidu_direct: '百度网盘直连',
};

interface BaiduOAuthSignal {
  success: boolean;
  returnTo: string;
}

interface RestoreConfirmDialogState {
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  danger?: boolean;
}

const BAIDU_OAUTH_SIGNAL_TYPE = 'baobaobaivault:baidu-oauth';
const BAIDU_AUTH_URL_TIMEOUT_MS = 15000;
const BAIDU_POPUP_CLOSE_DELAY_MS = 1800;

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return '未知错误';
};

const isVaultAuthFailure = (error: unknown) => {
  const message = toErrorMessage(error).toLowerCase();
  return (
    /\b401\b/.test(message) ||
    /\b403\b/.test(message) ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    (message.includes('token') && (message.includes('expired') || message.includes('invalid')))
  );
};

const isBaiduAuthFailure = (error: unknown) => {
  const message = toErrorMessage(error).toLowerCase();
  return (
    isVaultAuthFailure(error) ||
    message.includes('oauth') ||
    message.includes('refresh token') ||
    message.includes('baidu account is not active') ||
    message.includes('record not found')
  );
};

const clampBackupMinutes = (value: unknown, fallback = 30) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const integer = Math.round(value);
  return Math.min(Math.max(integer, 1), 24 * 60);
};

const parseBackupProvider = (value: unknown): BackupProvider => {
  if (value === 'baidu_quick' || value === 'baidu_direct' || value === 'vault') {
    return value;
  }
  return DEFAULT_BACKUP_SETTINGS.backupProvider;
};

const normalizeObjectPrefix = (value: string) => {
  return value
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

const buildVaultObjectKey = (prefix: string, fileName: string) => {
  const normalizedPrefix = normalizeObjectPrefix(prefix);
  if (!normalizedPrefix) return fileName;
  return `${normalizedPrefix}/${fileName}`;
};

const buildSnapshotFileName = (snapshot: BackupSnapshot) => {
  const baseName = buildBackupFileName();
  if (snapshot.mode !== 'category' || !snapshot.sourceCategoryId) {
    return baseName;
  }
  const safeCategory = snapshot.sourceCategoryId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return baseName.replace(/\.json$/i, `-${safeCategory}.json`);
};

const encodeIdbKeyBase64 = (bytes: Uint8Array): string => {
  if (bytes.length === 0) return '';
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const createIdbKeyFingerprint = (key: IDBValidKey): string => {
  if (typeof key === 'string') return `s:${key}`;
  if (typeof key === 'number') {
    if (Number.isNaN(key)) return 'n:NaN';
    if (key === Number.POSITIVE_INFINITY) return 'n:Infinity';
    if (key === Number.NEGATIVE_INFINITY) return 'n:-Infinity';
    return `n:${String(key)}`;
  }
  if (key instanceof Date) return `d:${key.toISOString()}`;
  if (Array.isArray(key)) {
    return `a:[${key.map((item) => createIdbKeyFingerprint(item as IDBValidKey)).join('|')}]`;
  }
  if (key instanceof ArrayBuffer) {
    return `b:${encodeIdbKeyBase64(new Uint8Array(key))}`;
  }
  if (ArrayBuffer.isView(key)) {
    const view = key as ArrayBufferView;
    const bytes = new Uint8Array(view.byteLength);
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return `b:${encodeIdbKeyBase64(bytes)}`;
  }
  return `u:${Object.prototype.toString.call(key)}`;
};

const makeEntryToken = (dbName: string, storeName: string, key: IDBValidKey): string => {
  return `${dbName}\u0000${storeName}\u0000${createIdbKeyFingerprint(key)}`;
};

const parseBackupSettings = (raw: unknown): BackupSettings => {
  if (!raw || typeof raw !== 'object') return DEFAULT_BACKUP_SETTINGS;
  const payload = raw as Record<string, unknown>;
  const backupProvider = parseBackupProvider(payload.backupProvider);
  const autoBackupEnabled =
    typeof payload.autoBackupEnabled === 'boolean'
      ? payload.autoBackupEnabled
      : DEFAULT_BACKUP_SETTINGS.autoBackupEnabled;
  return {
    backupProvider,
    vaultUrl: typeof payload.vaultUrl === 'string' ? payload.vaultUrl : DEFAULT_BACKUP_SETTINGS.vaultUrl,
    tenantCode: typeof payload.tenantCode === 'string' ? payload.tenantCode : DEFAULT_BACKUP_SETTINGS.tenantCode,
    email: typeof payload.email === 'string' ? payload.email : DEFAULT_BACKUP_SETTINGS.email,
    namespaceId:
      typeof payload.namespaceId === 'string' ? payload.namespaceId : DEFAULT_BACKUP_SETTINGS.namespaceId,
    objectPrefix:
      typeof payload.objectPrefix === 'string'
        ? payload.objectPrefix
        : DEFAULT_BACKUP_SETTINGS.objectPrefix,
    baiduPathPrefix:
      typeof payload.baiduPathPrefix === 'string'
        ? payload.baiduPathPrefix
        : DEFAULT_BACKUP_SETTINGS.baiduPathPrefix,
    backupCurrentCategoryOnly:
      typeof payload.backupCurrentCategoryOnly === 'boolean'
        ? payload.backupCurrentCategoryOnly
        : DEFAULT_BACKUP_SETTINGS.backupCurrentCategoryOnly,
    autoBackupEnabled: backupProvider === 'baidu_quick' ? false : autoBackupEnabled,
    autoBackupIntervalMinutes: clampBackupMinutes(
      payload.autoBackupIntervalMinutes,
      DEFAULT_BACKUP_SETTINGS.autoBackupIntervalMinutes
    ),
  };
};

const loadBackupSettings = (): BackupSettings => {
  if (typeof window === 'undefined') return DEFAULT_BACKUP_SETTINGS;
  try {
    const raw = window.localStorage.getItem(BACKUP_SETTINGS_KEY);
    if (!raw) return DEFAULT_BACKUP_SETTINGS;
    return parseBackupSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_BACKUP_SETTINGS;
  }
};

const saveBackupSettings = (settings: BackupSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
};

const parseBaiduOAuthSignal = (payload: unknown): BaiduOAuthSignal | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (data.type !== BAIDU_OAUTH_SIGNAL_TYPE) return null;
  return {
    success: Boolean(data.success),
    returnTo: typeof data.return_to === 'string' ? data.return_to : '',
  };
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderBaiduPopupState = (
  popup: Window | null,
  title: string,
  description: string,
  options?: { isError?: boolean; autoCloseMs?: number }
) => {
  if (!popup || popup.closed || typeof window === 'undefined') return;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const accent = options?.isError ? '#dc2626' : '#2563eb';
  const badgeBg = options?.isError ? '#fee2e2' : '#dbeafe';
  const badgeText = options?.isError ? '#991b1b' : '#1d4ed8';
  const border = options?.isError ? '#fecaca' : '#bfdbfe';

  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;">
    <main style="width:100%;max-width:480px;background:#fff;border:1px solid ${border};border-radius:16px;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <div style="display:inline-flex;align-items:center;gap:8px;background:${badgeBg};color:${badgeText};border-radius:999px;padding:6px 10px;font-size:12px;font-weight:600;margin-bottom:12px;">
        ${options?.isError ? '授权错误' : '授权中'}
      </div>
      <h1 style="font-size:18px;line-height:1.4;margin:0 0 8px;color:${accent};">${safeTitle}</h1>
      <p style="margin:0;color:#334155;">${safeDescription}</p>
    </main>
  </body>
</html>`);
    popup.document.close();
  } catch {
    // Ignore popup rendering failures and continue with auth flow.
  }

  if (options?.autoCloseMs && options.autoCloseMs > 0) {
    window.setTimeout(() => {
      try {
        if (!popup.closed) popup.close();
      } catch {
        // Ignore close errors.
      }
    }, options.autoCloseMs);
  }
};

const getBaiduAuthUrlWithTimeout = async (session: VaultSession, returnTo: string): Promise<string> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error('获取百度授权链接超时，请重试。'));
      }, BAIDU_AUTH_URL_TIMEOUT_MS);

      void getBaiduConnectorAuthURL(session, returnTo).then(resolve).catch(reject);
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const formatVaultObjectTime = (item: VaultObjectItem) => {
  const raw = item.updatedAt || item.lastModified || item.createdAt;
  if (!raw) return '未知';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '未知';
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatBaiduBackupTime = (item: BaiduBackupItem) => {
  const timestamp = item.mtime || item.ctime;
  if (!timestamp) return '未知';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '未知';
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSnapshotMode = (snapshot: BackupSnapshot) => {
  if (snapshot.mode === 'category') {
    return `分类备份（${snapshot.sourceCategoryName ?? snapshot.sourceCategoryId ?? '当前分类'}）`;
  }
  return '完整备份';
};

export const StorageApp: React.FC<StorageAppProps> = ({ onClose }) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => loadBackupSettings());
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultSession, setVaultSession] = useState<VaultSession | null>(null);
  const [tenantOptions, setTenantOptions] = useState<VaultTenantOption[]>([]);
  const [vaultNamespaces, setVaultNamespaces] = useState<VaultNamespace[]>([]);
  const [vaultObjects, setVaultObjects] = useState<VaultObjectItem[]>([]);
  const [selectedVaultKey, setSelectedVaultKey] = useState('');
  const [baiduStatus, setBaiduStatus] = useState<BaiduConnectorStatus | null>(null);
  const [baiduBackups, setBaiduBackups] = useState<BaiduBackupItem[]>([]);
  const [selectedBaiduPath, setSelectedBaiduPath] = useState('');
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupPage, setBackupPage] = useState<BackupPanelPage>('actions');
  const [isBackupCenterOpen, setIsBackupCenterOpen] = useState(false);
  const [restoreConfirmDialog, setRestoreConfirmDialog] = useState<RestoreConfirmDialogState | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const backupBusyRef = useRef(false);
  const restoreConfirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    saveBackupSettings(backupSettings);
  }, [backupSettings]);

  const updateBackupSettings = useCallback((patch: Partial<BackupSettings>) => {
    setBackupSettings((previous) => {
      const next = { ...previous, ...patch };
      if (next.backupProvider === 'baidu_quick' && next.autoBackupEnabled) {
        next.autoBackupEnabled = false;
      }
      return next;
    });
  }, []);

  const isVaultProvider = backupSettings.backupProvider === 'vault';
  const isBaiduQuickProvider = backupSettings.backupProvider === 'baidu_quick';
  const isBaiduDirectProvider = backupSettings.backupProvider === 'baidu_direct';

  const syncFromIndexedDb = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await listIndexedDbEntries();
      const nextFiles = buildFilesFromEntries(data);
      setFiles(nextFiles);
      setLastSyncedAt(Date.now());
    } catch (error) {
      console.error('Failed to read IndexedDB:', error);
      setFiles([]);
      setSyncError('从 IndexedDB 同步存储数据失败。');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void syncFromIndexedDb();
  }, [syncFromIndexedDb]);

  const totalFileBytes = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);
  const storageQuota: number | null = null;
  const usedBytes = totalFileBytes;
  const totalCapacity = totalFileBytes;
  const progress = 0;

  const categoriesWithStats = useMemo<StorageCategoryStat[]>(() => {
    const baseIds = new Set(CATEGORY_DEFINITIONS.map((category) => category.id));
    const dynamic: StorageCategoryStat[] = [];
    const seen = new Set<string>(baseIds);

    files.forEach((file) => {
      if (!seen.has(file.categoryId)) {
        seen.add(file.categoryId);
        dynamic.push({
          id: file.categoryId,
          name: file.categoryName ?? file.categoryId,
          accent: 'text-indigo-600',
          muted: 'bg-indigo-50',
          Icon: Database,
          description: '动态分类',
          fileCount: 0,
          totalSize: 0,
        });
      }
    });

    return [...CATEGORY_DEFINITIONS, ...dynamic].map((category) => {
      const items = files.filter((file) => file.categoryId === category.id);
      const totalSizeByCategory = items.reduce((sum, file) => sum + file.size, 0);
      return {
        ...category,
        fileCount: items.length,
        totalSize: totalSizeByCategory,
      };
    });
  }, [files]);

  const activeCategory = categoriesWithStats.find((cat) => cat.id === activeCategoryId) || null;

  const filteredFiles = useMemo(() => {
    let result = activeCategoryId ? files.filter((file) => file.categoryId === activeCategoryId) : files;
    if (searchTerm.trim()) {
      const keyword = searchTerm.trim().toLowerCase();
      result = result.filter((file) => `${file.name}.${file.extension}`.toLowerCase().includes(keyword));
    }
    return [...result].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'size') return b.size - a.size;
      return b.updatedAt - a.updatedAt;
    });
  }, [files, activeCategoryId, searchTerm, sortKey]);

  const canClearCategory = Boolean(
    activeCategoryId && filteredFiles.some((file) => !file.readOnly && file.segment)
  );

  const updateSegment = useCallback(async (file: StorageFile) => {
    if (!file.originKey || !file.segment || file.readOnly) return;
    const raw = await readIndexedDbValue(file.dbName, file.storeName, file.originKeyValue);
    if (!raw) return;
    const parsed = typeof raw === 'string' ? safeJsonParse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return;

    const hasStateWrapper = Object.prototype.hasOwnProperty.call(parsed, 'state');
    const currentState = hasStateWrapper ? (parsed as Record<string, unknown>).state : parsed;
    if (!currentState || typeof currentState !== 'object') return;
    if (file.resetValue === undefined) return;

    const nextState = { ...(currentState as Record<string, unknown>), [file.segment]: file.resetValue };
    const payload = hasStateWrapper ? { ...(parsed as Record<string, unknown>), state: nextState } : nextState;

    await writeIndexedDbValue(
      file.dbName,
      file.storeName,
      file.originKeyValue,
      typeof raw === 'string' ? JSON.stringify(payload) : payload
    );
  }, []);

  const clearFiles = useCallback(async () => {
    if (!activeCategoryId) return;
    const targets = filteredFiles.filter((file) => !file.readOnly && file.segment);
    if (targets.length === 0) return;
    for (const file of targets) {
      await updateSegment(file);
    }
    await syncFromIndexedDb();
  }, [activeCategoryId, filteredFiles, syncFromIndexedDb, updateSegment]);

  const deleteFile = useCallback(
    async (file: StorageFile) => {
      if (file.readOnly || !file.segment) return;
      await updateSegment(file);
      await syncFromIndexedDb();
    },
    [syncFromIndexedDb, updateSegment]
  );

  const downloadFile = useCallback(async (file: StorageFile) => {
    setIsExporting(true);
    setSyncError(null);
    try {
      const raw = await readIndexedDbValue(file.dbName, file.storeName, file.originKeyValue);
      const { data, fileExtension } = extractFileData(file, raw);
      const payload = typeof data === 'string' ? data : JSON.stringify(data ?? {}, null, 2);
      const safeName = sanitizeFileName(file.name);
      const finalName = safeName.endsWith(`.${fileExtension}`) ? safeName : `${safeName}.${fileExtension}`;
      const blobType =
        typeof data === 'string' && fileExtension !== 'json'
          ? 'text/plain;charset=utf-8'
          : 'application/json;charset=utf-8';
      downloadBlob(new Blob([payload], { type: blobType }), finalName);
    } catch (error) {
      console.error('Export failed:', error);
      setSyncError('导出失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    if (filteredFiles.length === 0) return;
    setIsExporting(true);
    setSyncError(null);
    try {
      const exports = await Promise.all(
        filteredFiles.map(async (file) => {
          const raw = await readIndexedDbValue(file.dbName, file.storeName, file.originKeyValue);
          const { data } = extractFileData(file, raw);
          return {
            name: file.name,
            extension: file.extension,
            categoryId: file.categoryId,
            dbName: file.dbName,
            storeName: file.storeName,
            originKey: file.originKey,
            segment: file.segment ?? null,
            data,
          };
        })
      );
      const payload = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          source: 'storage-browser',
          files: exports,
        },
        null,
        2
      );
      const fileName = `storage-export-${new Date().toISOString().slice(0, 10)}.json`;
      downloadBlob(new Blob([payload], { type: 'application/json;charset=utf-8' }), fileName);
    } catch (error) {
      console.error('Export failed:', error);
      setSyncError('导出失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  }, [filteredFiles]);

  const runBackupAction = useCallback(async (action: () => Promise<void>) => {
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setIsBackupBusy(true);
    setBackupError(null);
    try {
      await action();
    } catch (error) {
      console.error('Backup action failed:', error);
      setBackupError(toErrorMessage(error));
    } finally {
      backupBusyRef.current = false;
      setIsBackupBusy(false);
    }
  }, []);

  const closeRestoreConfirmDialog = useCallback((confirmed: boolean) => {
    const resolver = restoreConfirmResolveRef.current;
    restoreConfirmResolveRef.current = null;
    setRestoreConfirmDialog(null);
    resolver?.(confirmed);
  }, []);

  const requestRestoreConfirm = useCallback((options: RestoreConfirmDialogState) => {
    return new Promise<boolean>((resolve) => {
      if (restoreConfirmResolveRef.current) {
        restoreConfirmResolveRef.current(false);
      }
      restoreConfirmResolveRef.current = resolve;
      setRestoreConfirmDialog(options);
    });
  }, []);

  useEffect(() => {
    return () => {
      const resolver = restoreConfirmResolveRef.current;
      restoreConfirmResolveRef.current = null;
      if (resolver) resolver(false);
    };
  }, []);

  const handleAutoBackupFailure = useCallback(
    (error: unknown) => {
      if (isVaultProvider && isVaultAuthFailure(error)) {
        updateBackupSettings({ autoBackupEnabled: false });
        setBackupError('自动备份已暂停：Vault 鉴权失败。请重新连接 Vault 后再开启定时备份。');
        setBackupMessage('Vault 会话可能已过期，系统已自动关闭定时备份。');
        return true;
      }
      if (isBaiduDirectProvider && isBaiduAuthFailure(error)) {
        updateBackupSettings({ autoBackupEnabled: false });
        setBackupError('自动备份已暂停：百度授权失败。请重新授权后重试。');
        setBackupMessage('百度授权可能已过期，系统已自动关闭定时备份。');
        return true;
      }
      return false;
    },
    [isBaiduDirectProvider, isVaultProvider, updateBackupSettings]
  );

  const refreshVaultObjectList = useCallback(
    async (sessionArg?: VaultSession | null, namespaceIdArg?: string) => {
      const session = sessionArg ?? vaultSession;
      if (!session) throw new Error('请先连接 Vault。');
      const namespaceId = (namespaceIdArg ?? backupSettings.namespaceId).trim();
      if (!namespaceId) throw new Error('请先填写命名空间 ID。');

      const items = await listVaultObjects({
        session,
        namespaceId,
        prefix: backupSettings.objectPrefix,
      });
      setVaultObjects(items);
      setSelectedVaultKey((current) => {
        if (current && items.some((item) => item.key === current)) return current;
        return items[0]?.key ?? '';
      });
      return items;
    },
    [backupSettings.namespaceId, backupSettings.objectPrefix, vaultSession]
  );

  const refreshBaiduStatus = useCallback(
    async (sessionArg?: VaultSession | null) => {
      const session = sessionArg ?? vaultSession;
      if (!session) throw new Error('请先连接 Vault。');
      const status = await getBaiduConnectorStatus(session);
      setBaiduStatus(status);
      if (!status.connected) {
        setBaiduBackups([]);
        setSelectedBaiduPath('');
      }
      return status;
    },
    [vaultSession]
  );

  const refreshBaiduBackupList = useCallback(
    async (sessionArg?: VaultSession | null, pathPrefixArg?: string) => {
      const session = sessionArg ?? vaultSession;
      if (!session) throw new Error('请先连接 Vault。');
      const pathPrefix = (pathPrefixArg ?? backupSettings.baiduPathPrefix).trim();
      const items = await listBaiduBackups({ session, pathPrefix });
      const fileItems = items.filter((item) => item.isDir !== 1);
      setBaiduBackups(fileItems);
      setSelectedBaiduPath((current) => {
        if (current && fileItems.some((item) => item.path === current)) return current;
        return fileItems[0]?.path ?? '';
      });
      return fileItems;
    },
    [backupSettings.baiduPathPrefix, vaultSession]
  );

  const createSnapshotForCurrentMode = useCallback(async (): Promise<BackupSnapshot> => {
    if (!backupSettings.backupCurrentCategoryOnly) return createBackupSnapshot();
    if (!activeCategoryId) throw new Error('当前为“仅备份当前分类”模式，请先进入一个分类。');

    const freshEntries = await listIndexedDbEntries();
    const freshFiles = buildFilesFromEntries(freshEntries);
    const categoryFiles = freshFiles.filter((file) => file.categoryId === activeCategoryId);
    if (categoryFiles.length === 0) throw new Error('当前分类中没有可备份数据。');

    const entryMap = new Map<string, IndexedDbEntry>();
    freshEntries.forEach((entry) => {
      const token = makeEntryToken(entry.dbName, entry.storeName, entry.key);
      if (!entryMap.has(token)) entryMap.set(token, entry);
    });

    const scopedEntryMap = new Map<string, IndexedDbEntry>();
    categoryFiles.forEach((file) => {
      const token = makeEntryToken(file.dbName, file.storeName, file.originKeyValue);
      const entry = entryMap.get(token);
      if (entry) scopedEntryMap.set(token, entry);
    });
    const scopedEntries = Array.from(scopedEntryMap.values());
    if (scopedEntries.length === 0) throw new Error('当前分类缺少可导出的 IndexedDB 记录。');

    const categoryName = categoriesWithStats.find((item) => item.id === activeCategoryId)?.name ?? activeCategoryId;
    return createBackupSnapshotFromEntries(scopedEntries, {
      mode: 'category',
      sourceCategoryId: activeCategoryId,
      sourceCategoryName: categoryName,
    });
  }, [backupSettings.backupCurrentCategoryOnly, activeCategoryId, categoriesWithStats]);

  const uploadBackupToVault = useCallback(
    async (trigger: 'manual' | 'auto') => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const namespaceId = backupSettings.namespaceId.trim();
      if (!namespaceId) throw new Error('请先填写命名空间 ID。');

      const snapshot = await createSnapshotForCurrentMode();
      const fileName = buildSnapshotFileName(snapshot);
      const objectKey = buildVaultObjectKey(backupSettings.objectPrefix, fileName);
      const blob = snapshotToBlob(snapshot);

      await uploadVaultObject({
        session: vaultSession,
        namespaceId,
        key: objectKey,
        file: blob,
        contentType: 'application/json',
      });

      if (trigger === 'manual') {
        await refreshVaultObjectList(vaultSession, namespaceId);
        setSelectedVaultKey(objectKey);
      }

      const modeLabel = formatSnapshotMode(snapshot);
      setBackupMessage(
        trigger === 'auto'
          ? `自动备份完成：${modeLabel}`
          : `备份上传成功：${objectKey}（${modeLabel}）`
      );
    },
    [
      backupSettings.namespaceId,
      backupSettings.objectPrefix,
      vaultSession,
      createSnapshotForCurrentMode,
      refreshVaultObjectList,
    ]
  );

  const uploadBackupToBaiduDirect = useCallback(
    async (trigger: 'manual' | 'auto') => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const status = await refreshBaiduStatus(vaultSession);
      if (!status.connected) throw new Error('请先完成百度授权。');

      const snapshot = await createSnapshotForCurrentMode();
      const fileName = buildSnapshotFileName(snapshot);
      const blob = snapshotToBlob(snapshot);

      const uploaded = await uploadBaiduBackup({
        session: vaultSession,
        pathPrefix: backupSettings.baiduPathPrefix,
        fileName,
        file: blob,
      });

      if (trigger === 'manual') {
        await refreshBaiduBackupList(vaultSession, backupSettings.baiduPathPrefix);
        setSelectedBaiduPath(uploaded.path);
      }

      const modeLabel = formatSnapshotMode(snapshot);
      setBackupMessage(
        trigger === 'auto'
          ? `百度自动备份完成（${modeLabel}）`
          : `百度备份上传成功：${uploaded.path}（${modeLabel}）`
      );
    },
    [
      backupSettings.baiduPathPrefix,
      createSnapshotForCurrentMode,
      refreshBaiduBackupList,
      refreshBaiduStatus,
      vaultSession,
    ]
  );

  const restoreSnapshotWithRollback = useCallback(
    async (snapshotFile: Blob, sourceLabel: string) => {
      const rescueSnapshot = await createBackupSnapshot();
      const incomingSnapshot = await parseBackupSnapshotFile(snapshotFile);
      const restoreMode = incomingSnapshot.mode === 'category' ? '分类恢复' : '完整恢复';
      const isFullRestore = incomingSnapshot.mode !== 'category';

      if (isFullRestore) {
        const confirmed = await requestRestoreConfirm({
          title: '即将执行完整恢复',
          description:
            '完整恢复会覆盖备份中包含的仓库数据；未包含在备份里的仓库会保留不变。是否继续？',
          confirmText: '继续恢复',
          cancelText: '取消',
          danger: true,
        });
        if (!confirmed) {
          setBackupMessage('已取消恢复操作。');
          return;
        }
      }

      try {
        const result = await applyBackupSnapshot(incomingSnapshot, {
          clearUnknownStores: false,
          clearTargetStores: isFullRestore,
        });
        await syncFromIndexedDb();
        setBackupMessage(
          restoreMode +
            '完成（来源：' +
            sourceLabel +
            '）。已清理 ' +
            result.storesCleared +
            ' 个仓库，写入 ' +
            result.entriesWritten +
            ' 条记录。'
        );

        const shouldReload = await requestRestoreConfirm({
          title: '恢复已完成',
          description: '建议立即刷新页面，以确保所有模块读取到最新数据。是否现在刷新？',
          confirmText: '立即刷新',
          cancelText: '稍后再说',
        });
        if (shouldReload && typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (restoreError) {
        let rollbackResult = '已尝试回滚到恢复前状态。';
        try {
          const rollback = await applyBackupSnapshot(rescueSnapshot, {
            clearUnknownStores: false,
            clearTargetStores: true,
          });
          await syncFromIndexedDb();
          rollbackResult = '回滚完成，已恢复 ' + rollback.entriesWritten + ' 条记录。';
        } catch (rollbackError) {
          rollbackResult = '回滚失败：' + toErrorMessage(rollbackError);
        }
        throw new Error('恢复失败：' + toErrorMessage(restoreError) + '；' + rollbackResult);
      }
    },
    [requestRestoreConfirm, syncFromIndexedDb]
  );

  const handleVaultLogin = useCallback(() => {
    void runBackupAction(async () => {
      const result = await vaultLogin({
        baseUrl: backupSettings.vaultUrl,
        tenantCode: backupSettings.tenantCode,
        email: backupSettings.email,
        password: vaultPassword,
      });

      if (result.requiresTenantSelection && !result.session) {
        setVaultSession(null);
        setVaultNamespaces([]);
        setVaultObjects([]);
        setSelectedVaultKey('');
        setBaiduStatus(null);
        setBaiduBackups([]);
        setSelectedBaiduPath('');
        setTenantOptions(result.tenantOptions);
        if (!backupSettings.tenantCode && result.tenantOptions.length > 0) {
          updateBackupSettings({ tenantCode: result.tenantOptions[0].tenantCode });
        }
        setBackupMessage('已获取 Vault 租户列表，请选择或填写 Tenant Code。');
        return;
      }

      if (!result.session) {
        throw new Error('Vault 登录成功，但未返回可用会话。');
      }

      setVaultSession(result.session);
      setTenantOptions([]);
      const namespaces = await listVaultNamespaces(result.session);
      setVaultNamespaces(namespaces);

      let namespaceId = backupSettings.namespaceId.trim();
      if (!namespaceId || !namespaces.some((item) => item.id === namespaceId)) {
        namespaceId = namespaces.find((item) => item.isDefault)?.id ?? namespaces[0]?.id ?? '';
        if (namespaceId) updateBackupSettings({ namespaceId });
      }

      if (namespaceId) {
        await refreshVaultObjectList(result.session, namespaceId);
      } else {
        setVaultObjects([]);
        setSelectedVaultKey('');
      }

      if (isBaiduDirectProvider) {
        const status = await refreshBaiduStatus(result.session);
        if (status.connected) {
          await refreshBaiduBackupList(result.session, backupSettings.baiduPathPrefix);
        }
      } else {
        setBaiduStatus(null);
        setBaiduBackups([]);
        setSelectedBaiduPath('');
      }

      const tenantName = result.session.tenantCode || result.session.tenantName || result.session.tenantId;
      setBackupMessage(`Vault 已连接：${tenantName}`);
    });
  }, [
    backupSettings.vaultUrl,
    backupSettings.tenantCode,
    backupSettings.email,
    backupSettings.namespaceId,
    backupSettings.baiduPathPrefix,
    vaultPassword,
    runBackupAction,
    updateBackupSettings,
    refreshVaultObjectList,
    refreshBaiduStatus,
    refreshBaiduBackupList,
    isBaiduDirectProvider,
  ]);

  const handleRefreshVaultObjects = useCallback(() => {
    void runBackupAction(async () => {
      await refreshVaultObjectList();
      setBackupMessage('Vault 备份列表已刷新。');
    });
  }, [refreshVaultObjectList, runBackupAction]);

  const handleUploadBackupToVault = useCallback(() => {
    void runBackupAction(async () => {
      await uploadBackupToVault('manual');
    });
  }, [runBackupAction, uploadBackupToVault]);

  const handleRestoreSelectedVaultBackup = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const namespaceId = backupSettings.namespaceId.trim();
      if (!namespaceId) throw new Error('请先填写命名空间 ID。');
      const key = selectedVaultKey.trim();
      if (!key) throw new Error('请选择一个云端备份对象。');

      const blob = await downloadVaultObject({ session: vaultSession, namespaceId, key });
      await restoreSnapshotWithRollback(blob, `Vault（${key}）`);
    });
  }, [backupSettings.namespaceId, selectedVaultKey, vaultSession, runBackupAction, restoreSnapshotWithRollback]);

  const handleDeleteSelectedVaultBackup = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const namespaceId = backupSettings.namespaceId.trim();
      if (!namespaceId) throw new Error('请先填写命名空间 ID。');
      const key = selectedVaultKey.trim();
      if (!key) throw new Error('请选择一个云端备份对象。');

      await deleteVaultObject({ session: vaultSession, namespaceId, key });
      const nextItems = await refreshVaultObjectList(vaultSession, namespaceId);
      if (nextItems.length === 0) {
        setSelectedVaultKey('');
      } else if (!nextItems.some((item) => item.key === key)) {
        setSelectedVaultKey(nextItems[0].key);
      }
      setBackupMessage(`已删除备份对象：${key}`);
    });
  }, [backupSettings.namespaceId, selectedVaultKey, vaultSession, runBackupAction, refreshVaultObjectList]);

  const handleShareBackupToBaiduQuick = useCallback(() => {
    void runBackupAction(async () => {
      const snapshot = await createSnapshotForCurrentMode();
      const blob = snapshotToBlob(snapshot);
      const fileName = buildSnapshotFileName(snapshot);
      const result = await shareBackupToBaiduQuickly(blob, fileName);
      setBackupMessage(`${result.message} (${formatSnapshotMode(snapshot)})`);
    });
  }, [createSnapshotForCurrentMode, runBackupAction]);

  const handleRefreshBaiduConnector = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const status = await refreshBaiduStatus(vaultSession);
      if (status.connected) {
        await refreshBaiduBackupList(vaultSession, backupSettings.baiduPathPrefix);
        setBackupMessage('百度授权状态已刷新，备份列表为最新。');
      } else {
        setBackupMessage('百度账号尚未连接，请先授权。');
      }
    });
  }, [backupSettings.baiduPathPrefix, refreshBaiduBackupList, refreshBaiduStatus, runBackupAction, vaultSession]);

  const handleConnectBaiduDirect = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const popup =
        typeof window !== 'undefined'
          ? window.open('about:blank', '_blank', 'noopener,noreferrer')
          : null;

      renderBaiduPopupState(popup, '正在打开百度授权', '正在准备安全授权链接，请稍候。');

      try {
        const returnTo = typeof window !== 'undefined' ? window.location.href : '';
        const authURL = await getBaiduAuthUrlWithTimeout(vaultSession, returnTo);

        if (popup) {
          if (popup.closed) {
            throw new Error('授权标签页在跳转前被关闭，请重新点击授权。');
          }
          popup.location.replace(authURL);
          setBackupMessage('已在新标签页打开百度授权，完成授权后返回此页面。');
        } else if (typeof window !== 'undefined') {
          setBackupMessage('浏览器拦截了弹窗，将在当前标签页继续授权。');
          window.location.href = authURL;
        }
      } catch (error) {
        renderBaiduPopupState(
          popup,
          '打开百度授权失败',
          toErrorMessage(error) + '。此标签页将自动关闭。',
          {
            isError: true,
            autoCloseMs: BAIDU_POPUP_CLOSE_DELAY_MS,
          }
        );
        throw error;
      }
    });
  }, [runBackupAction, vaultSession]);

  const handleUploadBackupToBaiduDirect = useCallback(() => {
    void runBackupAction(async () => {
      await uploadBackupToBaiduDirect('manual');
    });
  }, [runBackupAction, uploadBackupToBaiduDirect]);

  const handleRestoreSelectedBaiduBackup = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const filePath = selectedBaiduPath.trim();
      if (!filePath) throw new Error('请选择一个百度网盘备份文件。');
      const downloaded = await downloadBaiduBackup({ session: vaultSession, path: filePath });
      await restoreSnapshotWithRollback(downloaded.blob, `百度网盘（${downloaded.fileName}）`);
    });
  }, [restoreSnapshotWithRollback, runBackupAction, selectedBaiduPath, vaultSession]);

  const handleDeleteSelectedBaiduBackup = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      const filePath = selectedBaiduPath.trim();
      if (!filePath) throw new Error('请选择一个百度网盘备份文件。');

      await deleteBaiduBackup({ session: vaultSession, path: filePath });

      // 先做本地乐观更新，避免异步删除期间列表无变化。
      const optimisticItems = baiduBackups.filter((item) => item.path !== filePath);
      setBaiduBackups(optimisticItems);
      setSelectedBaiduPath((current) => {
        if (current && optimisticItems.some((item) => item.path === current)) return current;
        return optimisticItems[0]?.path ?? '';
      });

      // 异步删除场景下，短轮询确认云端结果；确认后再与服务端列表对齐。
      const pathPrefix = backupSettings.baiduPathPrefix;
      let confirmedRemoved = false;
      const maxAttempts = 6;
      const waitMs = 800;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (typeof window !== 'undefined') {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, attempt === 0 ? 200 : waitMs);
          });
        }

        try {
          const items = await listBaiduBackups({ session: vaultSession, pathPrefix });
          const fileItems = items.filter((item) => item.isDir !== 1);
          if (!fileItems.some((item) => item.path === filePath)) {
            confirmedRemoved = true;
            setBaiduBackups(fileItems);
            setSelectedBaiduPath((current) => {
              if (current && fileItems.some((item) => item.path === current)) return current;
              return fileItems[0]?.path ?? '';
            });
            break;
          }
        } catch {
          // Ignore transient polling errors and keep optimistic UI state.
        }
      }

      if (confirmedRemoved) {
        setBackupMessage(`已删除百度备份：${filePath}`);
      } else {
        setBackupMessage('删除请求已提交，云端列表同步中，请稍后点击刷新。');
      }
    });
  }, [
    baiduBackups,
    backupSettings.baiduPathPrefix,
    runBackupAction,
    selectedBaiduPath,
    vaultSession,
  ]);

  const handleDisconnectBaiduDirect = useCallback(() => {
    void runBackupAction(async () => {
      if (!vaultSession) throw new Error('请先连接 Vault。');
      await disconnectBaiduConnector(vaultSession);
      setBaiduStatus({
        connected: false,
        provider: 'baidu_pan',
        displayName: '',
        externalUserId: '',
        scope: '',
        expiresAt: '',
        defaultDir: backupSettings.baiduPathPrefix,
        autoBackupReady: false,
      });
      setBaiduBackups([]);
      setSelectedBaiduPath('');
      setBackupMessage('百度账号已断开。');
    });
  }, [backupSettings.baiduPathPrefix, runBackupAction, vaultSession]);

  const handleExportLocalBackup = useCallback(() => {
    void runBackupAction(async () => {
      const snapshot = await createSnapshotForCurrentMode();
      const blob = snapshotToBlob(snapshot);
      const fileName = buildSnapshotFileName(snapshot);
      downloadBlob(blob, fileName);
      setBackupMessage(`本地备份已导出：${fileName}（${formatSnapshotMode(snapshot)}）`);
    });
  }, [runBackupAction, createSnapshotForCurrentMode]);

  const handleTriggerImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleLocalImportFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      void runBackupAction(async () => {
        await restoreSnapshotWithRollback(file, `本地文件（${file.name}）`);
      });
    },
    [runBackupAction, restoreSnapshotWithRollback]
  );

  const handleBaiduOAuthSignal = useCallback(
    (signal: BaiduOAuthSignal) => {
      if (!isBaiduDirectProvider) return;
      if (!vaultSession) {
        setBackupMessage('百度授权已完成，请先连接 Vault，然后刷新百度状态。');
        return;
      }
      if (!signal.success) {
        setBackupError('百度授权失败，请重试。');
        return;
      }
      void runBackupAction(async () => {
        const status = await refreshBaiduStatus(vaultSession);
        if (!status.connected) {
          setBackupMessage('百度授权已完成，但状态尚未激活，请手动刷新一次。');
          return;
        }
        await refreshBaiduBackupList(vaultSession, backupSettings.baiduPathPrefix);
        setBackupMessage('百度授权成功，状态和备份列表已自动刷新。');
      });
    },
    [
      isBaiduDirectProvider,
      vaultSession,
      runBackupAction,
      refreshBaiduStatus,
      refreshBaiduBackupList,
      backupSettings.baiduPathPrefix,
    ]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMessage = (event: MessageEvent) => {
      try {
        const expectedOrigin = new URL(backupSettings.vaultUrl).origin;
        if (event.origin && event.origin !== expectedOrigin) return;
      } catch {
        // ignore origin filtering when Vault URL is invalid
      }
      const signal = parseBaiduOAuthSignal(event.data);
      if (!signal) return;
      handleBaiduOAuthSignal(signal);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [backupSettings.vaultUrl, handleBaiduOAuthSignal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    const oauthState = currentUrl.searchParams.get('baidu_oauth');
    if (!oauthState) return;
    currentUrl.searchParams.delete('baidu_oauth');
    window.history.replaceState(null, '', currentUrl.toString());
    handleBaiduOAuthSignal({
      success: oauthState === 'success',
      returnTo: currentUrl.toString(),
    });
  }, [handleBaiduOAuthSignal]);

  useEffect(() => {
    if (!isBaiduDirectProvider) return;
    if (!vaultSession) return;
    let disposed = false;
    void (async () => {
      try {
        const status = await refreshBaiduStatus(vaultSession);
        if (disposed) return;
        if (status.connected) {
          await refreshBaiduBackupList(vaultSession, backupSettings.baiduPathPrefix);
        }
      } catch (error) {
        if (!disposed) console.warn('Failed to refresh Baidu connector state:', error);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [
    isBaiduDirectProvider,
    vaultSession,
    refreshBaiduStatus,
    refreshBaiduBackupList,
    backupSettings.baiduPathPrefix,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!backupSettings.autoBackupEnabled) return;
    if (!vaultSession) return;
    if (backupSettings.backupCurrentCategoryOnly && !activeCategoryId) return;
    if (backupSettings.backupProvider === 'vault' && !backupSettings.namespaceId.trim()) return;
    if (backupSettings.backupProvider === 'baidu_quick') return;
    if (backupSettings.backupProvider === 'baidu_direct' && !baiduStatus?.connected) return;

    const minutes = clampBackupMinutes(
      backupSettings.autoBackupIntervalMinutes,
      DEFAULT_BACKUP_SETTINGS.autoBackupIntervalMinutes
    );
    const intervalMs = minutes * 60 * 1000;

    const timer = window.setInterval(() => {
      if (backupBusyRef.current) return;
      void runBackupAction(async () => {
        try {
          if (backupSettings.backupProvider === 'vault') {
            await uploadBackupToVault('auto');
            return;
          }
          if (backupSettings.backupProvider === 'baidu_direct') {
            await uploadBackupToBaiduDirect('auto');
          }
        } catch (error) {
          if (handleAutoBackupFailure(error)) return;
          throw error;
        }
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    backupSettings.autoBackupEnabled,
    backupSettings.autoBackupIntervalMinutes,
    backupSettings.backupProvider,
    backupSettings.namespaceId,
    baiduStatus?.connected,
    backupSettings.backupCurrentCategoryOnly,
    activeCategoryId,
    vaultSession,
    runBackupAction,
    uploadBackupToVault,
    uploadBackupToBaiduDirect,
    handleAutoBackupFailure,
  ]);

  const activeNamespace = useMemo(
    () => vaultNamespaces.find((item) => item.id === backupSettings.namespaceId) ?? null,
    [vaultNamespaces, backupSettings.namespaceId]
  );

  const selectedVaultObject = useMemo(
    () => vaultObjects.find((item) => item.key === selectedVaultKey) ?? null,
    [vaultObjects, selectedVaultKey]
  );

  const selectedBaiduBackup = useMemo(
    () => baiduBackups.find((item) => item.path === selectedBaiduPath) ?? null,
    [baiduBackups, selectedBaiduPath]
  );

  const scopedBackupBlocked = backupSettings.backupCurrentCategoryOnly && !activeCategoryId;
  const scopedCategoryDataCount = activeCategoryId
    ? files.filter((file) => file.categoryId === activeCategoryId).length
    : 0;
  const canCreateSnapshot = !scopedBackupBlocked && (!backupSettings.backupCurrentCategoryOnly || scopedCategoryDataCount > 0);
  const canConnectVault = Boolean(
    backupSettings.vaultUrl.trim() && backupSettings.email.trim() && vaultPassword.trim()
  );
  const canUseVaultActions = Boolean(vaultSession && backupSettings.namespaceId.trim());
  const canUseBaiduDirectActions = Boolean(vaultSession && baiduStatus?.connected);
  const hasVaultSelection = Boolean(selectedVaultObject);
  const hasBaiduSelection = Boolean(selectedBaiduBackup);
  const canUploadBackup =
    canCreateSnapshot &&
    ((isVaultProvider && canUseVaultActions) || (isBaiduDirectProvider && canUseBaiduDirectActions));
  const canAutoBackupNow =
    backupSettings.autoBackupEnabled &&
    Boolean(vaultSession) &&
    ((isVaultProvider && Boolean(backupSettings.namespaceId.trim())) ||
      (isBaiduDirectProvider && Boolean(baiduStatus?.connected))) &&
    (!backupSettings.backupCurrentCategoryOnly || Boolean(activeCategoryId));
  const backupBusyText = isBackupBusy ? '执行中...' : '';
  const providerConnected =
    (isVaultProvider && Boolean(vaultSession)) ||
    (isBaiduDirectProvider && Boolean(baiduStatus?.connected)) ||
    isBaiduQuickProvider;
  const providerStatusText = isVaultProvider
    ? vaultSession
      ? 'Vault：' + (vaultSession.tenantCode || vaultSession.tenantName)
      : 'Vault 未连接'
    : isBaiduDirectProvider
      ? baiduStatus?.connected
        ? '百度网盘已连接' + (baiduStatus.displayName ? '（' + baiduStatus.displayName + '）' : '')
        : '百度网盘未连接'
      : '快捷分享模式';

  const baiduDirectNeedsVault = isBaiduDirectProvider && !vaultSession;
  const baiduDirectNeedsAuthorize = isBaiduDirectProvider && Boolean(vaultSession) && !baiduStatus?.connected;
  const baiduDirectCurrentStep = baiduDirectNeedsVault ? 1 : baiduDirectNeedsAuthorize ? 2 : 3;
  const baiduDirectPrimaryLabel =
    baiduDirectCurrentStep === 1
      ? '第1步：连接 Vault'
      : baiduDirectCurrentStep === 2
        ? '第2步：授权百度网盘'
        : '第3步：立即备份到百度网盘';
  const baiduDirectPrimaryDescription =
    baiduDirectCurrentStep === 1
      ? '请先在配置页填写 Vault 地址、租户、账号和密码，然后连接 Vault。'
      : baiduDirectCurrentStep === 2
        ? '点击按钮后会拉起百度授权流程，授权完成后回到此页即可继续。'
        : '已满足备份条件，点击后会按当前模式把数据上传到百度网盘。';
    const baiduDirectPrimaryDisabled =
    isBackupBusy ||
    (baiduDirectCurrentStep === 1
      ? !canConnectVault
      : baiduDirectCurrentStep === 2
        ? !vaultSession
        : !canUploadBackup);
  const baiduBackupPath = backupSettings.baiduPathPrefix || baiduStatus?.defaultDir || '/';
  const hideStorageCardsWhenBackupOpen = isBackupCenterOpen;

  const handleToggleBackupCenter = useCallback(() => {
    setIsBackupCenterOpen((previous) => {
      const next = !previous;
      if (next) setBackupPage('actions');
      return next;
    });
  }, []);

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-gradient-to-br from-[#F7F9FF] via-[#F6FBFF] to-[#F8F6FF] flex flex-col text-slate-800"
    >
      <StorageHeader
        activeCategoryId={activeCategoryId}
        activeCategory={activeCategory}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        canClearCategory={canClearCategory}
        filteredFileCount={filteredFiles.length}
        isExporting={isExporting}
        isBackupCenterOpen={isBackupCenterOpen}
        onBack={() => setActiveCategoryId(null)}
        onRefresh={() => void syncFromIndexedDb()}
        onClear={() => void clearFiles()}
        onDownloadAll={() => void downloadAll()}
        onToggleBackupCenter={handleToggleBackupCenter}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-5 space-y-5 scrollbar-hide">
        {isBackupCenterOpen && (
          <section className="bg-white/95 border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">备份中心</div>
                <div className="text-[18px] font-semibold text-slate-800">
                  {`多目标备份与恢复（${BACKUP_PROVIDER_LABEL[backupSettings.backupProvider]}）`}
                </div>
              </div>
              <div className="text-[12px] text-slate-500">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 border ${
                    providerConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {providerStatusText}
                </span>
              </div>
            </div>

            {backupError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-2xl text-[12px]">
                {backupError}
              </div>
            )}
            {backupMessage && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-2xl text-[12px]">
                {backupMessage}
              </div>
            )}
            {scopedBackupBlocked && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded-2xl text-[12px]">
                已开启“仅备份当前分类”，请先进入一个分类后再执行备份。
              </div>
            )}
            {backupSettings.backupCurrentCategoryOnly && activeCategoryId && (
              <div className="bg-sky-50 border border-sky-100 text-sky-700 px-3 py-2 rounded-2xl text-[12px]">
                {`当前仅备份分类：${activeCategory?.name ?? activeCategoryId}（${scopedCategoryDataCount} 项）`}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setBackupPage('actions')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    backupPage === 'actions'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  备份操作
                </button>
                <button
                  type="button"
                  onClick={() => setBackupPage('settings')}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    backupPage === 'settings'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  备份配置
                </button>
              </div>
            </div>

            {backupPage === 'actions' && (
              <div className="space-y-4">
                {isBaiduDirectProvider && (
                  <>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-3 space-y-2">
                      <div className="text-[13px] font-semibold text-sky-900">百度网盘直连流程</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                        <div className={`rounded-xl border px-2.5 py-2 ${baiduDirectCurrentStep > 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : baiduDirectCurrentStep === 1 ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                          <div className="text-[11px]">第1步</div>
                          <div className="font-medium">连接 Vault</div>
                        </div>
                        <div className={`rounded-xl border px-2.5 py-2 ${baiduDirectCurrentStep > 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : baiduDirectCurrentStep === 2 ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                          <div className="text-[11px]">第2步</div>
                          <div className="font-medium">授权百度网盘</div>
                        </div>
                        <div className={`rounded-xl border px-2.5 py-2 ${baiduDirectCurrentStep === 3 ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                          <div className="text-[11px]">第3步</div>
                          <div className="font-medium">立即备份</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                        <div className="text-[14px] font-semibold text-slate-800">立即备份</div>
                        <div className="text-[12px] text-slate-500">{baiduDirectPrimaryDescription}</div>
                        <button
                          type="button"
                          onClick={baiduDirectCurrentStep === 1 ? handleVaultLogin : baiduDirectCurrentStep === 2 ? handleConnectBaiduDirect : handleUploadBackupToBaiduDirect}
                          disabled={baiduDirectPrimaryDisabled}
                          className={`w-full px-3 py-2 rounded-xl text-[13px] font-medium transition ${!baiduDirectPrimaryDisabled ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          {baiduDirectPrimaryLabel}
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleRefreshBaiduConnector}
                            disabled={!vaultSession || isBackupBusy}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${vaultSession && !isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            刷新百度状态
                          </button>
                          <button
                            type="button"
                            onClick={handleDisconnectBaiduDirect}
                            disabled={!baiduStatus?.connected || isBackupBusy}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${baiduStatus?.connected && !isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            断开百度授权
                          </button>
                          {backupBusyText && <span className="text-[12px] text-slate-400 self-center">{backupBusyText}</span>}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[14px] font-semibold text-slate-800">恢复备份</div>
                          <button
                            type="button"
                            onClick={handleRefreshBaiduConnector}
                            disabled={!vaultSession || isBackupBusy}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${vaultSession && !isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            刷新列表
                          </button>
                        </div>
                        <div className="text-[12px] text-slate-500">{`云端目录：${baiduBackupPath}`}</div>

                        {!vaultSession ? (
                          <div className="text-[12px] text-slate-500">请先完成第1步连接 Vault，再查看可恢复的备份。</div>
                        ) : !baiduStatus?.connected ? (
                          <div className="text-[12px] text-slate-500">请先完成第2步授权百度网盘，授权后可在此选择备份恢复。</div>
                        ) : baiduBackups.length === 0 ? (
                          <div className="text-[12px] text-slate-500">当前目录下暂无可恢复备份文件。</div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                            {baiduBackups.map((item) => (
                              <label
                                key={item.path}
                                className={`flex gap-2 items-start rounded-xl border px-2.5 py-2 cursor-pointer transition ${
                                  selectedBaiduPath === item.path
                                    ? 'border-sky-200 bg-sky-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="baidu-object"
                                  checked={selectedBaiduPath === item.path}
                                  onChange={() => setSelectedBaiduPath(item.path)}
                                  className="mt-1"
                                />
                                <div className="min-w-0">
                                  <div className="text-[12px] text-slate-700 break-all">{item.path}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {item.size} 字节 · {formatBaiduBackupTime(item)}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleRestoreSelectedBaiduBackup}
                            disabled={!canUseBaiduDirectActions || !hasBaiduSelection || isBackupBusy}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUseBaiduDirectActions && hasBaiduSelection && !isBackupBusy ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            恢复选中备份
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelectedBaiduBackup}
                            disabled={!canUseBaiduDirectActions || !hasBaiduSelection || isBackupBusy}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUseBaiduDirectActions && hasBaiduSelection && !isBackupBusy ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                          >
                            删除选中备份
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isBaiduQuickProvider && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-3 space-y-3">
                    <div className="text-[14px] font-semibold text-indigo-900">快捷分享到百度网盘</div>
                    <div className="text-[12px] text-slate-600">
                      快捷模式不会在服务端保存备份列表，点击后在系统分享面板选择百度网盘即可。
                    </div>
                    <button
                      type="button"
                      onClick={handleShareBackupToBaiduQuick}
                      disabled={!canCreateSnapshot || isBackupBusy}
                      className={`w-full px-3 py-2 rounded-xl text-[13px] font-medium transition ${canCreateSnapshot && !isBackupBusy ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      立即快捷分享
                    </button>
                    {backupBusyText && <span className="text-[12px] text-slate-400">{backupBusyText}</span>}
                  </div>
                )}

                {isVaultProvider && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                    <div className="text-[14px] font-semibold text-slate-800">Vault 备份操作</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleVaultLogin}
                        disabled={!canConnectVault || isBackupBusy}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canConnectVault && !isBackupBusy ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        连接 Vault
                      </button>
                      <button
                        type="button"
                        onClick={handleRefreshVaultObjects}
                        disabled={!canUseVaultActions || isBackupBusy}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUseVaultActions && !isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        刷新列表
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadBackupToVault}
                        disabled={!canUploadBackup || isBackupBusy}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUploadBackup && !isBackupBusy ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        上传备份
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreSelectedVaultBackup}
                        disabled={!canUseVaultActions || !hasVaultSelection || isBackupBusy}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUseVaultActions && hasVaultSelection && !isBackupBusy ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        恢复选中备份
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelectedVaultBackup}
                        disabled={!canUseVaultActions || !hasVaultSelection || isBackupBusy}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canUseVaultActions && hasVaultSelection && !isBackupBusy ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        删除选中备份
                      </button>
                    </div>
                    {backupBusyText && <span className="text-[12px] text-slate-400">{backupBusyText}</span>}
                    <div className="text-[12px] text-slate-500">
                      {`命名空间：${activeNamespace ? `${activeNamespace.name}(${activeNamespace.id})` : '未选择'}`}
                    </div>
                    {vaultObjects.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {vaultObjects.map((item) => (
                          <label
                            key={item.key}
                            className={`flex gap-2 items-start rounded-xl border px-2.5 py-2 cursor-pointer transition ${
                              selectedVaultKey === item.key
                                ? 'border-sky-200 bg-sky-50'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="vault-object"
                              checked={selectedVaultKey === item.key}
                              onChange={() => setSelectedVaultKey(item.key)}
                              className="mt-1"
                            />
                            <div className="min-w-0">
                              <div className="text-[12px] text-slate-700 break-all">{item.key}</div>
                              <div className="text-[11px] text-slate-400">
                                {item.size} 字节 · {formatVaultObjectTime(item)}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="text-[14px] font-semibold text-slate-800">本地备份工具</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExportLocalBackup}
                      disabled={!canCreateSnapshot || isBackupBusy}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${canCreateSnapshot && !isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      导出本地备份
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerImport}
                      disabled={isBackupBusy}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${!isBackupBusy ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      导入本地备份
                    </button>
                  </div>
                </div>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleLocalImportFileChange}
                />
              </div>
            )}

            {backupPage === 'settings' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">备份目标</span>
                    <select
                      value={backupSettings.backupProvider}
                      onChange={(event) =>
                        updateBackupSettings({
                          backupProvider: parseBackupProvider(event.target.value),
                          autoBackupEnabled:
                            parseBackupProvider(event.target.value) === 'baidu_quick'
                              ? false
                              : backupSettings.autoBackupEnabled,
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="vault">Vault 云端</option>
                      <option value="baidu_direct">百度网盘直连</option>
                      <option value="baidu_quick">百度网盘快捷分享</option>
                    </select>
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">Vault 地址</span>
                    <input
                      value={backupSettings.vaultUrl}
                      onChange={(event) => updateBackupSettings({ vaultUrl: event.target.value })}
                      placeholder="http://127.0.0.1:8080"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">Tenant Code（租户代码）</span>
                    <input
                      value={backupSettings.tenantCode}
                      onChange={(event) => updateBackupSettings({ tenantCode: event.target.value })}
                      placeholder="platform"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">账号邮箱</span>
                    <input
                      value={backupSettings.email}
                      onChange={(event) => updateBackupSettings({ email: event.target.value })}
                      placeholder="admin@example.com"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">Vault 密码</span>
                    <input
                      type="password"
                      value={vaultPassword}
                      onChange={(event) => setVaultPassword(event.target.value)}
                      placeholder="请输入 Vault 登录密码"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">命名空间 ID</span>
                    <input
                      value={backupSettings.namespaceId}
                      onChange={(event) => updateBackupSettings({ namespaceId: event.target.value })}
                      placeholder="namespace id"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">对象前缀</span>
                    <input
                      value={backupSettings.objectPrefix}
                      onChange={(event) => updateBackupSettings({ objectPrefix: event.target.value })}
                      placeholder="baobaobaiphone/backups"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  {isBaiduDirectProvider && (
                    <label className="text-[12px] text-slate-600 space-y-1">
                      <span className="block font-medium">百度网盘目录</span>
                      <input
                        value={backupSettings.baiduPathPrefix}
                        onChange={(event) => updateBackupSettings({ baiduPathPrefix: event.target.value })}
                        placeholder="/apps/baobaobaiphone/backups"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <div className="text-[12px] text-slate-700">
                      <div className="font-medium">仅备份当前分类</div>
                      <div className="text-slate-500 mt-0.5">开启后，上传和导出只包含当前分类的数据。</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={backupSettings.backupCurrentCategoryOnly}
                      onChange={(event) =>
                        updateBackupSettings({ backupCurrentCategoryOnly: event.target.checked })
                      }
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <div className="text-[12px] text-slate-700">
                      <div className="font-medium">自动定时备份</div>
                      <div className="text-slate-500 mt-0.5">
                        {isBaiduQuickProvider
                          ? '快捷分享模式不支持自动定时备份'
                          : canAutoBackupNow
                            ? '当前条件满足，自动备份已生效'
                            : isBaiduDirectProvider
                              ? '请先连接 Vault 并完成百度授权'
                              : '请先连接 Vault 并选择命名空间'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={backupSettings.autoBackupEnabled}
                      onChange={(event) => updateBackupSettings({ autoBackupEnabled: event.target.checked })}
                      disabled={isBaiduQuickProvider}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="text-[12px] text-slate-600 space-y-1">
                    <span className="block font-medium">自动备份间隔（分钟）</span>
                    <select
                      value={String(backupSettings.autoBackupIntervalMinutes)}
                      onChange={(event) =>
                        updateBackupSettings({
                          autoBackupIntervalMinutes: clampBackupMinutes(Number(event.target.value), 30),
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {AUTO_BACKUP_INTERVAL_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item} 分钟
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center">
                    当前模式：{backupSettings.backupCurrentCategoryOnly ? '分类备份' : '全量备份'}
                  </div>
                </div>

                {isVaultProvider && tenantOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[12px] text-slate-500">推荐租户（点击可快捷填充）</div>
                    <div className="flex flex-wrap gap-2">
                      {tenantOptions.map((option) => (
                        <button
                          key={`${option.tenantId}-${option.userId}`}
                          type="button"
                          onClick={() => updateBackupSettings({ tenantCode: option.tenantCode })}
                          className={`text-[12px] px-2.5 py-1 rounded-full border transition ${
                            backupSettings.tenantCode === option.tenantCode
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {`${option.tenantCode}（${option.tenantName || option.username}）`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isVaultProvider && vaultNamespaces.length > 0 && (
                  <label className="text-[12px] text-slate-600 space-y-1 block">
                    <span className="block font-medium">命名空间快捷选择</span>
                    <select
                      value={backupSettings.namespaceId}
                      onChange={(event) => updateBackupSettings({ namespaceId: event.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="">请选择命名空间</option>
                      {vaultNamespaces.map((namespace) => (
                        <option key={namespace.id} value={namespace.id}>
                          {`${namespace.name}（${namespace.id}）`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </section>
        )}

        {syncError && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2 rounded-2xl text-[13px]">
            {syncError}
          </div>
        )}

        {!hideStorageCardsWhenBackupOpen && (
          <AnimatePresence mode="wait">
            {!activeCategory ? (
              <StorageOverview
                usedBytes={usedBytes}
                totalCapacity={totalCapacity}
                progress={progress}
                storageQuota={storageQuota}
                categories={categoriesWithStats}
                onSelectCategory={setActiveCategoryId}
              />
            ) : (
              <StorageDetail
                activeCategory={activeCategory}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filteredFiles={filteredFiles}
                sortKey={sortKey}
                onSortChange={setSortKey}
                isExporting={isExporting}
                onDownloadFile={(file) => void downloadFile(file)}
                onDeleteFile={(file) => void deleteFile(file)}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {restoreConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-[80] bg-slate-900/35 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-4"
            onClick={() => closeRestoreConfirmDialog(false)}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
                    restoreConfirmDialog.danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900">{restoreConfirmDialog.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-slate-600">{restoreConfirmDialog.description}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeRestoreConfirmDialog(false)}
                  className="h-9 px-3 rounded-lg bg-slate-100 text-[13px] text-slate-700 hover:bg-slate-200 transition"
                >
                  {restoreConfirmDialog.cancelText ?? '取消'}
                </button>
                <button
                  type="button"
                  onClick={() => closeRestoreConfirmDialog(true)}
                  className={`h-9 px-3 rounded-lg text-[13px] text-white transition ${
                    restoreConfirmDialog.danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {restoreConfirmDialog.confirmText}
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export type { StorageAppProps };
