import type { AppManifest } from '@mimisOS/sdk';
import { ContactsApp } from './ContactsApp';
import {
  registerContactsSnapshotResolver,
  registerContactsSnapshotSubscriber,
} from '../../shared/business/contacts/snapshotBridge';
import {
  registerMyCardsSnapshotResolver,
  registerMyCardsSnapshotSubscriber,
} from '../../shared/business/contacts/myCardsSnapshotBridge';
import {
  registerRoleDisplayNameResolver,
  registerRoleDisplayNameSubscriber,
} from '../../shared/business/contacts/roleDisplayNameBridge';
import { registerCommerceContactsSnapshotResolver } from '../../shared/business/commerce/messageBridge';
import {
  emitCommerceRoleChanged,
  registerCommerceRoleIdResolver,
} from '../../shared/business/commerce/roleContext';
import { getActiveRoleId } from './activeRole';
import { getContactsSnapshot, getMyCardsSnapshot } from './queries';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  normalizeRoleId,
  parseContactRoleId,
} from './roleIdentity';
import { useContactsRoleRuntimeStore } from './runtimeRole';
import { useContactsStore } from './store';

registerCommerceContactsSnapshotResolver(getContactsSnapshot);
registerCommerceRoleIdResolver(getActiveRoleId);
registerContactsSnapshotResolver(getContactsSnapshot);
registerContactsSnapshotSubscriber((listener) =>
  useContactsStore.subscribe(() => {
    listener();
  })
);
registerMyCardsSnapshotResolver(getMyCardsSnapshot);
registerMyCardsSnapshotSubscriber((listener) =>
  useContactsStore.subscribe(() => {
    listener();
  })
);
registerRoleDisplayNameResolver((roleId) => {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (normalizedRoleId === DEFAULT_ACTIVE_ROLE_ID) return '默认身份';

  const parsedContactId = parseContactRoleId(normalizedRoleId);
  if (parsedContactId) {
    const contact = useContactsStore
      .getState()
      .contacts.find((item) => item.id === parsedContactId);
    return contact?.name || parsedContactId;
  }

  const myCard = useContactsStore
    .getState()
    .myCards.find((item) => item.id === normalizedRoleId);
  return myCard?.name || normalizedRoleId;
});
registerRoleDisplayNameSubscriber((listener) =>
  useContactsStore.subscribe(() => {
    listener();
  })
);

let lastCommerceRoleId = getActiveRoleId();
let commerceRoleSyncSubscribed = false;

if (!commerceRoleSyncSubscribed) {
  commerceRoleSyncSubscribed = true;

  const syncCommerceRole = () => {
    const nextRoleId = getActiveRoleId();
    if (nextRoleId === lastCommerceRoleId) return;
    lastCommerceRoleId = nextRoleId;
    emitCommerceRoleChanged();
  };

  useContactsStore.subscribe(syncCommerceRole);
  useContactsRoleRuntimeStore.subscribe(syncCommerceRole);
}

const contactsManifest: AppManifest = {
  id: 'contacts',
  name: '通讯录',
  icon: 'ContactRound',
  color: '#10B981',
  component: ContactsApp,
  isSystem: true,
  description: '联系人与通话记录管理。',
};

export default contactsManifest;
