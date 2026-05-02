import { DELIVERY_STORAGE_KEY } from './data';
import type { DeliveryOrderRecord } from './types';

export const DELIVERY_ORDERS_CHANGED_EVENT = 'delivery-orders-changed';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeOrders = (value: unknown): DeliveryOrderRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DeliveryOrderRecord => {
    return Boolean(
      isPlainObject(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.merchantName === 'string' &&
        typeof item.amount === 'number' &&
        typeof item.createdAt === 'number'
    );
  });
};

const readPersistedDeliveryState = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writePersistedDeliveryState = (state: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(state));
};

export const updatePersistedDeliveryOrders = (
  updater: (orders: DeliveryOrderRecord[]) => DeliveryOrderRecord[],
  options?: { clearCart?: boolean; orderIds?: string[] },
): DeliveryOrderRecord[] => {
  if (typeof window === 'undefined') return [];
  const currentState = readPersistedDeliveryState() || {};
  const currentOrders = normalizeOrders(currentState.orders);
  const nextOrders = updater(currentOrders);
  writePersistedDeliveryState({
    ...currentState,
    orders: nextOrders,
    ...(options?.clearCart ? { cart: [] } : {}),
  });
  const normalizedOrderIds = options?.orderIds?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (normalizedOrderIds.length > 0) {
    window.dispatchEvent(
      new CustomEvent(DELIVERY_ORDERS_CHANGED_EVENT, {
        detail: { orderIds: normalizedOrderIds, orders: nextOrders },
      }),
    );
  }
  return nextOrders;
};

export const patchPersistedDeliveryOrders = (
  orderIds: string[],
  patch: Partial<DeliveryOrderRecord>,
  options?: { clearCart?: boolean },
): DeliveryOrderRecord[] => {
  const normalizedIds = orderIds.map((item) => item.trim()).filter(Boolean);
  if (normalizedIds.length === 0) return [];
  if (typeof window === 'undefined') return [];
  const currentState = readPersistedDeliveryState() || {};
  const currentOrders = normalizeOrders(currentState.orders);
  const idSet = new Set(normalizedIds);
  let hasMatchedOrder = false;
  const nextOrders = currentOrders.map((order) => {
    if (!idSet.has(order.id)) return order;
    hasMatchedOrder = true;
    return { ...order, ...patch };
  });
  if (!hasMatchedOrder) return currentOrders;
  writePersistedDeliveryState({
    ...currentState,
    orders: nextOrders,
    ...(options?.clearCart ? { cart: [] } : {}),
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DELIVERY_ORDERS_CHANGED_EVENT, {
        detail: { orderIds: normalizedIds, orders: nextOrders },
      }),
    );
  }
  return nextOrders;
};
