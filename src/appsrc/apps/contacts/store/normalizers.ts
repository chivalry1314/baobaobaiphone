import type { Contact, MyCard, WeChatRelation } from '../types';

export const normalizeText = (value?: string): string => value?.trim() ?? '';

export const normalizeWeChatRelation = (value?: WeChatRelation): WeChatRelation => {
  return value ?? 'friend';
};

export const normalizeContact = (
  payload: Partial<Contact> & Pick<Contact, 'id' | 'name'>
): Contact => ({
  id: payload.id,
  name: normalizeText(payload.name) || 'Unnamed',
  role: normalizeText(payload.role) || 'Uncategorized',
  wechatRelation: normalizeWeChatRelation(payload.wechatRelation),
  phone: normalizeText(payload.phone),
  note: normalizeText(payload.note),
  avatar: normalizeText(payload.avatar),
  description: normalizeText(payload.description),
  greeting: normalizeText(payload.greeting),
  personality: normalizeText(payload.personality),
  background: normalizeText(payload.background),
  worldBookId: normalizeText(payload.worldBookId) || undefined,
  sourceCardId: normalizeText(payload.sourceCardId) || undefined,
  createdAt: payload.createdAt ?? Date.now(),
});

export const normalizeMyCard = (
  payload: Partial<MyCard> & Pick<MyCard, 'id' | 'name'>
): MyCard => ({
  id: payload.id,
  avatar: normalizeText(payload.avatar),
  name: normalizeText(payload.name),
  isActive: Boolean(payload.isActive),
  gender: normalizeText(payload.gender) || '未知',
  age: normalizeText(payload.age),
  height: normalizeText(payload.height),
  weight: normalizeText(payload.weight),
  wechatId: normalizeText(payload.wechatId),
  phone: normalizeText(payload.phone),
  introduction: normalizeText(payload.introduction),
  createdAt: payload.createdAt ?? Date.now(),
});
