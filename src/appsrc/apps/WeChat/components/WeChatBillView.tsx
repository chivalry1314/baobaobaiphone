import React from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Search, X } from 'lucide-react';
import { useWeChatStore } from '../store';
import type { WeChatBillRecord } from '../types';

interface WeChatBillViewProps {
  onBack: () => void;
}

interface BillMonthGroup {
  key: string;
  label: string;
  income: number;
  expense: number;
  records: WeChatBillRecord[];
}

type PickerTab = 'month' | 'range';
type BillRangeKey = 'thisMonth' | 'last3Months' | 'last6Months' | 'last12Months' | 'all';
type BillFilter = { type: 'month'; monthKey: string } | { type: 'range'; rangeKey: BillRangeKey };

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PICKER_ITEM_HEIGHT = 48;
const PICKER_VISIBLE_ROWS = 5;

const RANGE_OPTIONS: { key: BillRangeKey; label: string }[] = [
  { key: 'thisMonth', label: '本月' },
  { key: 'last3Months', label: '近3个月' },
  { key: 'last6Months', label: '近6个月' },
  { key: 'last12Months', label: '近1年' },
  { key: 'all', label: '全部账单' },
];

const formatAmount = (amount: number, direction: WeChatBillRecord['direction']): string =>
  `${direction === 'income' ? '+' : '-'}${Math.abs(amount).toFixed(2)}`;

const formatMonthKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
};

const formatMonthAmount = (amount: number): string => `¥${amount.toFixed(2)}`;

const formatRecordTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
};

const getFallbackAvatarChar = (record: WeChatBillRecord): string => {
  const source = (record.counterparty || record.title).trim();
  return source ? source[0] : '账';
};

const buildMonthGroups = (records: WeChatBillRecord[]): BillMonthGroup[] => {
  const map = new Map<string, BillMonthGroup>();
  records.forEach((record) => {
    const monthKey = formatMonthKey(record.timestamp);
    const current = map.get(monthKey) || {
      key: monthKey,
      label: formatMonthLabel(monthKey),
      income: 0,
      expense: 0,
      records: [],
    };
    if (record.direction === 'income') current.income += record.amount;
    else current.expense += record.amount;
    current.records.push(record);
    map.set(monthKey, current);
  });

  return Array.from(map.values())
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .map((group) => ({
      ...group,
      records: [...group.records].sort((a, b) => b.timestamp - a.timestamp),
      income: Number(group.income.toFixed(2)),
      expense: Number(group.expense.toFixed(2)),
    }));
};

const monthDistanceFromCurrent = (timestamp: number): number => {
  const target = new Date(timestamp);
  const now = new Date();
  const targetIndex = target.getFullYear() * 12 + target.getMonth();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  return nowIndex - targetIndex;
};

const filterRecordsByRange = (records: WeChatBillRecord[], rangeKey: BillRangeKey): WeChatBillRecord[] => {
  if (rangeKey === 'all') return records;
  const monthsLimitMap: Record<Exclude<BillRangeKey, 'all'>, number> = {
    thisMonth: 1,
    last3Months: 3,
    last6Months: 6,
    last12Months: 12,
  };
  const limit = monthsLimitMap[rangeKey];
  return records.filter((record) => {
    const distance = monthDistanceFromCurrent(record.timestamp);
    return distance >= 0 && distance < limit;
  });
};

const getRangeLabel = (rangeKey: BillRangeKey): string =>
  RANGE_OPTIONS.find((item) => item.key === rangeKey)?.label || '全部时间';

const parseMonthKey = (monthKey: string): { year: number; month: number } => {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const now = new Date();
  return {
    year: Number.isFinite(year) ? year : now.getFullYear(),
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1,
  };
};

interface WheelColumnProps<T extends string | number> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  formatter: (value: T) => string;
}

const WheelColumn = <T extends string | number>({
  options,
  selected,
  onSelect,
  formatter,
}: WheelColumnProps<T>) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selectedIndex = Math.max(0, options.findIndex((item) => item === selected));

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const targetTop = selectedIndex * PICKER_ITEM_HEIGHT;
    if (Math.abs(container.scrollTop - targetTop) <= 1) return;
    container.scrollTop = targetTop;
  }, [selectedIndex]);

  const handleScroll = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(container.scrollTop / PICKER_ITEM_HEIGHT))
    );
    const nextValue = options[index];
    if (nextValue !== selected) onSelect(nextValue);
  }, [onSelect, options, selected]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="max-h-[240px] flex-1 overflow-y-auto"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div style={{ height: `${((PICKER_VISIBLE_ROWS - 1) / 2) * PICKER_ITEM_HEIGHT}px` }} />
      {options.map((value) => (
        <div
          key={String(value)}
          className={`flex items-center justify-center text-[14px] ${
            value === selected ? 'text-[#1C1C1C]' : 'text-[#B2B2B2]'
          }`}
          style={{
            height: `${PICKER_ITEM_HEIGHT}px`,
            scrollSnapAlign: 'center',
          }}
        >
          {formatter(value)}
        </div>
      ))}
      <div style={{ height: `${((PICKER_VISIBLE_ROWS - 1) / 2) * PICKER_ITEM_HEIGHT}px` }} />
    </div>
  );
};

