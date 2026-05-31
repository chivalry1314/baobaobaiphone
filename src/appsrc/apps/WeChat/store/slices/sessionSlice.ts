import { createDefaultRoleScopedState } from '../defaults';
import type { WeChatRoleScopedState, WeChatState } from '../types';
import {
  createContactRoleId,
  createRoleCharacterId,
  parseContactRoleId,
  parseRoleCharacterId,
} from '../../../../shared/business/roleIdentity';
import { wechatMemoryController } from '../../memory';
import type { WeChatMessage, WeChatSession } from '../../types';
import type { WeChatMessageMemoryOptions } from './types';

const DELETED_MEMORY_SOURCE_LIMIT = 240;
const DELETED_MEMORY_HINT_LIMIT = 80;

const slugifyInspectorValue = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const ascii = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (ascii) return ascii.slice(0, 32);

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36) || 'contact';
};

const isInspectorGeneratedSessionForSource = (
  session: WeChatSession,
  sourceContactId: string
): boolean => {
  if (session.inspectorGeneratedContact?.sourceContactId === sourceContactId) return true;
  const legacyPrefix = `inspector-gen-${slugifyInspectorValue(sourceContactId)}-`;
  return session.characterId.trim().startsWith(legacyPrefix);
};

const normalizeDeletedMemoryHint = (content: string): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 80) return normalized;
  return normalized.slice(0, 80);
};

interface MirrorPlan {
  mirrorRoleId: string;
  mirrorCharacterId: string;
}

interface SeededPerspectiveSession {
  messages: WeChatMessage[];
  lastUpdated: number;
}

const resolveMirrorCharacterIdFromSourceRole = (sourceRoleId: string): string => {
  const sourceContactId = parseContactRoleId(sourceRoleId);
  return sourceContactId || createRoleCharacterId(sourceRoleId);
};

const resolveMirrorPlan = (
  sourceRoleId: string,
  sourceCharacterId: string
): MirrorPlan | null => {
  const normalizedCharacterId = sourceCharacterId.trim();
  if (!normalizedCharacterId) return null;

  const peerRoleId = parseRoleCharacterId(normalizedCharacterId);
  if (peerRoleId) {
    const mirrorCharacterId = resolveMirrorCharacterIdFromSourceRole(sourceRoleId);
    if (peerRoleId === sourceRoleId) return null;
    return {
      mirrorRoleId: peerRoleId,
      mirrorCharacterId,
    };
  }

  const mirrorRoleId = createContactRoleId(normalizedCharacterId);
  if (mirrorRoleId === sourceRoleId) return null;

  return {
    mirrorRoleId,
    mirrorCharacterId: resolveMirrorCharacterIdFromSourceRole(sourceRoleId),
  };
};

const appendMessageToMirrorRole = (input: {
  roleState: WeChatRoleScopedState;
  roleId: string;
  characterId: string;
  message: WeChatMessage;
  timestamp: number;
  generateId: () => string;
}): WeChatRoleScopedState => {
  const { roleState, roleId, characterId, message, timestamp, generateId } = input;
  const existingSession = roleState.wechatSessions.find((session) => session.characterId === characterId);

  if (!existingSession) {
    const nextSession: WeChatSession = {
      id: `session-${roleId}-${generateId()}`,
      characterId,
      messages: [message],
      lastUpdated: timestamp,
      unreadCount: message.role === 'character' ? 1 : 0,
    };
    return {
      ...roleState,
      wechatSessions: [nextSession, ...roleState.wechatSessions],
    };
  }

  return {
    ...roleState,
    wechatSessions: roleState.wechatSessions.map((session) =>
      session.id === existingSession.id
        ? {
            ...session,
            messages: [...session.messages, message],
            lastUpdated: timestamp,
            unreadCount:
              message.role === 'character' ? session.unreadCount + 1 : session.unreadCount,
          }
        : session
    ),
  };
};

