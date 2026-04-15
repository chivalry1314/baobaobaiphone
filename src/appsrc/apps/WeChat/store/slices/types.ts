import type { StateCreator } from 'zustand';
import type { WeChatMessage } from '../../types';
import type { WeChatRoleScopedState, WeChatState } from '../types';

export type WeChatSet = Parameters<StateCreator<WeChatState>>[0];
export type WeChatGet = Parameters<StateCreator<WeChatState>>[1];

export interface WeChatRoleContextOptions {
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
  generateId: () => string;
}

export interface WeChatMessageMemoryOptions extends WeChatRoleContextOptions {
  normalizeMessageContentForMemory: (message: Omit<WeChatMessage, 'id' | 'timestamp'>) => string;
  shouldRecordInteractionMemory: (content: string) => boolean;
}

export interface WeChatSettingsOptions extends WeChatRoleContextOptions {
  clampRecentMessageCount: (value: number) => number;
  clampMemoryReferenceCount: (value: number) => number;
}
