import React, { useMemo, useState } from 'react';
import { DEFAULT_DISCHARGE_OPTIONS, type DischargeOption } from '../discharge';

interface DischargePickerSheetProps {
  selectedDischargeId: string | null;
  onCancel: () => void;
  onConfirm: (dischargeId: string | null) => void;
}

const renderDischargeGlyph = (iconType: DischargeOption['iconType']) => {
  if (iconType === 'dry') {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <circle cx="16" cy="22" r="5" fill="white" fillOpacity="0.9" />
        <circle cx="24" cy="20" r="7" fill="white" fillOpacity="0.78" />
        <circle cx="33" cy="25" r="4.5" fill="white" fillOpacity="0.85" />
      </svg>
    );
  }

  if (iconType === 'sticky') {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect x="10" y="18" width="28" height="12" rx="6" fill="white" fillOpacity="0.88" />
      </svg>
    );
  }

  if (iconType === 'mushy') {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <path
          d="M11 16h22c2.5 0 4.5 2 4.5 4.5v1.2c0 2-1.6 3.6-3.6 3.6h-9.2v7.5c0 2.7-2.2 4.8-4.8 4.8h-.2c-2.7 0-4.8-2.2-4.8-4.8V25h-3.9c-1.7 0-3-1.3-3-3v-2c0-2.2 1.8-4 4-4z"
          fill="white"
          fillOpacity="0.86"
        />
      </svg>
    );
  }

  if (iconType === 'watery') {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <path d="M10 21c0-2.2 1.8-4 4-4h18c2.2 0 4 1.8 4 4s-1.8 4-4 4H14c-2.2 0-4-1.8-4-4z" fill="white" fillOpacity="0.82" />
        <path d="M27 24.5v7.2c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-2-1.5-3.8-4.3-6.3l-1.6-1.4-1.5 1.5c-.5.5-1 .9-1.6 1.4z" fill="white" fillOpacity="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <path
        d="M8.5 21.5c0-3 2.4-5.5 5.5-5.5h19c3 0 5.5 2.4 5.5 5.5S36 27 33 27h-6v6.8c0 2.8-2.2 5.1-5 5.1s-5-2.3-5-5.1V27h-3c-3.1 0-5.5-2.5-5.5-5.5z"
        fill="white"
        fillOpacity="0.88"
      />
      <path d="M30 27v4.2c0 2 1.6 3.5 3.6 3.5s3.6-1.6 3.6-3.5c0-1.6-1.3-3-3.6-5.2L32 24.6 30 27z" fill="white" fillOpacity="0.94" />
    </svg>
  );
};

const renderDischargeIcon = (option: DischargeOption, selected: boolean) => (
  <span
    className={`w-14 h-14 rounded-full grid place-items-center ${
      selected
        ? 'bg-gradient-to-br from-[#ff7eb4] to-[#ff4f93] shadow-[0_12px_24px_-15px_rgba(244,77,143,0.65)]'
        : 'bg-gradient-to-br from-[#ffcae0] to-[#f88ab8]'
    }`}
  >
    {renderDischargeGlyph(option.iconType)}
  </span>
);

const renderRadio = (selected: boolean) => (
  <span
    className={`w-8 h-8 rounded-full border-2 grid place-items-center ${
      selected ? 'border-[#f24f8f] bg-white' : 'border-slate-300 bg-white'
    }`}
  >
    {selected ? <span className="w-3.5 h-3.5 rounded-full bg-[#f24f8f]" /> : null}
  </span>
);

export const DischargePickerSheet: React.FC<DischargePickerSheetProps> = ({ selectedDischargeId, onCancel, onConfirm }) => {
  const [draftDischargeId, setDraftDischargeId] = useState<string | null>(selectedDischargeId);
  const selectedOption = useMemo(
    () => DEFAULT_DISCHARGE_OPTIONS.find((option) => option.id === draftDischargeId) ?? null,
    [draftDischargeId]
  );

  return (
    <div className="absolute inset-0 z-[70] bg-black/20">
      <button type="button" aria-label="关闭白带选择弹窗" onClick={onCancel} className="absolute inset-0" />

      <section className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#f2f2f5] border-t border-rose-100 shadow-[0_-14px_34px_-28px_rgba(15,23,42,0.3)]">
        <header className="h-14 px-4 bg-white rounded-t-[28px] flex items-center">
          <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
            取消
          </button>
          <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">白带</h2>
          <button
            type="button"
            onClick={() => onConfirm(draftDischargeId)}
            className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70"
          >
            确定
          </button>
        </header>

        <div className="px-3 pb-4 max-h-[62vh] overflow-y-auto">
          <div className="space-y-3 pt-3">
            {DEFAULT_DISCHARGE_OPTIONS.map((option) => {
              const selected = draftDischargeId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraftDischargeId((current) => (current === option.id ? null : option.id))}
                  className="w-full rounded-3xl bg-white border border-slate-100 px-3 py-3.5 flex items-center gap-3 active:scale-[0.995] transition-transform"
                >
                  {renderDischargeIcon(option, selected)}
                  <span className="min-w-0 flex-1 text-left">
                    <span className={`block text-[20px] font-semibold ${selected ? 'text-[#e95493]' : 'text-slate-900'}`}>{option.label}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-slate-500">{option.description}</span>
                  </span>
                  {renderRadio(selected)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-6 -mt-1">
          <p className="text-[12px] text-slate-500">{selectedOption ? `已选：${selectedOption.label}` : '未选择白带状态，点击任意项可记录'}</p>
        </div>
      </section>
    </div>
  );
};
