import type { AppMemoryModule } from '../../../core/appMemoryRegistry';
import { getRoleDisplayNameSnapshot } from '../../shared/business/contacts/roleDisplayNameBridge';
import type { DailyWordsMemoryRecord, DailyWordsMemorySourceType } from './memory';

const DAILY_WORDS_SOURCE_LABELS: Partial<Record<DailyWordsMemorySourceType, string>> = {
  'diary-entry': '日记条目',
  'memory-summary': '记忆摘要',
};

export const dailyWordsAppMemoryModule: AppMemoryModule<DailyWordsMemoryRecord> = {
  appId: 'dailywords',
  defaultSpace: 'personal',
  resolveContactName: (contactId) => getRoleDisplayNameSnapshot(contactId),
  resolveSourceLabel: (record) => {
    const sourceType = record.sourceType as DailyWordsMemorySourceType | undefined;
    if (!sourceType) return undefined;
    return DAILY_WORDS_SOURCE_LABELS[sourceType] || sourceType;
  },
};

export default dailyWordsAppMemoryModule;
