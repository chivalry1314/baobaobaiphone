import type { Address, Favorite, Order, ProductItem, ShoppingState } from '../types';

export interface ShoppingActions {
  addProduct: (product: Omit<ProductItem, 'id' | 'isSelected'>) => void;
  setDessertProducts: (
    next: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])
  ) => void;
  setDessertCart: (next: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])) => void;
  hydrateCommerceData: () => Promise<void>;
  toggleProductSelect: (id: string) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setFlowerProducts: (
    next: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])
  ) => void;
  setFlowerCart: (next: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])) => void;
  setOrders: (next: Order[] | ((prev: Order[]) => Order[])) => void;
  setFavorites: (next: Favorite[] | ((prev: Favorite[]) => Favorite[])) => void;
  setAddresses: (next: Address[] | ((prev: Address[]) => Address[])) => void;
  setSettingNotify: (notify: boolean) => void;
  setSettingFaceId: (faceId: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface ShoppingStore extends ShoppingState, ShoppingActions {}
