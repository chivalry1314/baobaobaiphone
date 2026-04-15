import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Database } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { CATEGORY_DEFINITIONS } from './constants';
import { StorageDetail, StorageHeader, StorageOverview } from './components';
import {
  listIndexedDbEntries,
  readIndexedDbValue,
  writeIndexedDbValue,
} from './indexedDb';
import type { StorageAppProps, StorageCategoryStat, StorageFile, SortKey } from './types';
import {
  buildFilesFromEntries,
  downloadBlob,
  extractFileData,
  sanitizeFileName,
  safeJsonParse,
} from './utils';

export const StorageApp: React.FC<StorageAppProps> = ({ onClose }) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
      setSyncError('读取浏览器数据库失败，请检查浏览器权限');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void syncFromIndexedDb();
  }, [syncFromIndexedDb]);

  const totalFileBytes = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files]
  );
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
          description: '应用数据',
          fileCount: 0,
          totalSize: 0,
        });
      }
    });

    return [...CATEGORY_DEFINITIONS, ...dynamic].map((category) => {
      const items = files.filter((file) => file.categoryId === category.id);
      const totalSize = items.reduce((sum, file) => sum + file.size, 0);
      return {
        ...category,
        fileCount: items.length,
        totalSize,
      };
    });
  }, [files]);

  const activeCategory = categoriesWithStats.find((cat) => cat.id === activeCategoryId) || null;

  const filteredFiles = useMemo(() => {
    let result = activeCategoryId
      ? files.filter((file) => file.categoryId === activeCategoryId)
      : files;

    if (searchTerm.trim()) {
      const keyword = searchTerm.trim().toLowerCase();
      result = result.filter((file) =>
        `${file.name}.${file.extension}`.toLowerCase().includes(keyword)
      );
    }

    return [...result].sort((a, b) => {
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortKey === 'size') {
        return b.size - a.size;
      }
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
    const currentState = hasStateWrapper ? (parsed as any).state : parsed;
    if (!currentState || typeof currentState !== 'object') return;

    if (file.resetValue === undefined) return;
    const nextState = { ...(currentState as any), [file.segment]: file.resetValue };
    const payload = hasStateWrapper ? { ...(parsed as any), state: nextState } : nextState;

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
      const finalName = safeName.endsWith(`.${fileExtension}`)
        ? safeName
        : `${safeName}.${fileExtension}`;
      const blobType =
        typeof data === 'string' && fileExtension !== 'json'
          ? 'text/plain;charset=utf-8'
          : 'application/json;charset=utf-8';
      const blob = new Blob([payload], { type: blobType });
      downloadBlob(blob, finalName);
    } catch (error) {
      console.error('Export failed:', error);
      setSyncError('导出失败，请稍后重试');
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
          source: '浏览器数据库',
          files: exports,
        },
        null,
        2
      );
      const fileName = `文件管理导出_${new Date().toISOString().slice(0, 10)}.json`;
      downloadBlob(new Blob([payload], { type: 'application/json;charset=utf-8' }), fileName);
    } catch (error) {
      console.error('Export failed:', error);
      setSyncError('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  }, [filteredFiles]);

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
        onBack={() => setActiveCategoryId(null)}
        onRefresh={() => void syncFromIndexedDb()}
        onClear={() => void clearFiles()}
        onDownloadAll={() => void downloadAll()}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-5 space-y-5 scrollbar-hide">
        {syncError && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2 rounded-2xl text-[13px]">
            {syncError}
          </div>
        )}

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
      </div>
    </motion.div>
  );
};

export type { StorageAppProps };
