import { STORES_UPDATED_EVENT } from './storeConstants';
import {
  financeEquals,
  getStoreRecycleAmount,
  settleFinanceByRules,
} from './storeFinance';
import {
  normalizeStore,
  parseStoresRaw,
  type SellerFinanceState,
} from './storeModel';
import {
  readSellerStorageState,
  writeSellerStorageState,
} from './storePersistence';
import type { CommerceStore, Order } from './types';

const emitStoresUpdated = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORES_UPDATED_EVENT));
};

export const loadCommerceStores = async (): Promise<CommerceStore[]> => {
  const sellerState = await readSellerStorageState();
  const parsed = parseStoresRaw(sellerState.stores);
  const normalized = parsed.map((store, index) => normalizeStore(store, index));
  const nextFinance = settleFinanceByRules(sellerState.finance, {
    stores: normalized,
    dessertProducts: sellerState.dessertProducts,
    flowerProducts: sellerState.flowerProducts,
    movieProducts: sellerState.movieProducts,
  });

  if (!financeEquals(nextFinance, sellerState.finance)) {
    await writeSellerStorageState({
      ...sellerState,
      stores: normalized,
      finance: nextFinance,
    });
  }

  return normalized;
};

export const saveCommerceStores = async (
  stores: CommerceStore[],
  options?: { orders?: Order[] }
): Promise<CommerceStore[]> => {
  const sellerState = await readSellerStorageState();
  const normalized = stores.map((store, index) => normalizeStore(store, index));
  const nextFinance = settleFinanceByRules(sellerState.finance, {
    stores: normalized,
    dessertProducts: sellerState.dessertProducts,
    flowerProducts: sellerState.flowerProducts,
    movieProducts: sellerState.movieProducts,
    orders: options?.orders,
  });

  await writeSellerStorageState({
    ...sellerState,
    stores: normalized,
    finance: nextFinance,
  });

  emitStoresUpdated();
  return normalized;
};

export const deleteCommerceStoreWithRecycle = async (
  storeId: string,
  options?: { orders?: Order[] }
): Promise<{ stores: CommerceStore[]; recycledAmount: number }> => {
  const sellerState = await readSellerStorageState();
  const currentStores = parseStoresRaw(sellerState.stores).map((store, index) =>
    normalizeStore(store, index)
  );
  const target = currentStores.find((store) => store.id === storeId);
  const recycledAmount = target ? getStoreRecycleAmount(target) : 0;
  const normalized = currentStores
    .filter((store) => store.id !== storeId)
    .map((store, index) => normalizeStore(store, index));
  const settled = settleFinanceByRules(sellerState.finance, {
    stores: normalized,
    dessertProducts: sellerState.dessertProducts,
    flowerProducts: sellerState.flowerProducts,
    movieProducts: sellerState.movieProducts,
    orders: options?.orders,
  });

  const nextFinance: SellerFinanceState = {
    ...settled,
    assetBalance: Number((settled.assetBalance + recycledAmount).toFixed(2)),
  };

  await writeSellerStorageState({
    ...sellerState,
    stores: normalized,
    finance: nextFinance,
  });

  emitStoresUpdated();
  return {
    stores: normalized,
    recycledAmount,
  };
};
