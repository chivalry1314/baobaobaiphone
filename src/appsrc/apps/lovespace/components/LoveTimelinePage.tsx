import React from 'react';

import { ChevronLeft, Clock3, Heart } from 'lucide-react';
import { motion } from 'motion/react';

import {
  DEFAULT_APP_MEMORY_ROLE_ID,
  DEFAULT_APP_MEMORY_SPACE,
  type AppMemoryRecord,
} from '../../../../core/appMemory';
import { getAppMemoryModule } from '../../../../core/appMemoryRegistry';
import { getAppById } from '../../../../core/registry';

import { LOVE_SPACE_TEXT } from '../constants';
import type { LoveImportantTimelineEvent } from '../importantTimeline';
import { useLoveSpaceStore } from '../store';
import type { BondCardData } from '../types';

type LoveTimelineRecord = AppMemoryRecord | LoveImportantTimelineEvent;

interface LoveTimelinePageProps {
  card: BondCardData;
  onBack: () => void;
  timelineRecords?: LoveTimelineRecord[];
}

const EMPTY_TIMELINE_RECORDS: LoveTimelineRecord[] = [];

const formatTimelineDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });

const formatTimelineTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const toResolvableMemoryRecord = (record: LoveTimelineRecord): AppMemoryRecord => {
  if ('roleId' in record && 'space' in record) {
    return record;
  }

  return {
    id: record.id,
    appId: record.appId,
    roleId: DEFAULT_APP_MEMORY_ROLE_ID,
    space: DEFAULT_APP_MEMORY_SPACE,
    contactId: record.contactId,
    sourceId: 'sourceRecordId' in record ? record.sourceRecordId : undefined,
    sourceType: record.sourceType,
    role: record.role,
    content: record.content,
    timestamp: record.timestamp,
  };
};

const resolveSourceText = (record: LoveTimelineRecord): string => {
  if (record.sourceType === 'memory-summary') return LOVE_SPACE_TEXT.timelineSummarySource;
  const appMemoryModule = getAppMemoryModule(record.appId);
  const resolved = appMemoryModule?.resolveSourceLabel?.(toResolvableMemoryRecord(record));
  return resolved || record.sourceType || LOVE_SPACE_TEXT.timelineSourceFallback;
};

export const LoveTimelinePage: React.FC<LoveTimelinePageProps> = ({
  card,
  onBack,
  timelineRecords,
}) => {
  const importantTimelineRecordsFromStore = useLoveSpaceStore(
    (state) => state.importantTimelineByBond[card.bond.id] ?? EMPTY_TIMELINE_RECORDS
  );
  const importantTimelineRecords = timelineRecords ?? importantTimelineRecordsFromStore;

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute inset-0 z-50 bg-[#f5f6f8] text-slate-900 flex flex-col overflow-hidden"
    >
      <header className="bg-gradient-to-r from-[#fde7ef] to-[#fbe2eb] px-4 pt-11 pb-3 border-b border-rose-100 flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
          aria-label={LOVE_SPACE_TEXT.back}
        >
          <ChevronLeft size={26} />
        </button>
        <h2 className="text-[20px] font-semibold tracking-wide">{LOVE_SPACE_TEXT.timelinePageTitle}</h2>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5">
        <section className="rounded-[20px] border border-rose-100/80 bg-white px-4 py-3 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.28)]">
          <p className="text-[15px] text-slate-700">
            {LOVE_SPACE_TEXT.timelineSubtitlePrefix}
            <span className="mx-1 font-semibold text-slate-900">{card.contact.name}</span>
            {LOVE_SPACE_TEXT.timelineSubtitleSuffix}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {`${importantTimelineRecords.length}${LOVE_SPACE_TEXT.timelineCountSuffix}`}
          </p>
        </section>

        {importantTimelineRecords.length === 0 ? (
          <section className="mt-4 rounded-[20px] border border-rose-100/80 bg-white px-5 py-10 text-center shadow-[0_18px_32px_-28px_rgba(15,23,42,0.26)]">
            <Clock3 size={26} className="mx-auto text-rose-300" />
            <p className="mt-3 text-[17px] font-semibold text-slate-800">
              {LOVE_SPACE_TEXT.timelineEmptyTitle}
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              {LOVE_SPACE_TEXT.timelineEmptyDescription}
            </p>
          </section>
        ) : (
          <section className="relative mt-4 pl-6">
            <div className="absolute left-[11px] top-1 bottom-1 w-[2px] rounded-full bg-rose-100" />
            <div className="space-y-3">
              {importantTimelineRecords.map((record) => {
                const appName = getAppById(record.appId)?.name || record.appId;
                const sourceLabel = resolveSourceText(record);
                const roleLabel =
                  record.role === 'user'
                    ? LOVE_SPACE_TEXT.timelineRoleMe
                    : LOVE_SPACE_TEXT.timelineRoleTa;

                return (
                  <article key={record.id} className="relative">
                    <span className="absolute -left-[18px] top-[22px] h-[10px] w-[10px] rounded-full bg-rose-300 ring-4 ring-[#fdf0f5]" />
                    <div className="rounded-[18px] border border-rose-100/80 bg-white px-3.5 py-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.28)]">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-slate-600">
                          {formatTimelineDate(record.timestamp)}
                        </span>
                        <span>{formatTimelineTime(record.timestamp)}</span>
                        <span>{`${appName} 路 ${sourceLabel}`}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-rose-400">
                          <Heart size={11} className="fill-rose-300 text-rose-300" />
                          {roleLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-[14px] leading-6 text-slate-800 whitespace-pre-wrap">
                        {'title' in record && typeof record.title === 'string' && record.title.trim()
                          ? `${record.title}\n${record.content}`
                          : record.content}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </motion.section>
  );
};
