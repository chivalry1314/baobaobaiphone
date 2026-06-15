import type { AddContactPayload, Contact } from './types';
import { useContactsStore } from './store';

export interface CharacterPersonaPackage {
  version?: number;
  contacts: Array<Partial<Contact> & { name: string }>;
  name?: string;
  author?: string;
  tags?: string[];
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeWechatRelation = (value: unknown): Contact['wechatRelation'] => {
  if (
    typeof value === 'string' &&
    ['incomingRequest', 'waitingForRequest', 'friend', 'deleted'].includes(value)
  ) {
    return value as Contact['wechatRelation'];
  }
  return 'friend';
};

const normalizeContact = (raw: unknown): AddContactPayload | null => {
  if (raw === null || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;

  return {
    name,
    role: typeof item.role === 'string' ? item.role.trim() : undefined,
    phone: typeof item.phone === 'string' ? item.phone.trim() : undefined,
    wechatRelation: normalizeWechatRelation(item.wechatRelation),
    avatar: typeof item.avatar === 'string' ? item.avatar.trim() : undefined,
    description: typeof item.description === 'string' ? item.description.trim() : undefined,
    greeting: typeof item.greeting === 'string' ? item.greeting.trim() : undefined,
    personality: typeof item.personality === 'string' ? item.personality.trim() : undefined,
    background: typeof item.background === 'string' ? item.background.trim() : undefined,
    note: typeof item.note === 'string' ? item.note.trim() : undefined,
  };
};

export const parseCharacterPersonaPackage = async (file: File): Promise<CharacterPersonaPackage> => {
  const text = await file.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('角色人设文件不是有效的 JSON');
  }

  if (payload === null || typeof payload !== 'object') {
    throw new Error('角色人设文件格式错误');
  }

  const packagePayload = payload as Record<string, unknown>;
  if (!Array.isArray(packagePayload.contacts)) {
    throw new Error('角色人设文件缺少 contacts 数组');
  }

  return {
    version: typeof packagePayload.version === 'number' ? packagePayload.version : 1,
    contacts: packagePayload.contacts
      .map(normalizeContact)
      .filter((contact): contact is AddContactPayload => contact !== null),
    name: typeof packagePayload.name === 'string' ? packagePayload.name : undefined,
    author: typeof packagePayload.author === 'string' ? packagePayload.author : undefined,
    tags: Array.isArray(packagePayload.tags)
      ? packagePayload.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
  };
};

export interface InstallCharacterPersonaResult {
  installedCount: number;
}

export const installRemoteCharacterPersonaPackage = async (
  file: File,
  sourceCardId?: string
): Promise<InstallCharacterPersonaResult> => {
  const packagePayload = await parseCharacterPersonaPackage(file);

  if (packagePayload.contacts.length === 0) {
    throw new Error('角色人设文件中没有有效联系人');
  }

  const { addContact } = useContactsStore.getState();
  let installedCount = 0;

  packagePayload.contacts.forEach((payload) => {
    const finalPayload: AddContactPayload = {
      ...payload,
      sourceCardId,
    };
    addContact(finalPayload);
    installedCount += 1;
  });

  return { installedCount };
};

export const isRemoteCharacterPersonaInstalled = (sourceCardId: string): boolean => {
  const { contacts } = useContactsStore.getState();
  return contacts.some((contact) => contact.sourceCardId === sourceCardId);
};
