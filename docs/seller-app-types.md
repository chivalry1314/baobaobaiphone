# 商家端 App 类型定义建议

**用途：** 作为 `src/appsrc/apps/seller/types.ts` 和 `uiTypes.ts` 的实现参考

---

## 一、核心数据类型 (types.ts)

```typescript
// src/appsrc/apps/seller/types.ts

import type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryDishSku,
  DeliveryDishOption,
  DeliveryOrder,
  DeliveryOrderStatus,
} from '../takeout/types';

// ==================== 店铺相关 ====================

/**
 * 商家店铺类型（扩展自用户端的 DeliveryMerchant）
 */
export interface SellerShop {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  
  // 公告信息
  announcement: string;  // 店铺公告（展示给用户）
  notice: string;        // 内部备注
  
  // 营业状态
  isOpen: boolean;
  businessHours: WeeklyBusinessHours;
  
  // 配送配置
  deliveryRange: number;      // 配送范围 (km)
  minOrderAmount: number;     // 起送价
  deliveryFee: number;        // 配送费
  avgDeliveryMinutes: number; // 平均配送时长
  
  // 服务标签
  serviceTags: ServiceTag[];
  
  // 统计数据（只读）
  rating: number;
  monthlySales: number;
  totalOrders: number;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

/**
 * 每周营业时间
 */
export interface WeeklyBusinessHours {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
}

/**
 * 时间段
 */
export interface TimeRange {
  start: string; // "09:00"
  end: string;   // "21:00"
}

/**
 * 服务标签
 */
export type ServiceTag = 
  | '准时达'
  | '可开发票'
  | '支持预订'
  | '品牌连锁'
  | '极速出单'
  | '安心食材'
  | '夜间营业'
  | '到店自取'
  | '可预约'
  | '低糖可选'
  | '甜品专送'
  | '品质保障'
  | '新鲜直送'
  | '源头采购'
  | '售后无忧'
  | '出餐稳定'
  | '加料自选'
  | '支持拼单'
  | '健康轻食'
  | '汤品保温'
  | '安心包装'
  | '精品豆'
  | '30 分钟达'
  | '支持备注';

// ==================== 商品相关（复用用户端类型） ====================

/**
 * 商品（直接复用用户端类型）
 */
export type SellerProduct = DeliveryDish;

/**
 * 商品分类（直接复用用户端类型）
 */
export type SellerCategory = DeliveryDishCategory;

/**
 * 商品规格（直接复用用户端类型）
 */
export type SellerProductSku = DeliveryDishSku;

/**
 * 规格选项（直接复用用户端类型）
 */
export type SellerProductOption = DeliveryDishOption;

/**
 * 商品表单（用于编辑）
 */
export interface SellerProductForm {
  id?: string;
  name: string;
  desc: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryId: string;
  stock: number;
  status: 'on' | 'off';
  skus: SellerProductSku[];
  monthlySales?: number;
}

/**
 * 分类表单
 */
export interface SellerCategoryForm {
  id?: string;
  name: string;
  sort: number;
}

// ==================== 订单相关 ====================

/**
 * 商家视角的订单（扩展自用户端 DeliveryOrder）
 */
export interface SellerOrder extends DeliveryOrder {
  // 商家操作时间戳
  acceptedAt?: number;
  preparingAt?: number;
  readyForDeliveryAt?: number;
  
  // 骑手信息（如有）
  riderName?: string;
  riderPhone?: string;
  
  // 打印状态
  printed: boolean;
  
  // 商家备注
  merchantNote?: string;
}

/**
 * 订单筛选条件
 */
export interface SellerOrderFilters {
  status: DeliveryOrderStatus | 'all';
  dateRange: {
    start: number; // timestamp
    end: number;   // timestamp
  };
  keyword: string; // 搜索订单号、商品名、用户名的关键词
}

/**
 * 拒单原因
 */
export type RejectReason = 
  | 'out_of_stock'      // 售罄
  | 'too_far'           // 超出配送范围
  | 'closed'            // 已打烊
  | 'capacity_full'     // 接单量已满
  | 'other';            // 其他

// ==================== 统计相关 ====================

/**
 * 店铺统计数据
 */
export interface ShopStats {
  // 今日数据
  today: DailyStats;
  
  // 昨日数据（用于对比）
  yesterday: DailyStats;
  
  // 本月数据
  month: MonthlyStats;
  
  // 商品排行
  topProducts: ProductStats[];
  
  // 评价统计
  reviews: ReviewStats;
}

/**
 * 每日统计
 */
export interface DailyStats {
  revenue: number;        // 营业额（元）
  orderCount: number;     // 订单数
  avgOrderValue: number;  // 客单价（元）
  customerCount: number;  // 顾客数
  refundCount: number;    // 退款数
  refundAmount: number;   // 退款金额
}

/**
 * 每月统计
 */
export interface MonthlyStats {
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  dayByDay: DailyStats[]; // 每日数据（用于图表）
}

/**
 * 商品统计
 */
export interface ProductStats {
  productId: string;
  productName: string;
  salesCount: number;     // 销量
  revenue: number;        // 销售额
  viewCount?: number;     // 浏览量（如有）
}

/**
 * 评价统计
 */
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
  recentReviews: Review[];
}

/**
 * 评分分布
 */
export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

/**
 * 用户评价
 */
export interface Review {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  images?: string[];
  reply?: string;        // 商家回复
  repliedAt?: number;
  createdAt: number;
}

// ==================== 营销活动 ====================

/**
 * 营销配置
 */
export interface MarketingConfig {
  promotions: Promotion[];
  coupons: Coupon[];
  newCustomerDiscount: NewCustomerDiscount | null;
}

/**
 * 促销活动
 */
export interface Promotion {
  id: string;
  type: PromotionType;
  name: string;
  description: string;
  rules: PromotionRule[];
  startTime: number;
  endTime: number;
  active: boolean;
  // 统计
  usedCount?: number;
  revenue?: number;
}

/**
 * 促销类型
 */
export type PromotionType = 
  | 'full-reduction'    // 满减
  | 'discount'          // 折扣
  | 'new-customer'      // 新客
  | 'flash-sale';       // 秒杀

/**
 * 促销规则
 */
export interface PromotionRule {
  threshold: number;  // 满 X 元
  discount: number;   // 减 Y 元（满减）或 折扣率（如 0.8 表示 8 折）
  maxDiscount?: number; // 最高优惠（折扣类型用）
}

/**
 * 优惠券
 */
export interface Coupon {
  id: string;
  title: string;
  description: string;
  type: CouponType;
  thresholdAmount: number;  // 使用门槛
  discountAmount: number;   // 优惠金额
  totalQuantity: number;    // 发放总量
  usedQuantity: number;     // 已使用量
  remainingQuantity: number; // 剩余量
  expiresAt: number;
  active: boolean;
}

/**
 * 优惠券类型
 */
export type CouponType = 'full-reduction' | 'discount';

/**
 * 新客立减
 */
export interface NewCustomerDiscount {
  active: boolean;
  discountAmount: number;
  description: string;
}

// ==================== 消息通知 ====================

/**
 * 新订单通知
 */
export interface NewOrderNotification {
  orderId: string;
  merchantName: string;
  totalAmount: number;
  itemCount: number;
  deliveryAddress: string;
  createdAt: number;
  read: boolean;
}

// ==================== App Props ====================

export interface SellerAppProps {
  onClose: () => void;
}
```

