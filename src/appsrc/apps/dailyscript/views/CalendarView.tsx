import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarDayCell } from '../utils';

interface CalendarViewProps {
  monthCursor: Date;
  weekdayLabels: string[];
  calendarCells: CalendarDayCell[];
  selectedRolePlanCountByDate: Map<string, number>;
  todayDateKey: string;
  onOpenDateSettings: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  formatMonthLabel: (monthCursor: Date) => string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  monthCursor,
  weekdayLabels,
  calendarCells,
  selectedRolePlanCountByDate,
  todayDateKey,
  onOpenDateSettings,
  onPrevMonth,
  onNextMonth,
  formatMonthLabel,
}) => {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 grid place-items-center"
          aria-label="上个月"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-[15px] font-semibold text-slate-800 flex items-center gap-1.5">
          <CalendarDays size={15} className="text-indigo-500" />
          {formatMonthLabel(monthCursor)}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 grid place-items-center"
          aria-label="下个月"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((label) => (
          <div key={label} className="h-7 text-[11px] text-slate-500 grid place-items-center">
            {label}
          </div>
        ))}
        {calendarCells.map((cell) => {
          const planCount = selectedRolePlanCountByDate.get(cell.dateKey) || 0;
          const isToday = cell.dateKey === todayDateKey;
          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onOpenDateSettings(cell.dateKey)}
              className={`relative min-h-[54px] rounded-xl border px-1.5 py-1 text-left ${
                cell.inCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-100/60 border-slate-200'
              } ${isToday ? 'ring-1 ring-indigo-300' : ''}`}
            >
              <div className={`text-[12px] ${cell.inCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                {cell.date.getDate()}
              </div>
              {planCount > 0 ? (
                <span className="mt-1 inline-flex rounded-full bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5">
                  {planCount}个
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
