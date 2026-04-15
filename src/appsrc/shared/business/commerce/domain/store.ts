import { SELLER_STORAGE_KEY } from './constants';
import { STORES_UPDATED_EVENT } from './storeConstants';
import {
  createStoreDraft,
  defaultStores,
  getDefaultStoreIdByKind,
  resolveStoreByKind,
  resolveStoreCode,
  type SellerFinanceState,
} from './storeModel';

export { SELLER_STORAGE_KEY };
export { STORES_UPDATED_EVENT };
export type { SellerFinanceState };
export {
  createStoreDraft,
  defaultStores,
  getDefaultStoreIdByKind,
  resolveStoreByKind,
  resolveStoreCode,
};

export {
  readDessertProductsFromStorage,
  readFlowerProductsFromStorage,
  readMovieProductsFromStorage,
  writeDessertProductsToStorage,
  writeFlowerProductsToStorage,
  writeMovieProductsToStorage,
} from './storeProductStorage';

export {
  deleteCommerceStoreWithRecycle,
  loadCommerceStores,
  saveCommerceStores,
} from './storeLifecycle';

export {
  readSellerFinanceSnapshot,
  settleSellerFinance,
  topUpSellerFinance,
} from './storeFinanceApi';

export {
  COMMERCE_ROLE_CHANGED_EVENT,
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
  registerCommerceRoleIdResolver,
} from '../roleContext';
