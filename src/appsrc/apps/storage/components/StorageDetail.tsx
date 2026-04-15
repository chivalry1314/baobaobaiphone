import React from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, Trash2, Download } from 'lucide-react';
import type { SortKey, StorageCategory, StorageFile } from '../types';
import { formatBytes, formatDate, getFileIcon } from '../utils';

interface StorageDetailProps {
  activeCategory: StorageCategory | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredFiles: StorageFile[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  isExporting: boolean;
  onDownloadFile: (file: StorageFile) => void;
  onDeleteFile: (file: StorageFile) => void;
}

export const StorageDetail: React.FC<StorageDetailProps> = ({
  activeCategory,
  searchTerm,
  onSearchChange,
  filteredFiles,
  sortKey,
  onSortChange,
  isExporting,
  onDownloadFile,
  onDeleteFile,
}) => {
  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      <div className="bg-white/90 rounded-2xl border border-slate-200/70 px-4 py-3 flex items-center gap-3">
        <Search size={18} className="text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索文件或数据..."
          className="flex-1 text-[14px] text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>

      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          {filteredFiles.length} 个文件
        </span>
        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          占用 {formatBytes(filteredFiles.reduce((sum, file) => sum + file.size, 0))}
        </span>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'recent', label: '最近' },
          { key: 'name', label: '名称' },
          { key: 'size', label: '大小' },
        ] as const).map((option) => (
          <button
            key={option.key}
            onClick={() => onSortChange(option.key)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition ${
              sortKey === option.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/90 text-slate-500 border border-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
        {activeCategory?.description && (
          <span className="ml-auto text-[12px] text-slate-400 flex items-center gap-1.5">
            <Sparkles size={12} />
            {activeCategory.description}
          </span>
        )}
      </div>

      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 text-center text-slate-400">
          暂无匹配文件
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.extension);
            const canDelete = !file.readOnly && file.segment;
            return (
              <motion.div
                key={file.id}
                layout
                className="bg-white/95 rounded-2xl border border-slate-200/70 px-4 py-3 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Icon size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                      {file.name}
                      {file.readOnly && (
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                          只读
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-slate-400 flex items-center gap-2">
                      <span className="uppercase">{file.source}</span>
                      <span>·</span>
                      <span>{file.extension.toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatBytes(file.size)}</span>
                      <span>·</span>
                      <span>{formatDate(file.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button
                    className={`p-2 rounded-full transition ${
                      isExporting ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100/80 hover:text-slate-700'
                    }`}
                    disabled={isExporting}
                    onClick={() => onDownloadFile(file)}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => onDeleteFile(file)}
                    className={`p-2 rounded-full transition ${
                      canDelete ? 'hover:bg-rose-50 hover:text-rose-500' : 'opacity-40 cursor-not-allowed'
                    }`}
                    disabled={!canDelete}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
