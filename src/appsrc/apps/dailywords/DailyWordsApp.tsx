import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Brain, ChevronLeft, Pencil, Search, Trash2 } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import {
  useKeyboardTextEntryActive,
  useKeyboardViewportStabilizer,
  useMobileViewportPageStyle,
} from '../../../core/mobileViewport';
import { COMMERCE_ROLE_CHANGED_EVENT } from '../../shared/business/commerce/roleContext';
import { useRoleDisplayNameBridge } from '../../shared/business/contacts/roleDisplayNameBridge';
import { isContactRoleId } from '../../shared/business/roleIdentity';
import { clearRuntimeActiveRoleId, useRoleRuntimeStore } from '../../shared/business/roleRuntime';
import { useDailyWordsStore } from './store';
import type { DailyWordsAppProps, DailyWordsEntry } from './types';

type EditorMode = 'create' | 'edit' | null;

const FIELD_FOCUS_TOP_PADDING = 56;

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

const NOTEBOOK_GRID_BACKGROUND: CSSProperties = {
  backgroundColor: '#f8f8f6',
  backgroundImage:
    'linear-gradient(rgba(148,163,184,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.28) 1px, transparent 1px)',
  backgroundSize: '58px 58px',
  backgroundPosition: '-1px -1px',
};

const PAPER_CARD_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(255,255,250,0.98), rgba(248,248,243,0.96))',
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
  const hasSearchKeyword = searchKeyword.trim().length > 0;

  const draftCanSubmit = useMemo(() => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    return Boolean(title || content);
  }, [draft.content, draft.title]);

  const isEditorOpen = editorMode !== null;
  const editorTitle = editorMode === 'edit' ? '编辑日记' : '新建日记';
  const viewportPageStyle = useMobileViewportPageStyle(!isEditorOpen);
  const editorPageStyle = useMobileViewportPageStyle(false);
  const shouldHideEditorFooter = useKeyboardTextEntryActive(isEditorOpen);
  const editorScrollRef = React.useRef<HTMLElement | null>(null);
  const sealViewportHeightRef = React.useRef<number | null>(null);
  const [sealKeyboardOffset, setSealKeyboardOffset] = useState(0);
  useKeyboardViewportStabilizer(isEditorOpen, editorScrollRef, {
    topPadding: FIELD_FOCUS_TOP_PADDING,
    bottomPadding: 28,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    sealViewportHeightRef.current = window.innerHeight;

    const syncSealPosition = () => {
      const baseHeight = sealViewportHeightRef.current || window.innerHeight;
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const keyboardOffset = Math.max(0, Math.round(baseHeight - currentHeight));
      setSealKeyboardOffset(keyboardOffset);
    };

    window.visualViewport?.addEventListener('resize', syncSealPosition);
    window.visualViewport?.addEventListener('scroll', syncSealPosition);
    window.addEventListener('resize', syncSealPosition);
    return () => {
      window.visualViewport?.removeEventListener('resize', syncSealPosition);
      window.visualViewport?.removeEventListener('scroll', syncSealPosition);
      window.removeEventListener('resize', syncSealPosition);
    };
  }, []);

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
      className="absolute left-0 right-0 z-50 flex min-h-0 flex-col overflow-hidden text-slate-800"
      style={{ ...NOTEBOOK_GRID_BACKGROUND, ...viewportPageStyle }}
    >
      <header className="sticky top-0 z-20 shrink-0 pt-11 px-3 pb-3 backdrop-blur-[1px]">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 grid place-items-center text-slate-700/75 active:scale-95 transition-transform"
            aria-label="返回"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-[20px] font-semibold tracking-wide text-neutral-950">日记心语</h1>
            <p className="text-[12px] text-neutral-700 mt-0.5">当前身份：{roleDisplayName}</p>
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-5">
        <section className="rounded-[30px] border border-neutral-200 bg-[#f8f8f6]/92 p-4">
          <div className="relative">
            <Search size={28} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索日记标题、正文、标签、心情"
              className="h-14 w-full rounded-[24px] border border-neutral-300 bg-white/55 pl-14 pr-4 text-[15px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </div>
        </section>

        {timelineGroups.length === 0 && hasSearchKeyword ? null : timelineGroups.length === 0 ? (
          <div className="relative mx-0 mt-4 h-[260px]">
            <div
              className="absolute left-3 right-0 top-7 h-[205px] rotate-[4deg] rounded-[12px] border border-neutral-300/90"
              style={{
                ...PAPER_CARD_STYLE,
                background: 'linear-gradient(180deg, rgba(249,249,246,0.98), rgba(242,242,238,0.98))',
              }}
            />
            <div
              className="absolute -left-1 right-2 top-4 h-[212px] rotate-[-2deg] rounded-[12px] border border-neutral-300/90"
              style={{
                ...PAPER_CARD_STYLE,
                background: 'linear-gradient(180deg, rgba(255,255,251,0.98), rgba(246,246,241,0.98))',
              }}
            />
            <section
              className="absolute inset-x-0 top-0 rotate-[-3deg] rounded-[13px] border border-neutral-300 px-7 py-5 text-neutral-900"
              style={{
                ...PAPER_CARD_STYLE,
              }}
            >
              <div className="pointer-events-none absolute left-2.5 top-4 flex flex-col gap-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-3 w-3 rounded-full border border-neutral-400/70 bg-neutral-200"
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute right-2.5 top-4 flex flex-col gap-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-3 w-3 rounded-full border border-neutral-400/70 bg-neutral-200"
                  />
                ))}
              </div>
              <div className="border border-neutral-500/75 px-5 py-4">
                <h2 className="border-b border-neutral-400/70 pb-2 text-[16px] font-semibold tracking-[0.08em]">
                  记事本
                </h2>
                <p className="mt-8 text-[14px] leading-[1.8] tracking-[0.08em]">
                  还没有匹配的日记，点击右下角加号写下今天吧。+
                </p>
                <p className="mt-5 text-right text-[12px] text-neutral-500">#PROMPT_002</p>
              </div>
            </section>
          </div>
        ) : (
          timelineGroups.map((group) => (
            <section key={group.dateKey} className="relative mx-0 pt-2">
              <h2 className="mb-4 pl-2 text-[18px] font-semibold tracking-[0.08em] text-neutral-800">
                {formatDateLabel(group.dateKey)}
              </h2>
              <div className="space-y-8">
                {group.items.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative mx-1"
                    style={{
                      marginLeft: `${index % 3 === 1 ? 12 : index % 3 === 2 ? 22 : 2}px`,
                      marginRight: `${index % 3 === 1 ? 20 : index % 3 === 2 ? 6 : 14}px`,
                      transform: `rotate(${index % 2 === 0 ? -1.1 : 1.2}deg)`,
                    }}
                  >
                    <div
                      className="absolute inset-0 translate-x-3 translate-y-2 rotate-[2.4deg] rounded-[12px] border border-neutral-300/90"
                      style={{
                        ...PAPER_CARD_STYLE,
                        background: 'linear-gradient(180deg, rgba(249,249,246,0.98), rgba(242,242,238,0.98))',
                      }}
                    />
                    <div
                      className="absolute inset-0 -translate-x-2 translate-y-1 rotate-[-1.8deg] rounded-[12px] border border-neutral-300/90"
                      style={{
                        ...PAPER_CARD_STYLE,
                        background: 'linear-gradient(180deg, rgba(255,255,251,0.98), rgba(246,246,241,0.98))',
                      }}
                    />
                    <article
                      className="relative rounded-[12px] border border-neutral-400/80 px-10 py-4 text-neutral-900"
                      style={PAPER_CARD_STYLE}
                    >
                      <div className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-3">
                        {Array.from({ length: 6 }).map((_, dotIndex) => (
                          <span
                            key={dotIndex}
                            className="h-2.5 w-2.5 rounded-full border border-neutral-400/75 bg-neutral-200/95"
                          />
                        ))}
                      </div>
                      <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-3">
                        {Array.from({ length: 6 }).map((_, dotIndex) => (
                          <span
                            key={dotIndex}
                            className="h-2.5 w-2.5 rounded-full border border-neutral-400/75 bg-neutral-200/95"
                          />
                        ))}
                      </div>
                      <div className="space-y-2 border border-neutral-500/55 bg-white/18 px-4 py-3">
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
                              className="rounded-full bg-red-50 text-red-800 text-[11px] px-2 py-1"
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
                            className="h-9 rounded-xl bg-red-50 text-red-800 text-[12px] font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={13} />
                            删除
                          </button>
                        </div>
                        ) : null}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {!isReadOnlyMode && !isEditorOpen && !hasSearchKeyword ? (
        <button
          type="button"
          onClick={handleOpenCreateEditor}
          className="fixed left-1/2 z-[90] h-14 w-14 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_34%_25%,#dc4a43_0%,#b91c1c_45%,#7f1d1d_78%,#4b0b0b_100%)] text-red-100 shadow-[inset_0_3px_5px_rgba(255,255,255,0.3),inset_0_-8px_12px_rgba(69,10,10,0.58)] grid place-items-center active:scale-95 transition-transform"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
            transform: `translate(-50%, ${sealKeyboardOffset}px)`,
          }}
          aria-label="添加日记"
        >
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_34%_24%,#d9463f_0%,#b91c1c_44%,#7f1d1d_80%,#4b0b0b_100%)]" />
          <span className="absolute inset-[9px] rounded-full bg-[radial-gradient(circle_at_48%_58%,#8f1616_0%,#a91b1b_54%,#d64b43_100%)] shadow-[inset_0_4px_7px_rgba(69,10,10,0.78),inset_0_-2px_3px_rgba(255,255,255,0.18)]" />
          <span className="absolute inset-[15px] rounded-full border border-red-950/35" />
          <span className="absolute left-1/2 top-1/2 z-10 h-[24px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/45" />
          <span className="absolute left-1/2 top-1/2 z-10 h-[2px] w-[24px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-950/45" />
        </button>
      ) : null}

      {isEditorOpen ? (
        <div
          className="absolute left-0 right-0 z-[120] flex min-h-0 flex-col overflow-hidden"
          style={{ ...NOTEBOOK_GRID_BACKGROUND, ...editorPageStyle }}
        >
          <header className="sticky top-0 z-20 shrink-0 pt-11 px-3 pb-3 bg-white/45 border-b border-neutral-200 backdrop-blur">
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

          <main
            ref={editorScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ scrollPaddingTop: FIELD_FOCUS_TOP_PADDING }}
          >
            <section className="rounded-[22px] border border-neutral-300 p-4 space-y-3" style={PAPER_CARD_STYLE}>
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft({ title: event.target.value })}
                placeholder="标题（可选）"
                className="w-full rounded-2xl border border-neutral-300 bg-white/55 px-3 py-2.5 text-[14px] outline-none focus:border-neutral-400"
              />
              <textarea
                value={draft.content}
                onChange={(event) => setDraft({ content: event.target.value })}
                placeholder="今天发生了什么？想记录什么？"
                className="w-full min-h-[230px] rounded-2xl border border-neutral-300 bg-white/55 px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-neutral-400 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.mood}
                  onChange={(event) => setDraft({ mood: event.target.value })}
                  placeholder="心情（如：平静）"
                  className="w-full rounded-2xl border border-neutral-300 bg-white/55 px-3 py-2.5 text-[13px] outline-none focus:border-neutral-400"
                />
                <input
                  type="text"
                  value={draft.tagsInput}
                  onChange={(event) => setDraft({ tagsInput: event.target.value })}
                  placeholder="标签，逗号分隔"
                  className="w-full rounded-2xl border border-neutral-300 bg-white/55 px-3 py-2.5 text-[13px] outline-none focus:border-neutral-400"
                />
              </div>
            </section>
          </main>

          <footer
            className={
              shouldHideEditorFooter
                ? 'shrink-0 h-0 overflow-hidden border-0 bg-white/80 px-0 pt-0 backdrop-blur'
                : 'shrink-0 px-4 pb-5 pt-2 border-t border-neutral-200 bg-white/65 backdrop-blur'
            }
            style={{
              paddingBottom: shouldHideEditorFooter ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            {!shouldHideEditorFooter ? (
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
                      ? 'bg-red-800 text-white hover:bg-red-900'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  保存日记
                </button>
              </div>
            ) : null}
          </footer>
        </div>
      ) : null}
    </motion.div>
  );
};

export type { DailyWordsAppProps };
