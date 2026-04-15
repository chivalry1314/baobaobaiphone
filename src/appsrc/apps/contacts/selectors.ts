import { DEFAULT_ACTIVE_ROLE_ID, normalizeRoleId } from './roleIdentity';
import { useContactsRoleRuntimeStore } from './runtimeRole';
import { useContactsStore } from './store';
import type { Contact, MyCard } from './types';

export const useContactsSnapshot = (): Contact[] => {
  return useContactsStore((state) => state.contacts);
};

export const useMyCardsSnapshot = (): MyCard[] => {
  return useContactsStore((state) => state.myCards);
};

export const useActiveRoleIdSnapshot = (): string => {
  const runtimeRoleId = useContactsRoleRuntimeStore((state) => state.overrideRoleId);
  const storeRoleId = useContactsStore(
    (state) => state.myCards.find((item) => item.isActive)?.id || DEFAULT_ACTIVE_ROLE_ID
  );
  return normalizeRoleId(runtimeRoleId || storeRoleId);
};

export const useStoredActiveRoleIdSnapshot = (): string => {
  const storeRoleId = useContactsStore(
    (state) => state.myCards.find((item) => item.isActive)?.id || DEFAULT_ACTIVE_ROLE_ID
  );
  return normalizeRoleId(storeRoleId);
};

export const useSetContactAsWeChatFriend = () => {
  return useContactsStore((state) => state.setContactAsWeChatFriend);
};

export const useUpdateContact = () => {
  return useContactsStore((state) => state.updateContact);
};
