import React, { useMemo, useState } from 'react';
import { Eraser, FileText } from 'lucide-react';
import { DIARY_MAX_LENGTH, normalizeDiaryText } from '../diary';
import { formatMonthDay, WARMTRACK_FONT_STACK } from '../utils';

interface DiaryEditorSheetProps {
  selectedDateKey: string;
  initialText: string;
  onCancel: () => void;
  onConfirm: (nextText: string | null) => void;
}

const QUICK_TAGS = ['姨妈第1天', '状态稳定', '轻微腹痛', '睡眠一般', '今天心情不错', '需要多喝水'] as const;

export const DiaryEditorSheet: React.FC<DiaryEditorSheetProps> = ({
  selectedDateKey,
  initialText,
  onCancel,
  onConfirm,
}) => {
  const [draftText, setDraftText] = useState<string>(initialText);
  const normalizedDraft = useMemo(() => normalizeDiaryText(draftText), [draftText]);

  const appendQuickTag = (tag: string) => {
    setDraftText((current) => {
      const base = current.trim();
      const next = base ? `${base}\n${tag}` : tag;
      return next.slice(0, DIARY_MAX_LENGTH);
    });
  };

  const handleConfirm = () => {
    onConfirm(normalizedDraft ? normalizedDraft : null);
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[#efeff2] pt-12 flex flex-col" style={{ fontFamily: WARMTRACK_FONT_STACK }}>
      <header className="h-14 rounded-t-3xl bg-white px-4 flex items-center border-b border-slate-100">
        <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
          取消
        </button>
        <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">日记</h2>
        <button type="button" onClick={handleConfirm} className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70">
          确定
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <section className="mt-3 rounded-3xl bg-white border border-rose-100/70 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <FileText size={16} />
            <span className="text-[13px]">记录日期：{formatMonthDay(selectedDateKey)}</span>
          </div>

          <textarea
            value={draftText}
            maxLength={DIARY_MAX_LENGTH}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="写下今天的身体状态、心情或想法..."
            className="mt-3 w-full h-44 rounded-2xl border border-rose-100 bg-[#fff9fc] px-3 py-2.5 text-[15px] leading-6 text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#f28ab4] focus:ring-2 focus:ring-[#f7d4e5] resize-none"
          />

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDraftText('')}
              className="h-8 px-2 rounded-lg text-[13px] text-slate-400 inline-flex items-center gap-1.5 active:opacity-70"
            >
              <Eraser size={14} />
              清空
            </button>
            <span className="text-[12px] text-slate-400">{draftText.length}/{DIARY_MAX_LENGTH}</span>
          </div>
        </section>

        <section className="mt-3 rounded-3xl bg-white border border-slate-100 px-3 py-4">
          <h3 className="text-[15px] font-medium text-slate-700">快捷记录</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => appendQuickTag(tag)}
                className="px-3 h-8 rounded-full border border-rose-100 bg-rose-50 text-[13px] text-[#df5e95] active:scale-[0.98] transition-transform"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
