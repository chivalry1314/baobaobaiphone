import { useMemo } from 'react';
import { DEFAULT_ACTIVE_ROLE_ID, createRoleCharacterId, isContactRoleId, parseContactRoleId, parseRoleCharacterId } from '../../shared/business/roleIdentity';
import { useActiveRoleIdSnapshot, useContactsSnapshot, useMyCardsSnapshot } from '../contacts/selectors';
import type { Contact, MyCard } from '../contacts/types';
import { useWeChatStore } from './store';
import type { WeChatCharacter } from './types';

const DEFAULT_DESCRIPTION = '这个联系人暂无详细设定';
const DEFAULT_GREETING = '你好，很高兴认识你';
const DEFAULT_SELF_NAME = '默认身份';

const resolveRoleProfileAvatar = (
  roleId: string,
  roleAvatarMap: Record<string, string>
): string => roleAvatarMap[roleId] || '';

export const mapContactToWeChatCharacter = (
  contact: Contact,
  patSuffix?: string
): WeChatCharacter => ({
  id: contact.id,
  name: contact.name,
  avatar: contact.avatar ?? '',
  description: contact.description || contact.note || DEFAULT_DESCRIPTION,
  greeting: contact.greeting || DEFAULT_GREETING,
  personality: contact.personality || '',
  background: contact.background || '',
  patSuffix,
  worldBookId: contact.worldBookId || undefined,
});

const mapMyCardToRoleCharacter = (
  card: MyCard,
  patSuffix?: string,
  roleAvatar?: string
): WeChatCharacter => ({
  id: createRoleCharacterId(card.id),
  name: card.name || DEFAULT_SELF_NAME,
  avatar: roleAvatar || card.avatar || '',
  description: card.introduction || '你正在查看这个身份与外部联系人的聊天记录。',
  greeting: card.name ? `你好，我是${card.name}` : '你好',
  personality: '',
  background: '',
  patSuffix,
});

const createDefaultRoleCharacter = (
  patSuffix?: string,
  roleAvatar?: string
): WeChatCharacter => ({
  id: createRoleCharacterId(DEFAULT_ACTIVE_ROLE_ID),
  name: DEFAULT_SELF_NAME,
  avatar: roleAvatar || '',
  description: '手机主人的默认身份。',
  greeting: '你好',
  personality: '',
  background: '',
  patSuffix,
});

const createFallbackCharacter = (
  characterId: string,
  contacts: Contact[],
  myCards: MyCard[],
  roleAvatarMap: Record<string, string>,
  patSuffix?: string
): WeChatCharacter => {
  const normalizedCharacterId = characterId.trim();
  const roleId = parseRoleCharacterId(normalizedCharacterId);

  if (roleId) {
    if (roleId === DEFAULT_ACTIVE_ROLE_ID) {
      return createDefaultRoleCharacter(
        patSuffix,
        resolveRoleProfileAvatar(DEFAULT_ACTIVE_ROLE_ID, roleAvatarMap)
      );
    }

    const roleContactId = parseContactRoleId(roleId);
    if (roleContactId) {
      const targetContact = contacts.find((item) => item.id === roleContactId);
      return {
        id: normalizedCharacterId,
        name: targetContact?.name || roleContactId,
        avatar: targetContact?.avatar || '',
        description: targetContact?.description || targetContact?.note || '该角色联系人暂无详细设定',
        greeting: targetContact?.greeting || DEFAULT_GREETING,
        personality: targetContact?.personality || '',
        background: targetContact?.background || '',
        patSuffix,
      };
    }

    const targetCard = myCards.find((item) => item.id === roleId);
    if (targetCard) {
      return mapMyCardToRoleCharacter(
        targetCard,
        patSuffix,
        resolveRoleProfileAvatar(roleId, roleAvatarMap)
      );
    }

    return {
      id: normalizedCharacterId,
      name: roleId,
      avatar: '',
      description: '该角色暂无详情。',
      greeting: DEFAULT_GREETING,
      personality: '',
      background: '',
      patSuffix,
    };
  }

  const targetContact = contacts.find((item) => item.id === normalizedCharacterId);
  if (targetContact) {
    return mapContactToWeChatCharacter(targetContact, patSuffix);
  }

  return {
    id: normalizedCharacterId,
    name: normalizedCharacterId,
    avatar: '',
    description: '该联系人暂无详情。',
    greeting: DEFAULT_GREETING,
    personality: '',
    background: '',
    patSuffix,
  };
};

