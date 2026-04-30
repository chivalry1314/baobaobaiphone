export interface DeliveryOrder extends Record<string, unknown> {
  id: string;
  merchantId?: string;
  createdAt?: number;
  status?: string;
}

export interface DeliveryDish extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryDishCategory extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryDishOption extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryDishSku extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryMerchant extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryCartLineSelectedOption extends Record<string, unknown> {
  id?: string;
  name?: string;
}

export interface DeliveryCartLine extends Record<string, unknown> {
  id?: string;
  dishId?: string;
}

export interface DeliveryAddress extends Record<string, unknown> {
  id?: string;
}

export type DeliveryOrderStatus = string;
export interface DeliveryOrderTimelineItem extends Record<string, unknown> {}
export type DeliveryOrderTimelineKind = string;
export type DeliveryAfterSaleStatus = string;
export type DeliveryBizType = string;
export interface DeliveryUserProfile extends Record<string, unknown> {}
export interface DeliveryCoupon extends Record<string, unknown> {}

export interface DeliveryTrackingRecord {
  stage: '接单' | '出餐' | '配送' | '送达';
  progress: number;
  driverName: string;
  driverDistanceKm: number;
  etaMinutes: number;
  destination: string;
  updatedAt: number;
}

export type ShopStatus = {
  status?: string;
  isOpen?: boolean;
  [key: string]: unknown;
};

export interface ShopConfig extends Record<string, unknown> {}
export interface OpeningHour extends Record<string, unknown> {}
export interface ProductStats extends Record<string, unknown> {}
export interface OrderStats extends Record<string, unknown> {}
export interface MarketingCampaign extends Record<string, unknown> {}
export type MarketingType = string;
export type StatsTimeRange = string;
export interface StatsOverview extends Record<string, unknown> {}
export interface StatsTrendPoint extends Record<string, unknown> {}
export interface CategorySales extends Record<string, unknown> {}
export interface UserReview extends Record<string, unknown> {
  id?: string;
  rating?: number;
  content?: string;
  merchantName?: string;
}
export type ReviewFilter = string;
export type NotificationType = string;
export interface SystemNotification extends Record<string, unknown> {}
export interface NotificationSettings extends Record<string, unknown> {}
export interface DeliveryFeeConfig extends Record<string, unknown> {}
export interface PrintSettings extends Record<string, unknown> {}
export interface AccountInfo extends Record<string, unknown> {}
export type OrderStatusFilter = string;
export type ProductStatusFilter = string;

export type DeliveryAppPage = 'home' | 'delivery' | 'checkout' | 'management' | 'me';
export type DeliveryDeliveryView = 'category' | 'store' | 'cart' | 'kitchen';

export interface DeliveryMenuCategory {
  id: string;
  name: string;
  icon: string;
  accent: string;
}

export interface DeliveryStoreSection {
  id: string;
  name: string;
}

export interface DeliveryStore {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  accent: string;
  subtitle: string;
  rating: number;
  monthlySales: number;
  distanceKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  avgDeliveryMinutes: number;
  notice: string;
  isOpen: boolean;
  sections: DeliveryStoreSection[];
}

export interface DeliveryMenuProduct {
  id: string;
  storeId: string;
  categoryId: string;
  sectionId: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  description: string;
  tag: string;
  status: '上架' | '下架';
}

export interface DeliveryCartEntry {
  productId: string;
  qty: number;
  name?: string;
  price?: number;
  description?: string;
  tag?: string;
  storeId?: string;
  categoryId?: string;
  sectionId?: string;
}

export interface DeliveryOrderRecord {
  id: string;
  type: '购买' | '发起代付' | '为TA买单';
  title: string;
  merchantName: string;
  amount: number;
  status: '待支付' | '已支付' | '配送中' | '已送达' | '已取消';
  createdAt: number;
  paymentMode?: 'wechat' | 'delegate' | 'gift';
  paymentStatus?: 'pending' | 'accepted' | 'rejected' | 'paid';
  paymentContactId?: string;
  paymentContactName?: string;
  paymentContactAvatar?: string;
  delivery?: DeliveryTrackingRecord;
  deliveryAddress?: {
    title: string;
    recipient: string;
    phone: string;
  };
}
