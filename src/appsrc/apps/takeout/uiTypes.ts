import type { DeliveryBizType } from './types';

export type TakeoutTabKey = 'home' | 'orders' | 'me';

export type TakeoutScreen =
  | 'home'
  | 'merchant-list'
  | 'merchant-detail'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'order-detail'
  | 'me'
  | 'addresses'
  | 'coupons';

export type TakeoutBizFilter = 'all' | DeliveryBizType;

export type MerchantListSortKey = 'comprehensive' | 'sales' | 'distance' | 'delivery-fee';

export type OrderStatusFilter = 'all' | 'ongoing' | 'completed' | 'refunded';

export type RouteParams = Record<string, unknown>;

export interface TakeoutRoute {
  tab: TakeoutTabKey;
  screen: TakeoutScreen;
  params?: RouteParams;
}

export const TAB_ROOT_SCREEN_MAP: Record<TakeoutTabKey, TakeoutScreen> = {
  home: 'home',
  orders: 'orders',
  me: 'me',
};

export const DEFAULT_TAKEOUT_ROUTE: TakeoutRoute = {
  tab: 'home',
  screen: 'home',
};
