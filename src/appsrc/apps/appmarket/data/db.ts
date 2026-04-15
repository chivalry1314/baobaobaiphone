import { createIdbStore } from '../../../../core/idb';
import {
  APPMARKET_DB_NAME,
  INSTALLED_APPS_STORE,
  UPLOADED_APPS_STORE,
} from './stores';

export const installedAppsStore = createIdbStore({
  dbName: APPMARKET_DB_NAME,
  storeName: INSTALLED_APPS_STORE,
});

export const uploadedAppsStore = createIdbStore({
  dbName: APPMARKET_DB_NAME,
  storeName: UPLOADED_APPS_STORE,
});
