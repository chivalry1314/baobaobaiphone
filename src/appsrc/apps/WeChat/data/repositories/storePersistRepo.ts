import { createIdbStore, deleteRecord, listRecordEntries, listStoreKeys, setRecord } from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import { createJSONStorage, type PersistOptions, type StateStorage } from 'zustand/middleware';
import { getActiveRoleId } from '../../../contacts/activeRole';
import type { WeChatRoleScopedState, WeChatState } from '../../store/types';

interface CreateWeChatPersistOptionsInput {
  normalizeRoleId: (value: string | undefined) => string;
  normalizePersistedRoleMap: (input: unknown) => Record<string, WeChatRoleScopedState>;
  createDefaultRoleScopedState: () => WeChatRoleScopedState;
}

type WeChatPersistState = Pick<WeChatState, 'wechatStateByRoleId'>;

type WeChatPersistOptions = PersistOptions<WeChatState, WeChatPersistState>;

const WECHAT_PERSIST_STATE_KEY = 'state';
const WECHAT_ROLE_STATE_STORE = 'role_states';

const wechatRoleStateStore = createIdbStore(createAppStoreConfig('wechat', WECHAT_ROLE_STATE_STORE));

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const toRoleIdKey = (value: IDBValidKey): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const createRoleStateStorage = ({
  normalizeRoleId,
  normalizePersistedRoleMap,
}: CreateWeChatPersistOptionsInput): StateStorage => {
  const normalizePersistState = (
    persistedState: Partial<WeChatPersistState> | undefined
  ): WeChatPersistState => ({
    wechatStateByRoleId: normalizePersistedRoleMap(persistedState?.wechatStateByRoleId),
  });

  const readRoleStates = async (): Promise<{ state: WeChatPersistState } | null> => {
    const entries = await listRecordEntries<unknown>(wechatRoleStateStore);
    if (entries.length === 0) return null;

    const roleStateMap: Record<string, unknown> = {};

    entries.forEach(([key, state]) => {
      const roleKey = toRoleIdKey(key);
      if (!roleKey) return;
      if (!isObjectRecord(state)) return;

      const roleId = normalizeRoleId(roleKey);
      if (!roleId) return;
      roleStateMap[roleId] = state;
    });

    return {
      state: normalizePersistState({
        wechatStateByRoleId: roleStateMap as Record<string, WeChatRoleScopedState>,
      }),
    };
  };

  return {
    getItem: async (): Promise<string | null> => {
      try {
        const value = await readRoleStates();
        return value ? JSON.stringify(value) : null;
      } catch (error) {
        console.error('[WeChatStorePersist] getItem failed:', error);
        return null;
      }
    },

    setItem: async (_name, value): Promise<void> => {
      try {
        const parsed = JSON.parse(value) as {
          state?: Partial<WeChatPersistState>;
        };
        const normalizedState = normalizePersistState(parsed?.state);

        const nextRoleIds = new Set<string>();
        const existingRoleIds = new Set<string>();
        const existingKeys = await listStoreKeys(wechatRoleStateStore);

        existingKeys.forEach((key) => {
          const roleKey = toRoleIdKey(key);
          if (!roleKey) return;
          const roleId = normalizeRoleId(roleKey);
          if (!roleId) return;
          existingRoleIds.add(roleId);
        });

        const writeTasks: Promise<unknown>[] = [];

        Object.entries(normalizedState.wechatStateByRoleId).forEach(([rawRoleId, roleState]) => {
          const roleId = normalizeRoleId(rawRoleId);
          if (!roleId) return;

          nextRoleIds.add(roleId);
          writeTasks.push(setRecord(wechatRoleStateStore, roleId, roleState));
        });

        existingRoleIds.forEach((roleId) => {
          if (nextRoleIds.has(roleId)) return;
          writeTasks.push(deleteRecord(wechatRoleStateStore, roleId));
        });

        await Promise.all(writeTasks);
      } catch (error) {
        console.error('[WeChatStorePersist] setItem failed:', error);
      }
    },

    removeItem: async (): Promise<void> => {
      try {
        const keys = await listStoreKeys(wechatRoleStateStore);
        const deleteTasks: Promise<unknown>[] = [];

        keys.forEach((key) => {
          const roleKey = toRoleIdKey(key);
          if (!roleKey) return;
          deleteTasks.push(deleteRecord(wechatRoleStateStore, roleKey));
        });

        await Promise.all(deleteTasks);
      } catch (error) {
        console.error('[WeChatStorePersist] removeItem failed:', error);
      }
    },
  };
};

export const createWeChatPersistOptions = ({
  normalizeRoleId,
  normalizePersistedRoleMap,
  createDefaultRoleScopedState,
}: CreateWeChatPersistOptionsInput): WeChatPersistOptions => ({
  name: WECHAT_PERSIST_STATE_KEY,
  storage: createJSONStorage<WeChatPersistState>(() =>
    createRoleStateStorage({
      normalizeRoleId,
      normalizePersistedRoleMap,
      createDefaultRoleScopedState,
    })
  ),
  onRehydrateStorage: () => (state?: WeChatState) => {
    state?.syncWeChatRoleContext();
  },
  partialize: (state) => ({
    wechatStateByRoleId: state.wechatStateByRoleId,
  }),
  merge: (persistedState: unknown, currentState: WeChatState): WeChatState => {
    const persisted = (persistedState as Partial<WeChatPersistState>) || {};
    const persistedRoleMap = normalizePersistedRoleMap(persisted.wechatStateByRoleId);

    const currentRoleId = normalizeRoleId(getActiveRoleId());
    const currentRoleState = persistedRoleMap[currentRoleId] || createDefaultRoleScopedState();

    const nextRoleMap = {
      ...persistedRoleMap,
      [currentRoleId]: currentRoleState,
    };

    return {
      ...currentState,
      activeRoleId: currentRoleId,
      wechatStateByRoleId: nextRoleMap,
      ...currentRoleState,
    };
  },
});