const resolveSeededPerspectiveSession = (
  state: WeChatState,
  activeRoleId: string,
  targetCharacterId: string,
  generateId: () => string
): SeededPerspectiveSession | null => {
  const contactId = parseContactRoleId(activeRoleId);
  if (!contactId) return null;

  const peerRoleId = parseRoleCharacterId(targetCharacterId);
  if (!peerRoleId || peerRoleId === activeRoleId) return null;

  const peerRoleState = state.wechatStateByRoleId[peerRoleId];
  if (!peerRoleState) return null;

  const sourceSession = peerRoleState.wechatSessions.find(
    (session) => session.characterId === contactId
  );
  if (!sourceSession || sourceSession.messages.length === 0) return null;

  return {
    messages: sourceSession.messages.map((message) => ({
      ...message,
      id: generateId(),
      role: message.role === 'user' ? 'character' : 'user',
    })),
    lastUpdated: sourceSession.lastUpdated,
  };
};

export const createWeChatSessionSlice = ({
  set,
  get,
  ensureRoleContextState,
  applyRoleState,
  generateId,
  normalizeMessageContentForMemory,
  shouldRecordInteractionMemory,
}: WeChatMessageMemoryOptions): Pick<
  WeChatState,
  | 'ensureWeChatSession'
  | 'createWeChatSession'
  | 'addWeChatMessage'
  | 'updateWeChatMessage'
  | 'setWeChatCurrentSession'
  | 'deleteWeChatMessages'
  | 'updateWeChatSessionSettings'
  | 'importWeChatInspectorSnapshot'
  | 'clearWeChatInspectorSnapshot'
  | 'clearWeChatInspectorContacts'
