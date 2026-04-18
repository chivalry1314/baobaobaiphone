export type DeliveryBizType = 'fastfood' | 'drink' | 'snack' | 'dessert' | 'fruit';

export interface DeliveryMerchant {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  bizType: DeliveryBizType;
  rating: number;
  monthlySales: number;
  minOrderAmount: number;
  deliveryFee: number;
  avgDeliveryMinutes: number;
  distanceKm: number;
  promotions: string[];
  tags: string[];
  announcement: string;
  notice: string;
  serviceTags: string[];
  isOpen: boolean;
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryDishOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface DeliveryDishSku {
  id: string;
  name: string;
  options: DeliveryDishOption[];
  required?: boolean;
}

export interface DeliveryDishCategory {
  id: string;
  merchantId: string;
  name: string;
  sort: number;
}

export interface DeliveryDish {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  desc: string;
  image?: string;
  price: number;
  originalPrice?: number;
  monthlySales: number;
  stock: number;
  skus: DeliveryDishSku[];
  status: 'on' | 'off';
}

export interface DeliveryCartLineSelectedOption {
  skuId: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface DeliveryCartLine {
  id: string;
  merchantId: string;
  dishId: string;
  dishName: string;
  unitPrice: number;
  qty: number;
  selectedOptions: DeliveryCartLineSelectedOption[];
  note?: string;
}

export type DeliveryOrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'refunding';

export type DeliveryAfterSaleStatus = 'none' | 'requested' | 'processing' | 'done';

export type DeliveryOrderTimelineKind = DeliveryOrderStatus | 'urge' | 'after-sale' | 'rated';

export interface DeliveryOrderTimelineItem {
  id: string;
  kind: DeliveryOrderTimelineKind;
  label: string;
  at: number;
  note?: string;
}

export interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  detail: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface DeliveryOrder {
  id: string;
  merchantId: string;
  merchantName: string;
  lines: DeliveryCartLine[];
  itemTotal: number;
  packageFee: number;
  deliveryFee: number;
  discountFee: number;
  payableAmount: number;
  status: DeliveryOrderStatus;
  address: DeliveryAddress;
  deliveryTimeMode: 'instant' | 'schedule';
  scheduleAt?: number;
  estimatedDeliveredAt?: number;
  createdAt: number;
  paidAt?: number;
  finishedAt?: number;
  couponId?: string | null;
  urgeCount: number;
  afterSaleStatus: DeliveryAfterSaleStatus;
  rated: boolean;
  ratingScore?: number;
  timeline: DeliveryOrderTimelineItem[];
}

export interface DeliveryCoupon {
  id: string;
  title: string;
  thresholdAmount: number;
  discountAmount: number;
  expiresAt: number;
  used: boolean;
}

export interface DeliveryUserProfile {
  id: string;
  name: string;
  avatar?: string;
  membershipLevel: 'normal' | 'silver' | 'gold';
}

export interface TakeoutAppProps {
  onClose: () => void;
}
