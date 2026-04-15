import {
  normalizeProduct,
  normalizeProducts,
} from '../helpers';
import type { ShoppingStore } from '../types';
import type { ShoppingActionContext } from './types';

export const createShoppingCartSlice = ({
  set,
  get,
}: ShoppingActionContext): Pick<
  ShoppingStore,
  'setDessertCart' | 'addToCart' | 'removeFromCart' | 'clearCart' | 'setFlowerCart'
> => ({
  setDessertCart: (next) =>
    set((state) => ({
      cart: normalizeProducts(typeof next === 'function' ? next(state.cart) : next, 'dessert'),
    })),

  addToCart: (id) => {
    const product = get().products.find((item) => item.id === id);
    if (!product) return;

    set((state) => ({
      cart: [...state.cart, normalizeProduct(product, 'dessert')],
    }));
  },

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  clearCart: () => set({ cart: [] }),

  setFlowerCart: (next) =>
    set((state) => ({
      flowerCart: normalizeProducts(
        typeof next === 'function' ? next(state.flowerCart) : next,
        'flower'
      ),
    })),
});
