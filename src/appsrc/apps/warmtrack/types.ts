export type DateKey = string;

export type CycleType = 'period' | 'predicted' | 'ovulation-window' | 'ovulation-day' | 'normal';

export type RecordItemType =
  | 'period-start-toggle'
  | 'period-end-toggle'
  | 'symptom'
  | 'mood'
  | 'discharge'
  | 'stool'
  | 'temperature'
  | 'weight'
  | 'plus'
  | 'diary'
  | 'habit';

export interface PeriodRange {
  start: DateKey;
  end: DateKey | null;
}

export interface CalendarCell {
  key: string;
  dateKey: DateKey | null;
  day: number | null;
  cycleType: CycleType;
  isToday: boolean;
  isSelected: boolean;
  isPeriodStart: boolean;
  isPeriodEnd: boolean;
}

export type PredictionConfidence = 'high' | 'medium' | 'low';

export interface PredictionWindow {
  periodStartKey: DateKey;
  periodEndKey: DateKey;
  ovulationStartKey: DateKey;
  ovulationDayKey: DateKey;
  ovulationEndKey: DateKey;
}

export interface PredictionModel {
  cycleLength: number;
  periodLength: number;
  cycleSamples: number;
  durationSamples: number;
  confidence: PredictionConfidence;
  nextPeriodStartKey: DateKey;
  nextPeriodEndKey: DateKey;
  windows: PredictionWindow[];
}

export interface PredictionDaySets {
  predictedPeriodDays: Set<DateKey>;
  ovulationWindowDays: Set<DateKey>;
  ovulationDays: Set<DateKey>;
}

export interface StoolRecord {
  feelingId: string | null;
  hour: number;
  minute: number;
  shapeId: string | null;
  amountId: string | null;
  durationId: string | null;
}

export interface WarmTrackState {
  periodRanges: PeriodRange[];
  symptomRecords: Record<DateKey, string[]>;
  moodRecords: Record<DateKey, string>;
  dischargeRecords: Record<DateKey, string>;
  stoolRecords: Record<DateKey, StoolRecord>;
  temperatureRecords: Record<DateKey, number>;
  weightRecords: Record<DateKey, number>;
  diaryRecords: Record<DateKey, string>;
  customSymptoms: string[];
  customSymptomIcons: Record<string, string>;
  selectedDateKey: DateKey;
  monthCursorKey: DateKey;
}

export interface WarmTrackActions {
  syncWarmTrackRoleContext: () => void;
  setSelectedDateKey: (dateKey: DateKey) => void;
  switchMonth: (offset: number) => void;
  setMoodForDate: (dateKey: DateKey, moodId: string | null) => void;
  setDischargeForDate: (dateKey: DateKey, dischargeId: string | null) => void;
  setStoolForDate: (dateKey: DateKey, stoolRecord: StoolRecord | null) => void;
  setTemperatureForDate: (dateKey: DateKey, temperature: number | null) => void;
  setWeightForDate: (dateKey: DateKey, weightKg: number | null) => void;
  setDiaryForDate: (dateKey: DateKey, diaryText: string | null) => void;
  setSymptomsForDate: (dateKey: DateKey, symptomIds: string[]) => void;
  setCustomSymptoms: (payload: { symptoms: string[]; iconMap: Record<string, string> }) => void;
  markPeriodStart: (enabled: boolean) => void;
  markPeriodEnd: (enabled: boolean) => void;
}

export interface WarmTrackStore extends WarmTrackState, WarmTrackActions {
  activeRoleId: string;
  warmTrackStateByRoleId: Record<string, WarmTrackState>;
  isHydrated: boolean;
}
