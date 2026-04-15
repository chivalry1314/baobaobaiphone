import { DEFAULT_ACTIVE_ROLE_ID, normalizeRoleId } from './roleIdentity';
import { getRuntimeActiveRoleId } from './runtimeRole';
import { useContactsStore } from './store';
import type { Contact, MyCard } from './types';

export const getContactsSnapshot = (): Contact[] => {
  return useContactsStore.getState().contacts || [];
};

export const getMyCardsSnapshot = (): MyCard[] => {
  return useContactsStore.getState().myCards || [];
};

export const getContactSnapshotById = (contactId: string): Contact | undefined => {
  return getContactsSnapshot().find((item) => item.id === contactId);
};

export const getActiveRoleIdSnapshot = (): string => {
  const runtimeRoleId = getRuntimeActiveRoleId();
  if (runtimeRoleId) return normalizeRoleId(runtimeRoleId);
  return normalizeRoleId(
    getMyCardsSnapshot().find((item) => item.isActive)?.id || DEFAULT_ACTIVE_ROLE_ID
  );
};
