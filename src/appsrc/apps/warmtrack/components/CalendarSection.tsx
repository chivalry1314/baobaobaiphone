import React from 'react';
import { ChevronLeft, ChevronRight, Play, Square } from 'lucide-react';
import type { CalendarCell, CycleType, PredictionModel } from '../types';
import {
  CALENDAR_FONT_STACK,
  WEEKDAY_LABELS,
  formatMonthDay,
  resolveDayTextClass,
} from '../utils';
import { getConfidenceLabel } from '../prediction';

interface CalendarSectionProps {
  monthLabel: string;
  monthRows: CalendarCell[][];
  predictionModel: PredictionModel | null;
  onSwitchMonth: (offset: number) => void;
  onSelectDate: (dateKey: string) => void;
}

const CYCLE_LEGENDS: Array<{ key: CycleType; label: string; dotClass: string }> = [
  { key: 'period', label: '月经期', dotClass: 'bg-[#f55a94]' },
  { key: 'predicted', label: '预测经期', dotClass: 'bg-[#f7c8dc]' },
  { key: 'ovulation-window', label: '排卵期', dotClass: 'bg-[#66cbbf]' },
  { key: 'ovulation-day', label: '排卵日', dotClass: 'bg-[#8f66ea]' },
];

const resolveDayCardClass = (cycleType: CycleType): string => {
  if (cycleType === 'period') return 'bg-[#f24f8f] border-[#f24f8f]';
  if (cycleType === 'predicted') return 'bg-[#fde8f1] border-[#f8d4e4]';
  if (cycleType === 'ovulation-day') return 'bg-[#efe7ff] border-[#dac8ff]';
  if (cycleType === 'ovulation-window') return 'bg-[#e9fbf8] border-[#c7eee8]';
  return 'bg-white border-transparent';
};

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  monthLabel,
  monthRows,
  predictionModel,
  onSwitchMonth,
  onSelectDate,
}) => (
  <section className="bg-white border-b border-slate-100" style={{ fontFamily: CALENDAR_FONT_STACK }}>
    <div className="border-b border-slate-100 px-3 pt-2 pb-2">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onSwitchMonth(-1)}
          className="w-8 h-8 rounded-full border border-rose-100 bg-white text-slate-500 grid place-items-center active:scale-95 transition-transform"
          aria-label="上个月"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[18px] font-semibold tabular-nums tracking-[0.01em] text-slate-700 min-w-16 text-center">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => onSwitchMonth(1)}
          className="w-8 h-8 rounded-full border border-rose-100 bg-white text-slate-500 grid place-items-center active:scale-95 transition-transform"
          aria-label="下个月"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[12px] font-medium tracking-[0.04em] text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>

    <div className="border-t border-slate-100">
      {monthRows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className={`grid grid-cols-7 ${rowIndex !== 0 ? 'border-t border-slate-100' : ''}`}>
          {row.map((cell) => {
            if (!cell.dateKey || cell.day === null) {
              return <div key={cell.key} className="h-[78px]" />;
            }

            const selectedDayClass = cell.isSelected
              ? 'ring-2 ring-[#dd3f49] ring-inset'
              : cell.isToday
                ? 'ring-1 ring-[#f0c3d8] ring-inset'
                : '';

            return (
              <div key={cell.key} className="h-[78px] px-1 py-1">
                <button
                  type="button"
                  onClick={() => onSelectDate(cell.dateKey as string)}
                  className={`relative w-full h-full rounded-2xl border ${resolveDayCardClass(cell.cycleType)} ${selectedDayClass} flex flex-col items-center justify-center`}
                >
                  {cell.isPeriodStart || cell.isPeriodEnd ? (
                    <span className="absolute left-1.5 top-1 inline-flex items-center gap-1">
                      {cell.isPeriodStart ? (
                        <Play size={8} strokeWidth={2.4} className="text-[#ffd33d] fill-[#ffd33d]" />
                      ) : null}
                      {cell.isPeriodEnd ? (
                        <Square size={8} strokeWidth={2.4} className="text-[#ffd33d] fill-[#ffd33d]" />
                      ) : null}
                    </span>
                  ) : null}

                  <span className={`text-[20px] leading-none font-semibold tabular-nums ${resolveDayTextClass(cell.cycleType)}`}>
                    {cell.day}
                  </span>

                  {cell.isToday ? (
                    <span className="mt-0.5 text-[11px] font-medium leading-none tracking-[0.02em] text-[#31b874]">今天</span>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>

    <div className="px-3 py-2 flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-slate-500">
        {CYCLE_LEGENDS.map((legend) => (
          <span key={legend.key} className="inline-flex items-center gap-1.5">
            <span className={`w-3.5 h-3.5 rounded-[4px] ${legend.dotClass}`} />
            {legend.label}
          </span>
        ))}
      </div>
      <ChevronRight size={20} className="text-slate-300" />
    </div>

    <div className="px-3 pb-3">
      {predictionModel ? (
        <div className="rounded-2xl border border-rose-100 bg-[#fff7fb] px-3 py-2.5">
          <p className="text-[14px] font-semibold text-[#d84a86]">
            下次经期：{formatMonthDay(predictionModel.nextPeriodStartKey)} - {formatMonthDay(predictionModel.nextPeriodEndKey)}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            预测周期 {predictionModel.cycleLength} 天，经期 {predictionModel.periodLength} 天，可信度
            {getConfidenceLabel(predictionModel.confidence)}（样本 {predictionModel.cycleSamples} 次）
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
          再记录至少 2 次经期开始日期后，将自动生成经期预测和排卵预测。
        </div>
      )}
    </div>
  </section>
);
