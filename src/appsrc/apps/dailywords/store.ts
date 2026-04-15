import { create } from 'zustand';
import { createIdbStore, listRecordEntries, setRecord } from '../../../core/idb';
import { getCommerceActiveRoleId } from '../../shared/business/commerce/roleContext';
import { normalizeRoleId as normalizeSharedRoleId } from '../../shared/business/roleIdentity';
import { dailyWordsMemoryController } from './memory';
import type {
  DailyWordsDraft,
  DailyWordsEntry,
  DailyWordsRoleState,
  DailyWordsStore,
} from './types';

const DAILY_WORDS_DB_NAME = 'mimiphone.app.dailywords.v1';
const DAILY_WORDS_ROLE_STATE_STORE = 'role_states';
const DAILY_WORDS_MEMORY_SESSION_PREFIX = 'dailywords-entry';
const DAILY_WORDS_MEMORY_SOURCE_PREFIX = 'dailywords-entry';

const dailyWordsRoleStateStore = createIdbStore({
  dbName: DAILY_WORDS_DB_NAME,
  storeName: DAILY_WORDS_ROLE_STATE_STORE,
});

interface DailyWordsHydratedState {
  activeRoleId: string;
  dailyWordsStateByRoleId: Record<string, DailyWordsRoleState>;
}

interface DailyWordsRoleMutationResult {
  roleId: string;
  previousRoleState: DailyWordsRoleState;
  nextRoleState: DailyWordsRoleState;
}

const createEmptyDraft = (): DailyWordsDraft => ({
  title: '',
  content: '',
  tagsInput: '',
  mood: '',
});

const createDefaultDailyWordsRoleState = (): DailyWordsRoleState => ({
  entries: [],
  draft: createEmptyDraft(),
  searchKeyword: '',
  dateFilter: 'all',
  showFullPreview: false,
});

const cloneDailyWordsRoleState = (roleState: DailyWordsRoleState): DailyWordsRoleState => ({
  entries: roleState.entries.map((entry) => ({
    ...entry,
    tags: [...entry.tags],
  })),
  draft: {
    ...roleState.draft,
  },
  searchKeyword: roleState.searchKeyword,
  dateFilter: roleState.dateFilter,
  showFullPreview: roleState.showFullPreview,
});

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeRoleId = (value: string | undefined): string => normalizeSharedRoleId(value);

const toDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sortEntries = (entries: DailyWordsEntry[]): DailyWordsEntry[] =>
  [...entries].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt;
    return right.createdAt - left.createdAt;
  });

const parseTagsInput = (value: string): string[] => {
  const tagSet = new Set<string>();

  value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      if (tagSet.size >= 16) return;
      tagSet.add(tag.slice(0, 20));
    });

  return [...tagSet];
};

const buildMemorySessionId = (entryId: string): string =>
  `${DAILY_WORDS_MEMORY_SESSION_PREFIX}-${entryId}`;
const buildMemorySourceId = (entryId: string): string =>
  `${DAILY_WORDS_MEMORY_SOURCE_PREFIX}:${entryId}`;

const buildEntryMemoryContent = (entry: DailyWordsEntry): string => {
  const title = entry.title.trim();
  const content = entry.content.trim();
  const mood = entry.mood.trim();
  const tags = entry.tags.filter(Boolean);

  const lines: string[] = [];
  lines.push(`日期：${entry.dateKey}`);
  if (title) lines.push(`标题：${title}`);
  if (mood) lines.push(`心情：${mood}`);
  if (tags.length > 0) lines.push(`标签：${tags.join('、')}`);
  lines.push(`内容：${content || title || '（无正文）'}`);
  return lines.join('\n');
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const sanitizeBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const sanitizeNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const sanitizeDateFilter = (value: unknown): DailyWordsRoleState['dateFilter'] =>
  value === 'today' || value === 'week' || value === 'all' ? value : 'all';

const sanitizeDraft = (value: unknown): DailyWordsDraft => {
  if (!isPlainObject(value)) return createEmptyDraft();

  return {
    title: sanitizeString(value.title).slice(0, 80),
    content: sanitizeString(value.content).slice(0, 5000),
    tagsInput: sanitizeString(value.tagsInput).slice(0, 200),
    mood: sanitizeString(value.mood).slice(0, 30),
  };
};

const sanitizeEntry = (value: unknown): DailyWordsEntry | null => {
  if (!isPlainObject(value)) return null;
  const now = Date.now();
  const id = sanitizeString(value.id).trim();
  if (!id) return null;

  const title = sanitizeString(value.title).trim().slice(0, 80);
  const content = sanitizeString(value.content).trim().slice(0, 5000);
  if (!title && !content) return null;

  const createdAt = sanitizeNumber(value.createdAt, now);
  const updatedAt = sanitizeNumber(value.updatedAt, createdAt);
  const fallbackDateKey = toDateKey(updatedAt);
  const dateKeyRaw = sanitizeString(value.dateKey);
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKeyRaw) ? dateKeyRaw : fallbackDateKey;
  const tags = Array.isArray(value.tags)
    ? value.tags
        .map((item) => sanitizeString(item).trim())
        .filter(Boolean)
        .slice(0, 16)
    : [];

  return {
    id,
    title,
    content,
    tags,
    mood: sanitizeString(value.mood).trim().slice(0, 30),
    dateKey,
    isSyncedToMemory: sanitizeBoolean(value.isSyncedToMemory, false),
    createdAt,
    updatedAt,
  };
};

