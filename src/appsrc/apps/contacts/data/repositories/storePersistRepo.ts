import { createAppPersistOptions } from '../../../../../core/persistOptions';
import type { ContactsState } from '../../types';

type ContactsPersistState = Pick<ContactsState, 'contacts' | 'callRecords' | 'myCards'>;

export const createContactsPersistOptions = <TState extends ContactsPersistState>() =>
  createAppPersistOptions<TState, ContactsPersistState>({
    appId: 'contacts',
    partialize: (state): ContactsPersistState => ({
      contacts: state.contacts,
      callRecords: state.callRecords,
      myCards: state.myCards,
    }),
  });
