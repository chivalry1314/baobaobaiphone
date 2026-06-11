import type { AppMarketState, CreateUploadedAppPayload, UploadedMarketApp } from '../types';

export interface AppMarketActions {
  installApp: (appId: string) => void;
  uninstallApp: (appId: string) => void;
  addUploadedApp: (payload: CreateUploadedAppPayload) => UploadedMarketApp;
  removeUploadedApp: (appId: string) => void;
}

export interface AppMarketStore extends AppMarketState, AppMarketActions {
  isHydrated: boolean;
}
