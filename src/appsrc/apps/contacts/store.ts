import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AddCallRecordPayload,
  AddContactPayload,
  AddMyCardPayload,
  CallRecord,
  Contact,
  ContactsState,
  MyCard,
} from './types';
import { createContactsPersistOptions } from './data/repositories/storePersistRepo';
import { createContactsActions } from './store/actions';
import {
  initialCallRecords,
  initialContacts,
  initialMyCards,
} from './store/defaults';
import { normalizeContact, normalizeMyCard } from './store/normalizers';

export interface ContactsStore extends ContactsState {
  addContact: (payload: AddContactPayload) => Contact;
  setContactAsWeChatFriend: (id: string) => void;
  addMyCard: (payload: AddMyCardPayload) => MyCard;
  setActiveMyCard: (id: string) => void;
  updateMyCard: (id: string, payload: AddMyCardPayload) => void;
  updateContact: (id: string, payload: Partial<AddContactPayload>) => void;
  deleteContact: (id: string) => void;
  addCallRecord: (payload: AddCallRecordPayload) => void;
  importInspectorCallRecords: (sourceContactId: string, records: CallRecord[]) => void;
  clearInspectorCallRecords: (sourceContactId: string) => void;
  deleteCallRecord: (id: string) => void;
  clearCallRecords: () => void;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      contacts: initialContacts,
      callRecords: initialCallRecords,
      myCards: initialMyCards,

      ...createContactsActions({
        set,
        get,
        generateId,
        normalizeContact,
        normalizeMyCard,
      }),
    }),
    createContactsPersistOptions<ContactsStore>()
  )
);
