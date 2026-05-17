import type { AppContext } from '../../../core/sdk/types';

export type ContactsTab = 'contacts' | 'records';

export type CallDirection = 'incoming' | 'outgoing' | 'missed';
export type WeChatRelation = 'incomingRequest' | 'waitingForRequest' | 'friend' | 'deleted';

export interface Contact {
  id: string;
  name: string;
  role: string;
  wechatRelation: WeChatRelation;
  phone: string;
  note?: string;
  avatar?: string;
  description?: string;
  greeting?: string;
  personality?: string;
  background?: string;
  worldBookId?: string;
  createdAt: number;
}

export interface CallRecord {
  id: string;
  contactId: string;
  roleId?: string;
  contactName: string;
  phone: string;
  direction: CallDirection;
  durationSec: number;
  createdAt: number;
}

export interface MyCard {
  id: string;
  avatar: string;
  name: string;
  isActive: boolean;
  gender: string;
  age: string;
  height: string;
  weight: string;
  wechatId: string;
  phone: string;
  introduction: string;
  createdAt: number;
}

export interface ContactsState {
  contacts: Contact[];
  callRecords: CallRecord[];
  myCards: MyCard[];
}

export interface AddContactPayload {
  name: string;
  role?: string;
  wechatRelation?: WeChatRelation;
  phone?: string;
  note?: string;
  avatar?: string;
  description?: string;
  greeting?: string;
  personality?: string;
  background?: string;
  worldBookId?: string;
}

export interface AddCallRecordPayload {
  contactId: string;
  roleId?: string;
  direction: CallDirection;
  durationSec?: number;
  createdAt?: number;
}

export interface AddMyCardPayload {
  avatar?: string;
  name: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  wechatId?: string;
  phone?: string;
  introduction?: string;
}

export interface ContactsAppProps {
  onClose: () => void;
  context?: AppContext;
}

