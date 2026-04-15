import { useContactsRoleRuntimeStore } from './runtimeRole';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  normalizeRoleId,
  parseContactRoleId,
} from './roleIdentity';
import { useContactsStore } from './store';

const resolveStoreRoleId = (): string => {
  const activeCard = useContactsStore.getState().myCards.find((card) => card.isActive);
  return normalizeRoleId(activeCard?.id);
};

export { DEFAULT_ACTIVE_ROLE_ID };

export const useActiveRoleId = (): string => {
  const runtimeRoleId = useContactsRoleRuntimeStore((state) => state.overrideRoleId);
  const storeRoleId = useContactsStore((state) => {
    const activeCard = state.myCards.find((card) => card.isActive);
    return normalizeRoleId(activeCard?.id);
  });

  return normalizeRoleId(runtimeRoleId || storeRoleId);
};

export const useStoredActiveRoleId = (): string => {
  return useContactsStore((state) => {
    const activeCard = state.myCards.find((card) => card.isActive);
    return normalizeRoleId(activeCard?.id);
  });
};

export const getActiveRoleId = (): string => {
  const runtimeRoleId = useContactsRoleRuntimeStore.getState().overrideRoleId;
  if (runtimeRoleId) return normalizeRoleId(runtimeRoleId);
  return resolveStoreRoleId();
};

export const getRoleDisplayName = (roleId: string): string => {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (normalizedRoleId === DEFAULT_ACTIVE_ROLE_ID) return '默认身份';

  const contactId = parseContactRoleId(normalizedRoleId);
  if (contactId) {
    const targetContact = useContactsStore
      .getState()
      .contacts.find((contact) => contact.id === contactId);
    return targetContact?.name || contactId;
  }

  const targetCard = useContactsStore
    .getState()
    .myCards.find((card) => card.id === normalizedRoleId);
  return targetCard?.name || normalizedRoleId;
};
