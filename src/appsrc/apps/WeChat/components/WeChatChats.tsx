import React, { useEffect, useMemo, useRef } from 'react';
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

export const WeChatChats: React.FC<WeChatChatsProps> = ({ onSelectChat }) => {
  const wechatCharacters = useWeChatFriendCharactersFromContacts();
  const inspectorVisibleRoleIds = useInspectorVisibleRoleIds();
  const activeRoleId = useWeChatStore((state) => state.activeRoleId);
  const wechatSessions = useWeChatStore((state) => state.wechatSessions);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);
  const syncWeChatRoleContext = useWeChatStore((state) => state.syncWeChatRoleContext);
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const parentRef = useRef<HTMLDivElement>(null);

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
    if (!isContactRoleId(effectiveRoleId)) return wechatCharacters;

    const characterById = new Map(wechatCharacters.map((item) => [item.id, item]));
    const result: typeof wechatCharacters = [];
    const added = new Set<string>();

    for (const session of safeSessions) {
      const characterId = session.characterId.trim();
      if (!characterId) continue;
      if (session.messages.length === 0) continue;

      const roleId = parseRoleCharacterId(characterId);
      if (!roleId || !inspectorVisibleRoleIds.has(roleId)) continue;
      if (added.has(characterId)) continue;

      const character = characterById.get(characterId);
      if (!character) continue;

      added.add(characterId);
      result.push(character);
    }

    if (result.length > 0 || !activeContactId) return result;

    // 兜底：若联系人角色分仓尚未镜像完成，直接从默认身份/我的名片分仓推导可展示项
    Object.entries(wechatStateByRoleId).forEach(([sourceRoleId, sourceRoleState]) => {
      if (!inspectorVisibleRoleIds.has(sourceRoleId)) return;

      const sourceSession = toSafeSessions(sourceRoleState?.wechatSessions).find(
        (item) => item.characterId === activeContactId && item.messages.length > 0
      );
      if (!sourceSession) return;

      const fallbackCharacterId = createRoleCharacterId(sourceRoleId);
      if (added.has(fallbackCharacterId)) return;

      const fallbackCharacter = characterById.get(fallbackCharacterId);
      if (!fallbackCharacter) return;

      added.add(fallbackCharacterId);
      result.push(fallbackCharacter);
    });

    return result;
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

  const getLastMessageInfo = (characterId: string) => {
    let session = safeSessions.find((item) => item.characterId === characterId);

    if (!session && isContactRoleId(effectiveRoleId) && activeContactId) {
      const sourceRoleId = parseRoleCharacterId(characterId);
      if (sourceRoleId && inspectorVisibleRoleIds.has(sourceRoleId)) {
        session = toSafeSessions(wechatStateByRoleId[sourceRoleId]?.wechatSessions).find(
          (item) => item.characterId === activeContactId
        );
      }
    }

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

            return (
              <div
                key={`${character.id}-${virtualItem.index}`}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                onClick={() => onSelectChat(character.id)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="flex items-center px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50 cursor-pointer"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                  {character.avatar ? (
                    <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[16px] font-medium text-gray-900 truncate">{character.name}</span>
                    <span className="text-[12px] text-gray-400 shrink-0 ml-2">{formatTime(lastMessageInfo.time)}</span>
                  </div>
                  <p className="text-[14px] text-gray-500 truncate">{lastMessageInfo.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
