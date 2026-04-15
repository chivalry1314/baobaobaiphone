import type { AppMemoryRecord } from '../../../core/appMemory';
import { createAppMemoryApi } from '../../../core/appMemoryCenter';
import { getActiveRoleId } from '../contacts/activeRole';

export type WarmTrackMemorySourceType =
  | 'period-range'
  | 'period-start'
  | 'period-end'
  | 'symptoms'
  | 'custom-symptoms'
  | 'mood'
  | 'discharge'
  | 'stool'
  | 'temperature'
  | 'weight'
  | 'diary'
  | 'memory-summary';

export interface WarmTrackMemoryRecord extends AppMemoryRecord {
  appId: 'warmtrack';
  sourceType?: WarmTrackMemorySourceType;
}

export const warmTrackMemoryController = createAppMemoryApi<
  'warmtrack',
  WarmTrackMemoryRecord
>('warmtrack', {
  mapRecord: (record) => ({
    ...record,
    appId: 'warmtrack',
    sourceType: record.sourceType as WarmTrackMemorySourceType | undefined,
  }),
  defaultSpace: 'personal',
  resolveRoleId: getActiveRoleId,
});
