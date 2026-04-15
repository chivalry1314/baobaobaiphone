import { normalizeFavorites } from '../helpers';
import type { ShoppingStore } from '../types';
import type { ShoppingActionContext } from './types';

export const createShoppingStateSlice = ({
  set,
}: ShoppingActionContext): Pick<
  ShoppingStore,
  | 'setOrders'
  | 'setFavorites'
  | 'setAddresses'
  | 'setSettingNotify'
  | 'setSettingFaceId'
  | 'setLoading'
  | 'setError'
> => ({
  setOrders: (next) =>
    set((state) => ({
      orders: typeof next === 'function' ? next(state.orders) : next,
    })),

  setFavorites: (next) =>
    set((state) => ({
      favorites: normalizeFavorites(typeof next === 'function' ? next(state.favorites) : next),
    })),

  setAddresses: (next) =>
    set((state) => ({
      addresses: typeof next === 'function' ? next(state.addresses) : next,
    })),

  setSettingNotify: (notify) =>
    set((state) => ({ settings: { ...state.settings, notify } })),

  setSettingFaceId: (faceId) =>
    set((state) => ({ settings: { ...state.settings, faceId } })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
});
