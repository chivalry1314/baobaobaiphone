import type { AppMemoryModule } from '../../../core/appMemoryRegistry';
import { getRoleDisplayName } from '../contacts/activeRole';
import type { WarmTrackMemoryRecord, WarmTrackMemorySourceType } from './memory';

const WARMTRACK_MEMORY_SOURCE_LABELS: Partial<Record<WarmTrackMemorySourceType, string>> = {
  'period-range': '经期区间',
  'period-start': '经期开始',
  'period-end': '经期结束',
  symptoms: '症状记录',
  'custom-symptoms': '自定义症状',
  mood: '心情记录',
  discharge: '分泌物记录',
  stool: '排便记录',
  temperature: '体温记录',
  weight: '体重记录',
  diary: '日记记录',
  'memory-summary': '记忆摘要',
};

export const warmTrackAppMemoryModule: AppMemoryModule<WarmTrackMemoryRecord> = {
  appId: 'warmtrack',
  defaultSpace: 'personal',
  resolveContactName: (contactId) => getRoleDisplayName(contactId),
  resolveSourceLabel: (record) => {
    const sourceType = record.sourceType as WarmTrackMemorySourceType | undefined;
    if (!sourceType) return undefined;
    return WARMTRACK_MEMORY_SOURCE_LABELS[sourceType] || sourceType;
  },
};

export default warmTrackAppMemoryModule;
