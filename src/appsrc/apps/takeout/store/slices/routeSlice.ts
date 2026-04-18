import type { StoreApi } from 'zustand';
import {
  DEFAULT_TAKEOUT_ROUTE,
  TAB_ROOT_SCREEN_MAP,
  type TakeoutRoute,
  type TakeoutScreen,
  type TakeoutTabKey,
} from '../../uiTypes';
import type { TakeoutStore } from '../types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

const resolveScreenTab = (screen: TakeoutScreen, fallback: TakeoutTabKey): TakeoutTabKey => {
  if (screen === 'orders' || screen === 'order-detail') return 'orders';
  if (screen === 'me' || screen === 'addresses' || screen === 'coupons') return 'me';
  return fallback;
};

const normalizeRoute = (route: TakeoutRoute): TakeoutRoute => {
  const tab = route.tab || DEFAULT_TAKEOUT_ROUTE.tab;
  const screen = route.screen || TAB_ROOT_SCREEN_MAP[tab];
  const normalizedTab = resolveScreenTab(screen, tab);
  return {
    tab: normalizedTab,
    screen,
    ...(route.params ? { params: route.params } : {}),
  };
};

export const createTakeoutRouteSlice = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Pick<TakeoutStore, 'setRoute' | 'openScreen' | 'switchTab' | 'goHome'> => ({
  setRoute: (route) => {
    set({ route: normalizeRoute(route) });
  },

  openScreen: (screen, params, tab) => {
    const currentTab = get().route.tab;
    const nextTab = resolveScreenTab(screen, tab || currentTab);
    set({
      route: {
        tab: nextTab,
        screen,
        ...(params ? { params } : {}),
      },
    });
  },

  switchTab: (tab) => {
    const rootScreen = TAB_ROOT_SCREEN_MAP[tab];
    set({
      route: {
        tab,
        screen: rootScreen,
      },
    });
  },

  goHome: () => {
    set({ route: DEFAULT_TAKEOUT_ROUTE });
  },
});
