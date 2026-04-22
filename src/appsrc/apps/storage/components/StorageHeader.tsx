import React from 'react';
import { ChevronLeft, Database, Download, HardDrive, RotateCw, Trash2, X } from 'lucide-react';
import type { StorageCategory } from '../types';
import { formatTime } from '../utils';

interface StorageHeaderProps {
  activeCategoryId: string | null;
  activeCategory: StorageCategory | null;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  canClearCategory: boolean;
  filteredFileCount: number;
  isExporting: boolean;
  isBackupCenterOpen: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onClear: () => void;
  onDownloadAll: () => void;
  onToggleBackupCenter: () => void;
  onClose: () => void;
}

export const StorageHeader: React.FC<StorageHeaderProps> = ({
  activeCategoryId,
  activeCategory,
  isSyncing,
  lastSyncedAt,
  canClearCategory,
  filteredFileCount,
  isExporting,
  isBackupCenterOpen,
  onBack,
  onRefresh,
  onClear,
  onDownloadAll,
  onToggleBackupCenter,
  onClose,
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-md border-b border-slate-200/70 px-4 pt-12 pb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {activeCategoryId && (
          <button
            onClick={onBack}
            className="p-2 text-slate-500 active:scale-95 transition-transform rounded-full hover:bg-slate-100/80"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
          <HardDrive size={20} className="text-slate-700" />
        </div>
        <div>
          <div className="text-[11px] tracking-[0.2em] text-slate-400">文件管理</div>
          <div className="text-[17px] font-semibold text-slate-800">
            {activeCategory ? `我的文件 · ${activeCategory.name}` : '我的文件'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>{isSyncing ? '同步中' : '已连接浏览器数据库'}</span>
            {lastSyncedAt && !isSyncing && <span>· {formatTime(lastSyncedAt)}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <button
          onClick={onRefresh}
          className="p-2 rounded-full hover:bg-slate-100/80 hover:text-slate-700 transition"
          aria-label="刷新"
        >
          <RotateCw size={18} className={isSyncing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onClear}
          className={`p-2 rounded-full transition ${
            canClearCategory ? 'hover:bg-rose-50 hover:text-rose-500' : 'opacity-40 cursor-not-allowed'
          }`}
          disabled={!canClearCategory}
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={onDownloadAll}
          className={`p-2 rounded-full transition ${
            filteredFileCount === 0 || isExporting
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-slate-100/80 hover:text-slate-700'
          }`}
          disabled={filteredFileCount === 0 || isExporting}
        >
          <Download size={18} />
        </button>
        <button
          onClick={onToggleBackupCenter}
          className={`p-2 rounded-full transition ${
            isBackupCenterOpen
              ? 'bg-sky-100 text-sky-700'
              : 'hover:bg-slate-100/80 hover:text-slate-700'
          }`}
          aria-label="备份中心"
          title="备份中心"
        >
          <Database size={18} />
        </button>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
