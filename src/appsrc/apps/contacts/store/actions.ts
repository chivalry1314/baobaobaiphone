import type { ContactsStore } from '../store';
import { createCallRecordSlice } from './slices/callRecordSlice';
import { createContactSlice } from './slices/contactSlice';
import { createMyCardSlice } from './slices/myCardSlice';
import type { ContactsActionContext } from './slices/types';

type ContactsActions = Pick<
  ContactsStore,
  | 'addContact'
  | 'setContactAsWeChatFriend'
  | 'addMyCard'
  | 'setActiveMyCard'
  | 'updateMyCard'
  | 'updateContact'
  | 'deleteContact'
  | 'addCallRecord'
  | 'importInspectorCallRecords'
  | 'clearInspectorCallRecords'
  | 'deleteCallRecord'
  | 'clearCallRecords'
>;

export const createContactsActions = (
  context: ContactsActionContext
): ContactsActions => ({
  ...createContactSlice(context),
  ...createMyCardSlice(context),
  ...createCallRecordSlice(context),
});
