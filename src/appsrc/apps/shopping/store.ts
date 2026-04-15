import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultAddresses } from './data';
import { createShoppingPersistOptions } from './data/repositories/storePersistRepo';
import { createShoppingActions } from './store/actions';
import { defaultSettings, normalizeFavorites, normalizeProducts } from './store/helpers';
import type { ShoppingStore } from './store/types';

export const useShoppingStore = create<ShoppingStore>()(
  persist(
    (set, get) => ({
      products: [],
      cart: [],
      flowerProducts: [],
      flowerCart: [],
      orders: [],
      favorites: [],
      addresses: defaultAddresses,
      settings: defaultSettings,
      isLoading: false,
      error: null,
      ...createShoppingActions({
        set,
        get,
      }),
    }),
    createShoppingPersistOptions<ShoppingStore>({
      normalizeProducts,
      normalizeFavorites,
      defaultAddresses,
      defaultSettings,
    })
  )
);

