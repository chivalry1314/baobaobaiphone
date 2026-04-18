import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { DeliveryFeeConfig, PrintSettings, AccountInfo } from '../../types';

type SettingsSliceState = Pick<
  DeliverySellerState,
  'deliveryFeeConfig' | 'printSettings' | 'accountInfo'
>;
type SettingsSliceActions = Pick<
  DeliverySellerActions,
  | 'setDeliveryFeeConfig'
  | 'setPrintSettings'
  | 'setAccountInfo'
  | 'updatePassword'
  | 'bindPhone'
  | 'loadSettings'
>;

export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

export const createSettingsSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  SettingsSlice
> = (set, get) => ({
  // State
  deliveryFeeConfig: {
    baseFee: 3,
    distanceFeePerKm: 1,
    minDistance: 3,
    freeDeliveryThreshold: 50,
  },
  printSettings: {
    autoPrint: false,
    printerId: undefined,
    printerName: undefined,
    copies: 1,
  },
  accountInfo: null,

  // Actions
  setDeliveryFeeConfig: (config) => {
    set({ deliveryFeeConfig: config }, false, 'settings/setDeliveryFeeConfig');
  },

  setPrintSettings: (settings) => {
    set({ printSettings: settings }, false, 'settings/setPrintSettings');
  },

  setAccountInfo: (info) => {
    set({ accountInfo: info }, false, 'settings/setAccountInfo');
  },

  updatePassword: async (oldPassword, newPassword) => {
    // 模拟密码修改
    console.log('Updating password...', { oldPassword, newPassword });
    // 实际实现需要调用 API
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  },

  bindPhone: async (phone, code) => {
    // 模拟手机绑定
    console.log('Binding phone...', { phone, code });
    // 实际实现需要调用 API
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  },

  loadSettings: () => {
    const state = get();
    const shopConfig = state.shopConfig;
    
    if (shopConfig) {
      // 从店铺配置加载账户信息
      const accountInfo: AccountInfo = {
        merchantId: shopConfig.merchantId,
        shopName: shopConfig.name,
        phone: undefined,
        isPhoneBound: false,
        hasPassword: true,
      };
      set({ accountInfo }, false, 'settings/loadSettings');
    }
    
    // 加载配送费配置（从店铺配置）
    if (shopConfig) {
      const deliveryFeeConfig: DeliveryFeeConfig = {
        baseFee: shopConfig.deliveryFee,
        distanceFeePerKm: 1,
        minDistance: 3,
        freeDeliveryThreshold: shopConfig.minOrderAmount,
      };
      set({ deliveryFeeConfig }, false, 'settings/loadSettings/deliveryFee');
    }
  },
});