export const WeChatBillView: React.FC<WeChatBillViewProps> = ({ onBack }) => {
  const records = useWeChatStore((state) => state.wechatBills);
  const allMonthGroups = React.useMemo(() => buildMonthGroups(records), [records]);
  const fallbackMonthKey = React.useMemo(() => formatMonthKey(Date.now()), []);
  const defaultMonthKey = allMonthGroups[0]?.key || fallbackMonthKey;

  const [activeFilter, setActiveFilter] = React.useState<BillFilter>({
    type: 'range',
    rangeKey: 'all',
  });
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [pickerTab, setPickerTab] = React.useState<PickerTab>('month');

  const initialMonth = parseMonthKey(defaultMonthKey);
  const [draftYear, setDraftYear] = React.useState(initialMonth.year);
  const [draftMonth, setDraftMonth] = React.useState(initialMonth.month);
  const [draftRangeKey, setDraftRangeKey] = React.useState<BillRangeKey>('last3Months');

  const filteredRecords = React.useMemo(() => {
    if (activeFilter.type === 'month') {
      return records.filter((record) => formatMonthKey(record.timestamp) === activeFilter.monthKey);
    }
    return filterRecordsByRange(records, activeFilter.rangeKey);
  }, [activeFilter, records]);

  const visibleMonthGroups = React.useMemo(() => buildMonthGroups(filteredRecords), [filteredRecords]);

  const summary = React.useMemo(
    () =>
      filteredRecords.reduce(
        (acc, record) => {
          if (record.direction === 'income') acc.income += record.amount;
          else acc.expense += record.amount;
          return acc;
        },
        { income: 0, expense: 0 }
      ),
    [filteredRecords]
  );

  const summaryIncome = Number(summary.income.toFixed(2));
  const summaryExpense = Number(summary.expense.toFixed(2));

  const periodLabel = activeFilter.type === 'month' ? formatMonthLabel(activeFilter.monthKey) : getRangeLabel(activeFilter.rangeKey);

  const yearOptions = React.useMemo(() => {
    const nowYear = new Date().getFullYear();
    const recordYears = records
      .map((record) => new Date(record.timestamp).getFullYear())
      .filter((value) => Number.isFinite(value));
    const minYear = recordYears.length > 0 ? Math.min(...recordYears, nowYear - 2) : nowYear - 2;
    const maxYear = recordYears.length > 0 ? Math.max(...recordYears, nowYear + 1) : nowYear + 1;
    const list: number[] = [];
    for (let year = minYear; year <= maxYear; year += 1) {
      list.push(year);
    }
    return list;
  }, [records]);

  const openPicker = () => {
    setPickerTab('month');
    if (activeFilter.type === 'month') {
      const parsed = parseMonthKey(activeFilter.monthKey);
      setDraftYear(parsed.year);
      setDraftMonth(parsed.month);
    } else {
      const parsed = parseMonthKey(defaultMonthKey);
      setDraftYear(parsed.year);
      setDraftMonth(parsed.month);
      setDraftRangeKey(activeFilter.rangeKey);
    }
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
  };

  const confirmPicker = () => {
    if (pickerTab === 'month') {
      const monthKey = `${draftYear}-${String(draftMonth).padStart(2, '0')}`;
      setActiveFilter({ type: 'month', monthKey });
    } else {
      setActiveFilter({ type: 'range', rangeKey: draftRangeKey });
    }
    setPickerVisible(false);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#EDEDED]">
      <div className="shrink-0 bg-[#EDEDED] px-4 pt-12 pb-4">
        <div className="flex items-center">
          <button onClick={onBack} className="text-gray-900 active:opacity-50" aria-label="关闭账单页">
            <X size={30} />
          </button>
          <h1 className="flex-1 text-center text-[14px] font-semibold text-gray-900">{'账单'}</h1>
          <button className="text-gray-900 active:opacity-50" aria-label="更多">
            <MoreHorizontal size={26} />
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-[#DEDEDE] bg-[#EFEFEF] px-4 pb-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveFilter({ type: 'range', rangeKey: 'all' });
              setDraftRangeKey('all');
            }}
            className="flex items-center gap-1 rounded-full bg-[#E3E3E3] px-4 py-2 text-[12px] text-[#202020]"
          >
            {'全部账单'}
            <ChevronDown size={18} />
          </button>
          <button className="flex items-center gap-1 rounded-full bg-[#E3E3E3] px-4 py-2 text-[12px] text-[#202020]">
            <Search size={21} />
            {'查找交易'}
          </button>
          <button className="ml-auto flex items-center text-[12px] text-[#686868]">
            {'收支统计'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between border-b border-[#DEDEDE] bg-[#E6E6E6] px-4 py-4">
        <button onClick={openPicker} className="flex items-center gap-1 text-[14px] text-[#202020]">
          {periodLabel}
          <ChevronDown size={20} />
        </button>
        <div className="text-[14px] text-[#707070]">
          <span>{`支出 ${formatMonthAmount(summaryExpense)}`}</span>
          <span className="ml-4">{`收入 ${formatMonthAmount(summaryIncome)}`}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleMonthGroups.length === 0 ? (
          <div className="px-6 py-20 text-center text-[14px] text-gray-500">{'暂无账单记录'}</div>
        ) : (
          <div className="bg-white">
            {visibleMonthGroups.map((group) => (
              <section key={group.key}>
                {activeFilter.type === 'range' ? (
                  <div className="border-b border-[#EEEEEE] bg-[#FAFAFA] px-4 py-2 text-[14px] text-[#8E8E8E]">
                    {group.label}
                  </div>
                ) : null}

                {group.records.map((record) => (
                  <article key={record.id} className="mx-4 flex gap-4 border-b border-[#EEEEEE] py-5">
                    {record.avatar ? (
                      <img src={record.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D9D9D9] text-[14px] text-[#666]">
                        {getFallbackAvatarChar(record)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-[#202020]">
                        {record.counterparty ? `${record.title}-${record.counterparty}` : record.title}
                      </div>
                      <div className="mt-1 text-[14px] text-[#A0A0A0]">{formatRecordTime(record.timestamp)}</div>
                    </div>

                    <div className="flex flex-col items-end justify-start">
                      <div
                        className={`text-[14px] font-semibold ${
                          record.direction === 'income' ? 'text-[#F0B300]' : 'text-[#1C1C1C]'
                        }`}
                      >
                        {formatAmount(record.amount, record.direction)}
                      </div>
                      {record.statusText ? (
                        <div className="mt-1 text-[14px] text-[#F45858]">{record.statusText}</div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {pickerVisible ? (
        <>
          <button
            type="button"
            aria-label="关闭时间筛选面板"
            onClick={closePicker}
            className="absolute inset-0 z-50 bg-black/45"
          />
          <div className="absolute inset-x-0 bottom-0 z-[60] rounded-t-[18px] bg-white px-5 pb-6 pt-4">
            <div className="flex items-center gap-8 border-b border-[#EDEDED] pb-3">
              <button
                type="button"
                onClick={() => setPickerTab('month')}
                className={`pb-2 text-[14px] ${
                  pickerTab === 'month'
                    ? 'border-b-2 border-black text-[#1C1C1C] font-semibold'
                    : 'text-[#A5A5A5]'
                }`}
              >
                {'选择月份'}
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('range')}
                className={`pb-2 text-[14px] ${
                  pickerTab === 'range'
                    ? 'border-b-2 border-black text-[#1C1C1C] font-semibold'
                    : 'text-[#A5A5A5]'
                }`}
              >
                {'选择时间段'}
              </button>
            </div>

            {pickerTab === 'month' ? (
              <div className="relative mt-4">
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 rounded-[10px] bg-[#F0F0F0]"
                  style={{
                    top: `calc(50% - ${PICKER_ITEM_HEIGHT / 2}px)`,
                    height: `${PICKER_ITEM_HEIGHT}px`,
                  }}
                />
                <div className="relative z-20 flex gap-3">
                  <WheelColumn
                    options={yearOptions}
                    selected={draftYear}
                    onSelect={setDraftYear}
                    formatter={(year) => `${year}年`}
                  />
                  <WheelColumn
                    options={MONTH_OPTIONS}
                    selected={draftMonth}
                    onSelect={setDraftMonth}
                    formatter={(month) => `${month}月`}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {RANGE_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDraftRangeKey(item.key)}
                    className={`rounded-[10px] px-3 py-3 text-[14px] ${
                      draftRangeKey === item.key ? 'bg-[#F0F0F0] text-[#1C1C1C]' : 'bg-[#FAFAFA] text-[#8E8E8E]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={closePicker}
                className="flex-1 rounded-[12px] bg-[#EDEDED] py-3 text-[14px] text-[#1C1C1C]"
              >
                {'取消'}
              </button>
              <button
                type="button"
                onClick={confirmPicker}
                className="flex-1 rounded-[12px] bg-[#12C35C] py-3 text-[14px] text-white"
              >
                {'确定'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
