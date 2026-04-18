import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { DeliveryOrder, DeliveryOrderStatus, OrderStats } from '../../types';
import { DeliveryEventBus, ORDER_EVENTS, DeliverySharedStorage } from '../../../../shared/business/delivery';

type OrderSliceState = Pick<
  DeliverySellerState,
  | 'orders'
  | 'orderFilter'
  | 'orderSearchKeyword'
  | 'orderLoading'
  | 'orderError'
  | 'newOrderCount'
>;
type OrderSliceActions = Pick<
  DeliverySellerActions,
  | 'setOrders'
  | 'acceptOrder'
  | 'startPreparingOrder'
  | 'completePreparation'
  | 'completeOrder'
  | 'cancelOrder'
  | 'rejectOrder'
  | 'setOrderFilter'
  | 'setOrderSearchKeyword'
  | 'setOrderLoading'
  | 'setOrderError'
  | 'setNewOrderCount'
  | 'clearNewOrderCount'
>;

export type OrderSlice = OrderSliceState & OrderSliceActions;

export const createOrderSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  OrderSlice
> = (set, get) => ({
  // State
  orders: [],
  orderFilter: 'all',
  orderSearchKeyword: '',
  orderLoading: false,
  orderError: null,
  newOrderCount: 0,

  // Actions
  setOrderLoading: (loading) => {
    set({ orderLoading: loading }, false, 'orders/setOrderLoading');
  },

  setOrderError: (error) => {
    set({ orderError: error }, false, 'orders/setOrderError');
  },

  setNewOrderCount: (count) => {
    set({ newOrderCount: count }, false, 'orders/setNewOrderCount');
  },

  clearNewOrderCount: () => {
    set({ newOrderCount: 0 }, false, 'orders/clearNewOrderCount');
  },

  setOrders: (next) => {
    set(
      (state) => ({
        orders: typeof next === 'function' ? next(state.orders) : next,
      }),
      false,
      'orders/setOrders'
    );
  },

  acceptOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'accepted' as DeliveryOrderStatus,
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'accepted' as const,
            label: '商家已接单',
            at: Date.now(),
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/acceptOrder'
      );

      // 触发事件并同步到共享存储
      DeliveryEventBus.dispatch(ORDER_EVENTS.STATUS_CHANGED, { orderId, status: 'accepted', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  startPreparingOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'preparing' as DeliveryOrderStatus,
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'preparing' as const,
            label: '开始制作',
            at: Date.now(),
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/startPreparingOrder'
      );

      DeliveryEventBus.dispatch(ORDER_EVENTS.STATUS_CHANGED, { orderId, status: 'preparing', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  completePreparation: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'delivering' as DeliveryOrderStatus,
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'delivering' as const,
            label: '已出餐，配送中',
            at: Date.now(),
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/completePreparation'
      );

      DeliveryEventBus.dispatch(ORDER_EVENTS.STATUS_CHANGED, { orderId, status: 'delivering', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  // 完成订单（待配送→已完成）
  completeOrder: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'completed' as DeliveryOrderStatus,
        finishedAt: Date.now(),
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'completed' as const,
            label: '订单已完成',
            at: Date.now(),
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/completeOrder'
      );

      DeliveryEventBus.dispatch(ORDER_EVENTS.STATUS_CHANGED, { orderId, status: 'completed', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  cancelOrder: (orderId, reason) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'cancelled' as DeliveryOrderStatus,
        finishedAt: Date.now(),
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'cancelled' as const,
            label: '订单已取消',
            at: Date.now(),
            note: reason,
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/cancelOrder'
      );

      DeliveryEventBus.dispatch(ORDER_EVENTS.CANCELLED, { orderId, status: 'cancelled', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  // 拒单操作
  rejectOrder: (orderId, reason) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (order) {
      const updatedOrder: DeliveryOrder = {
        ...order,
        status: 'cancelled' as DeliveryOrderStatus,
        finishedAt: Date.now(),
        timeline: [
          ...order.timeline,
          {
            id: `timeline-${Date.now()}`,
            kind: 'cancelled' as const,
            label: '商家拒单',
            at: Date.now(),
            note: reason,
          },
        ],
      };

      set(
        (state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
        }),
        false,
        'orders/rejectOrder'
      );

      DeliveryEventBus.dispatch(ORDER_EVENTS.CANCELLED, { orderId, status: 'cancelled', order: updatedOrder });
      DeliverySharedStorage.syncOrder(updatedOrder).catch(console.error);
    }
  },

  setOrderFilter: (filter) => {
    set({ orderFilter: filter }, false, 'orders/setOrderFilter');
  },

  setOrderSearchKeyword: (keyword) => {
    set({ orderSearchKeyword: keyword }, false, 'orders/setOrderSearchKeyword');
  },
});

// Helper function to calculate order stats
export const calculateOrderStats = (orders: DeliveryOrder[]): OrderStats => {
  const now = Date.now();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  const todayOrders = orders.filter((o) => o.createdAt >= startOfDayMs);
  const pendingOrders = orders.filter((o) => o.status === 'pending-payment' || o.status === 'paid').length;
  const preparingOrders = orders.filter((o) => o.status === 'preparing' || o.status === 'accepted').length;
  const deliveringOrders = orders.filter((o) => o.status === 'delivering').length;
  const completedToday = todayOrders.filter((o) => o.status === 'completed').length;
  const cancelledToday = todayOrders.filter((o) => o.status === 'cancelled').length;
  const totalRevenue = todayOrders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.payableAmount, 0);

  return {
    todayOrders: todayOrders.length,
    pendingOrders,
    preparingOrders,
    deliveringOrders,
    completedToday,
    cancelledToday,
    totalRevenue,
  };
};
