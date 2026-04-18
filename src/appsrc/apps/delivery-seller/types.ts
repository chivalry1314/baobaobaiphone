// 复用 takeout 的基础类型
export type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryDishOption,
  DeliveryDishSku,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryOrderTimelineItem,
  DeliveryOrderTimelineKind,
  DeliveryAddress,
  DeliveryCartLine,
  DeliveryCartLineSelectedOption,
  DeliveryAfterSaleStatus,
  DeliveryMerchant,
  DeliveryBizType,
  DeliveryUserProfile,
  DeliveryCoupon,
} from '../takeout/types';

// ============ 商家端特有类型 ============

/** 店铺营业状态 */
export interface ShopStatus {
  isOpen: boolean;
  autoAcceptOrders: boolean;
  preparationMinutes: number; // 预计备餐时间（分钟）
  busyMode: boolean; // 忙碌模式
  lastStatusChangeAt: number;
}

/** 店铺配置 */
export interface ShopConfig {
  id: string;
  merchantId: string;
  name: string;
  logo?: string;
  cover?: string;
  bizType: DeliveryBizType;
  description: string;
  announcement: string;
  notice: string;
  minOrderAmount: number;
  deliveryFee: number;
  packageFee: number;
  serviceTags: string[];
  openingHours: OpeningHour[];
  status: ShopStatus;
  createdAt: number;
  updatedAt: number;
}

/** 营业时间 */
export interface OpeningHour {
  dayOfWeek: number; // 0-6, 0=Sunday
  open: string; // "09:00"
  close: string; // "22:00"
  isOpen: boolean;
}

/** 商品统计信息 */
export interface ProductStats {
  totalProducts: number;
  onSaleProducts: number;
  offSaleProducts: number;
  lowStockProducts: number; // stock < 10
  outOfStockProducts: number;
}

/** 订单统计信息 */
export interface OrderStats {
  todayOrders: number;
  pendingOrders: number; // 待接单
  preparingOrders: number; // 制作中
  deliveringOrders: number; // 配送中
  completedToday: number;
  cancelledToday: number;
  totalRevenue: number; // 今日营业额
}

/** 营销活动类型 */
export type MarketingType = 'discount' | 'coupon' | 'fullReduction' | 'freeDelivery';

/** 营销活动 */
export interface MarketingCampaign {
  id: string;
  merchantId: string;
  type: MarketingType;
  title: string;
  description: string;
  discountAmount?: number; // 优惠金额
  thresholdAmount?: number; // 满减门槛
  discountRate?: number; // 折扣率 (0.8 = 8 折)
  startTime: number;
  endTime: number;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  createdAt: number;
  updatedAt: number;
}

/** 数据统计 - 时间范围 */
export type StatsTimeRange = 'today' | 'week' | 'month' | 'custom';

/** 数据统计概览 */
export interface StatsOverview {
  timeRange: StatsTimeRange;
  startDate: number;
  endDate: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalCustomers: number;
  newCustomers: number;
  completionRate: number; // 完成率
  avgPreparationMinutes: number; // 平均备餐时间
  avgRating: number;
  totalRatings: number;
}

/** 趋势图数据点 */
export interface StatsTrendPoint {
  date: number;
  label: string;
  revenue: number;
  orders: number;
}

/** 商品分类销量 */
export interface CategorySales {
  categoryId: string;
  categoryName: string;
  salesCount: number;
  salesRevenue: number;
  percentage: number;
}

/** 用户评价 */
export interface UserReview {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  content: string;
  images?: string[];
  replyContent?: string;
  replyAt?: number;
  createdAt: number;
  isBadReview?: boolean; // 差评预警（1-2 星）
}

/** 评价筛选条件 */
export type ReviewFilter = 'all' | 'good' | 'normal' | 'bad';

/** 系统通知类型 */
export type NotificationType = 'system' | 'order' | 'review' | 'marketing';

/** 系统通知 */
export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: number;
  actionUrl?: string;
}

/** 通知设置 */
export interface NotificationSettings {
  orderNotification: boolean;
  reviewNotification: boolean;
  marketingNotification: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

/** 配送费配置 */
export interface DeliveryFeeConfig {
  baseFee: number;
  distanceFeePerKm: number;
  minDistance: number; // 起步距离（km）
  freeDeliveryThreshold: number; // 免配送费门槛
}

/** 打印设置 */
export interface PrintSettings {
  autoPrint: boolean;
  printerId?: string;
  printerName?: string;
  copies: number;
}

/** 账户信息 */
export interface AccountInfo {
  merchantId: string;
  shopName: string;
  phone?: string;
  isPhoneBound: boolean;
  hasPassword: boolean;
}

/** 订单筛选条件 */
export type OrderStatusFilter = 'all' | 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';

/** 商品筛选条件 */
export type ProductStatusFilter = 'all' | 'on' | 'off' | 'lowStock' | 'outOfStock';
