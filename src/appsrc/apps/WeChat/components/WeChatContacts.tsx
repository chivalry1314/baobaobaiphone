import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, MessageSquare, Tag, User, Users } from 'lucide-react';
import pinyin from 'pinyin';
import { DEFAULT_ACTIVE_ROLE_ID, isContactRoleId, parseRoleCharacterId } from '../../../shared/business/roleIdentity';
import { useRoleRuntimeStore } from '../../../shared/business/roleRuntime';
import type { WeChatContactsProps } from '../types';
import {
  useIncomingRequestContacts,
  useInspectorVisibleRoleIds,
  useWeChatFriendCharactersFromContacts,
} from '../contactAdapter';
import { useWeChatStore } from '../store';

interface ListItem {
  id: string;
  type: 'fixed' | 'letter' | 'contact' | 'additional';
  data?: {
    id?: string;
    label?: string;
    icon?: unknown;
    color?: string;
    count?: number;
    iconBg?: string;
    iconColor?: string;
    isLucide?: boolean;
    name?: string;
    avatar?: string;
  };
  letter?: string;
}

const getPinyinInitial = (name: string): string => {
  if (!name) return '#';
  const firstChar = name.charAt(0);
  if (/[一-龥]/.test(firstChar)) {
    const pinyinArray = pinyin(firstChar, { style: pinyin.STYLE_FIRST_LETTER, heteronym: false });
    return pinyinArray[0][0].toUpperCase();
  }
  return firstChar.toUpperCase();
};

const isInspectorGeneratedCharacterId = (characterId: string): boolean =>
  characterId.trim().startsWith('inspector-gen-');

