import type { AppMemoryModule } from '../../../core/appMemoryRegistry';
import { getContactSnapshotById } from '../contacts/queries';
import type { WeChatInteractionMemoryRecord, WeChatMessage } from './types';

const WECHAT_SOURCE_LABELS: Partial<Record<NonNullable<WeChatMessage['type']>, string>> = {
  text: '文本',
  image: '图片',
  sticker: '动态表情',
  voice: '语音',
  transfer: '转账',
  transfer_accepted: '收款',
  pat: '拍一拍',
};

const resolveContactName = (contactId: string): string => {
  const contact = getContactSnapshotById(contactId);
  return contact?.name || contactId;
};

export const wechatAppMemoryModule: AppMemoryModule<WeChatInteractionMemoryRecord> = {
  appId: 'wechat',
  defaultSpace: 'social',
  resolveContactName,
  resolveSourceLabel: (record) => {
    const sourceType = record.sourceType as string | undefined;
    return sourceType === 'memory-summary'
      ? '记忆摘要'
      : sourceType
      ? WECHAT_SOURCE_LABELS[sourceType as NonNullable<WeChatMessage['type']>] || sourceType
      : undefined;
  },
};

export default wechatAppMemoryModule;
