import type { StoreApi } from 'zustand';
import type {
  DeliveryAddress,
  DeliveryAfterSaleStatus,
  DeliveryCartLine,
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryOrderTimelineItem,
} from '../../types';
import type { TakeoutStore } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const MILLISECONDS_IN_MINUTE = 60 * 1000;

const statusLabelMap: Record<DeliveryOrderStatus, string> = {
  'pending-payment': '待支付',
  paid: '已支付',
  accepted: '商家已接单',
  preparing: '商家备餐中',
  delivering: '骑手配送中',
  completed: '订单已完成',
  cancelled: '订单已取消',
  refunding: '退款处理中',
};

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
};

const clampScore = (score: number): number => Math.max(1, Math.min(5, Math.round(score)));

const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const buildDefaultScheduleDate = (): string => {
  return formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
};

const combineDateTime = (date: string, time: string): number | null => {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  const timestamp = parsed.getTime();
  if (!Number.isFinite(timestamp)) return null;
  return timestamp;
};

const resolveAddress = (
  addresses: DeliveryAddress[],
  selectedAddressId: string | null
): DeliveryAddress | null => {
  const selected = selectedAddressId ? addresses.find((item) => item.id === selectedAddressId) : undefined;
  if (selected) return selected;

  const defaultAddress = addresses.find((item) => item.isDefault);
  if (defaultAddress) return defaultAddress;

  return addresses[0] || null;
};

const calculateLineTotal = (line: DeliveryCartLine): number => line.qty * line.unitPrice;

const createTimelineItem = (
  kind: DeliveryOrderTimelineItem['kind'],
  at: number,
  label: string,
  note?: string
): DeliveryOrderTimelineItem => ({
  id: generateId('timeline'),
  kind,
  at,
  label,
  ...(note ? { note } : {}),
});

const buildOrderTimeline = (
  mode: 'instant' | 'schedule',
  createdAt: number,
  scheduleAt: number | undefined,
  etaMinutes: number
): DeliveryOrderTimelineItem[] => {
  if (mode === 'schedule' && scheduleAt) {
    const acceptedAt = Math.max(createdAt + 2 * MILLISECONDS_IN_MINUTE, scheduleAt - 20 * MILLISECONDS_IN_MINUTE);
    const preparingAt = Math.max(acceptedAt + 2 * MILLISECONDS_IN_MINUTE, scheduleAt - 15 * MILLISECONDS_IN_MINUTE);
    const deliveringAt = Math.max(preparingAt + 3 * MILLISECONDS_IN_MINUTE, scheduleAt);
    const completedAt = deliveringAt + etaMinutes * MILLISECONDS_IN_MINUTE;

    return [
      createTimelineItem('paid', createdAt, statusLabelMap.paid),
      createTimelineItem('accepted', acceptedAt, statusLabelMap.accepted),
      createTimelineItem('preparing', preparingAt, statusLabelMap.preparing),
      createTimelineItem('delivering', deliveringAt, statusLabelMap.delivering),
      createTimelineItem('completed', completedAt, statusLabelMap.completed),
    ];
  }

  const acceptedAt = createdAt + 2 * MILLISECONDS_IN_MINUTE;
  const preparingAt = acceptedAt + 5 * MILLISECONDS_IN_MINUTE;
  const deliveringAt = preparingAt + 12 * MILLISECONDS_IN_MINUTE;
  const completedAt = deliveringAt + etaMinutes * MILLISECONDS_IN_MINUTE;

  return [
    createTimelineItem('paid', createdAt, statusLabelMap.paid),
    createTimelineItem('accepted', acceptedAt, statusLabelMap.accepted),
    createTimelineItem('preparing', preparingAt, statusLabelMap.preparing),
    createTimelineItem('delivering', deliveringAt, statusLabelMap.delivering),
    createTimelineItem('completed', completedAt, statusLabelMap.completed),
  ];
};

const mergeCartLines = (current: DeliveryCartLine[], incoming: DeliveryCartLine[]): DeliveryCartLine[] => {
  const lineMap = new Map<string, DeliveryCartLine>();
  current.forEach((line) => {
    lineMap.set(line.id, { ...line, selectedOptions: [...line.selectedOptions] });
  });

  incoming.forEach((line) => {
    const found = lineMap.get(line.id);
    if (!found) {
      lineMap.set(line.id, { ...line, selectedOptions: [...line.selectedOptions] });
      return;
    }

    lineMap.set(line.id, {
      ...found,
      qty: found.qty + line.qty,
    });
  });

  return Array.from(lineMap.values());
};

