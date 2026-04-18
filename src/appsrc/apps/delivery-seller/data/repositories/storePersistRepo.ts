import type { PersistOptions } from 'zustand/middleware';
import type { DeliverySellerStore } from '../../store/types';

export const DELIVERY_SELLER_STORAGE_KEY = 'delivery-seller-store';

export const createDeliverySellerPersistOptions = <
  T extends DeliverySellerStore
>(): PersistOptions<T, Partial<T>> => ({
  name: DELIVERY_SELLER_STORAGE_KEY,
  partialize: (state) => ({
    shopConfig: state.shopConfig,
    shopStatus: state.shopStatus,
    products: state.products,
    categories: state.categories,
    orders: state.orders,
    marketingCampaigns: state.marketingCampaigns,
    isHydrated: state.isHydrated,
  }),
  version: 1,
  migrate: (persistedState, version) => {
    // Future migration logic can be added here
    return persistedState as Partial<T>;
  },
  onRehydrateStorage: () => {
    return (state, error) => {
      if (error) {
        console.error('Failed to rehydrate delivery-seller store:', error);
      } else if (state) {
        state.markHydrated(true);
      }
    };
  },
});
