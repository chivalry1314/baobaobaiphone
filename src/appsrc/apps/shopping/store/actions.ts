import type { ShoppingStore } from './types';
import { createShoppingCartSlice } from './slices/cartSlice';
import { createShoppingCatalogSlice } from './slices/catalogSlice';
import { createShoppingHydrationSlice } from './slices/hydrationSlice';
import { createShoppingStateSlice } from './slices/stateSlice';
import type { ShoppingActionContext } from './slices/types';

export const createShoppingActions = (
  context: ShoppingActionContext
): Omit<
  ShoppingStore,
  | 'products'
  | 'cart'
  | 'flowerProducts'
  | 'flowerCart'
  | 'orders'
  | 'favorites'
  | 'addresses'
  | 'settings'
  | 'isLoading'
  | 'error'
> => ({
  ...createShoppingCatalogSlice(context),
  ...createShoppingCartSlice(context),
  ...createShoppingHydrationSlice(context),
  ...createShoppingStateSlice(context),
});
