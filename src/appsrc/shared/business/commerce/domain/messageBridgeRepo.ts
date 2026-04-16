import {
  createAppStoreConfig,
  readIdbRawValue,
  updateIdbRawValue,
} from '../../../../../core/storage';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../roleContext';

const SELLER_MESSAGE_BRIDGE_STORE = createAppStoreConfig('seller', 'message_bridge_v1');
const SELLER_MESSAGE_BRIDGE_KEY_PREFIX = 'message_bridge_state';

export type MessageBridgePersistState = {
  inboxMessages: unknown[];
  favoriteEvents: unknown[];
  autoOrderTasks: unknown[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeMessageBridgePersistState = (value: unknown): MessageBridgePersistState => {
  if (!isPlainObject(value)) {
    return {
      inboxMessages: [],
      favoriteEvents: [],
      autoOrderTasks: [],
    };
  }

  return {
    inboxMessages: toArray(value.inboxMessages),
    favoriteEvents: toArray(value.favoriteEvents),
    autoOrderTasks: toArray(value.autoOrderTasks),
  };
};

const resolveMessageBridgeStateKey = (): string => {
  const roleId = normalizeCommerceRoleId(getCommerceActiveRoleId());
  return `${SELLER_MESSAGE_BRIDGE_KEY_PREFIX}::${roleId}`;
};

export const readMessageBridgeState = async (): Promise<MessageBridgePersistState> => {
  const raw = await readIdbRawValue<unknown>(
    SELLER_MESSAGE_BRIDGE_STORE,
    resolveMessageBridgeStateKey()
  );
  return normalizeMessageBridgePersistState(raw);
};

export const updateMessageBridgeState = async (
  updater: (state: MessageBridgePersistState) => MessageBridgePersistState
): Promise<MessageBridgePersistState> => {
  return updateIdbRawValue<unknown, MessageBridgePersistState>(
    SELLER_MESSAGE_BRIDGE_STORE,
    resolveMessageBridgeStateKey(),
    (current) => {
      const currentState = normalizeMessageBridgePersistState(current);
      return normalizeMessageBridgePersistState(updater(currentState));
    }
  );
};
