import { financeEquals, settleFinanceByRules } from './storeFinance';
import {
  normalizeFinanceState,
  normalizeStore,
  type SellerFinanceState,
} from './storeModel';
import {
  readSellerStorageState,
  writeSellerStorageState,
} from './storePersistence';
import type { CommerceStore, Order } from './types';

export const settleSellerFinance = async (input: {
  stores: CommerceStore[];
  orders?: Order[];
}): Promise<SellerFinanceState> => {
  const sellerState = await readSellerStorageState();
  const normalizedStores = input.stores.map((store, index) => normalizeStore(store, index));
  const nextFinance = settleFinanceByRules(sellerState.finance, {
    stores: normalizedStores,
    dessertProducts: sellerState.dessertProducts,
    flowerProducts: sellerState.flowerProducts,
    movieProducts: sellerState.movieProducts,
    orders: input.orders,
  });

  if (!financeEquals(nextFinance, sellerState.finance)) {
    await writeSellerStorageState({
      ...sellerState,
      stores: normalizedStores,
      finance: nextFinance,
    });
  }

  return nextFinance;
};

export const readSellerFinanceSnapshot = async (): Promise<SellerFinanceState> => {
  const sellerState = await readSellerStorageState();
  return sellerState.finance;
};

export const topUpSellerFinance = async (amount: number): Promise<SellerFinanceState> => {
  const topUpAmount = Number(amount);
  if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
    return readSellerFinanceSnapshot();
  }
  const sellerState = await readSellerStorageState();
  const current = normalizeFinanceState(sellerState.finance);
  const nextFinance: SellerFinanceState = {
    ...current,
    assetBalance: Number((current.assetBalance + topUpAmount).toFixed(2)),
  };
  await writeSellerStorageState({
    ...sellerState,
    finance: nextFinance,
  });
  return nextFinance;
};
