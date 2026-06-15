import type { AddContactPayload } from '../../types';
import type { ContactsStore } from '../../store';
import type { ContactsActionContext } from './types';

export const createContactSlice = ({
  set,
  generateId,
  normalizeContact,
}: ContactsActionContext): Pick<
  ContactsStore,
  'addContact' | 'setContactAsWeChatFriend' | 'updateContact' | 'deleteContact'
> => ({
  addContact: (payload: AddContactPayload) => {
    const contact = normalizeContact({
      id: `contact-${generateId()}`,
      name: payload.name,
      role: payload.role,
      wechatRelation: payload.wechatRelation,
      phone: payload.phone,
      note: payload.note,
      avatar: payload.avatar,
      description: payload.description,
      greeting: payload.greeting,
      personality: payload.personality,
      background: payload.background,
      worldBookId: payload.worldBookId,
      sourceCardId: payload.sourceCardId,
      createdAt: Date.now(),
    });

    set((state) => ({
      contacts: [contact, ...state.contacts],
    }));

    return contact;
  },

  setContactAsWeChatFriend: (id) =>
    set((state) => ({
      contacts: state.contacts.map((item) =>
        item.id === id
          ? normalizeContact({
              ...item,
              wechatRelation: 'friend',
            })
          : item
      ),
    })),

  updateContact: (id, payload) =>
    set((state) => ({
      contacts: state.contacts.map((item) =>
        item.id !== id
          ? item
          : normalizeContact({
              ...item,
              ...payload,
              id: item.id,
              name: payload.name ?? item.name,
              createdAt: item.createdAt,
            })
      ),
    })),

  deleteContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((item) => item.id !== id),
      callRecords: state.callRecords.filter((item) => item.contactId !== id),
    })),
});
