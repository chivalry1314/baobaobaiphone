import type { WeChatMessage } from '../types';
import type { WeChatRoleScopedState, WeChatState } from './types';
import { createWeChatMomentsSlice } from './slices/momentsSlice';
import { createWeChatProfileSlice } from './slices/profileSlice';
import { createWeChatRoleSlice } from './slices/roleSlice';
import { createWeChatSessionSlice } from './slices/sessionSlice';
import { createWeChatSettingsSlice } from './slices/settingsSlice';
import type { WeChatGet, WeChatSet } from './slices/types';

type WeChatActions = Pick<
  WeChatState,
  | 'syncWeChatRoleContext'
  | 'ensureWeChatSession'
  | 'createWeChatSession'
  | 'addWeChatMessage'
  | 'updateWeChatMessage'
  | 'setWeChatCurrentSession'
  | 'addWeChatMoment'
  | 'toggleWeChatMomentLike'
  | 'addWeChatMomentComment'
  | 'updateWeChatUserProfile'
  | 'updateWeChatUiSettings'
  | 'updateWeChatAiChatSettings'
  | 'updateWeChatAiMomentsSettings'
  | 'setWeChatContactPatSuffix'
  | 'deleteWeChatMessages'
  | 'topUpWeChatBalance'
  | 'withdrawWeChatBalance'
>;

interface CreateWeChatActionsOptions {
  set: WeChatSet;
  get: WeChatGet;
  ensureRoleContextState: (
    state: WeChatState,
    preferredRoleId?: string
  ) => { state: WeChatState; roleId: string; roleState: WeChatRoleScopedState };
  applyRoleState: (
    state: WeChatState,
    roleId: string,
    roleState: WeChatRoleScopedState
  ) => WeChatState;
  normalizeMessageContentForMemory: (message: Omit<WeChatMessage, 'id' | 'timestamp'>) => string;
  shouldRecordInteractionMemory: (content: string) => boolean;
  clampRecentMessageCount: (value: number) => number;
  clampMemoryReferenceCount: (value: number) => number;
  generateId: () => string;
}

export const createWeChatActions = (
  options: CreateWeChatActionsOptions
): WeChatActions => ({
  ...createWeChatRoleSlice(options),
  ...createWeChatSessionSlice(options),
  ...createWeChatMomentsSlice(options),
  ...createWeChatProfileSlice(options),
  ...createWeChatSettingsSlice(options),
});

