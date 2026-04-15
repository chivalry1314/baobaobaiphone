import React, { useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import { digitsToTemperatureValue, formatTemperatureDigits, temperatureToDigits } from '../temperature';
import { CALENDAR_FONT_STACK, WARMTRACK_FONT_STACK } from '../utils';

interface TemperaturePickerSheetProps {
  selectedTemperature: number | null;
  onCancel: () => void;
  onConfirm: (temperature: number) => void;
}

const KEYPAD_ROWS: Array<Array<{ key: string; value: string; kind: 'digit' | 'backspace' | 'empty' }>> = [
  [
    { key: '1', value: '1', kind: 'digit' },
    { key: '2', value: '2', kind: 'digit' },
    { key: '3', value: '3', kind: 'digit' },
  ],
  [
    { key: '4', value: '4', kind: 'digit' },
    { key: '5', value: '5', kind: 'digit' },
    { key: '6', value: '6', kind: 'digit' },
  ],
  [
    { key: '7', value: '7', kind: 'digit' },
    { key: '8', value: '8', kind: 'digit' },
    { key: '9', value: '9', kind: 'digit' },
  ],
  [
    { key: 'empty', value: '', kind: 'empty' },
    { key: '0', value: '0', kind: 'digit' },
    { key: 'backspace', value: '', kind: 'backspace' },
  ],
];

export const TemperaturePickerSheet: React.FC<TemperaturePickerSheetProps> = ({
  selectedTemperature,
  onCancel,
  onConfirm,
}) => {
  const [draftDigits, setDraftDigits] = useState<string>(() => temperatureToDigits(selectedTemperature));
  const displayValue = useMemo(() => formatTemperatureDigits(draftDigits), [draftDigits]);
  const draftTemperature = useMemo(() => digitsToTemperatureValue(draftDigits), [draftDigits]);

  const appendDigit = (digit: string) => {
    setDraftDigits((current) => {
      const normalizedCurrent = current || '0';
      if (normalizedCurrent.length >= 3 && normalizedCurrent !== '0') return normalizedCurrent;
      if (normalizedCurrent === '0') return digit;
      return `${normalizedCurrent}${digit}`;
    });
  };

  const backspace = () => {
    setDraftDigits((current) => {
      if (!current || current === '0') return '0';
      if (current.length === 1) return '0';
      return current.slice(0, -1);
    });
  };

  const handleConfirm = () => {
    onConfirm(draftTemperature ?? 0);
  };

  return (
    <div className="absolute inset-0 z-[70] bg-black/20">
      <button type="button" aria-label="关闭体温输入弹窗" onClick={onCancel} className="absolute inset-0" />

      <section
        className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#efeff2] border-t border-rose-100 shadow-[0_-14px_34px_-28px_rgba(15,23,42,0.3)]"
        style={{ fontFamily: WARMTRACK_FONT_STACK }}
      >
        <header className="h-14 px-4 bg-white rounded-t-[28px] flex items-center">
          <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
            取消
          </button>
          <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">体温</h2>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70"
          >
            确定
          </button>
        </header>

        <div className="px-3 pt-3 pb-2">
          <div className="h-[188px] rounded-3xl border border-slate-200 bg-white/80 flex items-center justify-center">
            <span
              className="text-[74px] leading-none font-medium tracking-[0.02em] tabular-nums text-slate-400"
              style={{ fontFamily: CALENDAR_FONT_STACK }}
            >
              {displayValue}
            </span>
            <span className="ml-2 text-[46px] leading-none font-medium text-slate-400">℃</span>
          </div>
        </div>

        <div className="px-2 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {KEYPAD_ROWS.flatMap((row) =>
              row.map((key) => {
                if (key.kind === 'empty') {
                  return <span key={key.key} className="h-[64px]" />;
                }

                if (key.kind === 'backspace') {
                  return (
                    <button
                      key={key.key}
                      type="button"
                      onClick={backspace}
                      className="h-[64px] rounded-2xl bg-white border border-slate-200 text-slate-600 grid place-items-center active:scale-[0.99] transition-transform"
                      aria-label="删除一位"
                    >
                      <Delete size={26} />
                    </button>
                  );
                }

                return (
                  <button
                    key={key.key}
                    type="button"
                    onClick={() => appendDigit(key.value)}
                    className="h-[64px] rounded-2xl bg-white border border-slate-200 text-[36px] leading-none font-light text-slate-700 active:scale-[0.99] transition-transform"
                  >
                    {key.value}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
