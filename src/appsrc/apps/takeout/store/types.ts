import type {
  DeliveryAddress,
  DeliveryAfterSaleStatus,
  DeliveryCartLine,
  DeliveryCartLineSelectedOption,
  DeliveryCoupon,
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryMerchant,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryUserProfile,
} from '../types';
import type {
  MerchantListSortKey,
  TakeoutBizFilter,
  TakeoutRoute,
  TakeoutScreen,
  TakeoutTabKey,
} from '../uiTypes';

export interface CreateAddressPayload {
  name: string;
  phone: string;
  detail: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string;
  membershipLevel?: DeliveryUserProfile['membershipLevel'];
}

export interface TakeoutMerchantFilters {
  maxDeliveryMinutes: number | null;
  maxMinOrderAmount: number | null;
  minRating: number | null;
  promotionOnly: boolean;
}

export interface TakeoutState {
  route: TakeoutRoute;
  merchants: DeliveryMerchant[];
  categories: DeliveryDishCategory[];
  dishes: DeliveryDish[];
  cartLines: DeliveryCartLine[];
  orders: DeliveryOrder[];
  addresses: DeliveryAddress[];
  coupons: DeliveryCoupon[];
  profile: DeliveryUserProfile;
  searchKeyword: string;
  bizFilter: TakeoutBizFilter;
  sortKey: MerchantListSortKey;
  merchantFilters: TakeoutMerchantFilters;
  homeRecommendationVisibleCount: number;
  selectedAddressId: string | null;
  activeMerchantId: string | null;
  deliveryTimeMode: 'instant' | 'schedule';
  scheduleDate: string;
  scheduleTime: string;
  selectedCouponId: string | null;
  isHydrated: boolean;
  loading: boolean;
  error: string | null;
}

export interface TakeoutRouteActions {
  setRoute: (route: TakeoutRoute) => void;
  openScreen: (screen: TakeoutScreen, params?: Record<string, unknown>, tab?: TakeoutTabKey) => void;
  switchTab: (tab: TakeoutTabKey) => void;
  goHome: () => void;
}

export interface TakeoutMerchantActions {
  setMerchants: (next: DeliveryMerchant[] | ((prev: DeliveryMerchant[]) => DeliveryMerchant[])) => void;
  setCategories: (
    next: DeliveryDishCategory[] | ((prev: DeliveryDishCategory[]) => DeliveryDishCategory[])
  ) => void;
  setDishes: (next: DeliveryDish[] | ((prev: DeliveryDish[]) => DeliveryDish[])) => void;
  setSearchKeyword: (keyword: string) => void;
  setBizFilter: (filter: TakeoutBizFilter) => void;
  setSortKey: (sortKey: MerchantListSortKey) => void;
  setMerchantFilters: (filters: Partial<TakeoutMerchantFilters>) => void;
  resetMerchantFilters: () => void;
  loadMoreRecommendations: () => void;
  resetHomeRecommendations: () => void;
  setActiveMerchant: (merchantId: string | null) => void;
  enterMerchant: (merchantId: string) => void;
  enterMerchantList: () => void;
}

export interface TakeoutCartActions {
  addDishToCart: (dishId: string, selectedOptions?: DeliveryCartLineSelectedOption[]) => void;
  increaseCartLine: (lineId: string) => void;
  decreaseCartLine: (lineId: string) => void;
  removeCartLine: (lineId: string) => void;
  clearCart: () => void;
  clearMerchantCart: (merchantId: string) => void;
}

export interface TakeoutOrderActions {
  submitCartAsOrder: (merchantId?: string) => string | null;
  updateOrder: (order: DeliveryOrder) => void;
  updateOrderStatus: (orderId: string, status: DeliveryOrderStatus) => void;
  deleteOrder: (orderId: string) => void;
  reorderOrderToCart: (orderId: string) => void;
  urgeOrder: (orderId: string) => void;
  requestAfterSale: (orderId: string) => void;
  rateOrder: (orderId: string, score: number) => void;
  updateAfterSaleStatus: (orderId: string, status: DeliveryAfterSaleStatus) => void;
  setDeliveryTimeMode: (mode: 'instant' | 'schedule') => void;
  setScheduleDate: (value: string) => void;
  setScheduleTime: (value: string) => void;
  setSelectedCoupon: (couponId: string | null) => void;
  resetCheckoutSettings: () => void;
}

export interface TakeoutProfileActions {
  addAddress: (payload: CreateAddressPayload) => void;
  updateAddress: (id: string, payload: UpdateAddressPayload) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  setSelectedAddress: (id: string | null) => void;
  setCoupons: (next: DeliveryCoupon[] | ((prev: DeliveryCoupon[]) => DeliveryCoupon[])) => void;
  updateProfile: (payload: UpdateProfilePayload) => void;
}

export interface TakeoutHydrationActions {
  hydrateFromSeed: () => void;
  resetToSeed: () => void;
  markHydrated: (hydrated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  resetError: () => void;
}

export type TakeoutActions = TakeoutRouteActions &
  TakeoutMerchantActions &
  TakeoutCartActions &
  TakeoutOrderActions &
  TakeoutProfileActions &
  TakeoutHydrationActions;

export interface TakeoutStore extends TakeoutState, TakeoutActions {}
