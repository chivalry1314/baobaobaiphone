import { createIdbStore, deleteRecord, listRecordEntries, listStoreKeys, setRecord } from '../../../../../core/idb';
import { createAppStoreConfig } from '../../../../../core/storage';
import { createJSONStorage, type PersistOptions, type StateStorage } from 'zustand/middleware';
import { getActiveRoleId } from '../../../contacts/activeRole';
import type { LoveSpaceRoleScopedState, LoveSpaceStore } from '../../types';

interface CreateLoveSpacePersistOptionsInput {
  normalizeRoleId: (value: string | undefined) => string;
  normalizePersistedRoleMap: (input: unknown) => Record<string, LoveSpaceRoleScopedState>;
  createDefaultLoveSpaceState: () => LoveSpaceRoleScopedState;
}

type LoveSpacePersistState = Pick<LoveSpaceStore, 'loveSpaceStateByRoleId'>;

type LoveSpacePersistOptions = PersistOptions<LoveSpaceStore, LoveSpacePersistState>;

const LOVE_SPACE_PERSIST_STATE_KEY = 'state';
const LOVE_SPACE_ROLE_STATE_STORE = 'role_states';

const loveSpaceRoleStateStore = createIdbStore(
  createAppStoreConfig('lovespace', LOVE_SPACE_ROLE_STATE_STORE)
);

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
}: CreateLoveSpacePersistOptionsInput): StateStorage => {
  const normalizePersistState = (
    persistedState: Partial<LoveSpacePersistState> | undefined
  ): LoveSpacePersistState => ({
    loveSpaceStateByRoleId: normalizePersistedRoleMap(persistedState?.loveSpaceStateByRoleId),
  });

  const readRoleStates = async (): Promise<{ state: LoveSpacePersistState } | null> => {
    const entries = await listRecordEntries<unknown>(loveSpaceRoleStateStore);
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
        loveSpaceStateByRoleId: roleStateMap as Record<string, LoveSpaceRoleScopedState>,
      }),
    };
  };

  return {
    getItem: async (): Promise<string | null> => {
      try {
        const value = await readRoleStates();
        return value ? JSON.stringify(value) : null;
      } catch (error) {
        console.error('[LoveSpaceStorePersist] getItem failed:', error);
        return null;
      }
    },

    setItem: async (_name, value): Promise<void> => {
      try {
        const parsed = JSON.parse(value) as {
          state?: Partial<LoveSpacePersistState>;
        };
        const normalizedState = normalizePersistState(parsed?.state);

        const nextRoleIds = new Set<string>();
        const existingRoleIds = new Set<string>();
        const existingKeys = await listStoreKeys(loveSpaceRoleStateStore);

        existingKeys.forEach((key) => {
          const roleKey = toRoleIdKey(key);
          if (!roleKey) return;
          const roleId = normalizeRoleId(roleKey);
          if (!roleId) return;
          existingRoleIds.add(roleId);
        });

        const writeTasks: Promise<unknown>[] = [];

        Object.entries(normalizedState.loveSpaceStateByRoleId).forEach(([rawRoleId, roleState]) => {
          const roleId = normalizeRoleId(rawRoleId);
          if (!roleId) return;

          nextRoleIds.add(roleId);
          writeTasks.push(setRecord(loveSpaceRoleStateStore, roleId, roleState));
        });

        existingRoleIds.forEach((roleId) => {
          if (nextRoleIds.has(roleId)) return;
          writeTasks.push(deleteRecord(loveSpaceRoleStateStore, roleId));
        });

        await Promise.all(writeTasks);
      } catch (error) {
        console.error('[LoveSpaceStorePersist] setItem failed:', error);
      }
    },

    removeItem: async (): Promise<void> => {
      try {
        const keys = await listStoreKeys(loveSpaceRoleStateStore);
        const deleteTasks: Promise<unknown>[] = [];

        keys.forEach((key) => {
          const roleKey = toRoleIdKey(key);
          if (!roleKey) return;
          deleteTasks.push(deleteRecord(loveSpaceRoleStateStore, roleKey));
        });

        await Promise.all(deleteTasks);
      } catch (error) {
        console.error('[LoveSpaceStorePersist] removeItem failed:', error);
      }
    },
  };
};

export const createLoveSpacePersistOptions = ({
  normalizeRoleId,
  normalizePersistedRoleMap,
  createDefaultLoveSpaceState,
}: CreateLoveSpacePersistOptionsInput): LoveSpacePersistOptions => ({
  name: LOVE_SPACE_PERSIST_STATE_KEY,
  storage: createJSONStorage<LoveSpacePersistState>(() =>
    createRoleStateStorage({
      normalizeRoleId,
      normalizePersistedRoleMap,
      createDefaultLoveSpaceState,
    })
  ),
  onRehydrateStorage: () => (state?: LoveSpaceStore) => {
    state?.syncLoveSpaceRoleContext();
  },
  partialize: (state) => ({
    loveSpaceStateByRoleId: state.loveSpaceStateByRoleId,
  }),
  merge: (persistedState: unknown, currentState: LoveSpaceStore): LoveSpaceStore => {
    const persisted = (persistedState as Partial<LoveSpacePersistState>) || {};
    const persistedRoleMap = normalizePersistedRoleMap(persisted.loveSpaceStateByRoleId);

    const currentRoleId = normalizeRoleId(getActiveRoleId());
    const currentRoleState =
      persistedRoleMap[currentRoleId] || createDefaultLoveSpaceState();

    const nextRoleMap = {
      ...persistedRoleMap,
      [currentRoleId]: currentRoleState,
    };

    return {
      ...currentState,
      activeRoleId: currentRoleId,
      loveSpaceStateByRoleId: nextRoleMap,
      ...currentRoleState,
    };
  },
});
