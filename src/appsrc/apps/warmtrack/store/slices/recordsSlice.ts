import type { WarmTrackStore } from '../../types';
import { createWarmTrackPeriodMarkerSlice } from './periodMarkerSlice';
import { createWarmTrackRecordDetailSlice } from './recordDetailSlice';
import { createWarmTrackRecordMetricsSlice } from './recordMetricsSlice';
import type { WarmTrackMutationSliceOptions } from './types';

export const createWarmTrackRecordsSlice = (
  options: WarmTrackMutationSliceOptions
): Pick<
  WarmTrackStore,
  | 'setMoodForDate'
  | 'setDischargeForDate'
  | 'setStoolForDate'
  | 'setTemperatureForDate'
  | 'setWeightForDate'
  | 'setDiaryForDate'
  | 'setSymptomsForDate'
  | 'markPeriodStart'
  | 'markPeriodEnd'
> => ({
  ...createWarmTrackRecordMetricsSlice(options),
  ...createWarmTrackRecordDetailSlice(options),
  ...createWarmTrackPeriodMarkerSlice(options),
});