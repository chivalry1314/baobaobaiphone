import type { UploadedMarketApp } from '../types';

export const APPMARKET_DB_NAME = 'baobaobaiphone.app.appmarket.v1';

export const INSTALLED_APPS_STORE = 'installed_apps';
export const UPLOADED_APPS_STORE = 'uploaded_apps';

export interface InstalledAppEntity {
  appId: string;
  installedAt: number;
}

export type UploadedAppEntity = UploadedMarketApp;
