import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Brain, ChevronLeft, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { COMMERCE_ROLE_CHANGED_EVENT } from '../../shared/business/commerce/roleContext';
import { useRoleDisplayNameBridge } from '../../shared/business/contacts/roleDisplayNameBridge';
import { isContactRoleId } from '../../shared/business/roleIdentity';
import { clearRuntimeActiveRoleId, useRoleRuntimeStore } from '../../shared/business/roleRuntime';
import { useDailyWordsStore } from './store';
import type { DailyWordsAppProps, DailyWordsEntry } from './types';

type EditorMode = 'create' | 'edit' | null;

interface TimelineGroup {
  dateKey: string;
  items: DailyWordsEntry[];
}

const TIMELINE_PREVIEW_CLAMP_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const parseTagsInput = (value: string): string[] => {
  const tagSet = new Set<string>();
  value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (tagSet.size >= 16) return;
      tagSet.add(item.slice(0, 20));
    });
  return [...tagSet];
};

const formatDateTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const normalizeSingleLineText = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const resolveEntryDisplayTitle = (entry: DailyWordsEntry): string => {
  const customTitle = normalizeSingleLineText(entry.title);
  if (customTitle) return customTitle;

  const contentPreview = normalizeSingleLineText(entry.content);
  if (contentPreview) {
    const maxLength = 14;
    if (contentPreview.length <= maxLength) return contentPreview;
    return `${contentPreview.slice(0, maxLength)}...`;
  }

  return formatDateTime(entry.createdAt || entry.updatedAt);
};

const formatDateLabel = (dateKey: string): string => {
  const parts = dateKey.split('-').map((item) => Number.parseInt(item, 10));
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) return dateKey;
  return `${parts[1]}月${parts[2]}日`;
};

const buildTimelineGroups = (entries: DailyWordsEntry[]): TimelineGroup[] => {
  const sorted = [...entries].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt;
    return right.createdAt - left.createdAt;
  });

  const groupMap = new Map<string, DailyWordsEntry[]>();
  sorted.forEach((entry) => {
    const previous = groupMap.get(entry.dateKey) || [];
    groupMap.set(entry.dateKey, [...previous, entry]);
  });

  return [...groupMap.entries()].map(([dateKey, items]) => ({
    dateKey,
    items,
  }));
};

