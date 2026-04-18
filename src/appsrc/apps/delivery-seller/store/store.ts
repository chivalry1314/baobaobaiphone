import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createShopSlice } from './slices/shopSlice';
import { createProductSlice } from './slices/productSlice';
import { createOrderSlice } from './slices/orderSlice';
import { createStatsSlice } from './slices/statsSlice';
import { createReviewSlice } from './slices/reviewSlice';
import { createNotificationSlice } from './slices/notificationSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createHydrationSlice } from './slices/hydrationSlice';
import type { DeliverySellerStore } from './types';
import { DEFAULT_SELLER_ROUTE } from '../uiTypes';
import { createDeliverySellerPersistOptions } from '../data/repositories/storePersistRepo';

const createInitialDeliverySellerState = () => ({
  // Route
  route: DEFAULT_SELLER_ROUTE,

  // Shop (will be hydrated from seed)
  shopConfig: null,
  shopStatus: {
    isOpen: false,
    autoAcceptOrders: true,
    preparationMinutes: 15,
    busyMode: false,
    lastStatusChangeAt: Date.now(),
  },

  // Products
  products: [],
  categories: [],
  productFilter: 'all' as const,
  productSearchKeyword: '',
  productLoading: false,
  productError: null,

  // Orders
  orders: [],
  orderFilter: 'all' as const,
  orderSearchKeyword: '',
  orderLoading: false,
  orderError: null,
  newOrderCount: 0,

  // Marketing
  marketingCampaigns: [],

  // Stats
  statsOverview: null,
  revenueTrend: [],
  orderTrend: [],
  categorySales: [],

  // Reviews
  reviews: [],
  reviewFilter: 'all' as const,
  badReviewCount: 0,

  // Notifications
  notifications: [],
  notificationSettings: {
    orderNotification: true,
    reviewNotification: true,
    marketingNotification: true,
    soundEnabled: true,
    vibrateEnabled: true,
  },
  unreadNotificationCount: 0,

  // Settings
  deliveryFeeConfig: {
    baseFee: 3,
    distanceFeePerKm: 1,
    minDistance: 3,
    freeDeliveryThreshold: 50,
  },
  printSettings: {
    autoPrint: false,
    printerId: undefined,
    printerName: undefined,
    copies: 1,
  },
  accountInfo: null,

  // UI State
  loading: false,
  error: null,
  isHydrated: false,
});

export const useDeliverySellerStore = create<DeliverySellerStore>()(
  persist(
    (...args) => ({
      ...createInitialDeliverySellerState(),
      ...createShopSlice(...args),
      ...createProductSlice(...args),
      ...createOrderSlice(...args),
      ...createStatsSlice(...args),
      ...createReviewSlice(...args),
      ...createNotificationSlice(...args),
      ...createSettingsSlice(...args),
      ...createHydrationSlice(...args),
    }),
    createDeliverySellerPersistOptions<DeliverySellerStore>()
  )
);

// Sync hydrated flag after persistence
const syncHydratedFlag = () => {
  const state = useDeliverySellerStore.getState();
  if (state.isHydrated) {
    state.markHydrated(true);
  }
};

if (useDeliverySellerStore.persist.hasHydrated()) {
  syncHydratedFlag();
}

useDeliverySellerStore.persist.onFinishHydration(() => {
  syncHydratedFlag();
});