---

## 二、UI 路由类型 (uiTypes.ts)

```typescript
// src/appsrc/apps/seller/uiTypes.ts

// ==================== Tab 导航 ====================

/**
 * 底部 Tab
 */
export type SellerTab = 
  | 'home'       // 首页（数据概览）
  | 'orders'     // 订单管理
  | 'products'   // 商品管理
  | 'shop'       // 店铺管理
  | 'stats'      // 数据统计
  | 'marketing'; // 营销活动

// ==================== 页面/屏幕 ====================

/**
 * 所有可用页面
 */
export type SellerScreen =
  // 首页
  | 'home'
  
  // 订单相关
  | 'order-list'
  | 'order-detail'
  
  // 商品相关
  | 'product-list'
  | 'product-form'
  | 'category-manage'
  | 'sku-manage'
  
  // 店铺相关
  | 'shop-manage'
  | 'shop-hours'
  | 'shop-decoration'
  
  // 统计相关
  | 'stats-overview'
  | 'stats-products'
  | 'stats-reviews'
  
  // 营销相关
  | 'marketing-manage'
  | 'promotion-form'
  | 'coupon-form';

// ==================== 路由状态 ====================

/**
 * 当前路由
 */
export interface SellerRoute {
  tab: SellerTab;
  screen: SellerScreen;
  params?: Record<string, string>;
}

// ==================== 订单筛选 UI ====================

/**
 * 订单状态筛选快捷选项
 */
export type OrderStatusFilter = 
  | 'all'
  | 'pending'      // 待处理（待接单）
  | 'processing'   // 进行中（已接单、制作中）
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消/退款

/**
 * 订单列表筛选 UI 状态
 */
export interface OrderListFilters {
  statusFilter: OrderStatusFilter;
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  customDateRange?: {
    start: string; // YYYY-MM-DD
    end: string;
  };
  keyword: string;
}

// ==================== 商品筛选 UI ====================

/**
 * 商品状态筛选
 */
export type ProductStatusFilter = 
  | 'all'
  | 'on'     // 上架
  | 'off'    // 下架
  | 'low-stock'; // 库存预警

/**
 * 商品列表筛选 UI 状态
 */
export interface ProductListFilters {
  statusFilter: ProductStatusFilter;
  categoryId: string | 'all';
  keyword: string;
}

// ==================== 表单验证 ====================

/**
 * 通用表单错误
 */
export interface FormError {
  field: string;
  message: string;
}

/**
 * 店铺表单验证状态
 */
export interface ShopFormErrors {
  name?: string;
  announcement?: string;
  deliveryRange?: string;
  minOrderAmount?: string;
  deliveryFee?: string;
}

/**
 * 商品表单验证状态
 */
export interface ProductFormErrors {
  name?: string;
  desc?: string;
  price?: string;
  categoryId?: string;
  stock?: string;
  skus?: string;
}

// ==================== 通用 UI 状态 ====================

/**
 * 加载状态
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 确认对话框配置
 */
export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
}
```

