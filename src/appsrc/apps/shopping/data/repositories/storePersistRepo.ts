import {
  createIdbStore,
  deleteRecord,
  getRecord,
  setRecord,
} from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import {
  createJSONStorage,
  type PersistOptions,
  type StateStorage,
} from 'zustand/middleware';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../../../../shared/business/commerce/roleContext';
import type {
  Address,
  Favorite,
  ProductItem,
  ShoppingSettings,
  ShoppingState,
} from '../../types';

interface CreateShoppingPersistOptionsInput {
  normalizeProducts: (items: ProductItem[], kind: 'dessert' | 'flower') => ProductItem[];
  normalizeFavorites: (favorites: Favorite[]) => Favorite[];
  defaultAddresses: Address[];
  defaultSettings: ShoppingSettings;
}

type ShoppingPersistState = Pick<
  ShoppingState,
  | 'cart'
  | 'flowerCart'
  | 'orders'
  | 'favorites'
  | 'addresses'
  | 'settings'
  | 'isLoading'
  | 'error'
>;

type ShoppingPersistOptions<TState extends ShoppingState> = PersistOptions<
  TState,
  ShoppingPersistState
>;

const SHOPPING_PERSIST_STATE_KEY = 'state';
const SHOPPING_ROLE_STATE_STORE = 'role_states';

const shoppingRoleStateStore = createIdbStore(
  createAppStoreConfig('shopping', SHOPPING_ROLE_STATE_STORE)
);

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const normalizeSettings = (
  value: unknown,
  fallback: ShoppingSettings
): ShoppingSettings => {
  if (!isObjectRecord(value)) return fallback;
  return {
    notify:
      typeof value.notify === 'boolean' ? value.notify : fallback.notify,
    faceId:
      typeof value.faceId === 'boolean' ? value.faceId : fallback.faceId,
  };
};

const createRoleStateStorage = ({
  normalizeProducts,
  normalizeFavorites,
  defaultAddresses,
  defaultSettings,
}: CreateShoppingPersistOptionsInput): StateStorage => {
  const defaultPersistState: ShoppingPersistState = {
    cart: [],
    flowerCart: [],
    orders: [],
    favorites: [],
    addresses: defaultAddresses,
    settings: defaultSettings,
    isLoading: false,
    error: null,
  };

  const normalizePersistState = (
    persisted: Partial<ShoppingState> | undefined
  ): ShoppingPersistState => ({
    cart: normalizeProducts(
      Array.isArray(persisted?.cart)
        ? (persisted.cart as ProductItem[])
        : defaultPersistState.cart,
      'dessert'
    ),
    flowerCart: normalizeProducts(
      Array.isArray(persisted?.flowerCart)
        ? (persisted.flowerCart as ProductItem[])
        : defaultPersistState.flowerCart,
      'flower'
    ),
    orders: Array.isArray(persisted?.orders)
      ? persisted.orders
      : defaultPersistState.orders,
    favorites: normalizeFavorites(
      Array.isArray(persisted?.favorites)
        ? (persisted.favorites as Favorite[])
        : defaultPersistState.favorites
    ),
    addresses: Array.isArray(persisted?.addresses)
      ? (persisted.addresses as Address[])
      : defaultPersistState.addresses,
    settings: normalizeSettings(persisted?.settings, defaultPersistState.settings),
    isLoading:
      typeof persisted?.isLoading === 'boolean'
        ? persisted.isLoading
        : defaultPersistState.isLoading,
    error:
      typeof persisted?.error === 'string' || persisted?.error === null
        ? persisted.error
        : defaultPersistState.error,
  });

  const resolveRoleId = () => normalizeCommerceRoleId(getCommerceActiveRoleId());

  return {
    getItem: async (): Promise<string | null> => {
      try {
        const roleId = resolveRoleId();
        const roleState = await getRecord<unknown>(shoppingRoleStateStore, roleId);
        if (!isObjectRecord(roleState)) return null;

        return JSON.stringify({
          state: normalizePersistState(roleState as Partial<ShoppingState>),
        });
      } catch (error) {
        console.error('[ShoppingStorePersist] getItem failed:', error);
        return null;
      }
    },

    setItem: async (_name, value): Promise<void> => {
      try {
        const roleId = resolveRoleId();
        const parsed = JSON.parse(value) as {
          state?: Partial<ShoppingState>;
        };
        const normalizedState = normalizePersistState(parsed?.state);
        await setRecord(shoppingRoleStateStore, roleId, normalizedState);
      } catch (error) {
        console.error('[ShoppingStorePersist] setItem failed:', error);
      }
    },

    removeItem: async (): Promise<void> => {
      try {
        const roleId = resolveRoleId();
        await deleteRecord(shoppingRoleStateStore, roleId);
      } catch (error) {
        console.error('[ShoppingStorePersist] removeItem failed:', error);
      }
    },
  };
};

export const createShoppingPersistOptions = <TState extends ShoppingState>({
  normalizeProducts,
  normalizeFavorites,
  defaultAddresses,
  defaultSettings,
}: CreateShoppingPersistOptionsInput): ShoppingPersistOptions<TState> => {
  const normalizePersistState = (
    persisted: Partial<ShoppingState> | undefined,
    fallback: ShoppingPersistState
  ): ShoppingPersistState => ({
    cart: normalizeProducts(
      Array.isArray(persisted?.cart)
        ? (persisted.cart as ProductItem[])
        : fallback.cart,
      'dessert'
    ),
    flowerCart: normalizeProducts(
      Array.isArray(persisted?.flowerCart)
        ? (persisted.flowerCart as ProductItem[])
        : fallback.flowerCart,
      'flower'
    ),
    orders: Array.isArray(persisted?.orders) ? persisted.orders : fallback.orders,
    favorites: normalizeFavorites(
      Array.isArray(persisted?.favorites)
        ? (persisted.favorites as Favorite[])
        : fallback.favorites
    ),
    addresses: Array.isArray(persisted?.addresses)
      ? (persisted.addresses as Address[])
      : fallback.addresses,
    settings: normalizeSettings(persisted?.settings, fallback.settings),
    isLoading:
      typeof persisted?.isLoading === 'boolean'
        ? persisted.isLoading
        : fallback.isLoading,
    error:
      typeof persisted?.error === 'string' || persisted?.error === null
        ? persisted.error
        : fallback.error,
  });

  return {
    name: SHOPPING_PERSIST_STATE_KEY,
    storage: createJSONStorage<ShoppingPersistState>(() =>
      createRoleStateStorage({
        normalizeProducts,
        normalizeFavorites,
        defaultAddresses,
        defaultSettings,
      })
    ),
    partialize: (state): ShoppingPersistState => ({
      cart: state.cart,
      flowerCart: state.flowerCart,
      orders: state.orders,
      favorites: state.favorites,
      addresses: state.addresses,
      settings: state.settings,
      isLoading: state.isLoading,
      error: state.error,
    }),
    merge: (persistedState: unknown, currentState: TState): TState => {
      const persisted = (persistedState as Partial<ShoppingState>) || {};
      const normalized = normalizePersistState(persisted, {
        cart: currentState.cart,
        flowerCart: currentState.flowerCart,
        orders: currentState.orders,
        favorites: currentState.favorites,
        addresses: currentState.addresses,
        settings: currentState.settings,
        isLoading: currentState.isLoading,
        error: currentState.error,
      });

      return {
        ...currentState,
        ...normalized,
      } as TState;
    },
  };
};
