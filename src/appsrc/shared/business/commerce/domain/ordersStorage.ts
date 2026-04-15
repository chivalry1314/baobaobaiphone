import {
  createIdbStore,
  getRecord,
  updateRecord,
} from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../roleContext';
import type { Address, Order } from './types';

const SHOPPING_ROLE_STATE_STORE = 'role_states';

const shoppingRoleStateStore = createIdbStore(
  createAppStoreConfig('shopping', SHOPPING_ROLE_STATE_STORE)
);

type ShoppingRoleStateRecord = {
  orders?: Order[];
  addresses?: Address[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const resolveRoleId = (): string => {
  return normalizeCommerceRoleId(getCommerceActiveRoleId());
};

const normalizeRoleStateRecord = (state: unknown): ShoppingRoleStateRecord => {
  if (!isPlainObject(state)) return {};
  return state as ShoppingRoleStateRecord;
};

const normalizeOrdersFromRecord = (state: ShoppingRoleStateRecord): Order[] => {
  return Array.isArray(state.orders) ? state.orders : [];
};

const normalizeAddressesFromRecord = (state: ShoppingRoleStateRecord): Address[] => {
  return Array.isArray(state.addresses) ? state.addresses : [];
};

export const readShoppingOrdersFromStorage = async (): Promise<Order[]> => {
  const roleId = resolveRoleId();
  const raw = await getRecord<unknown>(shoppingRoleStateStore, roleId);
  return normalizeOrdersFromRecord(normalizeRoleStateRecord(raw));
};

export const readShoppingAddressesFromStorage = async (): Promise<Address[]> => {
  const roleId = resolveRoleId();
  const raw = await getRecord<unknown>(shoppingRoleStateStore, roleId);
  return normalizeAddressesFromRecord(normalizeRoleStateRecord(raw));
};

export const appendShoppingOrderToStorage = async (order: Order): Promise<Order[]> => {
  const roleId = resolveRoleId();
  let nextOrders: Order[] = [];

  await updateRecord<unknown, ShoppingRoleStateRecord>(
    shoppingRoleStateStore,
    roleId,
    (current) => {
      const currentState = normalizeRoleStateRecord(current);
      const currentOrders = normalizeOrdersFromRecord(currentState);
      nextOrders = [order, ...currentOrders.filter((item) => item.id !== order.id)];

      return {
        ...currentState,
        orders: nextOrders,
      };
    }
  );

  return nextOrders;
};
