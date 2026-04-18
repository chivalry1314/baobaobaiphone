import type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryOrder,
  ShopConfig,
  ShopStatus,
  MarketingCampaign,
  StatsOverview,
  OrderStatusFilter,
  ProductStatusFilter,
  StatsTimeRange,
  StatsTrendPoint,
  CategorySales,
  UserReview,
  ReviewFilter,
  SystemNotification,
  NotificationSettings,
  DeliveryFeeConfig,
  PrintSettings,
  AccountInfo,
} from '../types';
import type { SellerRoute, SellerScreen, SellerTabKey } from '../uiTypes';

// ============ 状态定义 ============

export interface DeliverySellerState {
  // 路由
  route: SellerRoute;

  // 店铺
  shopConfig: ShopConfig | null;
  shopStatus: ShopStatus;

  // 商品
  categories: DeliveryDishCategory[];
  products: DeliveryDish[];
  productFilter: ProductStatusFilter;
  productSearchKeyword: string;
  productLoading: boolean;
  productError: string | null;

  // 订单
  orders: DeliveryOrder[];
  orderFilter: OrderStatusFilter;
  orderSearchKeyword: string;
  orderLoading: boolean;
  orderError: string | null;
  newOrderCount: number;

  // 营销
  marketingCampaigns: MarketingCampaign[];

  // 统计
  statsOverview: StatsOverview | null;
  revenueTrend: StatsTrendPoint[];
  orderTrend: StatsTrendPoint[];
  categorySales: CategorySales[];

  // 评价
  reviews: UserReview[];
  reviewFilter: ReviewFilter;
  badReviewCount: number;

  // 通知
  notifications: SystemNotification[];
  notificationSettings: NotificationSettings;
  unreadNotificationCount: number;

  // 设置
  deliveryFeeConfig: DeliveryFeeConfig;
  printSettings: PrintSettings;
  accountInfo: AccountInfo | null;

  // UI 状态
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

// ============ Action 定义 ============

export interface SellerRouteActions {
  setRoute: (route: SellerRoute) => void;
  switchTab: (tab: SellerTabKey) => void;
  openScreen: (screen: SellerScreen, params?: Record<string, unknown>) => void;
  goHome: () => void;
}

export interface SellerShopActions {
  setShopConfig: (config: ShopConfig) => void;
  updateShopStatus: (status: Partial<ShopStatus>) => void;
  toggleShopOpen: () => void;
  toggleAutoAccept: () => void;
  toggleBusyMode: () => void;
}

export interface SellerProductActions {
  setProducts: (products: DeliveryDish[] | ((prev: DeliveryDish[]) => DeliveryDish[])) => void;
  setCategories: (categories: DeliveryDishCategory[] | ((prev: DeliveryDishCategory[]) => DeliveryDishCategory[])) => void;
  addProduct: (product: DeliveryDish) => void;
  updateProduct: (id: string, updates: Partial<DeliveryDish>) => void;
  deleteProduct: (id: string) => void;
  toggleProductStatus: (id: string) => void;
  setProductFilter: (filter: ProductStatusFilter) => void;
  setProductSearchKeyword: (keyword: string) => void;
  batchToggleProductStatus: (productIds: string[], status: 'on' | 'off') => void;
  updateProductStock: (productId: string, stock: number) => void;
  setProductLoading: (loading: boolean) => void;
  setProductError: (error: string | null) => void;
  loadProducts: () => Promise<void>;
}

export interface SellerOrderActions {
  setOrders: (orders: DeliveryOrder[] | ((prev: DeliveryOrder[]) => DeliveryOrder[])) => void;
  acceptOrder: (orderId: string) => void;
  startPreparingOrder: (orderId: string) => void;
  completePreparation: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  setOrderFilter: (filter: OrderStatusFilter) => void;
  setOrderSearchKeyword: (keyword: string) => void;
  setOrderLoading: (loading: boolean) => void;
  setOrderError: (error: string | null) => void;
  setNewOrderCount: (count: number) => void;
  clearNewOrderCount: () => void;
}

export interface SellerMarketingActions {
  setMarketingCampaigns: (campaigns: MarketingCampaign[] | ((prev: MarketingCampaign[]) => MarketingCampaign[])) => void;
  addMarketingCampaign: (campaign: MarketingCampaign) => void;
  updateMarketingCampaign: (id: string, updates: Partial<MarketingCampaign>) => void;
  deleteMarketingCampaign: (id: string) => void;
  toggleCampaignActive: (id: string) => void;
}

export interface SellerStatsActions {
  setStatsOverview: (stats: StatsOverview | null) => void;
  setStatsTimeRange: (timeRange: StatsTimeRange, startDate?: number, endDate?: number) => void;
  refreshStats: () => void;
  setRevenueTrend: (trend: StatsTrendPoint[]) => void;
  setOrderTrend: (trend: StatsTrendPoint[]) => void;
  setCategorySales: (sales: CategorySales[]) => void;
  calculateTrendData: () => void;
  calculateCategorySales: () => void;
}

export interface SellerReviewActions {
  setReviews: (reviews: UserReview[]) => void;
  addReviewReply: (reviewId: string, replyContent: string) => void;
  setReviewFilter: (filter: ReviewFilter) => void;
  loadReviews: () => void;
  getBadReviewCount: () => number;
}

export interface SellerNotificationActions {
  setNotifications: (notifications: SystemNotification[]) => void;
  addNotification: (notification: SystemNotification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  loadNotifications: () => void;
}

export interface SellerSettingsActions {
  setDeliveryFeeConfig: (config: DeliveryFeeConfig) => void;
  setPrintSettings: (settings: PrintSettings) => void;
  setAccountInfo: (info: AccountInfo) => void;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  bindPhone: (phone: string, code: string) => Promise<boolean>;
  loadSettings: () => void;
}

export interface SellerHydrationActions {
  hydrateFromSeed: () => void;
  markHydrated: (hydrated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  resetError: () => void;
}

export type DeliverySellerActions =
  & SellerRouteActions
  & SellerShopActions
  & SellerProductActions
  & SellerOrderActions
  & SellerMarketingActions
  & SellerStatsActions
  & SellerReviewActions
  & SellerNotificationActions
  & SellerSettingsActions
  & SellerHydrationActions;

export interface DeliverySellerStore extends DeliverySellerState, DeliverySellerActions {}
