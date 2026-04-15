import type { WarmTrackState, WarmTrackStore } from '../types';
import type { WarmTrackRoleMutationResult } from '../store';
import { createWarmTrackCalendarSlice } from './slices/calendarSlice';
import { createWarmTrackCustomSymptomsSlice } from './slices/customSymptomsSlice';
import { createWarmTrackRecordsSlice } from './slices/recordsSlice';
import { createWarmTrackRoleSlice } from './slices/roleSlice';
import type { WarmTrackSet } from './slices/types';

type WarmTrackActions = Pick<
  WarmTrackStore,
  | 'syncWarmTrackRoleContext'
  | 'setSelectedDateKey'
  | 'switchMonth'
  | 'setMoodForDate'
  | 'setDischargeForDate'
  | 'setStoolForDate'
  | 'setTemperatureForDate'
  | 'setWeightForDate'
  | 'setDiaryForDate'
  | 'setSymptomsForDate'
  | 'setCustomSymptoms'
  | 'markPeriodStart'
  | 'markPeriodEnd'
>;

interface CreateWarmTrackActionsOptions {
  set: WarmTrackSet;
  updateRoleState: (
    mutate: (roleState: WarmTrackState) => WarmTrackState
  ) => WarmTrackRoleMutationResult | null;
  normalizeRoleId: (value: string | undefined) => string;
  createDefaultWarmTrackState: () => WarmTrackState;
  persistWarmTrackRoleState: (roleId: string, roleState: WarmTrackState) => void;
  recordWarmTrackMemory: (params: {
    roleId: string;
    sourceType:
      | 'period-range'
      | 'period-start'
      | 'period-end'
      | 'symptoms'
      | 'mood'
      | 'discharge'
      | 'stool'
      | 'temperature'
      | 'weight'
      | 'diary'
      | 'custom-symptoms';
    content: string | null;
    dateKey?: string;
    sessionId?: string;
    sourceId?: string;
  }) => void;
  syncWarmTrackPeriodRangeMemories: (params: {
    roleId: string;
    previousRanges: WarmTrackState['periodRanges'];
    nextRanges: WarmTrackState['periodRanges'];
  }) => void;
  arePeriodRangesEqual: (
    left: WarmTrackState['periodRanges'],
    right: WarmTrackState['periodRanges']
  ) => boolean;
  areStoolRecordsEqual: (
    left: WarmTrackState['stoolRecords'][string] | undefined,
    right: WarmTrackState['stoolRecords'][string]
  ) => boolean;
}

export const createWarmTrackActions = (
  options: CreateWarmTrackActionsOptions
): WarmTrackActions => ({
  ...createWarmTrackRoleSlice(options),
  ...createWarmTrackCalendarSlice(options),
  ...createWarmTrackRecordsSlice(options),
  ...createWarmTrackCustomSymptomsSlice(options),
});
