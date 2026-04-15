import type { StoolRecord, WarmTrackState } from './types';
import { isValidDischargeId } from './discharge';
import { normalizeDiaryText } from './diary';
import { isValidMoodId } from './moods';
import { normalizeCustomSymptomIconMap, normalizeSymptomList } from './symptoms';
import { normalizeStoolRecord } from './stool';
import { normalizeTemperatureValue } from './temperature';
import {
  getMonthStartKey,
  getTodayDateKey,
  isValidDateKey,
  sanitizePersistedRanges,
  sanitizeSymptomRecords,
} from './utils';
import { normalizeWeightValue } from './weight';

export type WarmTrackPersistedState = Pick<
  WarmTrackState,
  | 'periodRanges'
  | 'symptomRecords'
  | 'moodRecords'
  | 'dischargeRecords'
  | 'stoolRecords'
  | 'temperatureRecords'
  | 'weightRecords'
  | 'diaryRecords'
  | 'customSymptoms'
  | 'customSymptomIcons'
  | 'selectedDateKey'
  | 'monthCursorKey'
>;

const isPlainObject = (input: unknown): input is Record<string, unknown> =>
  Boolean(input) && typeof input === 'object' && !Array.isArray(input);

const sanitizeStringRecord = (input: unknown, isValidValue: (value: string) => boolean): Record<string, string> => {
  if (!isPlainObject(input)) return {};

  const next: Record<string, string> = {};
  Object.entries(input).forEach(([dateKey, value]) => {
    if (!isValidDateKey(dateKey)) return;
    if (typeof value !== 'string') return;
    const normalizedValue = value.trim();
    if (!normalizedValue || !isValidValue(normalizedValue)) return;
    next[dateKey] = normalizedValue;
  });
  return next;
};

const sanitizeNumberRecord = (
  input: unknown,
  normalizeValue: (value: number) => number | null
): Record<string, number> => {
  if (!isPlainObject(input)) return {};

  const next: Record<string, number> = {};
  Object.entries(input).forEach(([dateKey, value]) => {
    if (!isValidDateKey(dateKey)) return;
    if (typeof value !== 'number') return;
    const normalizedValue = normalizeValue(value);
    if (normalizedValue === null) return;
    next[dateKey] = normalizedValue;
  });
  return next;
};

const sanitizeStoolRecords = (input: unknown): WarmTrackState['stoolRecords'] => {
  if (!isPlainObject(input)) return {};

  const next: WarmTrackState['stoolRecords'] = {};
  const normalizeNullableString = (value: unknown): string | null => {
    if (value === null) return null;
    return typeof value === 'string' ? value : null;
  };

  Object.entries(input).forEach(([dateKey, value]) => {
    if (!isValidDateKey(dateKey)) return;
    if (!isPlainObject(value)) return;

    const maybeFeelingId = Reflect.get(value, 'feelingId');
    const maybeHour = Reflect.get(value, 'hour');
    const maybeMinute = Reflect.get(value, 'minute');
    const maybeShapeId = Reflect.get(value, 'shapeId');
    const maybeAmountId = Reflect.get(value, 'amountId');
    const maybeDurationId = Reflect.get(value, 'durationId');

    const rawRecord: StoolRecord = {
      feelingId: normalizeNullableString(maybeFeelingId),
      hour: typeof maybeHour === 'number' ? maybeHour : 0,
      minute: typeof maybeMinute === 'number' ? maybeMinute : 0,
      shapeId: normalizeNullableString(maybeShapeId),
      amountId: normalizeNullableString(maybeAmountId),
      durationId: normalizeNullableString(maybeDurationId),
    };
    next[dateKey] = normalizeStoolRecord(rawRecord);
  });
  return next;
};

const sanitizeDiaryRecords = (input: unknown): WarmTrackState['diaryRecords'] => {
  if (!isPlainObject(input)) return {};

  const next: WarmTrackState['diaryRecords'] = {};
  Object.entries(input).forEach(([dateKey, value]) => {
    if (!isValidDateKey(dateKey)) return;
    if (typeof value !== 'string') return;
    const normalizedDiary = normalizeDiaryText(value);
    if (!normalizedDiary) return;
    next[dateKey] = normalizedDiary;
  });
  return next;
};

const sanitizeCustomSymptomIconSource = (input: unknown): Record<string, string> => {
  if (!isPlainObject(input)) return {};

  const next: Record<string, string> = {};
  Object.entries(input).forEach(([label, value]) => {
    if (typeof value !== 'string') return;
    next[label] = value;
  });
  return next;
};

const sanitizeDateKeyValue = (input: unknown, fallback: string): string => {
  if (typeof input !== 'string') return fallback;
  return isValidDateKey(input) ? input : fallback;
};

export const createDefaultWarmTrackState = (): WarmTrackState => {
  const todayDateKey = getTodayDateKey();
  return {
    periodRanges: [],
    symptomRecords: {},
    moodRecords: {},
    dischargeRecords: {},
    stoolRecords: {},
    temperatureRecords: {},
    weightRecords: {},
    diaryRecords: {},
    customSymptoms: [],
    customSymptomIcons: {},
    selectedDateKey: todayDateKey,
    monthCursorKey: getMonthStartKey(todayDateKey),
  };
};

export const sanitizePersistedWarmTrackState = (persistedState: unknown): WarmTrackState => {
  const fallback = createDefaultWarmTrackState();
  const persisted = isPlainObject(persistedState) ? persistedState : {};
  const customSymptoms = normalizeSymptomList(Array.isArray(persisted.customSymptoms) ? persisted.customSymptoms : []);
  const customSymptomIcons = normalizeCustomSymptomIconMap(
    customSymptoms,
    sanitizeCustomSymptomIconSource(persisted.customSymptomIcons)
  );
  const selectedDateKey = sanitizeDateKeyValue(persisted.selectedDateKey, fallback.selectedDateKey);
  const monthCursorSourceKey = sanitizeDateKeyValue(persisted.monthCursorKey, selectedDateKey);

  return {
    ...fallback,
    periodRanges: sanitizePersistedRanges(persisted.periodRanges),
    symptomRecords: sanitizeSymptomRecords(persisted.symptomRecords),
    moodRecords: sanitizeStringRecord(persisted.moodRecords, isValidMoodId),
    dischargeRecords: sanitizeStringRecord(persisted.dischargeRecords, isValidDischargeId),
    stoolRecords: sanitizeStoolRecords(persisted.stoolRecords),
    temperatureRecords: sanitizeNumberRecord(persisted.temperatureRecords, normalizeTemperatureValue),
    weightRecords: sanitizeNumberRecord(persisted.weightRecords, normalizeWeightValue),
    diaryRecords: sanitizeDiaryRecords(persisted.diaryRecords),
    customSymptoms,
    customSymptomIcons,
    selectedDateKey,
    monthCursorKey: getMonthStartKey(monthCursorSourceKey),
  };
};

export const toPersistedWarmTrackState = (state: WarmTrackState): WarmTrackPersistedState => ({
  periodRanges: state.periodRanges,
  symptomRecords: state.symptomRecords,
  moodRecords: state.moodRecords,
  dischargeRecords: state.dischargeRecords,
  stoolRecords: state.stoolRecords,
  temperatureRecords: state.temperatureRecords,
  weightRecords: state.weightRecords,
  diaryRecords: state.diaryRecords,
  customSymptoms: state.customSymptoms,
  customSymptomIcons: state.customSymptomIcons,
  selectedDateKey: state.selectedDateKey,
  monthCursorKey: state.monthCursorKey,
});
