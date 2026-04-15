import { createIdbStore } from '../../../../core/idb';
import { WARMTRACK_DB_NAME, WARMTRACK_ROLE_STATE_STORE } from './stores';

export const warmTrackRoleStateStore = createIdbStore({
  dbName: WARMTRACK_DB_NAME,
  storeName: WARMTRACK_ROLE_STATE_STORE,
});
