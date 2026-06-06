import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { User } from 'lucide-react';
import {
  createRoleCharacterId,
  isContactRoleId,
  parseContactRoleId,
  parseRoleCharacterId,
} from '../../../shared/business/roleIdentity';
import { useRoleRuntimeStore } from '../../../shared/business/roleRuntime';
import { useInspectorVisibleRoleIds, useWeChatFriendCharactersFromContacts } from '../contactAdapter';
import { useWeChatStore } from '../store';
import type { WeChatChatsProps, WeChatSession } from '../types';

const isSessionLike = (session: unknown): session is WeChatSession => {
  if (!session || typeof session !== 'object') return false;
  const candidate = session as Partial<WeChatSession>;
  return typeof candidate.characterId === 'string' && Array.isArray(candidate.messages);
};

const toSafeSessions = (sessions: unknown): WeChatSession[] => {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter(isSessionLike);
};

const isInspectorGeneratedCharacterId = (characterId: string): boolean =>
  characterId.trim().startsWith('inspector-gen-');

const SWIPE_ACTION_WIDTH = 176;
const SWIPE_REVEAL_THRESHOLD = 44;

export const WeChatChats: React.FC<WeChatChatsProps> = ({ onSelectChat }) => {
  const wechatCharacters = useWeChatFriendCharactersFromContacts();
  const inspectorVisibleRoleIds = useInspectorVisibleRoleIds();
  const activeRoleId = useWeChatStore((state) => state.activeRoleId);
  const wechatSessions = useWeChatStore((state) => state.wechatSessions);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);
  const syncWeChatRoleContext = useWeChatStore((state) => state.syncWeChatRoleContext);
  const hideWeChatSession = useWeChatStore((state) => state.hideWeChatSession);
  const deleteWeChatSession = useWeChatStore((state) => state.deleteWeChatSession);
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const parentRef = useRef<HTMLDivElement>(null);
  const [openActionSessionId, setOpenActionSessionId] = useState<string | null>(null);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    sessionId: string;
    name: string;
  } | null>(null);
  const swipeRef = useRef<{
    sessionId: string;
    startX: number;
    startY: number;
    startOffset: number;
    currentOffset: number;
    dragging: boolean;
  } | null>(null);

  const effectiveRoleId = runtimeRoleId || activeRoleId;
  const activeContactId = parseContactRoleId(effectiveRoleId);

  useEffect(() => {
    if (!isContactRoleId(effectiveRoleId)) return;
    syncWeChatRoleContext();
  }, [effectiveRoleId, syncWeChatRoleContext]);

  const roleScopedSessions = useMemo(() => {
    const scopedSessions = wechatStateByRoleId[effectiveRoleId]?.wechatSessions;
    if (Array.isArray(scopedSessions)) return scopedSessions;
    return wechatSessions;
  }, [effectiveRoleId, wechatSessions, wechatStateByRoleId]);

  const safeSessions = useMemo(() => toSafeSessions(roleScopedSessions), [roleScopedSessions]);

  const displayCharacters = useMemo(() => {
    const resolveSessionForCharacter = (characterId: string) => {
      let session = safeSessions.find((item) => item.characterId === characterId && !item.isHidden);

      if (!session && isContactRoleId(effectiveRoleId) && activeContactId) {
        const sourceRoleId = parseRoleCharacterId(characterId);
        if (sourceRoleId && inspectorVisibleRoleIds.has(sourceRoleId)) {
          session = toSafeSessions(wechatStateByRoleId[sourceRoleId]?.wechatSessions).find(
            (item) => item.characterId === activeContactId && !item.isHidden
          );
        }
      }

      return session;
    };
    const sortCharacters = (items: typeof wechatCharacters) =>
      [...items].sort((left, right) => {
        const leftSession = resolveSessionForCharacter(left.id);
        const rightSession = resolveSessionForCharacter(right.id);
        const pinnedDelta = Number(Boolean(rightSession?.isPinned)) - Number(Boolean(leftSession?.isPinned));
        if (pinnedDelta !== 0) return pinnedDelta;
        return (rightSession?.lastUpdated || 0) - (leftSession?.lastUpdated || 0);
      });

    if (!isContactRoleId(effectiveRoleId)) {
      const visibleCharacters = wechatCharacters.filter((character) => {
        const hiddenSession = safeSessions.find(
          (session) => session.characterId === character.id && session.isHidden
        );
        return !hiddenSession;
      });
      return sortCharacters(visibleCharacters);
    }

    const characterById = new Map(wechatCharacters.map((item) => [item.id, item]));
    const result: typeof wechatCharacters = [];
    const added = new Set<string>();

    for (const session of safeSessions) {
      const characterId = session.characterId.trim();
      if (!characterId) continue;
      if (session.isHidden) continue;
      if (session.messages.length === 0) continue;

      const roleId = parseRoleCharacterId(characterId);
      const isGenerated = isInspectorGeneratedCharacterId(characterId);
      if (!isGenerated && (!roleId || !inspectorVisibleRoleIds.has(roleId))) continue;
      if (added.has(characterId)) continue;

      const character = characterById.get(characterId);
      if (!character) continue;

      added.add(characterId);
      result.push(character);
    }

    if (result.length > 0 || !activeContactId) return sortCharacters(result);

    // 兜底：若联系人角色分仓尚未镜像完成，直接从默认身份/我的名片分仓推导可展示项
    Object.entries(wechatStateByRoleId).forEach(([sourceRoleId, sourceRoleState]) => {
      if (!inspectorVisibleRoleIds.has(sourceRoleId)) return;

      const sourceSession = toSafeSessions(sourceRoleState?.wechatSessions).find(
        (item) => item.characterId === activeContactId && !item.isHidden && item.messages.length > 0
      );
      if (!sourceSession) return;

      const fallbackCharacterId = createRoleCharacterId(sourceRoleId);
      if (added.has(fallbackCharacterId)) return;

      const fallbackCharacter = characterById.get(fallbackCharacterId);
      if (!fallbackCharacter) return;

      added.add(fallbackCharacterId);
      result.push(fallbackCharacter);
    });

    return sortCharacters(result);
  }, [activeContactId, effectiveRoleId, inspectorVisibleRoleIds, safeSessions, wechatCharacters, wechatStateByRoleId]);

  const formatTime = (timestamp: number) => {
    if (!Number.isFinite(timestamp)) return '';
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffTime = Math.abs(now.getTime() - messageDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 1) {
      return messageDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      return `周${weekdays[messageDate.getDay()]}`;
    } else {
      return messageDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  const resolveSessionForDisplayCharacter = (characterId: string) => {
    let session = safeSessions.find((item) => item.characterId === characterId && !item.isHidden);

    if (!session && isContactRoleId(effectiveRoleId) && activeContactId) {
      const sourceRoleId = parseRoleCharacterId(characterId);
      if (sourceRoleId && inspectorVisibleRoleIds.has(sourceRoleId)) {
        session = toSafeSessions(wechatStateByRoleId[sourceRoleId]?.wechatSessions).find(
          (item) => item.characterId === activeContactId && !item.isHidden
        );
      }
    }

    return session;
  };

  const setSessionSwipeOffset = useCallback((sessionId: string, offset: number) => {
    setSwipeOffsets((prev) => ({ ...prev, [sessionId]: Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, offset)) }));
  }, []);

  const closeSwipeActions = useCallback(() => {
    setOpenActionSessionId(null);
    setSwipeOffsets({});
  }, []);

  const handleSwipePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, sessionId: string) => {
      if (!sessionId) return;
      const currentOffset = openActionSessionId === sessionId ? -SWIPE_ACTION_WIDTH : swipeOffsets[sessionId] || 0;
      swipeRef.current = {
        sessionId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: currentOffset,
        currentOffset,
        dragging: false,
      };
    },
    [openActionSessionId, swipeOffsets]
  );

  const handleSwipePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe) return;
      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      if (!swipe.dragging && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (!swipe.dragging && Math.abs(dy) > Math.abs(dx)) {
        swipeRef.current = null;
        return;
      }
      swipe.dragging = true;
      event.preventDefault();
      swipe.currentOffset = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, swipe.startOffset + dx));
      setSessionSwipeOffset(swipe.sessionId, swipe.currentOffset);
    },
    [setSessionSwipeOffset]
  );

  const handleSwipePointerEnd = useCallback(() => {
    const swipe = swipeRef.current;
    if (!swipe) return;
    swipeRef.current = null;
    const offset = swipe.currentOffset;
    if (offset <= -SWIPE_REVEAL_THRESHOLD) {
      setOpenActionSessionId(swipe.sessionId);
      setSessionSwipeOffset(swipe.sessionId, -SWIPE_ACTION_WIDTH);
    } else {
      setOpenActionSessionId(null);
      setSessionSwipeOffset(swipe.sessionId, 0);
    }
  }, [setSessionSwipeOffset, swipeOffsets]);

  const handleHideSession = useCallback(
    (sessionId: string) => {
      hideWeChatSession(sessionId);
      closeSwipeActions();
    },
    [closeSwipeActions, hideWeChatSession]
  );

  const handleDeleteSession = useCallback(() => {
    if (!deleteConfirmTarget) return;
    deleteWeChatSession(deleteConfirmTarget.sessionId);
    setDeleteConfirmTarget(null);
    closeSwipeActions();
  }, [closeSwipeActions, deleteConfirmTarget, deleteWeChatSession]);

  const getLastMessageInfo = (characterId: string) => {
    const session = resolveSessionForDisplayCharacter(characterId);

    if (session && session.messages.length > 0) {
      const lastMessage = session.messages[session.messages.length - 1];
      const text =
        lastMessage.type === 'voice'
          ? '[语音]'
          : lastMessage.type === 'transfer'
          ? '[转账]'
          : lastMessage.type === 'transfer_accepted'
          ? '[已收款]'
          : typeof lastMessage.content === 'string'
          ? lastMessage.content
          : '';
      return {
        text,
        time: Number.isFinite(lastMessage.timestamp) ? lastMessage.timestamp : Date.now(),
      };
    }

    return {
      text: '暂无消息',
      time: Date.now(),
    };
  };

  const virtualizer = useVirtualizer({
    count: displayCharacters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
    useAnimationFrameWithResizeObserver: true,
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#EDEDED' }}>
      <div
        ref={parentRef}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const character = displayCharacters[virtualItem.index];
            if (!character) return null;
            const lastMessageInfo = getLastMessageInfo(character.id);
            const session = resolveSessionForDisplayCharacter(character.id);
            const sessionId = session?.id || '';
            const unreadCount = Math.max(0, Number(session?.unreadCount) || 0);
            const swipeOffset = sessionId
              ? openActionSessionId === sessionId
                ? -SWIPE_ACTION_WIDTH
                : swipeOffsets[sessionId] || 0
              : 0;

            return (
              <div
                key={`${character.id}-${virtualItem.index}`}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="overflow-hidden bg-white"
              >
                <div className="absolute inset-y-0 right-0 flex w-[176px]">
                  <button
                    type="button"
                    disabled={!sessionId}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (sessionId) handleHideSession(sessionId);
                    }}
                    className="flex w-[88px] items-center justify-center bg-[#FF9F0A] text-[15px] font-medium text-white disabled:opacity-50"
                  >
                    不显示
                  </button>
                  <button
                    type="button"
                    disabled={!sessionId}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (sessionId) setDeleteConfirmTarget({ sessionId, name: character.name });
                    }}
                    className="flex w-[88px] items-center justify-center bg-[#FA5151] text-[15px] font-medium text-white disabled:opacity-50"
                  >
                    删除
                  </button>
                </div>
                <div
                  onClick={() => {
                    if (openActionSessionId && openActionSessionId !== sessionId) {
                      closeSwipeActions();
                      return;
                    }
                    if (openActionSessionId === sessionId) {
                      closeSwipeActions();
                      return;
                    }
                    onSelectChat(character.id);
                  }}
                  onPointerDown={(event) => handleSwipePointerDown(event, sessionId)}
                  onPointerMove={handleSwipePointerMove}
                  onPointerUp={handleSwipePointerEnd}
                  onPointerCancel={handleSwipePointerEnd}
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: swipeRef.current?.sessionId === sessionId ? 'none' : 'transform 180ms ease-out',
                    touchAction: 'pan-y',
                  }}
                  className="relative z-10 flex cursor-pointer items-center border-b border-gray-100 bg-white px-4 py-3 active:bg-gray-50"
                >
                  <div className="relative w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                    {unreadCount > 0 ? (
                      <span
                        className="absolute z-10 h-3.5 min-w-3.5 rounded-full bg-[#FA5151] ring-2 ring-white"
                        style={{ right: '-4px', top: '-4px' }}
                      />
                    ) : null}
                    <div className="h-full w-full overflow-hidden rounded-lg flex items-center justify-center">
                    {character.avatar ? (
                      <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} />
                    )}
                    </div>
                  </div>
                  <div className="flex-1 ml-3 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[16px] font-medium text-gray-900 truncate">{character.name}</span>
                      <span className="text-[12px] text-gray-400 shrink-0 ml-2">{formatTime(lastMessageInfo.time)}</span>
                    </div>
                    <p className="text-[14px] text-gray-500 truncate">{lastMessageInfo.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {deleteConfirmTarget ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 px-8">
          <div className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-white text-center shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="text-[16px] font-semibold text-gray-900">删除会话？</div>
              <div className="mt-2 text-[13px] leading-5 text-gray-500">
                将删除与「{deleteConfirmTarget.name}」的聊天记录，此操作不可撤销。
              </div>
            </div>
            <div className="flex h-12 divide-x divide-gray-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 text-[15px] text-gray-600 active:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                className="flex-1 text-[15px] font-medium text-[#FA5151] active:bg-gray-50"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
