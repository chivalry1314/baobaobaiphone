import type { OrderStatusFilter, ProductStatusFilter, StatsTimeRange } from './types';

/** 底部导航 Tab */
export type SellerTabKey = 'home' | 'orders' | 'products' | 'me';

/** 页面路由 */
export type SellerScreen =
  | 'home'
  | 'shop-manage'
  | 'order-list'
  | 'order-detail'
  | 'product-list'
  | 'product-form'
  | 'stats-view'
  | 'marketing-manage'
  | 'review-manage'
  | 'message-center'
  | 'settings-view'
  | 'me';

/** 路由参数 */
export type RouteParams = Record<string, unknown>;

/** 路由状态 */
export interface SellerRoute {
  tab: SellerTabKey;
  screen: SellerScreen;
  params?: RouteParams;
}

/** 默认路由 */
export const DEFAULT_SELLER_ROUTE: SellerRoute = {
  tab: 'home',
  screen: 'home',
};

/** Tab 根页面映射 */
export const TAB_ROOT_SCREEN_MAP: Record<SellerTabKey, SellerScreen> = {
  home: 'home',
  orders: 'order-list',
  products: 'product-list',
  me: 'me',
};
