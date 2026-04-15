import type { Order, ProductItem } from './types';
import { DEFAULT_STORE_ID_BY_KIND } from './constants';

const getDefaultStoreIdByKind = (kind: 'dessert' | 'flower' | 'movie'): string => {
  return DEFAULT_STORE_ID_BY_KIND[kind];
};

export type LogisticsStep = {
  label: string;
  at: number;
};

export type LogisticsInfo = {
  steps: LogisticsStep[];
  activeIndex: number;
};

export const formatMoney = (value: number) => `¥${value.toFixed(2)}`;

export const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDateTime = (timeMs: number) => {
  const date = new Date(timeMs);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mi = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

export const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const groupCartLines = (cart: ProductItem[]) => {
  const map = new Map<string, { product: ProductItem; qty: number }>();
  cart.forEach((product) => {
    const entry = map.get(product.id);
    if (entry) entry.qty += 1;
    else map.set(product.id, { product, qty: 1 });
  });
  return [...map.values()].map(({ product, qty }) => ({
    name: product.name,
    qty,
    unitPrice: product.price,
  }));
};

export const resolveOrderStoreId = (order: Order): string | undefined => {
  const rawStoreId = order.meta?.storeId;
  if (typeof rawStoreId === 'string' && rawStoreId.trim()) return rawStoreId;
  if (order.kind === 'dessert') return getDefaultStoreIdByKind('dessert');
  if (order.kind === 'flower') return getDefaultStoreIdByKind('flower');
  if (order.kind === 'movie') return getDefaultStoreIdByKind('movie');
  return undefined;
};

export const getOrderStatus = (order: Order) => {
  if (order.kind === 'movie') return '已出票';
  const shipAt = Number(order.meta?.shipAt ?? order.createdAt);
  const now = Date.now();
  if (now < shipAt) return '等待发货';
  if (now < shipAt + 2 * 60 * 60 * 1000) return '已发货';
  if (now < shipAt + 20 * 60 * 60 * 1000) return '运输中';
  if (now < shipAt + 24 * 60 * 60 * 1000) return '派送中';
  return '已送达';
};

export const isOrderInTransit = (order: Order) => {
  if (order.kind === 'movie') return false;
  return getOrderStatus(order) !== '已送达';
};

export const getLogisticsSteps = (order: Order): LogisticsInfo => {
  const shipAt = Number(order.meta?.shipAt ?? order.createdAt);
  const steps = [
    { label: '订单已确认', at: order.createdAt },
    { label: '等待发货', at: Math.min(shipAt, order.createdAt + 10 * 60 * 1000) },
    { label: '已发货', at: shipAt },
    { label: '运输中', at: shipAt + 2 * 60 * 60 * 1000 },
    { label: '派送中', at: shipAt + 20 * 60 * 60 * 1000 },
    { label: '已送达', at: shipAt + 24 * 60 * 60 * 1000 },
  ];
  const now = Date.now();
  const activeIndex = steps.reduce((acc, step, idx) => (now >= step.at ? idx : acc), 0);
  return { steps, activeIndex };
};