> => ({
  ensureWeChatSession: (characterId, options) => {
    const normalizedCharacterId = characterId.trim();
    if (!normalizedCharacterId) return '';

    let resolvedSessionId = '';
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const existingSession = roleState.wechatSessions.find(
        (item) => item.characterId === normalizedCharacterId
      );
      const shouldSwitchCurrent = options?.switchCurrent !== false;
      const seededSession = resolveSeededPerspectiveSession(
        syncedState,
        roleId,
        normalizedCharacterId,
        generateId
      );

      if (existingSession) {
        resolvedSessionId = existingSession.id;
        if (existingSession.messages.length === 0 && seededSession && seededSession.messages.length > 0) {
          return applyRoleState(syncedState, roleId, {
            ...roleState,
            wechatSessions: roleState.wechatSessions.map((session) =>
              session.id === existingSession.id
                ? {
                    ...session,
                    messages: seededSession.messages,
                    lastUpdated: seededSession.lastUpdated,
                    unreadCount: 0,
                  }
                : session
            ),
            wechatCurrentSessionId: shouldSwitchCurrent
              ? existingSession.id
              : roleState.wechatCurrentSessionId,
          });
        }

        if (!shouldSwitchCurrent || roleState.wechatCurrentSessionId === existingSession.id) {
          return syncedState;
        }

        return applyRoleState(syncedState, roleId, {
          ...roleState,
          wechatCurrentSessionId: existingSession.id,
        });
      }

      resolvedSessionId = `session-${roleId}-${generateId()}`;
      const nextSession: WeChatSession = {
        id: resolvedSessionId,
        characterId: normalizedCharacterId,
        messages: seededSession?.messages || [],
        lastUpdated: seededSession?.lastUpdated || Date.now(),
        unreadCount: 0,
        isPinned: false,
        chatBackgroundImage: '',
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: [nextSession, ...roleState.wechatSessions],
        wechatCurrentSessionId: shouldSwitchCurrent
          ? resolvedSessionId
          : roleState.wechatCurrentSessionId,
      });
    });

    return resolvedSessionId;
  },

  createWeChatSession: (characterId) =>
    get().ensureWeChatSession(characterId, { switchCurrent: true }),

  addWeChatMessage: (sessionId, message) => {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) return;

    let memoryPayload:
      | {
          contactId: string;
          sessionId: string;
          sourceId: string;
          sourceType: WeChatMessage['type'];
          role: 'user' | 'assistant';
          content: string;
          timestamp: number;
        }
      | null = null;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const targetSession = roleState.wechatSessions.find(
        (session) => session.id === normalizedSessionId
      );
      if (!targetSession) return syncedState;

      const messageId = generateId();
      const timestamp = Date.now();
      const nextMessage: WeChatMessage = {
        ...message,
        id: messageId,
        timestamp,
      };

      const normalizedContent = normalizeMessageContentForMemory(message);
      const canRecordMemory =
        (message.role === 'user' || message.role === 'character') &&
        shouldRecordInteractionMemory(normalizedContent);

      if (canRecordMemory) {
        memoryPayload = {
          contactId: targetSession.characterId,
          sessionId: normalizedSessionId,
          sourceId: messageId,
          sourceType: message.type,
          role: message.role === 'user' ? 'user' : 'assistant',
          content: normalizedContent,
          timestamp,
        };
      }

      const nextCurrentRoleState: WeChatRoleScopedState = {
        ...roleState,
        wechatSessions: roleState.wechatSessions.map((session) =>
          session.id === normalizedSessionId
            ? {
                ...session,
                messages: [...session.messages, nextMessage],
                lastUpdated: timestamp,
                unreadCount:
                  message.role === 'character' && roleState.wechatCurrentSessionId !== normalizedSessionId
                    ? Math.max(0, Number(session.unreadCount) || 0) + 1
                    : session.unreadCount,
              }
            : session
        ),
      };

      let nextState = applyRoleState(syncedState, roleId, nextCurrentRoleState);

      const mirrorPlan = resolveMirrorPlan(roleId, targetSession.characterId);
      if (!mirrorPlan) return nextState;

      const mirrorRoleState =
        nextState.wechatStateByRoleId[mirrorPlan.mirrorRoleId] || createDefaultRoleScopedState();
      const mirroredMessage: WeChatMessage = {
        ...nextMessage,
        id: generateId(),
        role: nextMessage.role === 'user' ? 'character' : 'user',
      };

      const nextMirrorRoleState = appendMessageToMirrorRole({
        roleState: mirrorRoleState,
        roleId: mirrorPlan.mirrorRoleId,
        characterId: mirrorPlan.mirrorCharacterId,
        message: mirroredMessage,
        timestamp,
        generateId,
      });

      nextState = applyRoleState(nextState, mirrorPlan.mirrorRoleId, nextMirrorRoleState);
      return nextState;
    });

    if (memoryPayload) {
      wechatMemoryController.record(memoryPayload);
    }
  },

  updateWeChatMessage: (sessionId, messageId, patch) => {
    const normalizedSessionId = sessionId.trim();
    const normalizedMessageId = messageId.trim();
    if (!normalizedSessionId || !normalizedMessageId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: roleState.wechatSessions.map((session) =>
          session.id === normalizedSessionId
            ? {
                ...session,
                messages: session.messages.map((messageItem) =>
                  messageItem.id === normalizedMessageId
                    ? { ...messageItem, ...patch }
                    : messageItem
                ),
                lastUpdated: Date.now(),
              }
            : session
        ),
      });
    });
  },

  setWeChatCurrentSession: (id) => {
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const normalizedSessionId = id?.trim() || null;

      if (!normalizedSessionId) {
        if (roleState.wechatCurrentSessionId === null) return syncedState;
        return applyRoleState(syncedState, roleId, {
          ...roleState,
          wechatCurrentSessionId: null,
        });
      }

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatCurrentSessionId: normalizedSessionId,
        wechatSessions: roleState.wechatSessions.map((session) =>
          session.id === normalizedSessionId ? { ...session, unreadCount: 0 } : session
        ),
      });
    });
  },

  updateWeChatSessionSettings: (sessionId, settings) => {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: roleState.wechatSessions.map((session) =>
          session.id === normalizedSessionId
            ? {
                ...session,
                ...settings,
              }
            : session
        ),
      });
    });
  },

  deleteWeChatMessages: (sessionId, messageIds) => {
    const normalizedSessionId = sessionId.trim();
    const normalizedMessageIds = messageIds.map((id) => id.trim()).filter(Boolean);
    if (!normalizedSessionId || normalizedMessageIds.length === 0) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const targetSession = roleState.wechatSessions.find(
        (session) => session.id === normalizedSessionId
      );
      const deletedMessages = (targetSession?.messages || []).filter((message) =>
        normalizedMessageIds.includes(message.id)
      );
      const deletedMemoryHints = deletedMessages
        .map((message) => normalizeMessageContentForMemory(message))
        .map(normalizeDeletedMemoryHint)
        .filter((content) => content.length >= 4);
      const deletedSourceIds = [
        ...normalizedMessageIds,
        ...roleState.wechatDeletedMemorySourceIds,
      ].filter(Boolean);
      const deletedContentHints = [
        ...deletedMemoryHints,
        ...roleState.wechatDeletedMemoryContentHints,
      ].filter(Boolean);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatDeletedMemorySourceIds: [...new Set(deletedSourceIds)].slice(0, DELETED_MEMORY_SOURCE_LIMIT),
        wechatDeletedMemoryContentHints: [...new Set(deletedContentHints)].slice(0, DELETED_MEMORY_HINT_LIMIT),
        wechatSessions: roleState.wechatSessions.map((session) =>
          session.id === normalizedSessionId
            ? {
                ...session,
                messages: session.messages.filter(
                  (message) => !normalizedMessageIds.includes(message.id)
                ),
              }
            : session
        ),
      });
    });

    wechatMemoryController.removeBySessionSources(normalizedSessionId, normalizedMessageIds);
  },

  importWeChatInspectorSnapshot: (targetRoleId, snapshot) => {
    const normalizedRoleId = targetRoleId.trim();
    const sourceContactId = snapshot.sourceContactId.trim();
    if (!normalizedRoleId || !sourceContactId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(
        state,
        normalizedRoleId
      );
      const replacingCharacterIds = new Set(snapshot.sessions.map((session) => session.characterId));
      const existingManualSessions = roleState.wechatSessions.filter((session) => {
        if (replacingCharacterIds.has(session.characterId)) return false;
        return true;
      });
      const existingManualBills = roleState.wechatBills.filter(
        (bill) => bill.inspectorGeneratedSourceContactId !== sourceContactId
      );
      const nextSessions = snapshot.sessions.filter((session) => session.characterId.trim());
      const nextBills = snapshot.bills.filter((bill) => Number.isFinite(bill.amount) && bill.amount > 0);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: [...nextSessions, ...existingManualSessions],
        wechatCurrentSessionId: roleState.wechatCurrentSessionId,
        wechatBills: [...nextBills, ...existingManualBills],
        wechatUserProfile: {
          ...roleState.wechatUserProfile,
          balance:
            Number(roleState.wechatUserProfile.balance || 0) > 0
              ? roleState.wechatUserProfile.balance
              : Number((88 + Math.random() * 1888).toFixed(2)),
        },
      });
    });
  },

  clearWeChatInspectorSnapshot: (targetRoleId, sourceContactId) => {
    const normalizedRoleId = targetRoleId.trim();
    const normalizedSourceContactId = sourceContactId.trim();
    if (!normalizedRoleId || !normalizedSourceContactId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(
        state,
        normalizedRoleId
      );

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: roleState.wechatSessions.filter(
          (session) =>
            !isInspectorGeneratedSessionForSource(session, normalizedSourceContactId)
        ),
        wechatCurrentSessionId:
          roleState.wechatCurrentSessionId &&
          roleState.wechatSessions.some(
            (session) =>
              session.id === roleState.wechatCurrentSessionId &&
              isInspectorGeneratedSessionForSource(session, normalizedSourceContactId)
          )
            ? null
            : roleState.wechatCurrentSessionId,
        wechatBills: roleState.wechatBills.filter(
          (bill) => bill.inspectorGeneratedSourceContactId !== normalizedSourceContactId
        ),
      });
    });
  },

  clearWeChatInspectorContacts: (targetRoleId, sourceContactId) => {
    const normalizedRoleId = targetRoleId.trim();
    const normalizedSourceContactId = sourceContactId.trim();
    if (!normalizedRoleId || !normalizedSourceContactId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(
        state,
        normalizedRoleId
      );

      const removedSessionIds = new Set(
        roleState.wechatSessions
          .filter(
            (session) =>
              isInspectorGeneratedSessionForSource(session, normalizedSourceContactId)
          )
          .map((session) => session.id)
      );

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatSessions: roleState.wechatSessions.filter((session) => !removedSessionIds.has(session.id)),
        wechatCurrentSessionId:
          roleState.wechatCurrentSessionId && removedSessionIds.has(roleState.wechatCurrentSessionId)
            ? null
            : roleState.wechatCurrentSessionId,
      });
    });
  },
});
