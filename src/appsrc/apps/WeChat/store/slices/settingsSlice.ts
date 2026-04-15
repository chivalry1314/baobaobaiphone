import type { WeChatState } from '../types';
import type { WeChatSettingsOptions } from './types';

export const createWeChatSettingsSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  clampRecentMessageCount,
  clampMemoryReferenceCount,
}: WeChatSettingsOptions): Pick<
  WeChatState,
  'updateWeChatUiSettings' | 'updateWeChatAiChatSettings' | 'updateWeChatAiMomentsSettings'
> => ({
  updateWeChatUiSettings: (settings) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatUiSettings: {
          ...roleState.wechatUiSettings,
          ...settings,
        },
      });
    }),

  updateWeChatAiChatSettings: (settings) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const nextRecentMessageCount =
        typeof settings.recentMessageCount === 'number'
          ? clampRecentMessageCount(settings.recentMessageCount)
          : roleState.wechatAiChatSettings.recentMessageCount;
      const nextMemoryReferenceCount =
        typeof settings.memoryReferenceCount === 'number'
          ? clampMemoryReferenceCount(settings.memoryReferenceCount)
          : roleState.wechatAiChatSettings.memoryReferenceCount;
      const nextIncludePersonalProfileMemory =
        typeof settings.includePersonalProfileMemory === 'boolean'
          ? settings.includePersonalProfileMemory
          : roleState.wechatAiChatSettings.includePersonalProfileMemory;

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatAiChatSettings: {
          ...roleState.wechatAiChatSettings,
          ...settings,
          recentMessageCount: nextRecentMessageCount,
          memoryReferenceCount: nextMemoryReferenceCount,
          includePersonalProfileMemory: nextIncludePersonalProfileMemory,
        },
      });
    }),

  updateWeChatAiMomentsSettings: (settings) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const nextRefreshCount =
        typeof settings.refreshCount === 'number'
          ? Math.max(1, Math.min(20, Math.round(settings.refreshCount)))
          : roleState.wechatAiMomentsSettings.refreshCount;

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatAiMomentsSettings: {
          ...roleState.wechatAiMomentsSettings,
          ...settings,
          refreshCount: nextRefreshCount,
        },
      });
    }),
});
