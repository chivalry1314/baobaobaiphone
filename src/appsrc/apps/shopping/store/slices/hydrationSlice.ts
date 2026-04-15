import { readShoppingOrdersFromStorage } from '../../../../shared/business/commerce/domain/ordersStorage';
import {
  readDessertProductsFromStorage,
  readFlowerProductsFromStorage,
} from '../../../../shared/business/commerce/domain/store';
import { normalizeProducts } from '../helpers';
import type { ShoppingStore } from '../types';
import type { ShoppingActionContext } from './types';

export const createShoppingHydrationSlice = ({
  set,
}: ShoppingActionContext): Pick<ShoppingStore, 'hydrateCommerceData'> => ({
  hydrateCommerceData: async () => {
    const [dessertProducts, flowerProducts, orders] = await Promise.all([
      readDessertProductsFromStorage(),
      readFlowerProductsFromStorage(),
      readShoppingOrdersFromStorage(),
    ]);

    set({
      products: normalizeProducts(dessertProducts, 'dessert'),
      flowerProducts: normalizeProducts(flowerProducts, 'flower'),
      orders: Array.isArray(orders) ? orders : [],
    });
  },
});


