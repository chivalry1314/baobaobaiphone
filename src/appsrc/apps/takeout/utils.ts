import React from 'react';
import type {
  DeliveryCartLine,
  DeliveryCoupon,
  DeliveryMerchant,
  DeliveryOrder,
  DeliveryOrderStatus,
} from './types';

// 防抖函数 - 适用于搜索输入等场景
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
};

// 节流函数 - 适用于滚动、窗口调整等场景
export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number = 300
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

const ORDER_FLOW_STATUSES: DeliveryOrderStatus[] = [
  'pending-payment',
  'paid',
  'accepted',
  'preparing',
  'delivering',
  'completed',
];

export const formatMoney = (value: number): string => `¥${value.toFixed(2)}`;

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mi = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getOrderStatusLabel = (status: DeliveryOrderStatus): string => {
  if (status === 'pending-payment') return '待支付';
  if (status === 'paid') return '已支付';
  if (status === 'accepted') return '已接单';
  if (status === 'preparing') return '备餐中';
  if (status === 'delivering') return '配送中';
  if (status === 'completed') return '已完成';
  if (status === 'cancelled') return '已取消';
  return '退款中';
};

const isFlowStatus = (value: string): value is DeliveryOrderStatus => {
  return ORDER_FLOW_STATUSES.includes(value as DeliveryOrderStatus);
};

export const resolveOrderLiveStatus = (
  order: DeliveryOrder,
  now = Date.now()
): DeliveryOrderStatus => {
  if (order.status === 'cancelled' || order.status === 'refunding') return order.status;

  let latestStatus: DeliveryOrderStatus = order.status;
  let latestAt = 0;

  order.timeline.forEach((item) => {
    if (!isFlowStatus(item.kind)) return;
    if (item.at > now) return;
    if (item.at < latestAt) return;

    latestAt = item.at;
    latestStatus = item.kind;
  });

  if (order.status === 'completed') return 'completed';

  return latestStatus;
};

export const isOrderOngoing = (status: DeliveryOrderStatus): boolean => {
  return ['paid', 'accepted', 'preparing', 'delivering'].includes(status);
};

export const isOrderCompleted = (status: DeliveryOrderStatus): boolean => {
  return status === 'completed' || status === 'cancelled';
};

export const computeCartCount = (lines: DeliveryCartLine[]): number =>
  lines.reduce((sum, line) => sum + line.qty, 0);

export interface CartMerchantGroup {
  merchantId: string;
  merchantName: string;
  deliveryFee: number;
  minOrderAmount: number;
  lines: DeliveryCartLine[];
  itemTotal: number;
  packageFee: number;
}

export const groupCartByMerchant = (
  cartLines: DeliveryCartLine[],
  merchants: DeliveryMerchant[]
): CartMerchantGroup[] => {
  const groupMap = new Map<string, DeliveryCartLine[]>();

  cartLines.forEach((line) => {
    const found = groupMap.get(line.merchantId);
    if (found) {
      found.push(line);
      return;
    }

    groupMap.set(line.merchantId, [line]);
  });

  return Array.from(groupMap.entries()).map(([merchantId, lines]) => {
    const merchant = merchants.find((item) => item.id === merchantId);
    const itemTotal = Number(lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0).toFixed(2));
    const packageFee = Number(lines.reduce((sum, line) => sum + line.qty * 1, 0).toFixed(2));

    return {
      merchantId,
      merchantName: merchant?.name || '未知店铺',
      deliveryFee: Number((merchant?.deliveryFee ?? 5).toFixed(2)),
      minOrderAmount: merchant?.minOrderAmount ?? 0,
      lines,
      itemTotal,
      packageFee,
    };
  });
};

export const resolveBestCouponDiscount = (
  subtotal: number,
  coupons: DeliveryCoupon[],
  selectedCouponId: string | null
): { discount: number; couponId: string | null } => {
  const now = Date.now();
  const availableCoupons = coupons.filter((coupon) => !coupon.used && coupon.expiresAt > now);

  if (selectedCouponId) {
    const selected = availableCoupons.find((coupon) => coupon.id === selectedCouponId);
    if (selected && subtotal >= selected.thresholdAmount) {
      return {
        discount: Math.min(selected.discountAmount, subtotal),
        couponId: selected.id,
      };
    }
  }

  const fallback = availableCoupons
    .filter((coupon) => subtotal >= coupon.thresholdAmount)
    .sort((left, right) => right.discountAmount - left.discountAmount)[0];

  if (!fallback) {
    return { discount: 0, couponId: null };
  }

  return {
    discount: Math.min(fallback.discountAmount, subtotal),
    couponId: fallback.id,
  };
};