---

## 三、Store 类型定义

```typescript
// src/appsrc/apps/seller/store/types.ts

import type {
  SellerShop,
  SellerProduct,
  SellerCategory,
  SellerOrder,
  SellerOrderFilters,
  ShopStats,
  MarketingConfig,
  SellerAppProps,
} from '../types';
import type { SellerRoute, SellerTab, OrderListFilters, ProductListFilters } from '../uiTypes';

// ==================== 状态定义 ====================

export interface SellerState {
  // 路由
  route: SellerRoute;
  
  // 店铺
  shop: SellerShop | null;
  shopLoading: boolean;
  shopError: string | null;
  
  // 商品
  products: SellerProduct[];
  categories: SellerCategory[];
  productFilters: ProductListFilters;
  productLoading: boolean;
  productError: string | null;
  
  // 订单
  orders: SellerOrder[];
  orderFilters: OrderListFilters;
  orderLoading: boolean;
  orderError: string | null;
  newOrderCount: number;
  
  // 统计
  stats: ShopStats | null;
  statsLoading: boolean;
  statsError: string | null;
  
  // 营销
  marketing: MarketingConfig | null;
  marketingLoading: boolean;
  marketingError: string | null;
  
  // 全局
  isHydrated: boolean;
  error: string | null;
}

// ==================== Actions ====================

// 路由 Actions
export interface SellerRouteActions {
  setRoute: (route: SellerRoute) => void;
  switchTab: (tab: SellerTab) => void;
  navigateTo: (screen: SellerScreen, params?: Record<string, string>) => void;
  goBack: () => void;
}

// 店铺 Actions
export interface SellerShopActions {
  loadShop: () => Promise<void>;
  updateShop: (shop: Partial<SellerShop>) => void;
  toggleShopStatus: () => void;
  updateBusinessHours: (hours: SellerShop['businessHours']) => void;
}

// 商品 Actions
export interface SellerProductActions {
  loadProducts: () => Promise<void>;
  loadCategories: () => Promise<void>;
  addProduct: (product: SellerProduct) => void;
  updateProduct: (id: string, product: Partial<SellerProduct>) => void;
  deleteProduct: (id: string) => void;
  toggleProductStatus: (id: string) => void;
  updateProductStock: (id: string, stock: number) => void;
  addCategory: (category: SellerCategory) => void;
  updateCategory: (id: string, category: Partial<SellerCategory>) => void;
  deleteCategory: (id: string) => void;
  setProductFilters: (filters: Partial<ProductListFilters>) => void;
}

// 订单 Actions
export interface SellerOrderActions {
  loadOrders: (filters?: Partial<OrderListFilters>) => Promise<void>;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  startPreparing: (orderId: string) => void;
  completePreparation: (orderId: string) => void;
  callRider: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  updateOrderFilters: (filters: Partial<OrderListFilters>) => void;
  setNewOrderCount: (count: number) => void;
}

// 统计 Actions
export interface SellerStatsActions {
  loadStats: () => Promise<void>;
  loadProductStats: () => Promise<void>;
  loadReviewStats: () => Promise<void>;
  replyReview: (reviewId: string, reply: string) => void;
}

// 营销 Actions
export interface SellerMarketingActions {
  loadMarketing: () => Promise<void>;
  createPromotion: (promotion: MarketingConfig['promotions'][0]) => void;
  updatePromotion: (id: string, promotion: Partial<MarketingConfig['promotions'][0]>) => void;
  togglePromotion: (id: string) => void;
  deletePromotion: (id: string) => void;
  createCoupon: (coupon: MarketingConfig['coupons'][0]) => void;
  updateCoupon: (id: string, coupon: Partial<MarketingConfig['coupons'][0]>) => void;
  toggleCoupon: (id: string) => void;
  setNewCustomerDiscount: (discount: MarketingConfig['newCustomerDiscount']) => void;
}

// 持久化 Actions
export interface SellerHydrationActions {
  hydrateFromSeed: () => void;
  markHydrated: (hydrated: boolean) => void;
  saveToStorage: () => void;
  loadFromStorage: () => Promise<void>;
}

// ==================== 完整 Store ====================

export type SellerActions = 
  SellerRouteActions &
  SellerShopActions &
  SellerProductActions &
  SellerOrderActions &
  SellerStatsActions &
  SellerMarketingActions &
  SellerHydrationActions;

export interface SellerStore extends SellerState, SellerActions {}
```

---

## 四、与 takeout 类型的映射关系

```typescript
// src/appsrc/apps/seller/types-mapping.ts
// 此文件用于说明类型映射关系，实际使用时直接 import

import type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryDishSku,
  DeliveryDishOption,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryMerchant,
} from '../takeout/types';

// 直接复用的类型
export type SellerProduct = DeliveryDish;
export type SellerCategory = DeliveryDishCategory;
export type SellerProductSku = DeliveryDishSku;
export type SellerProductOption = DeliveryDishOption;
export type SellerOrderStatus = DeliveryOrderStatus;

// 需要扩展的类型
// SellerOrder extends DeliveryOrder (添加商家特有字段)
// SellerShop extends DeliveryMerchant (添加商家管理字段)

// 类型转换工具函数
export const merchantToShop = (merchant: DeliveryMerchant): SellerShop => ({
  ...merchant,
  // 添加商家端特有字段
  notice: '',
  businessHours: getDefaultBusinessHours(),
  deliveryRange: 3,
  totalOrders: 0,
});

export const orderToSellerOrder = (order: DeliveryOrder): SellerOrder => ({
  ...order,
  printed: false,
  merchantNote: undefined,
});
```

---

**文档结束**