export const WeChatContacts: React.FC<WeChatContactsProps> = ({ onSelectContact, onOpenNewFriends }) => {
  const friendCharacters = useWeChatFriendCharactersFromContacts();
  const incomingRequests = useIncomingRequestContacts();
  const inspectorVisibleRoleIds = useInspectorVisibleRoleIds();
  const activeRoleId = useWeChatStore((state) => state.activeRoleId);
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const parentRef = useRef<HTMLDivElement>(null);
  const effectiveRoleId = runtimeRoleId || activeRoleId;
  const isInspectorContactRoleMode = isContactRoleId(effectiveRoleId);

  const filteredCharacters = useMemo(() => {
    if (!isInspectorContactRoleMode) return friendCharacters;

    return friendCharacters.filter((character) => {
      if (isInspectorGeneratedCharacterId(character.id)) return true;
      const roleId = parseRoleCharacterId(character.id);
      if (!roleId) return false;
      return roleId === DEFAULT_ACTIVE_ROLE_ID || inspectorVisibleRoleIds.has(roleId);
    });
  }, [friendCharacters, inspectorVisibleRoleIds, isInspectorContactRoleMode]);

  const fixedSections = useMemo(
    () =>
      isInspectorContactRoleMode
        ? []
        : [
            { id: 'new-friends', label: '新的朋友', icon: Users, color: 'bg-orange-500', count: incomingRequests.length },
            { id: 'groups', label: '群聊', icon: Users, color: 'bg-green-500', count: 0 },
            { id: 'tags', label: '标签', icon: Tag, color: 'bg-blue-500', count: 0 },
          ],
    [incomingRequests.length, isInspectorContactRoleMode]
  );

  const listItems = useMemo(() => {
    const grouped = filteredCharacters.reduce<Record<string, typeof filteredCharacters>>((acc, character) => {
      const key = getPinyinInitial(character.name);
      if (!acc[key]) acc[key] = [];
      acc[key].push(character);
      return acc;
    }, {});

    const letters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    const items: ListItem[] = [];

    fixedSections.forEach((section) => {
      items.push({ id: section.id, type: 'fixed', data: section });
    });

    letters.forEach((letter) => {
      items.push({ id: `header-${letter}`, type: 'letter', letter });
      grouped[letter].forEach((character) => {
        items.push({
          id: character.id,
          type: 'contact',
          data: {
            id: character.id,
            name: character.name,
            avatar: character.avatar,
          },
        });
      });
    });

    if (!isInspectorContactRoleMode) {
      items.push({
        id: 'file-helper',
        type: 'additional',
        data: { id: 'file-helper', name: '文件传输助手', icon: '📁', iconBg: 'bg-green-100', iconColor: 'text-green-500' },
      });
      items.push({
        id: 'wechat-team',
        type: 'additional',
        data: {
          id: 'wechat-team',
          name: '微信团队',
          icon: MessageSquare,
          iconBg: 'bg-green-500',
          iconColor: 'text-white',
          isLucide: true,
        },
      });
    }

    return items;
  }, [fixedSections, filteredCharacters, isInspectorContactRoleMode]);

  const virtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
    useAnimationFrameWithResizeObserver: true,
    getItemKey: (index) => listItems[index]?.id ?? `wechat-contact-row-${index}`,
  });

  const scrollToLetter = (letter: string) => {
    const index = listItems.findIndex((item) => item.type === 'letter' && item.letter === letter);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'start' });
    }
  };

  const handleFixedClick = (id?: string) => {
    if (id === 'new-friends') onOpenNewFriends();
  };

  const renderItem = (item: ListItem) => {
    if (item.type === 'fixed') {
      const Icon = item.data?.icon === Tag ? Tag : Users;
      const isClickable = item.data?.id === 'new-friends';
      return (
        <button
          type="button"
          onClick={() => handleFixedClick(item.data?.id)}
          className={`flex w-full items-center gap-4 border-b border-gray-100 px-4 py-3 ${
            isClickable ? 'active:bg-gray-50 cursor-pointer' : ''
          }`}
        >
          <div className={`h-12 w-12 rounded-xl ${item.data?.color ?? 'bg-gray-300'} flex items-center justify-center text-white shadow-sm`}>
            <Icon size={22} />
          </div>
          <span className="flex-1 text-left text-[16px] font-medium text-gray-900">{item.data?.label}</span>
          {item.data?.count ? (
            <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] text-white">{item.data.count}</span>
          ) : null}
          {isClickable ? <ChevronRight size={20} className="text-gray-300" /> : null}
        </button>
      );
    }

    if (item.type === 'letter') {
      return (
        <div className="bg-gray-100 px-4 py-2">
          <span className="text-[13px] font-semibold text-gray-500">{item.letter}</span>
        </div>
      );
    }

    if (item.type === 'contact') {
      const id = item.data?.id ?? '';
      return (
        <button
          type="button"
          onClick={() => onSelectContact(id)}
          className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-3 active:bg-gray-50"
        >
          <div className="h-14 w-14 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden shadow-sm">
            {item.data?.avatar ? (
              <img src={item.data.avatar} alt={item.data.name} className="h-full w-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <span className="flex-1 text-left text-[16px] font-medium text-gray-900">{item.data?.name}</span>
        </button>
      );
    }

    if (item.type === 'additional') {
      return (
        <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3">
          <div className={`h-12 w-12 rounded-xl ${item.data?.iconBg ?? 'bg-gray-200'} flex items-center justify-center ${item.data?.iconColor ?? 'text-gray-700'} shadow-sm`}>
            {item.data?.isLucide && item.data.icon
              ? React.createElement(item.data.icon as React.ComponentType<{ size?: number }>, { size: 22 })
              : <span className="text-[18px]">{String(item.data?.icon ?? '')}</span>}
          </div>
          <span className="flex-1 text-[16px] font-medium text-gray-900">{item.data?.name}</span>
          <ChevronRight size={20} className="text-gray-300" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative h-full w-full bg-white">
      <div
        ref={parentRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = listItems[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                {item ? renderItem(item) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 px-1 pointer-events-auto">
        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              scrollToLetter(letter);
            }}
            className="px-1 text-[12px] text-gray-500 hover:text-[#07C160]"
          >
            {letter}
          </button>
        ))}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            scrollToLetter('#');
          }}
          className="px-1 text-[12px] text-gray-500 hover:text-[#07C160]"
        >
          #
        </button>
      </div>
    </div>
  );
};
