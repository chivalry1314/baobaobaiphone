import type { ProductItem } from './types';
import {
  normalizeDessertProducts,
  normalizeFlowerProducts,
  normalizeMovieProducts,
  parseStoresRaw,
} from './storeModel';
import {
  patchSellerStorageState,
  readSellerStorageState,
} from './storePersistence';
import { settleFinanceByRules } from './storeFinance';

export const readDessertProductsFromStorage = async (): Promise<ProductItem[]> => {
  return (await readSellerStorageState()).dessertProducts;
};

export const writeDessertProductsToStorage = async (products: ProductItem[]) => {
  const normalized = normalizeDessertProducts(products);
  await patchSellerStorageState((state) => {
    const nextFinance = settleFinanceByRules(state.finance, {
      stores: parseStoresRaw(state.stores),
      dessertProducts: normalized,
      flowerProducts: state.flowerProducts,
      movieProducts: state.movieProducts,
    });
    return {
      ...state,
      dessertProducts: normalized,
      finance: nextFinance,
    };
  });
};

export const readFlowerProductsFromStorage = async (): Promise<ProductItem[]> => {
  return (await readSellerStorageState()).flowerProducts;
};

export const writeFlowerProductsToStorage = async (products: ProductItem[]) => {
  const normalized = normalizeFlowerProducts(products);
  await patchSellerStorageState((state) => {
    const nextFinance = settleFinanceByRules(state.finance, {
      stores: parseStoresRaw(state.stores),
      dessertProducts: state.dessertProducts,
      flowerProducts: normalized,
      movieProducts: state.movieProducts,
    });
    return {
      ...state,
      flowerProducts: normalized,
      finance: nextFinance,
    };
  });
};

export const readMovieProductsFromStorage = async (): Promise<ProductItem[]> => {
  return (await readSellerStorageState()).movieProducts;
};

export const writeMovieProductsToStorage = async (products: ProductItem[]) => {
  const normalized = normalizeMovieProducts(products);
  await patchSellerStorageState((state) => {
    const nextFinance = settleFinanceByRules(state.finance, {
      stores: parseStoresRaw(state.stores),
      dessertProducts: state.dessertProducts,
      flowerProducts: state.flowerProducts,
      movieProducts: normalized,
    });
    return {
      ...state,
      movieProducts: normalized,
      finance: nextFinance,
    };
  });
};
