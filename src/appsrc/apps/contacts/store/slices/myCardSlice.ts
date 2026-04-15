import type { AddMyCardPayload } from '../../types';
import type { ContactsStore } from '../../store';
import { clearRuntimeActiveRoleId } from '../../../../shared/business/roleRuntime';
import type { ContactsActionContext } from './types';

export const createMyCardSlice = ({
  set,
  generateId,
  normalizeMyCard,
}: ContactsActionContext): Pick<
  ContactsStore,
  'addMyCard' | 'setActiveMyCard' | 'updateMyCard'
> => ({
  addMyCard: (payload: AddMyCardPayload) => {
    const myCard = normalizeMyCard({
      id: `my-card-${generateId()}`,
      avatar: payload.avatar,
      name: payload.name,
      gender: payload.gender,
      age: payload.age,
      height: payload.height,
      weight: payload.weight,
      wechatId: payload.wechatId,
      phone: payload.phone,
      introduction: payload.introduction,
      createdAt: Date.now(),
    });

    set((state) => ({
      myCards: [myCard, ...state.myCards],
    }));

    return myCard;
  },

  setActiveMyCard: (id) => {
    set((state) => {
      const isCurrentlyActive = state.myCards.some((item) => item.id === id && item.isActive);

      return {
        myCards: state.myCards.map((item) => ({
          ...item,
          isActive: isCurrentlyActive ? false : item.id === id,
        })),
      };
    });
    clearRuntimeActiveRoleId();
  },

  updateMyCard: (id, payload) =>
    set((state) => ({
      myCards: state.myCards.map((item) =>
        item.id !== id
          ? item
          : normalizeMyCard({
              ...item,
              ...payload,
              id: item.id,
              name: payload.name || item.name,
              createdAt: item.createdAt,
            })
      ),
    })),
});
