import type { StateCreator } from 'zustand';
import type { Contact, MyCard } from '../../types';
import type { ContactsStore } from '../../store';

export type ContactsSet = Parameters<StateCreator<ContactsStore>>[0];
export type ContactsGet = Parameters<StateCreator<ContactsStore>>[1];

export interface ContactsActionContext {
  set: ContactsSet;
  get: ContactsGet;
  generateId: () => string;
  normalizeContact: (payload: Partial<Contact> & Pick<Contact, 'id' | 'name'>) => Contact;
  normalizeMyCard: (payload: Partial<MyCard> & Pick<MyCard, 'id' | 'name'>) => MyCard;
}
