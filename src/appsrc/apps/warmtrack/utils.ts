import type { CalendarCell, CycleType, DateKey, PeriodRange, PredictionDaySets } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

export const WARMTRACK_FONT_STACK =
  '"HarmonyOS Sans SC", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export const CALENDAR_FONT_STACK =
  '"SF Pro Display", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export const padTwo = (value: number): string => value.toString().padStart(2, '0');

export const toDateKey = (date: Date): DateKey =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;

export const parseDateKey = (value: string): Date | null => {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
};

export const isValidDateKey = (value: string): value is DateKey => parseDateKey(value) !== null;

export const getTodayDateKey = (): DateKey => toDateKey(new Date());

export const getMonthStartKey = (dateKey: DateKey): DateKey => {
  const date = parseDateKey(dateKey);
  if (!date) return getTodayDateKey();
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
};

export const switchMonthKey = (monthCursorKey: DateKey, offset: number): DateKey => {
  const cursor = parseDateKey(monthCursorKey);
  if (!cursor) return getMonthStartKey(getTodayDateKey());
  return toDateKey(new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1));
};

export const addDaysToDateKey = (dateKey: DateKey, days: number): DateKey => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};

export const diffDateKeys = (later: DateKey, earlier: DateKey): number => {
  const laterDate = parseDateKey(later);
  const earlierDate = parseDateKey(earlier);
  if (!laterDate || !earlierDate) return 0;
  return Math.round((laterDate.getTime() - earlierDate.getTime()) / DAY_MS);
};

export const compareDateKeys = (left: DateKey, right: DateKey): number => diffDateKeys(left, right);

export const isSameDateKey = (left: DateKey, right: DateKey): boolean => left === right;

export const normalizeRange = (range: PeriodRange): PeriodRange => {
  if (range.end && compareDateKeys(range.start, range.end) > 0) {
    return { start: range.end, end: range.start };
  }
  return range;
};

export const sortRanges = (ranges: PeriodRange[]): PeriodRange[] => {
  const normalized = ranges
    .map((range) => normalizeRange(range))
    .filter((range) => isValidDateKey(range.start) && (range.end === null || isValidDateKey(range.end)))
    .sort((left, right) => compareDateKeys(left.start, right.start));

  const deduped: PeriodRange[] = [];
  normalized.forEach((range) => {
    const last = deduped[deduped.length - 1];
    if (!last || !isSameDateKey(last.start, range.start)) {
      deduped.push(range);
      return;
    }

    const lastEnd = last.end ?? last.start;
    const nextEnd = range.end ?? range.start;
    if (compareDateKeys(nextEnd, lastEnd) > 0) {
      deduped[deduped.length - 1] = {
        start: last.start,
        end: range.end ?? nextEnd,
      };
    }
  });
  return deduped;
};

export const isDateKeyInRange = (dateKey: DateKey, range: PeriodRange): boolean => {
  if (!range.end) return isSameDateKey(dateKey, range.start);
  const min = compareDateKeys(range.start, range.end) <= 0 ? range.start : range.end;
  const max = compareDateKeys(range.start, range.end) <= 0 ? range.end : range.start;
  return compareDateKeys(dateKey, min) >= 0 && compareDateKeys(dateKey, max) <= 0;
};

export const isDateKeyInAnyRange = (dateKey: DateKey, ranges: PeriodRange[]): boolean =>
  ranges.some((range) => isDateKeyInRange(dateKey, range));

export const applyMarkPeriodStart = (
  currentRanges: PeriodRange[],
  selectedDateKey: DateKey,
  enabled: boolean
): PeriodRange[] => {
  const next = [...currentRanges];
  const startIndex = next.findIndex((range) => isSameDateKey(range.start, selectedDateKey));

  if (enabled) {
    if (startIndex >= 0) return sortRanges(next);

    const containingIndex = next.findIndex((range) => isDateKeyInRange(selectedDateKey, range));
    if (containingIndex >= 0) {
      const containingRange = next[containingIndex];
      next[containingIndex] = normalizeRange({
        start: selectedDateKey,
        end: containingRange.end ?? containingRange.start,
      });
      return sortRanges(next);
    }

    next.push({ start: selectedDateKey, end: null });
    return sortRanges(next);
  }

  if (startIndex < 0) return sortRanges(next);
  next.splice(startIndex, 1);
  return sortRanges(next);
};

