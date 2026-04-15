import type { CommerceStore, Order, ProductItem } from './types';
import {
  MS_PER_DAY,
  PRODUCT_COST_RATIO,
  STORE_DAILY_PLATFORM_FEE,
  STORE_DELETE_DEPRECIATION_DAILY,
  STORE_OPEN_COST,
} from './storeConstants';
import type { SellerFinanceState } from './storeModel';

const getProductQuantity = (product: ProductItem): number => {
  const raw =
    (product as ProductItem & { quantity?: unknown; stock?: unknown; count?: unknown }).quantity ??
    (product as ProductItem & { stock?: unknown }).stock ??
    (product as ProductItem & { count?: unknown }).count;
  const qty = Number(raw);
  return Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
};

export const settleFinanceByRules = (
  finance: SellerFinanceState,
  payload: {
    stores: CommerceStore[];
    dessertProducts: ProductItem[];
    flowerProducts: ProductItem[];
    movieProducts: ProductItem[];
    orders?: Order[];
  }
): SellerFinanceState => {
  let asset = finance.assetBalance;
  const chargedStoreIds = new Set(finance.chargedStoreIds);
  const chargedProductIds = new Set(finance.chargedProductIds);
  const accountedOrderIds = new Set(finance.accountedOrderIds);
  const platformFeePaidDaysByStore = { ...finance.platformFeePaidDaysByStore };
  const activeStoreIds = new Set(payload.stores.map((store) => store.id));

  // 修复历史数据：无店铺时旧逻辑会把初始化商品计入成本，导致默认资产异常为负数。
  if (
    payload.stores.length === 0 &&
    chargedStoreIds.size === 0 &&
    accountedOrderIds.size === 0 &&
    Object.keys(platformFeePaidDaysByStore).length === 0 &&
    chargedProductIds.size > 0 &&
    asset <= 0
  ) {
    chargedProductIds.clear();
    asset = 0;
  }

  payload.stores.forEach((store) => {
    if (!chargedStoreIds.has(store.id)) {
      chargedStoreIds.add(store.id);
      asset -= STORE_OPEN_COST;
    }
  });

  [...payload.dessertProducts, ...payload.flowerProducts, ...payload.movieProducts].forEach((product) => {
    if (payload.stores.length === 0) return;
    const productStoreId = typeof product.storeId === 'string' ? product.storeId.trim() : '';
    if (productStoreId && !activeStoreIds.has(productStoreId)) return;
    if (chargedProductIds.has(product.id)) return;
    chargedProductIds.add(product.id);
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) return;
    asset -= price * getProductQuantity(product) * PRODUCT_COST_RATIO;
  });

  const nowTime = Date.now();
  payload.stores.forEach((store) => {
    const createdAt = Number(store.createdAt);
    const effectiveCreatedAt = Number.isFinite(createdAt) ? createdAt : nowTime;
    const openDays = Math.max(1, Math.floor((nowTime - effectiveCreatedAt) / MS_PER_DAY) + 1);
    const paidDays = Math.max(0, Math.floor(Number(platformFeePaidDaysByStore[store.id] || 0)));
    if (openDays > paidDays) {
      asset -= (openDays - paidDays) * STORE_DAILY_PLATFORM_FEE;
      platformFeePaidDaysByStore[store.id] = openDays;
    }
  });

  (payload.orders || []).forEach((order) => {
    if (accountedOrderIds.has(order.id)) return;
    accountedOrderIds.add(order.id);
    const total = Number(order.total);
    if (Number.isFinite(total)) asset += total;
  });

  return {
    assetBalance: Number(asset.toFixed(2)),
    chargedStoreIds: Array.from(chargedStoreIds),
    chargedProductIds: Array.from(chargedProductIds),
    accountedOrderIds: Array.from(accountedOrderIds),
    platformFeePaidDaysByStore,
  };
};

const getStoreOpenDays = (createdAt: number, nowTime = Date.now()) => {
  const safeCreatedAt = Number.isFinite(createdAt) ? createdAt : nowTime;
  return Math.max(1, Math.floor((nowTime - safeCreatedAt) / MS_PER_DAY) + 1);
};

export const getStoreRecycleAmount = (store: CommerceStore, nowTime = Date.now()) => {
  const depreciation = getStoreOpenDays(store.createdAt, nowTime) * STORE_DELETE_DEPRECIATION_DAILY;
  return Math.max(0, STORE_OPEN_COST - depreciation);
};

export const financeEquals = (left: SellerFinanceState, right: SellerFinanceState) => {
  return JSON.stringify(left) === JSON.stringify(right);
};