const sanitizeRoleState = (value: unknown): DailyWordsRoleState => {
  const fallback = createDefaultDailyWordsRoleState();
  if (!isPlainObject(value)) return fallback;

  const entryIdSet = new Set<string>();
  const entries = Array.isArray(value.entries)
    ? value.entries
        .map((item) => sanitizeEntry(item))
        .filter((item): item is DailyWordsEntry => Boolean(item))
        .filter((item) => {
          if (entryIdSet.has(item.id)) return false;
          entryIdSet.add(item.id);
          return true;
        })
    : [];

  return {
    entries: sortEntries(entries),
    draft: sanitizeDraft(value.draft),
    searchKeyword: sanitizeString(value.searchKeyword).slice(0, 80),
    dateFilter: sanitizeDateFilter(value.dateFilter),
    showFullPreview: sanitizeBoolean(value.showFullPreview, false),
  };
};

const rolePersistQueue = new Map<string, Promise<void>>();

const persistDailyWordsRoleState = (roleId: string, roleState: DailyWordsRoleState): void => {
  const normalizedRoleId = normalizeRoleId(roleId);
  const snapshot = cloneDailyWordsRoleState(roleState);
  const previousTask = rolePersistQueue.get(normalizedRoleId) ?? Promise.resolve();

  let nextTask: Promise<void>;
  nextTask = previousTask
    .catch(() => undefined)
    .then(() => setRecord(dailyWordsRoleStateStore, normalizedRoleId, snapshot))
    .catch((error) => {
      console.error('[DailyWordsStore] persist role state failed:', error);
    })
    .finally(() => {
      if (rolePersistQueue.get(normalizedRoleId) === nextTask) {
        rolePersistQueue.delete(normalizedRoleId);
      }
    });

  rolePersistQueue.set(normalizedRoleId, nextTask);
};

const loadDailyWordsPersistedState = async (): Promise<DailyWordsHydratedState> => {
  const roleEntries = await listRecordEntries<unknown>(dailyWordsRoleStateStore);
  const roleStateById: Record<string, DailyWordsRoleState> = {};

  roleEntries.forEach(([rawRoleId, rawRoleState]) => {
    if (typeof rawRoleId !== 'string') return;
    const roleId = normalizeRoleId(rawRoleId);
    roleStateById[roleId] = sanitizeRoleState(rawRoleState);
  });

  const activeRoleId = normalizeRoleId(getCommerceActiveRoleId());
  if (!roleStateById[activeRoleId]) {
    roleStateById[activeRoleId] = createDefaultDailyWordsRoleState();
  }

  return {
    activeRoleId,
    dailyWordsStateByRoleId: roleStateById,
  };
};

const ensureRoleContextState = (
  state: DailyWordsStore,
  preferredRoleId?: string
): { state: DailyWordsStore; roleId: string; roleState: DailyWordsRoleState } => {
  const roleId = normalizeRoleId(preferredRoleId ?? getCommerceActiveRoleId());
  const existingRoleState = state.dailyWordsStateByRoleId[roleId];
  if (existingRoleState && state.activeRoleId === roleId) {
    return {
      state,
      roleId,
      roleState: existingRoleState,
    };
  }

  const roleState = existingRoleState ?? createDefaultDailyWordsRoleState();
  const nextRoleMap = existingRoleState
    ? state.dailyWordsStateByRoleId
    : {
        ...state.dailyWordsStateByRoleId,
        [roleId]: roleState,
      };

  return {
    state: {
      ...state,
      activeRoleId: roleId,
      dailyWordsStateByRoleId: nextRoleMap,
      ...roleState,
    },
    roleId,
    roleState,
  };
};