const resolveAfterSaleOrderStatus = (
  afterSaleStatus: DeliveryAfterSaleStatus,
  currentStatus: DeliveryOrderStatus
): DeliveryOrderStatus => {
  if (afterSaleStatus === 'requested' || afterSaleStatus === 'processing') return 'refunding';
  if (afterSaleStatus === 'done') return currentStatus === 'completed' ? 'completed' : 'cancelled';
  return currentStatus;
};

export const createTakeoutOrderSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<
  TakeoutStore,
  | 'submitCartAsOrder'
  | 'updateOrderStatus'
  | 'updateOrder'
  | 'deleteOrder'
  | 'reorderOrderToCart'
  | 'urgeOrder'
  | 'requestAfterSale'
  | 'rateOrder'
  | 'updateAfterSaleStatus'
  | 'setDeliveryTimeMode'
  | 'setScheduleDate'
  | 'setScheduleTime'
  | 'setSelectedCoupon'
  | 'resetCheckoutSettings'
> => ({
  submitCartAsOrder: (merchantId) => {
    let nextOrderId: string | null = null;

    set((state) => {
      const targetLines = merchantId
        ? state.cartLines.filter((line) => line.merchantId === merchantId)
        : state.cartLines;

      if (targetLines.length === 0) {
        return {
          error: '购物车为空，暂时无法下单。',
        };
      }

      const shippingAddress = resolveAddress(state.addresses, state.selectedAddressId);
      if (!shippingAddress) {
        return {
          error: '请先新增收货地址。',
        };
      }

      const groupedByMerchant = new Map<string, DeliveryCartLine[]>();
      targetLines.forEach((line) => {
        const found = groupedByMerchant.get(line.merchantId);
        if (found) {
          found.push(line);
          return;
        }
        groupedByMerchant.set(line.merchantId, [line]);
      });

      const groups = Array.from(groupedByMerchant.entries()).map(([groupMerchantId, lines]) => {
        const merchant = state.merchants.find((item) => item.id === groupMerchantId);
        const itemTotal = Number(lines.reduce((sum, line) => sum + calculateLineTotal(line), 0).toFixed(2));
        const packageFee = Number(lines.reduce((sum, line) => sum + line.qty * 1, 0).toFixed(2));
        const deliveryFee = Number((merchant?.deliveryFee ?? 5).toFixed(2));
        const subtotal = Number((itemTotal + packageFee + deliveryFee).toFixed(2));

        return {
          merchantId: groupMerchantId,
          merchant,
          lines,
          itemTotal,
          packageFee,
          deliveryFee,
          subtotal,
        };
      });

      const now = Date.now();
      const requestedScheduleAt =
        state.deliveryTimeMode === 'schedule'
          ? combineDateTime(state.scheduleDate, state.scheduleTime)
          : null;
      const scheduleAt =
        state.deliveryTimeMode === 'schedule'
          ? Math.max(now + 10 * MILLISECONDS_IN_MINUTE, requestedScheduleAt ?? now + 35 * MILLISECONDS_IN_MINUTE)
          : undefined;

      const selectedCoupon = state.selectedCouponId
        ? state.coupons.find((coupon) => coupon.id === state.selectedCouponId)
        : undefined;
      const couponAvailable =
        selectedCoupon && !selectedCoupon.used && selectedCoupon.expiresAt > now
          ? selectedCoupon
          : undefined;

      let couponTargetMerchantId: string | null = null;
      if (couponAvailable) {
        const eligible = groups
          .filter((group) => group.subtotal >= couponAvailable.thresholdAmount)
          .sort((left, right) => right.subtotal - left.subtotal);
        couponTargetMerchantId = eligible[0]?.merchantId || null;
      }

      const createdOrders: DeliveryOrder[] = [];

      groups.forEach((group) => {
        const discountFee =
          couponAvailable && couponTargetMerchantId === group.merchantId
            ? Math.min(couponAvailable.discountAmount, group.subtotal)
            : 0;
        const payableAmount = Number((group.subtotal - discountFee).toFixed(2));
        const etaMinutes = Math.max(18, (group.merchant?.avgDeliveryMinutes ?? 30) + (state.deliveryTimeMode === 'schedule' ? 5 : 0));
        const timeline = buildOrderTimeline(state.deliveryTimeMode, now, scheduleAt, etaMinutes);
        const estimatedDeliveredAt = timeline.find((item) => item.kind === 'completed')?.at;

        const order: DeliveryOrder = {
          id: generateId('order'),
          merchantId: group.merchantId,
          merchantName: group.merchant?.name || '未知店铺',
          lines: group.lines.map((line) => ({
            ...line,
            selectedOptions: [...line.selectedOptions],
          })),
          itemTotal: group.itemTotal,
          packageFee: group.packageFee,
          deliveryFee: group.deliveryFee,
          discountFee,
          payableAmount,
          status: 'paid',
          address: { ...shippingAddress },
          deliveryTimeMode: state.deliveryTimeMode,
          ...(scheduleAt ? { scheduleAt } : {}),
          ...(estimatedDeliveredAt ? { estimatedDeliveredAt } : {}),
          createdAt: now,
          paidAt: now,
          couponId: couponAvailable && couponTargetMerchantId === group.merchantId ? couponAvailable.id : null,
          urgeCount: 0,
          afterSaleStatus: 'none',
          rated: false,
          timeline,
        };

        createdOrders.push(order);
      });

      nextOrderId = createdOrders[0]?.id || null;

      const nextCoupons = couponAvailable && couponTargetMerchantId
        ? state.coupons.map((coupon) =>
            coupon.id === couponAvailable.id
              ? {
                  ...coupon,
                  used: true,
                }
              : coupon
          )
        : state.coupons;

      return {
        orders: [...createdOrders, ...state.orders],
        cartLines: merchantId
          ? state.cartLines.filter((line) => line.merchantId !== merchantId)
          : [],
        coupons: nextCoupons,
        selectedCouponId: null,
        route: {
          tab: 'orders',
          screen: 'orders',
        },
        error: null,
      };
    });

    return nextOrderId;
  },

  updateOrder: (order) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    }));
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== orderId) return order;

        const now = Date.now();
        const finishedAt = status === 'completed' || status === 'cancelled' ? now : order.finishedAt;

        return {
          ...order,
          status,
          finishedAt,
          timeline: [
            createTimelineItem(status, now, statusLabelMap[status]),
            ...order.timeline,
          ],
        };
      }),
    }));
  },

  deleteOrder: (orderId) => {
    set((state) => ({
      orders: state.orders.filter((order) => order.id !== orderId),
    }));
  },

  reorderOrderToCart: (orderId) => {
    set((state) => {
      const order = state.orders.find((item) => item.id === orderId);
      if (!order) return {};

      return {
        cartLines: mergeCartLines(state.cartLines, order.lines),
        activeMerchantId: order.merchantId,
        route: {
          tab: 'home',
          screen: 'cart',
        },
      };
    });
  },

  urgeOrder: (orderId) => {
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          urgeCount: order.urgeCount + 1,
          timeline: [
            createTimelineItem('urge', Date.now(), '已提醒商家尽快出餐'),
            ...order.timeline,
          ],
        };
      }),
    }));
  },

  requestAfterSale: (orderId) => {
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.afterSaleStatus === 'requested' || order.afterSaleStatus === 'processing') {
          return order;
        }

        return {
          ...order,
          afterSaleStatus: 'requested',
          status: 'refunding',
          timeline: [
            createTimelineItem('after-sale', Date.now(), '售后申请已提交'),
            ...order.timeline,
          ],
        };
      }),
    }));
  },

  rateOrder: (orderId, score) => {
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== orderId) return order;

        return {
          ...order,
          rated: true,
          ratingScore: clampScore(score),
          timeline: [
            createTimelineItem('rated', Date.now(), `用户已评价：${clampScore(score)} 星`),
            ...order.timeline,
          ],
        };
      }),
    }));
  },

  updateAfterSaleStatus: (orderId, status) => {
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== orderId) return order;
        const nextStatus = resolveAfterSaleOrderStatus(status, order.status);

        return {
          ...order,
          afterSaleStatus: status,
          status: nextStatus,
          timeline: [
            createTimelineItem('after-sale', Date.now(), `售后状态更新：${status}`),
            ...order.timeline,
          ],
        };
      }),
    }));
  },

  setDeliveryTimeMode: (mode) => {
    set({ deliveryTimeMode: mode });
  },

  setScheduleDate: (value) => {
    set({ scheduleDate: value });
  },

  setScheduleTime: (value) => {
    set({ scheduleTime: value });
  },

  setSelectedCoupon: (couponId) => {
    if (!couponId) {
      set({ selectedCouponId: null });
      return;
    }

    const couponExists = get().coupons.some((coupon) => coupon.id === couponId);
    if (!couponExists) return;

    set({ selectedCouponId: couponId });
  },

  resetCheckoutSettings: () => {
    set({
      deliveryTimeMode: 'instant',
      scheduleDate: buildDefaultScheduleDate(),
      scheduleTime: '12:00',
      selectedCouponId: null,
    });
  },
});
