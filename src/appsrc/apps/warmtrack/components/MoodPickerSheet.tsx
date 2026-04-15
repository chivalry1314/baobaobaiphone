import React, { useMemo, useState } from 'react';
import { DEFAULT_MOOD_OPTIONS, type MoodOption } from '../moods';

interface MoodPickerSheetProps {
  selectedMoodId: string | null;
  onCancel: () => void;
  onConfirm: (moodId: string | null) => void;
}

const renderMoodCircle = (option: MoodOption, selected: boolean) => (
  <span
    className={`w-14 h-14 rounded-full grid place-items-center text-[30px] transition-all ${
      selected
        ? 'bg-gradient-to-br from-[#ff7eb4] to-[#ff4f93] shadow-[0_10px_20px_-12px_rgba(244,77,143,0.55)] scale-[1.04]'
        : 'bg-gradient-to-br from-[#fff5c9] to-[#ffeaa4]'
    }`}
  >
    {option.icon}
  </span>
);

export const MoodPickerSheet: React.FC<MoodPickerSheetProps> = ({ selectedMoodId, onCancel, onConfirm }) => {
  const [draftMoodId, setDraftMoodId] = useState<string | null>(selectedMoodId);
  const selectedMood = useMemo(
    () => DEFAULT_MOOD_OPTIONS.find((option) => option.id === draftMoodId) ?? null,
    [draftMoodId]
  );

  return (
    <div className="absolute inset-0 z-[70] bg-black/20">
      <button type="button" aria-label="关闭心情选择弹窗" onClick={onCancel} className="absolute inset-0" />

      <section className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-white border-t border-rose-100 shadow-[0_-14px_34px_-28px_rgba(15,23,42,0.3)]">
        <header className="h-14 px-4 flex items-center">
          <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
            取消
          </button>
          <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">心情</h2>
          <button type="button" onClick={() => onConfirm(draftMoodId)} className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70">
            确定
          </button>
        </header>

        <div className="mx-3 mb-4 rounded-[24px] bg-[#f8f8fa] border border-slate-100 px-2 py-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-5 gap-y-4">
            {DEFAULT_MOOD_OPTIONS.map((option) => {
              const selected = draftMoodId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraftMoodId((current) => (current === option.id ? null : option.id))}
                  className="flex flex-col items-center text-center active:scale-95 transition-transform"
                >
                  {renderMoodCircle(option, selected)}
                  <span className={`mt-1.5 text-[11px] leading-tight ${selected ? 'text-[#e95493] font-semibold' : 'text-slate-800'}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-6 -mt-1">
          <p className="text-[12px] text-slate-500">
            {selectedMood ? `已选：${selectedMood.icon} ${selectedMood.label}` : '未选择心情，点击任意心情可记录'}
          </p>
        </div>
      </section>
    </div>
  );
};
