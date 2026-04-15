import type { ShoppingStore } from '../types';

export type SetShoppingState = (
  partial:
    | ShoppingStore
    | Partial<ShoppingStore>
    | ((state: ShoppingStore) => ShoppingStore | Partial<ShoppingStore>)
) => void;

export interface ShoppingActionContext {
  set: SetShoppingState;
  get: () => ShoppingStore;
}
