import {
  createContactRoleId,
  createRoleCharacterId,
  parseContactRoleId,
  parseRoleCharacterId,
} from '../../../../shared/business/roleIdentity';
import type { WeChatMessage, WeChatSession } from '../../types';
import { createDefaultRoleScopedState } from '../defaults';
import type { WeChatRoleScopedState, WeChatState } from '../types';
import type { WeChatRoleContextOptions } from './types';

const resolveMirrorCharacterIdFromSourceRole = (sourceRoleId: string): string => {
  const sourceContactId = parseContactRoleId(sourceRoleId);
  return sourceContactId || createRoleCharacterId(sourceRoleId);
};

const createMirroredMessage = (
  message: WeChatMessage,
  targetRoleId: string
): WeChatMessage => ({
  ...message,
  id: `mirror-${targetRoleId}-${message.id}`,
  role: message.role === 'user' ? 'character' : 'user',
});

const areMessagesStructurallyEqual = (
  left: WeChatMessage[],
  right: WeChatMessage[]
): boolean => {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftMessage = left[index];
    const rightMessage = right[index];
    if (!rightMessage) return false;
    if (leftMessage.id !== rightMessage.id) return false;
    if (leftMessage.role !== rightMessage.role) return false;
    if (leftMessage.timestamp !== rightMessage.timestamp) return false;
  }

  return true;
};

const mirrorRoleForContactSession = (
  sourceRoleId: string,
  sourceSession: WeChatSession,
  targetRoleState: WeChatRoleScopedState,
  targetRoleId: string,
  generateId: () => string
): { roleState: WeChatRoleScopedState; changed: boolean } => {
  const rawCharacterId = sourceSession.characterId.trim();
  if (!rawCharacterId) return { roleState: targetRoleState, changed: false };
  if (parseRoleCharacterId(rawCharacterId)) return { roleState: targetRoleState, changed: false };

  const mirrorCharacterId = resolveMirrorCharacterIdFromSourceRole(sourceRoleId);
  const existingSessionIndex = targetRoleState.wechatSessions.findIndex(
    (item) => item.characterId === mirrorCharacterId
  );
  const mirroredMessages = sourceSession.messages.map((message) =>
    createMirroredMessage(message, targetRoleId)
  );

  if (existingSessionIndex >= 0) {
    const existingSession = targetRoleState.wechatSessions[existingSessionIndex];
    if (
      existingSession.lastUpdated === sourceSession.lastUpdated &&
      areMessagesStructurallyEqual(existingSession.messages, mirroredMessages)
    ) {
      return { roleState: targetRoleState, changed: false };
    }

    const nextSessions = [...targetRoleState.wechatSessions];
    nextSessions[existingSessionIndex] = {
      ...existingSession,
      messages: mirroredMessages,
      lastUpdated: sourceSession.lastUpdated,
      unreadCount: 0,
    };

    return {
      roleState: {
        ...targetRoleState,
        wechatSessions: nextSessions,
      },
      changed: true,
    };
  }

  if (mirroredMessages.length === 0) return { roleState: targetRoleState, changed: false };

  const mirroredSession: WeChatSession = {
    id: `session-${targetRoleId}-${generateId()}`,
    characterId: mirrorCharacterId,
    messages: mirroredMessages,
    lastUpdated: sourceSession.lastUpdated,
    unreadCount: 0,
  };

  return {
    roleState: {
      ...targetRoleState,
      wechatSessions: [mirroredSession, ...targetRoleState.wechatSessions],
    },
    changed: true,
  };
};

const backfillLegacyRolePerspective = (
  state: WeChatState,
  generateId: () => string
): WeChatState => {
  let changed = false;
  const nextRoleMap: Record<string, WeChatRoleScopedState> = {
    ...state.wechatStateByRoleId,
  };

  Object.entries(state.wechatStateByRoleId).forEach(([sourceRoleId, sourceRoleState]) => {
    sourceRoleState.wechatSessions.forEach((sourceSession) => {
      const rawCharacterId = sourceSession.characterId.trim();
      if (!rawCharacterId) return;
      if (parseRoleCharacterId(rawCharacterId)) return;

      const targetRoleId = createContactRoleId(rawCharacterId);
      if (targetRoleId === sourceRoleId) return;

      const currentTargetRoleState = nextRoleMap[targetRoleId] || createDefaultRoleScopedState();
      const { roleState: nextTargetRoleState, changed: sessionChanged } = mirrorRoleForContactSession(
        sourceRoleId,
        sourceSession,
        currentTargetRoleState,
        targetRoleId,
        generateId
      );

      if (!sessionChanged) return;
      changed = true;
      nextRoleMap[targetRoleId] = nextTargetRoleState;
    });
  });

  if (!changed) return state;
  const activeRoleState = nextRoleMap[state.activeRoleId];

  if (!activeRoleState) {
    return {
      ...state,
      wechatStateByRoleId: nextRoleMap,
    };
  }

  return {
    ...state,
    wechatStateByRoleId: nextRoleMap,
    ...activeRoleState,
  };
};

const rebuildActiveContactRolePerspective = (
  state: WeChatState,
  generateId: () => string
): WeChatState => {
  const activeRoleId = state.activeRoleId;
  const activeContactId = parseContactRoleId(activeRoleId);
  if (!activeContactId) return state;

  const currentActiveRoleState = state.wechatStateByRoleId[activeRoleId] || createDefaultRoleScopedState();
  let nextActiveRoleState = currentActiveRoleState;
  let changed = false;

  Object.entries(state.wechatStateByRoleId).forEach(([sourceRoleId, sourceRoleState]) => {
    if (sourceRoleId === activeRoleId) return;

    const sourceSession = sourceRoleState.wechatSessions.find(
      (session) => session.characterId === activeContactId
    );
    if (!sourceSession) return;

    const result = mirrorRoleForContactSession(
      sourceRoleId,
      sourceSession,
      nextActiveRoleState,
      activeRoleId,
      generateId
    );
    if (!result.changed) return;

    changed = true;
    nextActiveRoleState = result.roleState;
  });

  if (!changed) return state;

  return {
    ...state,
    wechatStateByRoleId: {
      ...state.wechatStateByRoleId,
      [activeRoleId]: nextActiveRoleState,
    },
    ...nextActiveRoleState,
  };
};

export const createWeChatRoleSlice = ({
  set,
  ensureRoleContextState,
  generateId,
}: WeChatRoleContextOptions): Pick<WeChatState, 'syncWeChatRoleContext'> => ({
  syncWeChatRoleContext: () =>
    set((state) => {
      const { state: syncedState } = ensureRoleContextState(state);
      const backfilledState = backfillLegacyRolePerspective(syncedState, generateId);
      return rebuildActiveContactRolePerspective(backfilledState, generateId);
    }),
});
