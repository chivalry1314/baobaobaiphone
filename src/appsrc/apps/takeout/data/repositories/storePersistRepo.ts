import { createIdbStore, deleteRecord, getRecord, setRecord } from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import { getCommerceActiveRoleId, normalizeCommerceRoleId } from '../../../../shared/business/commerce/roleContext';
import { createJSONStorage, type PersistOptions, type StateStorage } from 'zustand/middleware';
import type { TakeoutState } from '../../store/types';

type TakeoutPersistState = Pick<
  TakeoutState,
  | 'route'
  | 'merchants'
  | 'categories'
  | 'dishes'
  | 'cartLines'
  | 'orders'
  | 'addresses'
  | 'coupons'
  | 'profile'
  | 'searchKeyword'
  | 'bizFilter'
  | 'sortKey'
  | 'merchantFilters'
  | 'homeRecommendationVisibleCount'
  | 'selectedAddressId'
  | 'activeMerchantId'
  | 'deliveryTimeMode'
  | 'scheduleDate'
  | 'scheduleTime'
  | 'selectedCouponId'
>;

type TakeoutPersistOptions<TState extends TakeoutState> = PersistOptions<TState, TakeoutPersistState>;

const TAKEOUT_PERSIST_STATE_KEY = 'state';
const TAKEOUT_ROLE_STATE_STORE = 'role_states';

const takeoutRoleStateStore = createIdbStore(createAppStoreConfig('takeout', TAKEOUT_ROLE_STATE_STORE));

const resolveRoleId = (): string => normalizeCommerceRoleId(getCommerceActiveRoleId());

const createRoleStateStorage = (): StateStorage => ({
  getItem: async (): Promise<string | null> => {
    try {
      const roleId = resolveRoleId();
      const value = await getRecord<unknown>(takeoutRoleStateStore, roleId);
      if (value == null) return null;
      return JSON.stringify(value);
    } catch (error) {
      console.error('[TakeoutStorePersist] getItem failed:', error);
      return null;
    }
  },

  setItem: async (_name, value): Promise<void> => {
    try {
      const roleId = resolveRoleId();
      await setRecord(takeoutRoleStateStore, roleId, JSON.parse(value));
    } catch (error) {
      console.error('[TakeoutStorePersist] setItem failed:', error);
    }
  },

  removeItem: async (): Promise<void> => {
    try {
      const roleId = resolveRoleId();
      await deleteRecord(takeoutRoleStateStore, roleId);
    } catch (error) {
      console.error('[TakeoutStorePersist] removeItem failed:', error);
    }
  },
});

export const createTakeoutPersistOptions = <TState extends TakeoutState>(): TakeoutPersistOptions<TState> => ({
  name: TAKEOUT_PERSIST_STATE_KEY,
  storage: createJSONStorage<TakeoutPersistState>(() => createRoleStateStorage()),
  partialize: (state) => ({
    route: state.route,
    merchants: state.merchants,
    categories: state.categories,
    dishes: state.dishes,
    cartLines: state.cartLines,
    orders: state.orders,
    addresses: state.addresses,
    coupons: state.coupons,
    profile: state.profile,
    searchKeyword: state.searchKeyword,
    bizFilter: state.bizFilter,
    sortKey: state.sortKey,
    merchantFilters: state.merchantFilters,
    homeRecommendationVisibleCount: state.homeRecommendationVisibleCount,
    selectedAddressId: state.selectedAddressId,
    activeMerchantId: state.activeMerchantId,
    deliveryTimeMode: state.deliveryTimeMode,
    scheduleDate: state.scheduleDate,
    scheduleTime: state.scheduleTime,
    selectedCouponId: state.selectedCouponId,
  }),
  merge: (persistedState: unknown, currentState: TState): TState => {
    const persisted = (persistedState as Partial<TakeoutPersistState>) || {};
    return {
      ...currentState,
      ...persisted,
    } as TState;
  },
});
