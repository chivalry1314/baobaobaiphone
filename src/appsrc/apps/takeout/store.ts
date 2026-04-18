import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createTakeoutSeedState } from './data/seed';
import { createTakeoutPersistOptions } from './data/repositories/storePersistRepo';
import { createTakeoutActions } from './store/actions';
import type { TakeoutState, TakeoutStore } from './store/types';
import { DEFAULT_TAKEOUT_ROUTE } from './uiTypes';

const buildDefaultScheduleDate = (): string => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const createInitialTakeoutState = (): TakeoutState => {
  const seed = createTakeoutSeedState();
  const defaultAddress = seed.addresses.find((address) => address.isDefault) || seed.addresses[0] || null;

  return {
    route: DEFAULT_TAKEOUT_ROUTE,
    merchants: seed.merchants,
    categories: seed.categories || [],
    dishes: seed.dishes,
    cartLines: [],
    orders: [],
    addresses: seed.addresses,
    coupons: seed.coupons,
    profile: seed.profile,
    searchKeyword: '',
    bizFilter: 'all',
    sortKey: 'comprehensive',
    merchantFilters: {
      maxDeliveryMinutes: null,
      maxMinOrderAmount: null,
      minRating: null,
      promotionOnly: false,
    },
    homeRecommendationVisibleCount: 6,
    selectedAddressId: defaultAddress ? defaultAddress.id : null,
    activeMerchantId: null,
    deliveryTimeMode: 'instant',
    scheduleDate: buildDefaultScheduleDate(),
    scheduleTime: '12:00',
    selectedCouponId: null,
    isHydrated: false,
    loading: false,
    error: null,
  };
};

// 导出 setSelectedCoupon 到 actions
declare module './store/types' {
  interface TakeoutOrderActions {
    setSelectedCoupon: (couponId: string | null) => void;
  }
}

export const useTakeoutStore = create<TakeoutStore>()(
  persist(
    (set, get) => ({
      ...createInitialTakeoutState(),
      ...createTakeoutActions(set, get),
    }),
    createTakeoutPersistOptions<TakeoutStore>()
  )
);

const syncHydratedFlag = () => {
  const state = useTakeoutStore.getState();
  if (!state.isHydrated) {
    state.markHydrated(true);
  }
};

if (useTakeoutStore.persist.hasHydrated()) {
  syncHydratedFlag();
}

useTakeoutStore.persist.onFinishHydration(() => {
  syncHydratedFlag();
});