export const useWeChatFriendCharactersFromContacts = (): WeChatCharacter[] => {
  const contacts = useContactsSnapshot();
  const myCards = useMyCardsSnapshot();
  const activeRoleId = useActiveRoleIdSnapshot();
  const wechatContactExtensions = useWeChatStore((state) => state.wechatContactExtensions);
  const wechatSessions = useWeChatStore((state) => state.wechatSessions);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);

  return useMemo(() => {
    const roleAvatarMap: Record<string, string> = {};
    Object.entries(wechatStateByRoleId).forEach(([roleId, roleState]) => {
      const avatar = roleState?.wechatUserProfile?.avatar;
      if (typeof avatar !== 'string') return;
      const normalized = avatar.trim();
      if (!normalized) return;
      roleAvatarMap[roleId] = normalized;
    });

    const activeContactId = parseContactRoleId(activeRoleId);
    const contactCharacters = contacts
      .filter(
        (item) => item.wechatRelation === 'friend' || typeof item.wechatRelation === 'undefined'
      )
      .filter((item) => item.id !== activeContactId)
      .map((item) =>
        mapContactToWeChatCharacter(item, wechatContactExtensions[item.id]?.patSuffix)
      );

    const roleCharacters: WeChatCharacter[] = isContactRoleId(activeRoleId)
      ? [
          createDefaultRoleCharacter(
            wechatContactExtensions[createRoleCharacterId(DEFAULT_ACTIVE_ROLE_ID)]?.patSuffix,
            resolveRoleProfileAvatar(DEFAULT_ACTIVE_ROLE_ID, roleAvatarMap)
          ),
          ...myCards.map((card) =>
            mapMyCardToRoleCharacter(
              card,
              wechatContactExtensions[createRoleCharacterId(card.id)]?.patSuffix,
              resolveRoleProfileAvatar(card.id, roleAvatarMap)
            )
          ),
        ]
      : [];

    const characterById = new Map<string, WeChatCharacter>();
    [...roleCharacters, ...contactCharacters].forEach((item) => {
      characterById.set(item.id, item);
    });

    wechatSessions.forEach((session) => {
      const sessionCharacterId = session.characterId?.trim();
      if (!sessionCharacterId) return;
      if (characterById.has(sessionCharacterId)) return;
      const sessionContact = contacts.find((item) => item.id === sessionCharacterId);
      if (sessionContact && sessionContact.wechatRelation !== 'friend') return;
      characterById.set(
        sessionCharacterId,
        createFallbackCharacter(
          sessionCharacterId,
          contacts,
          myCards,
          roleAvatarMap,
          wechatContactExtensions[sessionCharacterId]?.patSuffix
        )
      );
    });

    return [...characterById.values()];
  }, [activeRoleId, contacts, myCards, wechatContactExtensions, wechatSessions, wechatStateByRoleId]);
};

export const useInspectorVisibleRoleIds = (): Set<string> => {
  const myCards = useMyCardsSnapshot();

  return useMemo(() => {
    const ids = new Set<string>();
    ids.add(DEFAULT_ACTIVE_ROLE_ID);
    myCards.forEach((card) => {
      const id = card.id?.trim();
      if (id) ids.add(id);
    });
    return ids;
  }, [myCards]);
};

export const useIncomingRequestContacts = (): Contact[] => {
  const contacts = useContactsSnapshot();
  return useMemo(
    () => contacts.filter((item) => item.wechatRelation === 'incomingRequest'),
    [contacts]
  );
};

export const useWaitingRequestContacts = (): Contact[] => {
  const contacts = useContactsSnapshot();
  return useMemo(
    () => contacts.filter((item) => item.wechatRelation === 'waitingForRequest'),
    [contacts]
  );
};

export const useWeChatCharactersFromContacts = useWeChatFriendCharactersFromContacts;
