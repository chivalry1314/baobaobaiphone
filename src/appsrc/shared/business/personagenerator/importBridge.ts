import type { WorldInfoEntry } from '../../../../core/sdk/types';

export type PersonaGeneratedContactPayload = {
  id?: string;
  name: string;
  role?: string;
  wechatRelation?: 'incomingRequest' | 'waitingForRequest' | 'friend';
  phone?: string;
  note?: string;
  avatar?: string;
  description?: string;
  greeting?: string;
  personality?: string;
  background?: string;
  worldBookId?: string;
  createdAt?: number;
};

export type PersonaImportedContact = {
  id: string;
  name: string;
};

type PersonaContactImporter = (payload: PersonaGeneratedContactPayload) => PersonaImportedContact;
type PersonaWorldBookImporter = (entry: WorldInfoEntry) => void;

let importPersonaContact: PersonaContactImporter = (payload) => ({
  id: payload.id || '',
  name: payload.name,
});

let importPersonaWorldBookEntry: PersonaWorldBookImporter = () => {};

export const registerPersonaContactImporter = (
  importer: PersonaContactImporter | null | undefined
): void => {
  importPersonaContact = typeof importer === 'function'
    ? importer
    : (payload) => ({ id: payload.id || '', name: payload.name });
};

export const registerPersonaWorldBookImporter = (
  importer: PersonaWorldBookImporter | null | undefined
): void => {
  importPersonaWorldBookEntry = typeof importer === 'function' ? importer : () => {};
};

export const addPersonaGeneratedContact = (
  payload: PersonaGeneratedContactPayload
): PersonaImportedContact => importPersonaContact(payload);

export const addPersonaGeneratedWorldBookEntry = (
  entry: WorldInfoEntry
): void => {
  importPersonaWorldBookEntry(entry);
};
