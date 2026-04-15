import type { AppMemoryRecord } from '../../../core/appMemory';
import { createAppMemoryApi } from '../../../core/appMemoryCenter';
import { getCommerceActiveRoleId } from '../../shared/business/commerce/roleContext';

export type DailyWordsMemorySourceType = 'diary-entry' | 'memory-summary';

export interface DailyWordsMemoryRecord extends AppMemoryRecord {
  appId: 'dailywords';
  sourceType?: DailyWordsMemorySourceType;
}

export const dailyWordsMemoryController = createAppMemoryApi<
  'dailywords',
  DailyWordsMemoryRecord
>('dailywords', {
  mapRecord: (record) => ({
    ...record,
    appId: 'dailywords',
    sourceType: record.sourceType as DailyWordsMemorySourceType | undefined,
  }),
  defaultSpace: 'personal',
  resolveRoleId: getCommerceActiveRoleId,
});
