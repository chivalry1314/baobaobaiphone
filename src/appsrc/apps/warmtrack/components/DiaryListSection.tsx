import React, { useMemo } from 'react';
import { BookText } from 'lucide-react';
import { buildDiarySummary } from '../diary';
import { compareDateKeys, formatMonthDay } from '../utils';

interface DiaryListSectionProps {
  diaryRecords: Record<string, string>;
  onOpenDiary: (dateKey: string) => void;
}

export const DiaryListSection: React.FC<DiaryListSectionProps> = ({ diaryRecords, onOpenDiary }) => {
  const diaryItems = useMemo(
    () =>
      Object.entries(diaryRecords)
        .map(([dateKey, text]) => ({
          dateKey,
          text,
        }))
        .filter((item) => item.text.trim().length > 0)
        .sort((left, right) => compareDateKeys(right.dateKey, left.dateKey)),
    [diaryRecords]
  );

  if (diaryItems.length === 0) {
    return (
      <section className="px-3 pt-4">
        <div className="rounded-3xl bg-white border border-rose-100/70 p-8 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-[#ec609a] grid place-items-center">
            <BookText size={22} />
          </span>
          <p className="mt-3 text-[17px] font-semibold text-slate-900">还没有日记</p>
          <p className="mt-1 text-[14px] text-slate-500">在“记录”页点击日记按钮，写下第一条记录吧。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-3 pt-4 pb-4">
      <div className="rounded-3xl bg-white border border-rose-100/70 p-4">
        <h3 className="text-[20px] font-semibold text-slate-900">全部日记</h3>
        <p className="mt-1 text-[13px] text-slate-500">共 {diaryItems.length} 条</p>

        <div className="mt-3 space-y-2.5">
          {diaryItems.map((item) => (
            <button
              key={item.dateKey}
              type="button"
              onClick={() => onOpenDiary(item.dateKey)}
              className="w-full text-left rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 active:scale-[0.995] transition-transform"
            >
              <p className="text-[14px] font-semibold text-[#e45191]">{formatMonthDay(item.dateKey)}</p>
              <p className="mt-1 text-[14px] text-slate-700">{buildDiarySummary(item.text, 42)}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
