import { createAppMemoryApi } from '../../../core/appMemoryCenter';
import type { WeChatInteractionMemoryRecord, WeChatMessage } from './types';
import { getActiveRoleId } from '../contacts/activeRole';

export const wechatMemoryController = createAppMemoryApi<
  'wechat',
  WeChatInteractionMemoryRecord
>('wechat', {
  mapRecord: (record) => ({
    ...record,
    appId: 'wechat',
    sourceType: record.sourceType as WeChatMessage['type'],
  }),
  defaultSpace: 'social',
  resolveRoleId: getActiveRoleId,
});
