import {
  generateId,
  normalizeProduct,
  normalizeProducts,
} from '../helpers';
import type { ShoppingStore } from '../types';
import type { ShoppingActionContext } from './types';

export const createShoppingCatalogSlice = ({
  set,
}: ShoppingActionContext): Pick<
  ShoppingStore,
  'addProduct' | 'setDessertProducts' | 'toggleProductSelect' | 'setFlowerProducts'
> => ({
  addProduct: (product) =>
    set((state) => {
      const nextProducts = [
        ...state.products,
        normalizeProduct(
          { ...product, id: `p-${generateId()}`, isSelected: false },
          'dessert'
        ),
      ];
      return { products: nextProducts };
    }),

  setDessertProducts: (next) =>
    set((state) => {
      const computed = typeof next === 'function' ? next(state.products) : next;
      const nextProducts = normalizeProducts(computed, 'dessert');
      return { products: nextProducts };
    }),

  toggleProductSelect: (id) =>
    set((state) => {
      const nextProducts = state.products.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item
      );
      return { products: nextProducts };
    }),

  setFlowerProducts: (next) =>
    set((state) => {
      const nextProducts = normalizeProducts(
        typeof next === 'function' ? next(state.flowerProducts) : next,
        'flower'
      );
      return { flowerProducts: nextProducts };
    }),
});
