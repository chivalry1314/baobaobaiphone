import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Trash2, Edit2, Check, X, BookOpen, Globe, User } from 'lucide-react';
import { WorldInfoEntry } from './types';
import { useWorldBookStore } from './store';
import { APP_OPEN_MOTION, APP_CLOSE_MOTION } from '../../../core/appOpenMotion';

interface WorldBookAppProps {
  onClose: () => void;
}

export const WorldBookApp: React.FC<WorldBookAppProps> = ({ onClose }) => {
  const { worldBook, addWorldEntry, updateWorldEntry, deleteWorldEntry } = useWorldBookStore();
  const [editingEntry, setEditingEntry] = useState<WorldInfoEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSave = (entry: WorldInfoEntry) => {
    if (isAdding) {
      addWorldEntry(entry);
      setIsAdding(false);
    } else {
      updateWorldEntry(entry.id, entry);
    }
    setEditingEntry(null);
  };

  const startNewEntry = () => {
    const newEntry: WorldInfoEntry = {
      id: '',
      name: '新条目',
      keywords: [],
      content: '',
      triggerMode: 'keyword',
      insertionOrder: worldBook.length + 1,
      scope: 'global',
    };
    setEditingEntry(newEntry);
    setIsAdding(true);
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#F2F2F7] flex flex-col text-gray-900"
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center text-[#007AFF] gap-1">
          <ChevronLeft size={24} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2">世界书 (备忘录)</h1>
        <button onClick={startNewEntry} className="text-[#007AFF]">
          <Plus size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {worldBook.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-2">
            <BookOpen size={48} strokeWidth={1} />
            <p className="text-[15px]">暂无世界书条目</p>
            <button
              onClick={startNewEntry}
              className="text-[#007AFF] text-[14px] font-medium"
            >
              点击右上角添加
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {worldBook.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                className={`bg-white rounded-xl border p-4 shadow-sm space-y-2 transition-opacity ${
                  entry.triggerMode === 'disabled' ? 'opacity-50 border-gray-200' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[16px]">{entry.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.scope === 'global' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {entry.scope === 'global' ? '全局' : '角色'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.triggerMode === 'keyword' ? 'bg-blue-100 text-blue-700' :
                        entry.triggerMode === 'constant' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {entry.triggerMode === 'keyword' ? '关键词触发' :
                         entry.triggerMode === 'constant' ? '始终触发' : '已禁用'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.triggerMode === 'keyword' && entry.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] rounded-full border border-blue-100">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="p-2 text-gray-400 hover:text-blue-500"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteWorldEntry(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 line-clamp-2">{entry.content}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-[17px]">{isAdding ? '添加条目' : '编辑条目'}</h2>
                <button onClick={() => setEditingEntry(null)} className="text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Trigger Mode Selection */}
                <div className="space-y-1">
                  <label className="text-[12px] text-gray-500 uppercase px-1">
                    触发模式 {editingEntry.scope === 'character' && <span className="text-orange-500 font-normal">(角色条目仅支持始终触发)</span>}
                  </label>
                  {editingEntry.scope === 'global' ? (
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
                      <button
                        onClick={() => setEditingEntry({ ...editingEntry, triggerMode: 'keyword' })}
                        className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                          editingEntry.triggerMode === 'keyword' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        关键词触发
                      </button>
                      <button
                        onClick={() => setEditingEntry({ ...editingEntry, triggerMode: 'constant' })}
                        className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                          editingEntry.triggerMode === 'constant' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'
                        }`}
                      >
                        始终触发
                      </button>
                      <button
                        onClick={() => setEditingEntry({ ...editingEntry, triggerMode: 'disabled' })}
                        className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                          editingEntry.triggerMode === 'disabled' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'
                        }`}
                      >
                        已禁用
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[14px] text-orange-700 font-medium">始终触发模式</span>
                    </div>
                  )}
                </div>

                {/* Scope Selection */}
                <div className="space-y-1">
                  <label className="text-[12px] text-gray-500 uppercase px-1">生效范围</label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setEditingEntry({ ...editingEntry, scope: 'global' })}
                      className={`flex-1 py-2 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-all ${
                        editingEntry.scope === 'global' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      <Globe size={16} />
                      全局
                    </button>
                    <button
                      onClick={() => setEditingEntry({ ...editingEntry, scope: 'character', triggerMode: 'constant' })}
                      className={`flex-1 py-2 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-all ${
                        editingEntry.scope === 'character' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'
                      }`}
                    >
                      <User size={16} />
                      角色
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] text-gray-500 uppercase px-1">名称</label>
                  <input
                    type="text"
                    value={editingEntry.name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 rounded-lg text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
                    placeholder="条目名称"
                  />
                </div>

                {editingEntry.triggerMode === 'keyword' && (
                  <div className="space-y-1">
                    <label className="text-[12px] text-gray-500 uppercase px-1">关键字 (逗号分隔)</label>
                    <input
                      type="text"
                      value={editingEntry.keywords.join(', ')}
                      onChange={(e) => setEditingEntry({
                        ...editingEntry,
                        keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      className="w-full px-3 py-2 bg-gray-100 rounded-lg text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
                      placeholder="关键字1, 关键字2..."
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[12px] text-gray-500 uppercase px-1">内容</label>
                  <textarea
                    value={editingEntry.content}
                    onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
                    className="w-full h-40 px-3 py-2 bg-gray-100 rounded-lg text-[15px] text-gray-900 outline-none resize-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
                    placeholder="当触发时，这段内容将被注入到提示词中..."
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium text-[15px]"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSave(editingEntry)}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-[15px] flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export type { WorldBookAppProps };