const applyRoleState = (
  state: DailyWordsStore,
  roleId: string,
  roleState: DailyWordsRoleState
): DailyWordsStore => {
  const nextRoleMap = {
    ...state.dailyWordsStateByRoleId,
    [roleId]: roleState,
  };

  if (state.activeRoleId === roleId) {
    return {
      ...state,
      dailyWordsStateByRoleId: nextRoleMap,
      ...roleState,
    };
  }

  return {
    ...state,
    dailyWordsStateByRoleId: nextRoleMap,
  };
};

const initialRoleId = normalizeRoleId(getCommerceActiveRoleId());
const initialRoleState = createDefaultDailyWordsRoleState();

export const useDailyWordsStore = create<DailyWordsStore>()((set) => {
  const updateRoleState = (
    mutate: (roleState: DailyWordsRoleState) => DailyWordsRoleState
  ): DailyWordsRoleMutationResult | null => {
    const mutationRef: { current: DailyWordsRoleMutationResult | null } = { current: null };

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const nextRoleState = mutate(roleState);
      if (nextRoleState === roleState) {
        return syncedState;
      }

      mutationRef.current = {
        roleId,
        previousRoleState: roleState,
        nextRoleState,
      };

      return applyRoleState(syncedState, roleId, nextRoleState);
    });

    const mutation = mutationRef.current;
    if (mutation) {
      persistDailyWordsRoleState(mutation.roleId, mutation.nextRoleState);
    }

    return mutation;
  };

  return {
    activeRoleId: initialRoleId,
    dailyWordsStateByRoleId: {
      [initialRoleId]: initialRoleState,
    },
    ...initialRoleState,

    syncDailyWordsRoleContext: () => {
      let shouldPersist = false;
      let nextRoleId: string | null = null;
      let nextRoleState: DailyWordsRoleState | null = null;

      set((state) => {
        const roleId = normalizeRoleId(getCommerceActiveRoleId());
        const existingRoleState = state.dailyWordsStateByRoleId[roleId];
        if (existingRoleState && state.activeRoleId === roleId) return state;

        const roleState = existingRoleState ?? createDefaultDailyWordsRoleState();
        const nextRoleMap = existingRoleState
          ? state.dailyWordsStateByRoleId
          : {
              ...state.dailyWordsStateByRoleId,
              [roleId]: roleState,
            };

        if (!existingRoleState) {
          shouldPersist = true;
          nextRoleId = roleId;
          nextRoleState = roleState;
        }

        return {
          ...state,
          activeRoleId: roleId,
          dailyWordsStateByRoleId: nextRoleMap,
          ...roleState,
        };
      });

      if (shouldPersist && nextRoleId && nextRoleState) {
        persistDailyWordsRoleState(nextRoleId, nextRoleState);
      }
    },

    setDraft: (patch) => {
      updateRoleState((roleState) => {
        const nextDraft: DailyWordsDraft = {
          title: patch.title !== undefined ? patch.title.slice(0, 80) : roleState.draft.title,
          content:
            patch.content !== undefined ? patch.content.slice(0, 5000) : roleState.draft.content,
          tagsInput:
            patch.tagsInput !== undefined
              ? patch.tagsInput.slice(0, 200)
              : roleState.draft.tagsInput,
          mood: patch.mood !== undefined ? patch.mood.slice(0, 30) : roleState.draft.mood,
        };

        return {
          ...roleState,
          draft: nextDraft,
        };
      });
    },

    clearDraft: () => {
      updateRoleState((roleState) => ({
        ...roleState,
        draft: createEmptyDraft(),
      }));
    },

    createEntryFromDraft: () => {
      updateRoleState((roleState) => {
        const draft = roleState.draft;
        const title = draft.title.trim();
        const content = draft.content.trim();
        if (!title && !content) return roleState;

        const now = Date.now();
        const newEntry: DailyWordsEntry = {
          id: `dailywords-entry-${generateId()}`,
          title,
          content,
          tags: parseTagsInput(draft.tagsInput),
          mood: draft.mood.trim(),
          dateKey: toDateKey(now),
          isSyncedToMemory: false,
          createdAt: now,
          updatedAt: now,
        };

        return {
          ...roleState,
          entries: sortEntries([newEntry, ...roleState.entries]),
          draft: createEmptyDraft(),
        };
      });
    },

    updateEntry: (entryId, payload) => {
      let shouldRemoveMemory = false;

      updateRoleState((roleState) => {
        const index = roleState.entries.findIndex((item) => item.id === entryId);
        if (index < 0) return roleState;

        const title = payload.title.trim().slice(0, 80);
        const content = payload.content.trim().slice(0, 5000);
        if (!title && !content) return roleState;

        const current = roleState.entries[index];
        shouldRemoveMemory = current.isSyncedToMemory;

        const nextEntry: DailyWordsEntry = {
          ...current,
          title,
          content,
          tags: payload.tags
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 16),
          mood: payload.mood.trim().slice(0, 30),
          isSyncedToMemory: false,
          updatedAt: Date.now(),
        };

        const nextEntries = [...roleState.entries];
        nextEntries[index] = nextEntry;

        return {
          ...roleState,
          entries: sortEntries(nextEntries),
        };
      });

      if (shouldRemoveMemory) {
        const sessionId = buildMemorySessionId(entryId);
        const sourceId = buildMemorySourceId(entryId);
        dailyWordsMemoryController.removeBySessionSources(sessionId, [sourceId]);
      }
    },

    removeEntry: (entryId) => {
      let shouldRemoveMemory = false;

      updateRoleState((roleState) => {
        const target = roleState.entries.find((item) => item.id === entryId);
        if (!target) return roleState;

        shouldRemoveMemory = target.isSyncedToMemory;

        return {
          ...roleState,
          entries: roleState.entries.filter((item) => item.id !== entryId),
        };
      });

      if (shouldRemoveMemory) {
        const sessionId = buildMemorySessionId(entryId);
        const sourceId = buildMemorySourceId(entryId);
        dailyWordsMemoryController.removeBySessionSources(sessionId, [sourceId]);
      }
    },

    setSearchKeyword: (value) => {
      updateRoleState((roleState) => ({
        ...roleState,
        searchKeyword: value.slice(0, 80),
      }));
    },

    setDateFilter: (value) => {
      updateRoleState((roleState) => ({
        ...roleState,
        dateFilter: value,
      }));
    },

    setShowFullPreview: (value) => {
      updateRoleState((roleState) => ({
        ...roleState,
        showFullPreview: value,
      }));
    },

    syncEntryMemory: (entryId) => {
      const mutation = updateRoleState((roleState) => {
        const index = roleState.entries.findIndex((item) => item.id === entryId);
        if (index < 0) return roleState;

        const current = roleState.entries[index];
        if (current.isSyncedToMemory) return roleState;

        const nextEntry: DailyWordsEntry = {
          ...current,
          isSyncedToMemory: true,
          updatedAt: Date.now(),
        };
        const nextEntries = [...roleState.entries];
        nextEntries[index] = nextEntry;

        return {
          ...roleState,
          entries: sortEntries(nextEntries),
        };
      });

      if (!mutation) return;
      const targetEntry = mutation.nextRoleState.entries.find((item) => item.id === entryId);
      if (!targetEntry) return;

      const sessionId = buildMemorySessionId(targetEntry.id);
      const sourceId = buildMemorySourceId(targetEntry.id);
      dailyWordsMemoryController.removeBySessionSources(sessionId, [sourceId]);
      dailyWordsMemoryController.record({
        contactId: mutation.roleId,
        role: 'user',
        sourceType: 'diary-entry',
        sessionId,
        sourceId,
        content: buildEntryMemoryContent(targetEntry),
      });
    },

    unsyncEntryMemory: (entryId) => {
      const mutation = updateRoleState((roleState) => {
        const index = roleState.entries.findIndex((item) => item.id === entryId);
        if (index < 0) return roleState;

        const current = roleState.entries[index];
        if (!current.isSyncedToMemory) return roleState;

        const nextEntries = [...roleState.entries];
        nextEntries[index] = {
          ...current,
          isSyncedToMemory: false,
          updatedAt: Date.now(),
        };

        return {
          ...roleState,
          entries: sortEntries(nextEntries),
        };
      });

      if (!mutation) return;

      const sessionId = buildMemorySessionId(entryId);
      const sourceId = buildMemorySourceId(entryId);
      dailyWordsMemoryController.removeBySessionSources(sessionId, [sourceId]);
    },
  };
});

let hydratePromise: Promise<void> | null = null;

const hydrateDailyWordsStore = async (): Promise<void> => {
  if (hydratePromise) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    try {
      const persistedState = await loadDailyWordsPersistedState();
      const activeRoleState =
        persistedState.dailyWordsStateByRoleId[persistedState.activeRoleId] ??
        createDefaultDailyWordsRoleState();

      useDailyWordsStore.setState((state) => ({
        ...state,
        activeRoleId: persistedState.activeRoleId,
        dailyWordsStateByRoleId: persistedState.dailyWordsStateByRoleId,
        ...activeRoleState,
      }));
    } catch (error) {
      console.error('[DailyWordsStore] hydrate failed:', error);
    } finally {
      hydratePromise = null;
    }
  })();

  await hydratePromise;
};

void hydrateDailyWordsStore();
