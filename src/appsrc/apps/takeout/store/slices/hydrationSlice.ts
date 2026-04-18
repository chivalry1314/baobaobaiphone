import type { StoreApi } from 'zustand';
import { createTakeoutSeedState } from '../../data/seed';
import type { TakeoutStore } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const resolveInitialSelectedAddressId = (addresses: ReturnType<typeof createTakeoutSeedState>['addresses']) => {
  const defaultAddress = addresses.find((address) => address.isDefault);
  return defaultAddress?.id || addresses[0]?.id || null;
};

const buildDefaultScheduleDate = (): string => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const createTakeoutHydrationSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<
  TakeoutStore,
  'hydrateFromSeed' | 'resetToSeed' | 'markHydrated' | 'setLoading' | 'setError' | 'resetError'
> => ({
  hydrateFromSeed: () => {
    const seed = createTakeoutSeedState();

    set((state) => {
      const needsHydration =
        state.merchants.length === 0 ||
        state.categories.length === 0 ||
        state.dishes.length === 0 ||
        state.addresses.length === 0;

      if (!needsHydration) {
        return {
          isHydrated: true,
        };
      }

      return {
        merchants: seed.merchants,
        categories: seed.categories,
        dishes: seed.dishes,
        addresses: seed.addresses,
        coupons: seed.coupons,
        profile: seed.profile,
        selectedAddressId: resolveInitialSelectedAddressId(seed.addresses),
        isHydrated: true,
        error: null,
      };
    });
  },

  resetToSeed: () => {
    const seed = createTakeoutSeedState();

    set({
      merchants: seed.merchants,
      categories: seed.categories,
      dishes: seed.dishes,
      cartLines: [],
      orders: [],
      addresses: seed.addresses,
      coupons: seed.coupons,
      profile: seed.profile,
      selectedAddressId: resolveInitialSelectedAddressId(seed.addresses),
      activeMerchantId: null,
      searchKeyword: '',
      bizFilter: 'all',
      sortKey: 'comprehensive',
      merchantFilters: {
        maxDeliveryMinutes: null,
        maxMinOrderAmount: null,
        minRating: null,
        promotionOnly: false,
      },
      homeRecommendationVisibleCount: 4,
      deliveryTimeMode: 'instant',
      scheduleDate: buildDefaultScheduleDate(),
      scheduleTime: '12:00',
      selectedCouponId: null,
      error: null,
    });
  },

  markHydrated: (hydrated) => {
    set({ isHydrated: hydrated });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (message) => {
    set({ error: message });
  },

  resetError: () => {
    if (!get().error) return;
    set({ error: null });
  },
});