export const applyMarkPeriodEnd = (
  currentRanges: PeriodRange[],
  selectedDateKey: DateKey,
  enabled: boolean
): PeriodRange[] => {
  const next = [...currentRanges];
  const endIndex = next.findIndex((range) => Boolean(range.end && isSameDateKey(range.end, selectedDateKey)));

  if (enabled) {
    if (endIndex >= 0) return sortRanges(next);

    const containingIndex = next.findIndex((range) => isDateKeyInRange(selectedDateKey, range));
    if (containingIndex >= 0) {
      next[containingIndex] = normalizeRange({
        start: next[containingIndex].start,
        end: selectedDateKey,
      });
      return sortRanges(next);
    }

    let openIndex = -1;
    for (let index = 0; index < next.length; index += 1) {
      if (next[index].end === null && compareDateKeys(next[index].start, selectedDateKey) <= 0) {
        if (openIndex < 0 || compareDateKeys(next[index].start, next[openIndex].start) > 0) {
          openIndex = index;
        }
      }
    }

    if (openIndex >= 0) {
      next[openIndex] = normalizeRange({
        start: next[openIndex].start,
        end: selectedDateKey,
      });
      return sortRanges(next);
    }

    next.push({ start: selectedDateKey, end: selectedDateKey });
    return sortRanges(next);
  }

  if (endIndex < 0) return sortRanges(next);
  next[endIndex] = { start: next[endIndex].start, end: null };
  return sortRanges(next);
};

export const buildMonthCells = (params: {
  monthCursorKey: DateKey;
  selectedDateKey: DateKey;
  todayDateKey: DateKey;
  periodRanges: PeriodRange[];
  predictionDaySets: PredictionDaySets;
}): CalendarCell[] => {
  const { monthCursorKey, selectedDateKey, todayDateKey, periodRanges, predictionDaySets } = params;
  const monthCursor = parseDateKey(monthCursorKey);
  if (!monthCursor) return [];

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rowCount = Math.ceil((firstWeekday + daysInMonth) / 7);
  const totalCells = rowCount * 7;
  const periodStarts = new Set(periodRanges.map((range) => range.start));
  const periodEnds = new Set(periodRanges.map((range) => range.end).filter((value): value is DateKey => Boolean(value)));

  return Array.from({ length: totalCells }).map((_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) {
      return {
        key: `empty-${index}`,
        dateKey: null,
        day: null,
        cycleType: 'normal',
        isToday: false,
        isSelected: false,
        isPeriodStart: false,
        isPeriodEnd: false,
      };
    }

    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    let cycleType: CycleType = 'normal';
    if (isDateKeyInAnyRange(dateKey, periodRanges)) {
      cycleType = 'period';
    } else if (predictionDaySets.predictedPeriodDays.has(dateKey)) {
      cycleType = 'predicted';
    } else if (predictionDaySets.ovulationDays.has(dateKey)) {
      cycleType = 'ovulation-day';
    } else if (predictionDaySets.ovulationWindowDays.has(dateKey)) {
      cycleType = 'ovulation-window';
    }

    return {
      key: `${year}-${month}-${day}`,
      dateKey,
      day,
      cycleType,
      isToday: isSameDateKey(dateKey, todayDateKey),
      isSelected: isSameDateKey(dateKey, selectedDateKey),
      isPeriodStart: periodStarts.has(dateKey),
      isPeriodEnd: periodEnds.has(dateKey),
    };
  });
};

export const chunkCells = (cells: CalendarCell[], size: number): CalendarCell[][] => {
  if (size <= 0) return [];
  const rows: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += size) {
    rows.push(cells.slice(index, index + size));
  }
  return rows;
};

export const formatMonthLabel = (monthCursorKey: DateKey): string => {
  const date = parseDateKey(monthCursorKey);
  if (!date) return '';
  return `${date.getMonth() + 1}月`;
};

export const formatMonthDay = (dateKey: DateKey): string => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export const resolveDayTextClass = (cycleType: CycleType): string => {
  if (cycleType === 'period') return 'text-white';
  if (cycleType === 'predicted') return 'text-[#c48ba7]';
  if (cycleType === 'ovulation-day') return 'text-[#7650d8]';
  if (cycleType === 'ovulation-window') return 'text-[#2f9f93]';
  return 'text-slate-700';
};

export const sanitizePersistedRanges = (input: unknown): PeriodRange[] => {
  if (!Array.isArray(input)) return [];
  const next: PeriodRange[] = [];
  input.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const maybeStart = Reflect.get(item, 'start');
    const maybeEnd = Reflect.get(item, 'end');
    if (typeof maybeStart !== 'string' || !isValidDateKey(maybeStart)) return;
    if (maybeEnd !== null && (typeof maybeEnd !== 'string' || !isValidDateKey(maybeEnd))) return;
    next.push({ start: maybeStart, end: maybeEnd });
  });
  return sortRanges(next);
};

export const sanitizeSymptomRecords = (input: unknown): Record<DateKey, string[]> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const next: Record<DateKey, string[]> = {};
  Object.entries(input as Record<string, unknown>).forEach(([dateKey, value]) => {
    if (!isValidDateKey(dateKey)) return;
    if (!Array.isArray(value)) return;
    const normalized = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item, index, source) => item.length > 0 && source.indexOf(item) === index);
    if (normalized.length === 0) return;
    next[dateKey] = normalized;
  });
  return next;
};
