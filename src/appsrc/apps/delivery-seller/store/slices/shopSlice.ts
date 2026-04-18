import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { ShopStatus } from '../../types';
import { DeliveryEventBus, SHOP_EVENTS, DeliverySharedStorage } from '../../../../shared/business/delivery';

type ShopSliceState = Pick<DeliverySellerState, 'shopConfig' | 'shopStatus'>;
type ShopSliceActions = Pick<DeliverySellerActions, 
  | 'setShopConfig'
  | 'updateShopStatus'
  | 'toggleShopOpen'
  | 'toggleAutoAccept'
  | 'toggleBusyMode'
>;

export type ShopSlice = ShopSliceState & ShopSliceActions;

export const createShopSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  ShopSlice
> = (set, get) => ({
  // State
  shopConfig: null,
  shopStatus: {
    isOpen: false,
    autoAcceptOrders: true,
    preparationMinutes: 15,
    busyMode: false,
    lastStatusChangeAt: Date.now(),
  },

  // Actions
  setShopConfig: (config) => {
    set({ shopConfig: config }, false, 'shop/setShopConfig');
  },

  updateShopStatus: (status) => {
    const currentState = get().shopStatus;
    const newState = {
      ...currentState,
      ...status,
      lastStatusChangeAt: Date.now(),
    };

    set(
      (state) => ({
        shopStatus: newState,
      }),
      false,
      'shop/updateShopStatus'
    );

    // 触发事件并同步到共享存储
    const shopConfig = get().shopConfig;
    if (shopConfig) {
      DeliveryEventBus.dispatch(SHOP_EVENTS.STATUS_CHANGED, newState);
      DeliverySharedStorage.updateShopStatus(shopConfig.merchantId, newState).catch(console.error);
    }
  },

  toggleShopOpen: () => {
    const current = get().shopStatus;
    const newState = {
      ...current,
      isOpen: !current.isOpen,
      lastStatusChangeAt: Date.now(),
    };

    set(
      (state) => ({
        shopStatus: newState,
      }),
      false,
      'shop/toggleShopOpen'
    );

    // 触发事件并同步
    const shopConfig = get().shopConfig;
    if (shopConfig) {
      DeliveryEventBus.dispatch(SHOP_EVENTS.STATUS_CHANGED, newState);
      DeliverySharedStorage.updateShopStatus(shopConfig.merchantId, newState).catch(console.error);
    }
  },

  toggleAutoAccept: () => {
    const current = get().shopStatus;
    const newState = {
      ...current,
      autoAcceptOrders: !current.autoAcceptOrders,
      lastStatusChangeAt: Date.now(),
    };

    set(
      (state) => ({
        shopStatus: newState,
      }),
      false,
      'shop/toggleAutoAccept'
    );

    const shopConfig = get().shopConfig;
    if (shopConfig) {
      DeliveryEventBus.dispatch(SHOP_EVENTS.STATUS_CHANGED, newState);
      DeliverySharedStorage.updateShopStatus(shopConfig.merchantId, newState).catch(console.error);
    }
  },

  toggleBusyMode: () => {
    const current = get().shopStatus;
    const newState = {
      ...current,
      busyMode: !current.busyMode,
      lastStatusChangeAt: Date.now(),
    };

    set(
      (state) => ({
        shopStatus: newState,
      }),
      false,
      'shop/toggleBusyMode'
    );

    const shopConfig = get().shopConfig;
    if (shopConfig) {
      DeliveryEventBus.dispatch(SHOP_EVENTS.STATUS_CHANGED, newState);
      DeliverySharedStorage.updateShopStatus(shopConfig.merchantId, newState).catch(console.error);
    }
  },
});
