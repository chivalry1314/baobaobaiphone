import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';

type HydrationSliceState = Pick<DeliverySellerState, 'isHydrated' | 'loading' | 'error'>;
type HydrationSliceActions = Pick<
  DeliverySellerActions,
  | 'hydrateFromSeed'
  | 'markHydrated'
  | 'setLoading'
  | 'setError'
  | 'resetError'
>;

export type HydrationSlice = HydrationSliceState & HydrationSliceActions;

export const createHydrationSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  HydrationSlice
> = (set, get) => ({
  // State
  isHydrated: false,
  loading: false,
  error: null,

  // Actions
  hydrateFromSeed: () => {
    // This will be called after persist middleware hydrates
    // Import seed data and initialize state
    import('../../data/seed').then(({ createDeliverySellerSeedState }) => {
      const seed = createDeliverySellerSeedState();
      
      set(
        (state) => ({
          shopConfig: seed.shopConfig,
          shopStatus: seed.shopStatus,
          products: seed.products,
          categories: seed.categories,
          orders: seed.orders,
          marketingCampaigns: seed.marketingCampaigns,
          isHydrated: true,
        }),
        false,
        'hydration/hydrateFromSeed'
      );
    });
  },

  markHydrated: (hydrated) => {
    set({ isHydrated: hydrated }, false, 'hydration/markHydrated');
  },

  setLoading: (loading) => {
    set({ loading }, false, 'hydration/setLoading');
  },

  setError: (message) => {
    set({ error: message, loading: false }, false, 'hydration/setError');
  },

  resetError: () => {
    set({ error: null }, false, 'hydration/resetError');
  },
});
