import type { StoreApi } from 'zustand';
import type { DeliveryDish, DeliveryDishCategory, DeliveryMerchant } from '../../types';
import type { MerchantListSortKey, TakeoutBizFilter } from '../../uiTypes';
import type { TakeoutMerchantFilters, TakeoutStore } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const HOME_RECOMMENDATION_PAGE_SIZE = 4;

const defaultMerchantFilters = (): TakeoutMerchantFilters => ({
  maxDeliveryMinutes: null,
  maxMinOrderAmount: null,
  minRating: null,
  promotionOnly: false,
});

const normalizeKeyword = (keyword: string): string => keyword.trimStart();

const applySortKey = (items: DeliveryMerchant[], sortKey: MerchantListSortKey): DeliveryMerchant[] => {
  const next = [...items];

  if (sortKey === 'sales') {
    next.sort((left, right) => right.monthlySales - left.monthlySales);
    return next;
  }

  if (sortKey === 'distance') {
    next.sort((left, right) => left.distanceKm - right.distanceKm);
    return next;
  }

  if (sortKey === 'delivery-fee') {
    next.sort((left, right) => left.deliveryFee - right.deliveryFee);
    return next;
  }

  next.sort((left, right) => {
    const scoreLeft = left.rating * 120 + left.monthlySales * 0.03 - left.deliveryFee * 4;
    const scoreRight = right.rating * 120 + right.monthlySales * 0.03 - right.deliveryFee * 4;
    return scoreRight - scoreLeft;
  });
  return next;
};

const normalizeMerchants = (
  merchants: DeliveryMerchant[],
  sortKey: MerchantListSortKey
): DeliveryMerchant[] => {
  const visibleMerchants = merchants.filter((merchant) => merchant.visible !== false);
  return applySortKey(visibleMerchants, sortKey);
};

const normalizeDishes = (dishes: DeliveryDish[]): DeliveryDish[] => {
  return dishes.filter((dish) => dish.status === 'on' && dish.stock > 0);
};

const normalizeCategories = (categories: DeliveryDishCategory[]): DeliveryDishCategory[] => {
  return [...categories].sort((left, right) => left.sort - right.sort);
};

const normalizeMerchantFilters = (filters: Partial<TakeoutMerchantFilters>): Partial<TakeoutMerchantFilters> => ({
  ...(filters.maxDeliveryMinutes !== undefined
    ? {
        maxDeliveryMinutes:
          filters.maxDeliveryMinutes == null
            ? null
            : Math.max(0, Math.floor(filters.maxDeliveryMinutes)),
      }
    : {}),
  ...(filters.maxMinOrderAmount !== undefined
    ? {
        maxMinOrderAmount:
          filters.maxMinOrderAmount == null
            ? null
            : Math.max(0, Math.floor(filters.maxMinOrderAmount)),
      }
    : {}),
  ...(filters.minRating !== undefined
    ? {
        minRating: filters.minRating == null ? null : Math.max(0, Math.min(5, filters.minRating)),
      }
    : {}),
  ...(filters.promotionOnly !== undefined ? { promotionOnly: Boolean(filters.promotionOnly) } : {}),
});

export const createTakeoutMerchantSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<
  TakeoutStore,
  | 'setMerchants'
  | 'setCategories'
  | 'setDishes'
  | 'setSearchKeyword'
  | 'setBizFilter'
  | 'setSortKey'
  | 'setMerchantFilters'
  | 'resetMerchantFilters'
  | 'loadMoreRecommendations'
  | 'resetHomeRecommendations'
  | 'setActiveMerchant'
  | 'enterMerchant'
  | 'enterMerchantList'
> => ({
  setMerchants: (next) => {
    set((state) => {
      const incoming = typeof next === 'function' ? next(state.merchants) : next;
      return {
        merchants: normalizeMerchants(incoming, state.sortKey),
      };
    });
  },

  setCategories: (next) => {
    set((state) => {
      const incoming = typeof next === 'function' ? next(state.categories) : next;
      return {
        categories: normalizeCategories(incoming),
      };
    });
  },

  setDishes: (next) => {
    set((state) => {
      const incoming = typeof next === 'function' ? next(state.dishes) : next;
      return {
        dishes: normalizeDishes(incoming),
      };
    });
  },

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: normalizeKeyword(keyword) });
  },

  setBizFilter: (filter) => {
    set({ bizFilter: filter as TakeoutBizFilter });
  },

  setSortKey: (sortKey) => {
    set((state) => ({
      sortKey,
      merchants: applySortKey(state.merchants, sortKey),
    }));
  },

  setMerchantFilters: (filters) => {
    set((state) => ({
      merchantFilters: {
        ...state.merchantFilters,
        ...normalizeMerchantFilters(filters),
      },
    }));
  },

  resetMerchantFilters: () => {
    set({ merchantFilters: defaultMerchantFilters() });
  },

  loadMoreRecommendations: () => {
    set((state) => ({
      homeRecommendationVisibleCount: state.homeRecommendationVisibleCount + HOME_RECOMMENDATION_PAGE_SIZE,
    }));
  },

  resetHomeRecommendations: () => {
    set({ homeRecommendationVisibleCount: HOME_RECOMMENDATION_PAGE_SIZE });
  },

  setActiveMerchant: (merchantId) => {
    set({ activeMerchantId: merchantId });
  },

  enterMerchant: (merchantId) => {
    const merchant = get().merchants.find((item) => item.id === merchantId);
    if (!merchant) {
      set({ error: '店铺不存在或已下线。' });
      return;
    }

    set({
      activeMerchantId: merchantId,
      route: {
        tab: 'home',
        screen: 'merchant-detail',
        params: { merchantId },
      },
      error: null,
    });
  },

  enterMerchantList: () => {
    set({
      route: {
        tab: 'home',
        screen: 'merchant-list',
      },
    });
  },
});
