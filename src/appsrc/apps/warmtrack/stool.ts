import type { StoolRecord } from './types';

interface StoolOption {
  id: string;
  label: string;
  icon: string;
}

export const STOOL_FEELING_OPTIONS: StoolOption[] = [
  { id: 'stool-feeling-comfort', label: '舒畅', icon: '🙂' },
  { id: 'stool-feeling-residue', label: '有残便感', icon: '😐' },
  { id: 'stool-feeling-hard', label: '排便困难', icon: '😣' },
];

export const STOOL_SHAPE_OPTIONS: StoolOption[] = [
  { id: 'stool-shape-hard-ball', label: '硬球状', icon: '🟡' },
  { id: 'stool-shape-bumpy-sausage', label: '凹凸香肠状', icon: '🥐' },
  { id: 'stool-shape-crack-sausage', label: '裂纹香肠状', icon: '🌭' },
  { id: 'stool-shape-smooth-banana', label: '平滑香蕉状', icon: '🍌' },
  { id: 'stool-shape-soft-lump', label: '软块状', icon: '🧩' },
  { id: 'stool-shape-mushy', label: '糊状', icon: '🟠' },
  { id: 'stool-shape-liquid', label: '水液状', icon: '💧' },
];

export const STOOL_AMOUNT_OPTIONS: StoolOption[] = [
  { id: 'stool-amount-very-low', label: '非常少量', icon: '🌙' },
  { id: 'stool-amount-low', label: '少量', icon: '🌛' },
  { id: 'stool-amount-normal', label: '一般量', icon: '🍌' },
  { id: 'stool-amount-large', label: '大量', icon: '🍌🍌' },
];

export const STOOL_DURATION_OPTIONS: StoolOption[] = [
  { id: 'stool-duration-lt5', label: '小于5分钟', icon: '🕔' },
  { id: 'stool-duration-5to10', label: '5-10分钟', icon: '🕙' },
  { id: 'stool-duration-10to20', label: '10-20分钟', icon: '🕒' },
  { id: 'stool-duration-gt20', label: '大于20分钟', icon: '⏱️' },
];

const FEELING_MAP: Record<string, StoolOption> = {};
const SHAPE_MAP: Record<string, StoolOption> = {};
const AMOUNT_MAP: Record<string, StoolOption> = {};
const DURATION_MAP: Record<string, StoolOption> = {};

STOOL_FEELING_OPTIONS.forEach((item) => {
  FEELING_MAP[item.id] = item;
});
STOOL_SHAPE_OPTIONS.forEach((item) => {
  SHAPE_MAP[item.id] = item;
});
STOOL_AMOUNT_OPTIONS.forEach((item) => {
  AMOUNT_MAP[item.id] = item;
});
STOOL_DURATION_OPTIONS.forEach((item) => {
  DURATION_MAP[item.id] = item;
});

const normalizeHour = (value: number): number => {
  if (!Number.isInteger(value)) return 0;
  if (value < 0) return 0;
  if (value > 23) return 23;
  return value;
};

const normalizeMinute = (value: number): number => {
  if (!Number.isInteger(value)) return 0;
  if (value < 0) return 0;
  if (value > 59) return 59;
  return value;
};

const normalizeOptionId = (value: string | null, map: Record<string, StoolOption>): string | null => {
  if (!value) return null;
  return map[value] ? value : null;
};

export const buildDefaultStoolRecord = (): StoolRecord => {
  const now = new Date();
  return {
    feelingId: null,
    hour: now.getHours(),
    minute: now.getMinutes(),
    shapeId: null,
    amountId: null,
    durationId: null,
  };
};

export const normalizeStoolRecord = (input: StoolRecord): StoolRecord => ({
  feelingId: normalizeOptionId(input.feelingId, FEELING_MAP),
  hour: normalizeHour(input.hour),
  minute: normalizeMinute(input.minute),
  shapeId: normalizeOptionId(input.shapeId, SHAPE_MAP),
  amountId: normalizeOptionId(input.amountId, AMOUNT_MAP),
  durationId: normalizeOptionId(input.durationId, DURATION_MAP),
});

const padTwo = (value: number): string => value.toString().padStart(2, '0');

export const buildStoolSummary = (record: StoolRecord | null): string => {
  if (!record) return '';
  const normalized = normalizeStoolRecord(record);
  const parts: string[] = [];
  if (normalized.feelingId) parts.push(FEELING_MAP[normalized.feelingId].label);
  if (normalized.shapeId) parts.push(SHAPE_MAP[normalized.shapeId].label);
  parts.push(`${padTwo(normalized.hour)}:${padTwo(normalized.minute)}`);
  return parts.join(' · ');
};
