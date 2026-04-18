import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { DeliveryDish, DeliveryDishCategory, ProductStats } from '../../types';
import { DeliveryEventBus, PRODUCT_EVENTS, DeliverySharedStorage } from '../../../../shared/business/delivery';

type ProductSliceState = Pick<
  DeliverySellerState,
  | 'products'
  | 'categories'
  | 'productFilter'
  | 'productSearchKeyword'
  | 'productLoading'
  | 'productError'
>;
type ProductSliceActions = Pick<
  DeliverySellerActions,
  | 'setProducts'
  | 'setCategories'
  | 'addProduct'
  | 'updateProduct'
  | 'deleteProduct'
  | 'toggleProductStatus'
  | 'setProductFilter'
  | 'setProductSearchKeyword'
  | 'batchToggleProductStatus'
  | 'updateProductStock'
  | 'setProductLoading'
  | 'setProductError'
>;

export type ProductSlice = ProductSliceState & ProductSliceActions;

export const createProductSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  ProductSlice
> = (set, get) => ({
  // State
  products: [],
  categories: [],
  productFilter: 'all',
  productSearchKeyword: '',
  productLoading: false,
  productError: null,

  // Actions
  setProductLoading: (loading) => {
    set({ productLoading: loading }, false, 'products/setProductLoading');
  },

  setProductError: (error) => {
    set({ productError: error }, false, 'products/setProductError');
  },

  setProducts: (next) => {
    set(
      (state) => ({
        products: typeof next === 'function' ? next(state.products) : next,
      }),
      false,
      'products/setProducts'
    );
  },

  setCategories: (next) => {
    set(
      (state) => ({
        categories: typeof next === 'function' ? next(state.categories) : next,
      }),
      false,
      'products/setCategories'
    );
  },

  addProduct: (product) => {
    set(
      (state) => ({
        products: [...state.products, product],
      }),
      false,
      'products/addProduct'
    );
  },

  updateProduct: (id, updates) => {
    set(
      (state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }),
      false,
      'products/updateProduct'
    );
  },

  deleteProduct: (id) => {
    set(
      (state) => ({
        products: state.products.filter((p) => p.id !== id),
      }),
      false,
      'products/deleteProduct'
    );
  },

  toggleProductStatus: (id) => {
    set(
      (state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, status: p.status === 'on' ? 'off' : 'on' } : p
        ),
      }),
      false,
      'products/toggleProductStatus'
    );
  },

  setProductFilter: (filter) => {
    set({ productFilter: filter }, false, 'products/setProductFilter');
  },

  setProductSearchKeyword: (keyword) => {
    set({ productSearchKeyword: keyword }, false, 'products/setProductSearchKeyword');
  },

  // 批量上下架
  batchToggleProductStatus: (productIds, status) => {
    set(
      (state) => ({
        products: state.products.map((p) =>
          productIds.includes(p.id) ? { ...p, status } : p
        ),
      }),
      false,
      'products/batchToggleProductStatus'
    );
  },

  // 快速调整库存
  updateProductStock: (productId, stock) => {
    const product = get().products.find((p) => p.id === productId);
    
    set(
      (state) => ({
        products: state.products.map((p) =>
          p.id === productId ? { ...p, stock } : p
        ),
      }),
      false,
      'products/updateProductStock'
    );

    // 触发库存变更事件并同步到共享存储
    if (product) {
      DeliveryEventBus.dispatch(PRODUCT_EVENTS.STOCK_CHANGED, { productId, stock, productName: product.name });
      DeliverySharedStorage.updateProductStock(productId, stock).catch(console.error);
    }
  },

  // 模拟异步加载商品
  loadProducts: async () => {
    const state = get();
    state.setProductLoading(true);
    state.setProductError(null);

    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));
      // 实际项目中这里会调用 API
      state.setProductLoading(false);
    } catch (error) {
      state.setProductError(error instanceof Error ? error.message : '加载失败');
      state.setProductLoading(false);
    }
  },
});

// Helper function to calculate product stats
export const calculateProductStats = (products: DeliveryDish[]): ProductStats => {
  const totalProducts = products.length;
  const onSaleProducts = products.filter((p) => p.status === 'on').length;
  const offSaleProducts = products.filter((p) => p.status === 'off').length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  return {
    totalProducts,
    onSaleProducts,
    offSaleProducts,
    lowStockProducts,
    outOfStockProducts,
  };
};