export const DailyWordsApp: React.FC<DailyWordsAppProps> = ({ onClose, context }) => {
  const activeRoleId = useDailyWordsStore((state) => state.activeRoleId);
  const roleDisplayName = useRoleDisplayNameBridge(activeRoleId);
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const isInspectorMode = context?.params?.mode === 'inspector';
  const isInspectorContactRoleMode = isInspectorMode && isContactRoleId(activeRoleId);

  const isReadOnlyMode = isInspectorContactRoleMode || context?.params?.readOnly === true;
  const entries = useDailyWordsStore((state) => state.entries);
  const draft = useDailyWordsStore((state) => state.draft);
  const searchKeyword = useDailyWordsStore((state) => state.searchKeyword);
  const syncDailyWordsRoleContext = useDailyWordsStore((state) => state.syncDailyWordsRoleContext);
  const setDraft = useDailyWordsStore((state) => state.setDraft);
  const clearDraft = useDailyWordsStore((state) => state.clearDraft);
  const createEntryFromDraft = useDailyWordsStore((state) => state.createEntryFromDraft);
  const updateEntry = useDailyWordsStore((state) => state.updateEntry);
  const removeEntry = useDailyWordsStore((state) => state.removeEntry);
  const setSearchKeyword = useDailyWordsStore((state) => state.setSearchKeyword);
  const syncEntryMemory = useDailyWordsStore((state) => state.syncEntryMemory);
  const unsyncEntryMemory = useDailyWordsStore((state) => state.unsyncEntryMemory);

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInspectorMode && runtimeRoleId) {
      clearRuntimeActiveRoleId();
    }
    syncDailyWordsRoleContext();
  }, [isInspectorMode, runtimeRoleId, syncDailyWordsRoleContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRoleChange = () => {
      syncDailyWordsRoleContext();
    };
    window.addEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleRoleChange);
    return () => {
      window.removeEventListener(COMMERCE_ROLE_CHANGED_EVENT, handleRoleChange);
    };
  }, [syncDailyWordsRoleContext]);

  useEffect(() => {
    setEditorMode(null);
    setEditingEntryId(null);
    clearDraft();
  }, [activeRoleId, clearDraft]);

  const filteredEntries = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    if (!normalizedKeyword) return entries;

    return entries.filter((entry) => {
      const haystack = `${entry.title}\n${entry.content}\n${entry.mood}\n${entry.tags.join(' ')}`
        .toLowerCase()
        .trim();
      return haystack.includes(normalizedKeyword);
    });
  }, [entries, searchKeyword]);

  const timelineGroups = useMemo(
    () => buildTimelineGroups(filteredEntries),
    [filteredEntries]
  );

  const draftCanSubmit = useMemo(() => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    return Boolean(title || content);
  }, [draft.content, draft.title]);

  const isEditorOpen = editorMode !== null;
  const editorTitle = editorMode === 'edit' ? '编辑日记' : '新建日记';

  const handleOpenCreateEditor = () => {
    if (isReadOnlyMode) return;
    setEditingEntryId(null);
    clearDraft();
    setEditorMode('create');
  };

  const handleStartEdit = (entryId: string) => {
    if (isReadOnlyMode) return;
    const target = entries.find((item) => item.id === entryId);
    if (!target) return;
    setDraft({
      title: target.title,
      content: target.content,
      tagsInput: target.tags.join('，'),
      mood: target.mood,
    });
    setEditingEntryId(entryId);
    setEditorMode('edit');
  };

  const handleCloseEditor = () => {
    setEditorMode(null);
    setEditingEntryId(null);
    clearDraft();
  };

  const handleSubmitDraft = () => {
    if (isReadOnlyMode || !draftCanSubmit) return;

    if (editorMode === 'edit' && editingEntryId) {
      updateEntry(editingEntryId, {
        title: draft.title,
        content: draft.content,
        tags: parseTagsInput(draft.tagsInput),
        mood: draft.mood,
      });
      handleCloseEditor();
      return;
    }

    createEntryFromDraft();
    handleCloseEditor();
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 220 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50 text-slate-800"
    >
      <header className="sticky top-0 z-20 shrink-0 pt-11 px-3 pb-3 bg-white/70 border-b border-rose-100 backdrop-blur">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label="返回"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-[20px] font-semibold tracking-wide">日记心语</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">当前身份：{roleDisplayName}</p>
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-3">
        <section className="rounded-3xl bg-white/90 border border-rose-100 p-4 shadow-sm">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索日记标题、正文、标签、心情"
              className="w-full rounded-2xl border border-rose-100 bg-rose-50/30 pl-9 pr-3 py-2 text-[13px] outline-none focus:border-rose-300"
            />
          </div>
        </section>

        {timelineGroups.length === 0 ? (
          <section className="rounded-3xl bg-white/80 border border-rose-100 p-6 text-center text-[13px] text-slate-500">
            还没有匹配的日记，点右下角加号写下今天吧。
          </section>
        ) : (
          timelineGroups.map((group) => (
            <section key={group.dateKey} className="rounded-3xl bg-white/88 border border-rose-100 p-4 shadow-sm">
              <h2 className="text-[13px] font-semibold text-rose-600 mb-2.5">
                {formatDateLabel(group.dateKey)}
              </h2>
              <div>
                {group.items.map((entry, index) => (
                  <div key={entry.id} className="relative pl-8 pb-5 last:pb-0">
                    <span className="absolute left-[11px] top-[9px] h-2.5 w-2.5 rounded-full bg-rose-500" />
                    {index < group.items.length - 1 ? (
                      <span className="absolute left-[16px] top-[18px] bottom-0 w-px bg-rose-200" />
                    ) : null}

                    <article className="rounded-2xl border border-rose-100 bg-white/95 px-3.5 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-slate-800 truncate">
                            {resolveEntryDisplayTitle(entry)}
                          </h3>
                          <p className="text-[12px] text-slate-500 mt-1">
                            更新于 {formatDateTime(entry.updatedAt)}
                          </p>
                        </div>
                        {entry.isSyncedToMemory ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-[11px] px-2 py-1">
                            已同步记忆
                          </span>
                        ) : null}
                      </div>

                      {entry.tags.length > 0 || entry.mood ? (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.mood ? (
                            <span className="rounded-full bg-amber-100 text-amber-700 text-[11px] px-2 py-1">
                              心情：{entry.mood}
                            </span>
                          ) : null}
                          {entry.tags.map((tag) => (
                            <span
                              key={`${entry.id}-${tag}`}
                              className="rounded-full bg-rose-100 text-rose-700 text-[11px] px-2 py-1"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p
                        className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed"
                        style={TIMELINE_PREVIEW_CLAMP_STYLE}
                      >
                        {entry.content || '（无正文）'}
                      </p>

                      {!isReadOnlyMode ? (
                        <div className="pt-1 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry.id)}
                            className="h-9 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Pencil size={13} />
                            编辑
                          </button>
                          {entry.isSyncedToMemory ? (
                            <button
                              type="button"
                              onClick={() => unsyncEntryMemory(entry.id)}
                              className="h-9 rounded-xl bg-amber-100 text-amber-700 text-[12px] font-medium hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <Brain size={13} />
                              取消同步
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => syncEntryMemory(entry.id)}
                              className="h-9 rounded-xl bg-emerald-100 text-emerald-700 text-[12px] font-medium hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1"
                            >
                              <Brain size={13} />
                              同步记忆
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="h-9 rounded-xl bg-rose-100 text-rose-700 text-[12px] font-medium hover:bg-rose-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={13} />
                            删除
                          </button>
                        </div>
                      ) : null}
                    </article>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {!isReadOnlyMode && !isEditorOpen ? (
        <button
          type="button"
          onClick={handleOpenCreateEditor}
          className="absolute right-5 bottom-8 z-[90] h-14 w-14 rounded-full bg-rose-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.35)] grid place-items-center active:scale-95 transition-transform"
          aria-label="添加日记"
        >
          <Plus size={24} />
        </button>
      ) : null}

      {isEditorOpen ? (
        <div className="absolute inset-0 z-[120] flex flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-orange-50">
          <header className="sticky top-0 z-20 shrink-0 pt-11 px-3 pb-3 bg-white/70 border-b border-rose-100 backdrop-blur">
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleCloseEditor}
                className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
                aria-label="返回"
              >
                <ChevronLeft size={26} />
              </button>
              <div className="flex-1 text-center pr-10">
                <h2 className="text-[19px] font-semibold tracking-wide">{editorTitle}</h2>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <section className="rounded-3xl bg-white/92 border border-rose-100 p-4 shadow-sm space-y-3">
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft({ title: event.target.value })}
                placeholder="标题（可选）"
                className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[14px] outline-none focus:border-rose-300"
              />
              <textarea
                value={draft.content}
                onChange={(event) => setDraft({ content: event.target.value })}
                placeholder="今天发生了什么？想记录什么？"
                className="w-full min-h-[230px] rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-rose-300 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.mood}
                  onChange={(event) => setDraft({ mood: event.target.value })}
                  placeholder="心情（如：平静）"
                  className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
                />
                <input
                  type="text"
                  value={draft.tagsInput}
                  onChange={(event) => setDraft({ tagsInput: event.target.value })}
                  placeholder="标签，逗号分隔"
                  className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
                />
              </div>
            </section>
          </main>

          <footer className="px-4 pb-5 pt-2 border-t border-rose-100 bg-white/80 backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCloseEditor}
                className="h-11 rounded-2xl bg-slate-100 text-slate-700 text-[14px] font-semibold hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitDraft}
                disabled={!draftCanSubmit}
                className={`h-11 rounded-2xl text-[14px] font-semibold transition-colors ${
                  draftCanSubmit
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                保存日记
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </motion.div>
  );
};

export type { DailyWordsAppProps };
