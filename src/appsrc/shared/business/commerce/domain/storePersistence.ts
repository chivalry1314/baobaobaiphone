import {
  createIdbStore,
  getRecord,
  setRecord,
  updateRecord,
} from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../roleContext';
import { normalizeSellerStorageState, type SellerStorageState } from './storeModel';

const SELLER_ROLE_STATE_STORE = 'role_states';

const sellerRoleStateStore = createIdbStore(
  createAppStoreConfig('seller', SELLER_ROLE_STATE_STORE)
);

const resolveRoleId = (): string => {
  return normalizeCommerceRoleId(getCommerceActiveRoleId());
};

export const readSellerStorageState = async (): Promise<SellerStorageState> => {
  const roleId = resolveRoleId();
  const raw = await getRecord<unknown>(sellerRoleStateStore, roleId);
  return normalizeSellerStorageState(raw);
};

export const writeSellerStorageState = async (
  state: SellerStorageState
): Promise<void> => {
  const roleId = resolveRoleId();
  await setRecord(
    sellerRoleStateStore,
    roleId,
    normalizeSellerStorageState(state)
  );
};

export const patchSellerStorageState = async (
  updater: (state: SellerStorageState) => SellerStorageState
): Promise<void> => {
  const roleId = resolveRoleId();
  await updateRecord<unknown, SellerStorageState>(
    sellerRoleStateStore,
    roleId,
    (current) => {
      const currentState = normalizeSellerStorageState(current);
      return normalizeSellerStorageState(updater(currentState));
    }
  );
};
