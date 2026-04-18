import type { StoreApi } from 'zustand';
import { createTakeoutCartSlice } from './slices/cartSlice';
import { createTakeoutHydrationSlice } from './slices/hydrationSlice';
import { createTakeoutMerchantSlice } from './slices/merchantSlice';
import { createTakeoutOrderSlice } from './slices/orderSlice';
import { createTakeoutProfileSlice } from './slices/profileSlice';
import { createTakeoutRouteSlice } from './slices/routeSlice';
import type { TakeoutState, TakeoutStore } from './types';

type TakeoutSetState = StoreApi<TakeoutStore>['setState'];
type TakeoutGetState = StoreApi<TakeoutStore>['getState'];

export const createTakeoutActions = (
  set: TakeoutSetState,
  get: TakeoutGetState
): Omit<TakeoutStore, keyof TakeoutState> => ({
  ...createTakeoutRouteSlice(set, get),
  ...createTakeoutMerchantSlice(set, get),
  ...createTakeoutCartSlice(set, get),
  ...createTakeoutOrderSlice(set, get),
  ...createTakeoutProfileSlice(set, get),
  ...createTakeoutHydrationSlice(set, get),
});
