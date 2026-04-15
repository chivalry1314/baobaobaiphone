import React from 'react';
import { motion } from 'motion/react';
import type { StorageCategoryStat } from '../types';
import { formatBytes } from '../utils';

interface StorageOverviewProps {
  usedBytes: number;
  totalCapacity: number;
  progress: number;
  storageQuota: number | null;
  categories: StorageCategoryStat[];
  onSelectCategory: (categoryId: string) => void;
}

export const StorageOverview: React.FC<StorageOverviewProps> = ({
  usedBytes,
  totalCapacity,
  progress,
  storageQuota,
  categories,
  onSelectCategory,
}) => {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-5"
    >
      <div className="bg-white/90 rounded-3xl border border-slate-200/70 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-slate-400 font-medium">已用空间</p>
            <p className="text-[28px] font-semibold text-slate-800">{formatBytes(usedBytes)}</p>
          </div>
          <div className="text-[12px] text-slate-400">
            {storageQuota ? `总量 ${formatBytes(totalCapacity)}` : '总量 未知'}
          </div>
        </div>
        {storageQuota && (
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 rounded-full transition-all"
              style={{ width: `${usedBytes === 0 ? 0 : Math.max(progress * 100, 3)}%` }}
            />
          </div>
        )}
        <div className="mt-3 text-[12px] text-slate-400 flex items-center gap-2">
          {storageQuota ? (
            <>
              <span>剩余 {formatBytes(Math.max(totalCapacity - usedBytes, 0))}</span>
              <span>·</span>
              <span>来自浏览器存储估算</span>
            </>
          ) : (
            <span>仅统计浏览器数据库已使用的大小</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="bg-white/90 rounded-3xl border border-slate-200/70 p-4 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <category.Icon size={20} className="text-slate-600" />
            </div>
            <div className="mt-3 text-[15px] font-semibold text-slate-800">{category.name}</div>
            <div className="text-[12px] text-slate-400 mt-1">{category.fileCount} 个文件</div>
            <div className="text-[12px] text-slate-500 mt-1">{formatBytes(category.totalSize)}</div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
