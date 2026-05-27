import { create } from 'zustand';
import {
  buildAppMemoryReferenceLines,
  createAppMemoryRecord,
  DEFAULT_APP_MEMORY_ROLE_ID,
  type AppMemoryRole,
  type AppMemoryRecord,
  type AppMemorySpace,
  type BuildAppMemoryReferenceOptions,
  type RecordAppInteractionPayload,
  normalizeAppMemoryRoleId,
  normalizeAppMemorySpace,
  recordAppInteraction,
  selectAppMemoryRecordsByContact,
} from './appMemory';
import {
  groupAppMemoryRecordsByShard,
  loadAppMemoryCenterShardRecords,
  persistAppMemoryCenterShardDiff,
} from './appMemoryCenterPersistRepo';
import { useSettingsCoreStore } from './stores/settings/store';
import { renderPaperMagicPrompt } from '../appsrc/apps/papermagic/promptCatalog';
const DEFAULT_TOTAL_LIMIT = 3000;
const DEFAULT_SUMMARY_THRESHOLD = 120;
const DEFAULT_AUTO_SUMMARY_MAX_ROUNDS = 2;
const DEFAULT_SUMMARY_MIN_BATCH = 8;
const DEFAULT_SUMMARY_MAX_BATCH = 60;
const DEFAULT_SUMMARY_KEEP_RECENT_MIN = 6;
const DEFAULT_SUMMARY_KEEP_RECENT_RATIO = 0.5;
const SUMMARY_SOURCE_TYPE = 'memory-summary';

const summarizingAppIds = new Set<string>();
const memoryCenterChangeListeners = new Set<{
  listener: (event: MemoryCenterChangeEvent) => void;
  filter?: MemoryCenterChangeFilter;
}>();
let memoryCenterRevision = 0;

export interface AppMemoryScope {
  roleId: string;
  space: AppMemorySpace;
}

const normalizeAppMemoryScope = (scope?: Partial<AppMemoryScope>): AppMemoryScope => ({
  roleId: normalizeAppMemoryRoleId(scope?.roleId),
  space: normalizeAppMemorySpace(scope?.space),
});

const isSameScope = (record: Pick<AppMemoryRecord, 'roleId' | 'space'>, scope: AppMemoryScope): boolean =>
  normalizeAppMemoryRoleId(record.roleId) === scope.roleId &&
  normalizeAppMemorySpace(record.space) === scope.space;

export type MemoryCenterChangeReason =
  | 'record'
  | 'import'
  | 'remove-by-id'
  | 'clear'
  | 'remove-by-session-sources'
  | 'auto-summary-save';

export interface MemoryCenterChangeEvent {
  revision: number;
  reason: MemoryCenterChangeReason;
  changedAppIds: string[];
  changedContactIds: string[];
  timestamp: number;
}

export interface MemoryCenterChangeFilter {
  appIds?: string | string[];
  contactIds?: string | string[];
  reasons?: MemoryCenterChangeReason | MemoryCenterChangeReason[];
}

const normalizeStringFilter = (value: string | string[] | undefined): Set<string> | null => {
  if (!value) return null;
  const list = (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return new Set(list);
};

const normalizeReasonFilter = (
  value: MemoryCenterChangeReason | MemoryCenterChangeReason[] | undefined
): Set<MemoryCenterChangeReason> | null => {
  if (!value) return null;
  const list = Array.isArray(value) ? value : [value];
  if (list.length === 0) return null;
  return new Set(list);
};

const hasIntersection = (left: Set<string>, rightItems: string[]): boolean => {
  for (const item of rightItems) {
    if (left.has(item)) return true;
  }
  return false;
};

const matchesMemoryCenterChangeFilter = (
  event: MemoryCenterChangeEvent,
  filter?: MemoryCenterChangeFilter
): boolean => {
  if (!filter) return true;

  const reasonFilter = normalizeReasonFilter(filter.reasons);
  if (reasonFilter && !reasonFilter.has(event.reason)) return false;

  const appFilter = normalizeStringFilter(filter.appIds);
  if (appFilter && event.changedAppIds.length > 0 && !hasIntersection(appFilter, event.changedAppIds)) {
    return false;
  }

  const contactFilter = normalizeStringFilter(filter.contactIds);
  if (
    contactFilter &&
    event.changedContactIds.length > 0 &&
    !hasIntersection(contactFilter, event.changedContactIds)
  ) {
    return false;
  }

  return true;
};

const emitMemoryCenterChange = (
  payload: Omit<MemoryCenterChangeEvent, 'revision' | 'timestamp'> & {
    timestamp?: number;
  }
): void => {
  const changedAppIds = [...new Set(payload.changedAppIds.filter(Boolean))];
  const changedContactIds = [...new Set(payload.changedContactIds.filter(Boolean))];

  if (changedAppIds.length === 0 && changedContactIds.length === 0) return;

  memoryCenterRevision += 1;
  const event: MemoryCenterChangeEvent = {
    revision: memoryCenterRevision,
    reason: payload.reason,
    changedAppIds,
    changedContactIds,
    timestamp: payload.timestamp ?? Date.now(),
  };

  memoryCenterChangeListeners.forEach((subscription) => {
    if (!matchesMemoryCenterChangeFilter(event, subscription.filter)) return;
    subscription.listener(event);
  });
};

export const getMemoryCenterRevision = (): number => memoryCenterRevision;

export const subscribeMemoryCenterChanges = (
  listener: (event: MemoryCenterChangeEvent) => void,
  filter?: MemoryCenterChangeFilter
): (() => void) => {
  const subscription = { listener, filter };
  memoryCenterChangeListeners.add(subscription);
  return () => {
    memoryCenterChangeListeners.delete(subscription);
  };
};

const normalizeMemoryRecords = (records: unknown[]): AppMemoryRecord[] =>
  records
    .filter(
      (item): item is AppMemoryRecord =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as AppMemoryRecord).id === 'string' &&
        typeof (item as AppMemoryRecord).appId === 'string' &&
        typeof (item as AppMemoryRecord).contactId === 'string' &&
        typeof (item as AppMemoryRecord).content === 'string' &&
        typeof (item as AppMemoryRecord).timestamp === 'number'
    )
    .map((item) => {
      const normalizedRole: AppMemoryRole = item.role === 'assistant' ? 'assistant' : 'user';
      return {
        ...item,
        id: item.id.trim(),
        appId: item.appId.trim(),
        roleId: normalizeAppMemoryRoleId(item.roleId),
        space: normalizeAppMemorySpace(item.space),
        contactId: item.contactId.trim(),
        role: normalizedRole,
        content: item.content.trim(),
      };
    })
    .filter((item) => Boolean(item.id) && Boolean(item.appId) && Boolean(item.contactId) && Boolean(item.content))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, DEFAULT_TOTAL_LIMIT);

const mergeMemoryRecordsById = (base: AppMemoryRecord[], override: AppMemoryRecord[]): AppMemoryRecord[] => {
  const recordMap = new Map(base.map((item) => [item.id, item]));
  override.forEach((item) => {
    recordMap.set(item.id, item);
  });

  return [...recordMap.values()]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, DEFAULT_TOTAL_LIMIT);
};

const areMemoryRecordListsEqual = (left: AppMemoryRecord[], right: AppMemoryRecord[]): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (
      leftItem.id !== rightItem.id ||
      leftItem.appId !== rightItem.appId ||
      leftItem.roleId !== rightItem.roleId ||
      leftItem.space !== rightItem.space ||
      leftItem.contactId !== rightItem.contactId ||
      leftItem.sessionId !== rightItem.sessionId ||
      leftItem.sourceId !== rightItem.sourceId ||
      leftItem.sourceType !== rightItem.sourceType ||
      leftItem.role !== rightItem.role ||
      leftItem.content !== rightItem.content ||
      leftItem.timestamp !== rightItem.timestamp
    ) {
      return false;
    }
  }

  return true;
};

const collectChangedShardIds = (
  previousShardMap: Record<string, AppMemoryRecord[]>,
  nextShardMap: Record<string, AppMemoryRecord[]>
): string[] => {
  const shardIdSet = new Set([
    ...Object.keys(previousShardMap),
    ...Object.keys(nextShardMap),
  ]);

  return [...shardIdSet].filter(
    (shardId) =>
      !areMemoryRecordListsEqual(
        previousShardMap[shardId] ?? [],
        nextShardMap[shardId] ?? []
      )
  );
};

let appMemoryPersistQueue: Promise<void> = Promise.resolve();

const scheduleAppMemoryShardPersistence = (
  previousRecords: AppMemoryRecord[],
  nextRecords: AppMemoryRecord[]
): void => {
  if (previousRecords === nextRecords) return;
  const previousShardMap = groupAppMemoryRecordsByShard(previousRecords);
  const nextShardMap = groupAppMemoryRecordsByShard(nextRecords);
  const changedShardIds = collectChangedShardIds(previousShardMap, nextShardMap);
  if (changedShardIds.length === 0) return;

  appMemoryPersistQueue = appMemoryPersistQueue
    .catch(() => undefined)
    .then(() =>
      persistAppMemoryCenterShardDiff({
        nextShardMap,
        changedShardIds,
      })
    )
    .catch((error) => {
      console.error('[MemoryCenter] persist shard records failed:', error);
    });
};

export type AppAutoSummaryStage =
  | 'planning'
  | 'summarizing'
  | 'saving'
  | 'completed'
  | 'failed';

export interface AppAutoSummaryProgress {
  appId: string;
  running: boolean;
  stage: AppAutoSummaryStage;
  round: number;
  maxRounds: number;
  completedRounds: number;
  compressedCount: number;
  currentBatchSize: number;
  contactId?: string;
  errorMessage?: string;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
}

const normalizeSummaryThreshold = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SUMMARY_THRESHOLD;
  return Math.max(20, Math.min(500, Math.round(value)));
};

const normalizeAutoSummaryMaxRounds = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_AUTO_SUMMARY_MAX_ROUNDS;
  return Math.max(1, Math.min(10, Math.round(value)));
};

const normalizeSummaryMinBatch = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SUMMARY_MIN_BATCH;
  return Math.max(4, Math.min(80, Math.round(value)));
};

const normalizeSummaryMaxBatch = (value: number | undefined, minBatch: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.max(minBatch, DEFAULT_SUMMARY_MAX_BATCH);
  }
  return Math.max(minBatch, Math.min(200, Math.round(value)));
};

const normalizeSummaryKeepRecentMin = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SUMMARY_KEEP_RECENT_MIN;
  return Math.max(0, Math.min(120, Math.round(value)));
};

const normalizeSummaryKeepRecentRatio = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_SUMMARY_KEEP_RECENT_RATIO;
  return Math.max(0.2, Math.min(0.8, value));
};

const extractContentFromChatCompletion = (rawContent: unknown): string => {
  if (typeof rawContent === 'string') return rawContent.trim();
  if (!Array.isArray(rawContent)) return '';

  return rawContent
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const text = (item as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
};

const summarizeMemoryBatch = async (
  appId: string,
  contactId: string,
  records: AppMemoryRecord[]
): Promise<string | null> => {
  const settings = useSettingsCoreStore.getState().settings;
  const apiKey = (settings.memoryApiKey || '').trim();
  const baseUrl = (settings.memoryBaseUrl || '').trim().replace(/\/+$/, '');
  const model = (settings.memoryModel || '').trim();

  if (!apiKey || !baseUrl || !model) return null;

  const sorted = [...records].sort((left, right) => left.timestamp - right.timestamp);
  const timeline = sorted
    .map((item) => {
      const timeLabel = new Date(item.timestamp).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const roleLabel = item.role === 'user' ? '用户' : 'AI';
      return `- ${timeLabel} ${roleLabel}：${item.content}`;
    })
    .join('\n');
  const memoryPrompt = renderPaperMagicPrompt('memory.summary.compress', {
    appId,
    contactId,
    timeline,
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: memoryPrompt.system || '',
        },
        {
          role: 'user',
          content: memoryPrompt.user || '',
        },
      ],
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) return null;

  const content = extractContentFromChatCompletion(
    (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message
      ?.content
  );

  if (!content) return null;
  return content;
};

const selectSummarizationBatch = (
  appRecords: AppMemoryRecord[],
  options: {
    threshold: number;
    minBatch: number;
    maxBatch: number;
    keepRecentMin: number;
    keepRecentRatio: number;
  }
): { contactId: string; roleId: string; space: AppMemorySpace; batch: AppMemoryRecord[] } | null => {
  const { threshold, minBatch, maxBatch, keepRecentMin, keepRecentRatio } = options;
  const recordsByContact = new Map<
    string,
    {
      roleId: string;
      space: AppMemorySpace;
      contactId: string;
      records: AppMemoryRecord[];
    }
  >();

  appRecords.forEach((item) => {
    const roleId = normalizeAppMemoryRoleId(item.roleId);
    const space = normalizeAppMemorySpace(item.space);
    const contactId = item.contactId;
    const key = `${roleId}::${space}::${contactId}`;

    const grouped = recordsByContact.get(key);
    if (grouped) {
      grouped.records.push(item);
      return;
    }

    recordsByContact.set(key, {
      roleId,
      space,
      contactId,
      records: [item],
    });
  });

  let selected:
    | {
        contactId: string;
        roleId: string;
        space: AppMemorySpace;
        batch: AppMemoryRecord[];
        overflow: number;
      }
    | null = null;

  for (const { records, contactId, roleId, space } of recordsByContact.values()) {
    // 摘要记录也属于记忆的一部分，也参与后续压缩，避免摘要条目持续累积。
    const compressibleRecords = [...records].sort((left, right) => right.timestamp - left.timestamp);

    if (compressibleRecords.length < threshold) continue;

    const ratioKeep = Math.floor(threshold * keepRecentRatio);
    const keepRecent = Math.max(
      keepRecentMin,
      Math.min(Math.max(keepRecentMin, ratioKeep), Math.max(0, threshold - minBatch))
    );
    const removable = compressibleRecords
      .slice(keepRecent)
      .sort((left, right) => left.timestamp - right.timestamp);

    if (removable.length < minBatch) continue;

    const batch = removable.slice(0, Math.min(maxBatch, removable.length));
    const overflow = compressibleRecords.length - threshold + 1;

    if (!selected || overflow > selected.overflow) {
      selected = {
        contactId,
        roleId,
        space,
        batch,
        overflow,
      };
    }
  }

  if (!selected) return null;
  return {
    contactId: selected.contactId,
    roleId: selected.roleId,
    space: selected.space,
    batch: selected.batch,
  };
};

const runAutoSummarizationForApp = async (appId: string): Promise<void> => {
  if (!appId || summarizingAppIds.has(appId)) return;
  summarizingAppIds.add(appId);

  try {
    const settings = useSettingsCoreStore.getState().settings;
    const maxRounds = normalizeAutoSummaryMaxRounds(settings.memoryAutoSummaryMaxRounds);
    const startedAt = Date.now();
    let completedRounds = 0;
    let compressedCount = 0;
    let failedMessage = '';

    useAppMemoryCenterStore.setState((state) => ({
      autoSummaryProgressByApp: {
        ...state.autoSummaryProgressByApp,
        [appId]: {
          appId,
          running: true,
          stage: 'planning',
          round: 0,
          maxRounds,
          completedRounds: 0,
          compressedCount: 0,
          currentBatchSize: 0,
          startedAt,
          updatedAt: startedAt,
        },
      },
    }));

    for (let round = 0; round < maxRounds; round += 1) {
      const nextRound = round + 1;
      const planningAt = Date.now();
      useAppMemoryCenterStore.setState((state) => {
        const previous = state.autoSummaryProgressByApp[appId];
        if (!previous) return state;

        return {
          autoSummaryProgressByApp: {
            ...state.autoSummaryProgressByApp,
            [appId]: {
              ...previous,
              running: true,
              stage: 'planning',
              round: nextRound,
              errorMessage: undefined,
              updatedAt: planningAt,
            },
          },
        };
      });

      const settings = useSettingsCoreStore.getState().settings;
      const threshold = normalizeSummaryThreshold(settings.memoryAutoSummaryThreshold);
      const minBatch = normalizeSummaryMinBatch(settings.memoryAutoSummaryMinBatch);
      const maxBatch = normalizeSummaryMaxBatch(settings.memoryAutoSummaryMaxBatch, minBatch);
      const keepRecentMin = normalizeSummaryKeepRecentMin(settings.memoryAutoSummaryKeepRecentMin);
      const keepRecentRatio = normalizeSummaryKeepRecentRatio(
        settings.memoryAutoSummaryKeepRecentRatio
      );
      const appRecords = useAppMemoryCenterStore
        .getState()
        .appMemoryRecords.filter((item) => item.appId === appId);

      const plan = selectSummarizationBatch(appRecords, {
        threshold,
        minBatch,
        maxBatch,
        keepRecentMin,
        keepRecentRatio,
      });
      if (!plan) break;

      const summarizingAt = Date.now();
      useAppMemoryCenterStore.setState((state) => {
        const previous = state.autoSummaryProgressByApp[appId];
        if (!previous) return state;

        return {
          autoSummaryProgressByApp: {
            ...state.autoSummaryProgressByApp,
            [appId]: {
              ...previous,
              running: true,
              stage: 'summarizing',
              round: nextRound,
              contactId: plan.contactId,
              currentBatchSize: plan.batch.length,
              updatedAt: summarizingAt,
            },
          },
        };
      });

      const summaryText = await summarizeMemoryBatch(appId, plan.contactId, plan.batch);
      if (!summaryText) {
        failedMessage = '总结失败，请检查记忆模型 API 配置后重试。';
        break;
      }

      const batchIdSet = new Set(plan.batch.map((item) => item.id));
      const summaryRecord = createAppMemoryRecord({
        appId,
        roleId: plan.roleId,
        space: plan.space,
        contactId: plan.contactId,
        role: 'assistant',
        content: `【记忆摘要】${summaryText}`,
        sourceType: SUMMARY_SOURCE_TYPE,
      });

      const savingAt = Date.now();
      let previousRecordsRef: AppMemoryRecord[] | null = null;
      let nextRecordsRef: AppMemoryRecord[] | null = null;
      useAppMemoryCenterStore.setState((state) => {
        const previous = state.autoSummaryProgressByApp[appId];
        const remaining = state.appMemoryRecords.filter((item) => !batchIdSet.has(item.id));
        const nextRecords = [summaryRecord, ...remaining]
          .sort((left, right) => right.timestamp - left.timestamp)
          .slice(0, DEFAULT_TOTAL_LIMIT);
        completedRounds += 1;
        compressedCount += plan.batch.length;

        previousRecordsRef = state.appMemoryRecords;
        nextRecordsRef = nextRecords;

        return {
          appMemoryRecords: nextRecords,
          ...(previous
            ? {
                autoSummaryProgressByApp: {
                  ...state.autoSummaryProgressByApp,
                  [appId]: {
                    ...previous,
                    running: true,
                    stage: 'saving',
                    round: nextRound,
                    completedRounds,
                    compressedCount,
                    contactId: plan.contactId,
                    currentBatchSize: plan.batch.length,
                    updatedAt: savingAt,
                  },
                },
              }
            : {}),
        };
      });
      if (
        previousRecordsRef &&
        nextRecordsRef &&
        previousRecordsRef !== nextRecordsRef &&
        previousRecordsRef.length > 0
      ) {
        scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
      }
      emitMemoryCenterChange({
        reason: 'auto-summary-save',
        changedAppIds: [appId],
        changedContactIds: [plan.contactId],
      });
    }

    const finishedAt = Date.now();
    useAppMemoryCenterStore.setState((state) => {
      const previous = state.autoSummaryProgressByApp[appId];
      if (!previous) return state;

      return {
        autoSummaryProgressByApp: {
          ...state.autoSummaryProgressByApp,
          [appId]: {
            ...previous,
            running: false,
            stage: failedMessage ? 'failed' : 'completed',
            errorMessage: failedMessage || undefined,
            finishedAt,
            updatedAt: finishedAt,
          },
        },
      };
    });
  } catch (error) {
    const finishedAt = Date.now();
    useAppMemoryCenterStore.setState((state) => {
      const previous = state.autoSummaryProgressByApp[appId];
      if (!previous) return state;

      return {
        autoSummaryProgressByApp: {
          ...state.autoSummaryProgressByApp,
          [appId]: {
            ...previous,
            running: false,
            stage: 'failed',
            errorMessage: '总结过程中出现异常，请稍后重试。',
            finishedAt,
            updatedAt: finishedAt,
          },
        },
      };
    });
    console.error('[MemoryCenter] Auto summarization failed:', error);
  } finally {
    summarizingAppIds.delete(appId);
  }
};

interface AppMemoryCenterState {
  isHydrated: boolean;
  appMemoryRecords: AppMemoryRecord[];
  autoSummaryProgressByApp: Record<string, AppAutoSummaryProgress>;
  importAppMemoryRecords: (records: AppMemoryRecord[]) => void;
  recordAppInteraction: (
    payload: RecordAppInteractionPayload,
    options?: {
      limit?: number;
      shouldRecord?: (content: string) => boolean;
    }
  ) => void;
  removeAppMemoryById: (appId: string, memoryId: string) => void;
  clearAppMemories: (appId: string, contactId?: string, scope?: Partial<AppMemoryScope>) => void;
  removeAppMemoriesBySessionSources: (
    appId: string,
    sessionId: string,
    sourceIds: string[],
    scope?: Partial<AppMemoryScope>
  ) => void;
}

export const useAppMemoryCenterStore = create<AppMemoryCenterState>()((set) => ({
  isHydrated: false,
  appMemoryRecords: [],
  autoSummaryProgressByApp: {},
  importAppMemoryRecords: (records) => {
    if (!Array.isArray(records) || records.length === 0) return;
    const normalizedRecords = normalizeMemoryRecords(records);
    if (normalizedRecords.length === 0) return;

    let previousRecordsRef: AppMemoryRecord[] | null = null;
    let nextRecordsRef: AppMemoryRecord[] | null = null;
    set((state) => {
      previousRecordsRef = state.appMemoryRecords;
      nextRecordsRef = mergeMemoryRecordsById(state.appMemoryRecords, normalizedRecords);
      if (nextRecordsRef === state.appMemoryRecords) return state;
      return { appMemoryRecords: nextRecordsRef };
    });

    if (previousRecordsRef && nextRecordsRef && previousRecordsRef !== nextRecordsRef) {
      scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
    }

    const appIds = [...new Set(normalizedRecords.map((item) => item.appId).filter(Boolean))];
    const contactIds = [
      ...new Set(normalizedRecords.map((item) => item.contactId).filter(Boolean)),
    ];
    emitMemoryCenterChange({
      reason: 'import',
      changedAppIds: appIds,
      changedContactIds: contactIds,
    });
    appIds.forEach((appId) => {
      void runAutoSummarizationForApp(appId);
    });
  },
  recordAppInteraction: (payload, options) => {
    const normalizedPayload: RecordAppInteractionPayload = {
      ...payload,
      roleId: normalizeAppMemoryRoleId(payload.roleId),
      space: normalizeAppMemorySpace(payload.space),
    };
    let previousRecordsRef: AppMemoryRecord[] | null = null;
    let nextRecordsRef: AppMemoryRecord[] | null = null;

    set((state) => {
      const nextRecords = recordAppInteraction(state.appMemoryRecords, normalizedPayload, {
        limit: options?.limit ?? DEFAULT_TOTAL_LIMIT,
        shouldRecord: options?.shouldRecord,
      });
      if (nextRecords === state.appMemoryRecords) return state;
      previousRecordsRef = state.appMemoryRecords;
      nextRecordsRef = nextRecords;
      return { appMemoryRecords: nextRecords };
    });

    if (!previousRecordsRef || !nextRecordsRef) return;
    scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
    emitMemoryCenterChange({
      reason: 'record',
      changedAppIds: [normalizedPayload.appId],
      changedContactIds: [normalizedPayload.contactId],
    });
    void runAutoSummarizationForApp(normalizedPayload.appId);
  },
  removeAppMemoryById: (appId, memoryId) => {
    let removedContactId: string | undefined;
    let previousRecordsRef: AppMemoryRecord[] | null = null;
    let nextRecordsRef: AppMemoryRecord[] | null = null;

    set((state) => {
      const target = state.appMemoryRecords.find(
        (item) => item.appId === appId && item.id === memoryId
      );
      if (!target) return state;
      removedContactId = target.contactId;
      previousRecordsRef = state.appMemoryRecords;
      nextRecordsRef = state.appMemoryRecords.filter(
        (item) => !(item.appId === appId && item.id === memoryId)
      );
      return { appMemoryRecords: nextRecordsRef };
    });

    if (!previousRecordsRef || !nextRecordsRef) return;
    scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
    emitMemoryCenterChange({
      reason: 'remove-by-id',
      changedAppIds: [appId],
      changedContactIds: removedContactId ? [removedContactId] : [],
    });
  },
  clearAppMemories: (appId, contactId, scopeInput) => {
    const scope = scopeInput ? normalizeAppMemoryScope(scopeInput) : null;
    const changedContactIds = contactId ? [contactId] : [];
    let previousRecordsRef: AppMemoryRecord[] | null = null;
    let nextRecordsRef: AppMemoryRecord[] | null = null;
    let removedCount = 0;

    set((state) => {
      const nextRecords = state.appMemoryRecords.filter((item) => {
        if (item.appId !== appId) return true;
        if (scope && !isSameScope(item, scope)) return true;
        if (!contactId) {
          removedCount += 1;
          return false;
        }
        const shouldKeep = item.contactId !== contactId;
        if (!shouldKeep) removedCount += 1;
        return shouldKeep;
      });
      if (removedCount === 0) return state;
      previousRecordsRef = state.appMemoryRecords;
      nextRecordsRef = nextRecords;
      return { appMemoryRecords: nextRecords };
    });

    if (!previousRecordsRef || !nextRecordsRef) return;
    scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
    emitMemoryCenterChange({
      reason: 'clear',
      changedAppIds: [appId],
      changedContactIds,
    });
  },
  removeAppMemoriesBySessionSources: (appId, sessionId, sourceIds, scopeInput) => {
    const sourceIdSet = new Set(sourceIds.filter(Boolean));
    if (sourceIdSet.size === 0) return;
    const scope = scopeInput ? normalizeAppMemoryScope(scopeInput) : null;

    let changedContactIds: string[] = [];
    let previousRecordsRef: AppMemoryRecord[] | null = null;
    let nextRecordsRef: AppMemoryRecord[] | null = null;
    set((state) => {
      changedContactIds = [
        ...new Set(
          state.appMemoryRecords
            .filter(
              (item) =>
                item.appId === appId &&
                (!scope || isSameScope(item, scope)) &&
                item.sessionId === sessionId &&
                item.sourceId &&
                sourceIdSet.has(item.sourceId)
            )
            .map((item) => item.contactId)
        ),
      ];
      if (changedContactIds.length === 0) return state;

      previousRecordsRef = state.appMemoryRecords;
      nextRecordsRef = state.appMemoryRecords.filter(
        (item) =>
          !(
            item.appId === appId &&
            (!scope || isSameScope(item, scope)) &&
            item.sessionId === sessionId &&
            item.sourceId &&
            sourceIdSet.has(item.sourceId)
          )
      );
      return { appMemoryRecords: nextRecordsRef };
    });

    if (!previousRecordsRef || !nextRecordsRef) return;
    scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
    emitMemoryCenterChange({
      reason: 'remove-by-session-sources',
      changedAppIds: [appId],
      changedContactIds,
    });
  },
}));

let appMemoryCenterHydrationPromise: Promise<void> | null = null;

const hydrateAppMemoryCenterStore = async (): Promise<void> => {
  if (appMemoryCenterHydrationPromise) {
    await appMemoryCenterHydrationPromise;
    return;
  }

  appMemoryCenterHydrationPromise = (async () => {
    try {
      const storedRecords = await loadAppMemoryCenterShardRecords();
      const normalizedStoredRecords = normalizeMemoryRecords(storedRecords);
      let previousRecordsRef: AppMemoryRecord[] | null = null;
      let nextRecordsRef: AppMemoryRecord[] | null = null;

      useAppMemoryCenterStore.setState((state) => {
        const mergedRecords = mergeMemoryRecordsById(
          normalizedStoredRecords,
          state.appMemoryRecords
        );

        if (state.isHydrated && areMemoryRecordListsEqual(state.appMemoryRecords, mergedRecords)) {
          return state;
        }

        previousRecordsRef = state.appMemoryRecords;
        nextRecordsRef = mergedRecords;
        return {
          appMemoryRecords: mergedRecords,
          isHydrated: true,
        };
      });

      if (
        previousRecordsRef &&
        nextRecordsRef &&
        previousRecordsRef !== nextRecordsRef &&
        previousRecordsRef.length > 0
      ) {
        scheduleAppMemoryShardPersistence(previousRecordsRef, nextRecordsRef);
      }
    } catch (error) {
      console.error('[MemoryCenter] hydrate shard records failed:', error);
      useAppMemoryCenterStore.setState({ isHydrated: true });
    }
  })();

  try {
    await appMemoryCenterHydrationPromise;
  } finally {
    appMemoryCenterHydrationPromise = null;
  }
};

void hydrateAppMemoryCenterStore();

export interface QueryMemoryCenterRecordsOptions<
  TRecord extends AppMemoryRecord = AppMemoryRecord,
> {
  appIds?: string | string[];
  roleIds?: string | string[];
  spaces?: AppMemorySpace | AppMemorySpace[];
  contactIds?: string | string[];
  sourceTypes?: string | string[];
  roles?: AppMemoryRole | AppMemoryRole[];
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  mapRecord?: (record: AppMemoryRecord) => TRecord;
}

const normalizeRoleFilter = (
  roles: AppMemoryRole | AppMemoryRole[] | undefined
): Set<AppMemoryRole> | null => {
  if (!roles) return null;
  const list = Array.isArray(roles) ? roles : [roles];
  if (list.length === 0) return null;
  return new Set(list);
};

const normalizeSpaceFilter = (
  spaces: AppMemorySpace | AppMemorySpace[] | undefined
): Set<AppMemorySpace> | null => {
  if (!spaces) return null;
  const list = Array.isArray(spaces) ? spaces : [spaces];
  if (list.length === 0) return null;
  return new Set(list.map((item) => normalizeAppMemorySpace(item)));
};

export const queryMemoryCenterRecords = <
  TRecord extends AppMemoryRecord = AppMemoryRecord,
>(
  options?: QueryMemoryCenterRecordsOptions<TRecord>
): TRecord[] => {
  const appFilter = normalizeStringFilter(options?.appIds);
  const roleIdFilter = normalizeStringFilter(options?.roleIds);
  const spaceFilter = normalizeSpaceFilter(options?.spaces);
  const contactFilter = normalizeStringFilter(options?.contactIds);
  const sourceTypeFilter = normalizeStringFilter(options?.sourceTypes);
  const roleFilter = normalizeRoleFilter(options?.roles);
  const fromTimestamp = options?.fromTimestamp;
  const toTimestamp = options?.toTimestamp;
  const order = options?.order ?? 'desc';
  const mapRecord =
    options?.mapRecord ??
    ((record: AppMemoryRecord): TRecord => record as TRecord);

  const records = useAppMemoryCenterStore.getState().appMemoryRecords;
  const filtered = records.filter((record) => {
    if (appFilter && !appFilter.has(record.appId)) return false;
    if (roleIdFilter && !roleIdFilter.has(normalizeAppMemoryRoleId(record.roleId))) return false;
    if (spaceFilter && !spaceFilter.has(normalizeAppMemorySpace(record.space))) return false;
    if (contactFilter && !contactFilter.has(record.contactId)) return false;
    if (sourceTypeFilter && !sourceTypeFilter.has(record.sourceType || '')) return false;
    if (roleFilter && !roleFilter.has(record.role)) return false;
    if (typeof fromTimestamp === 'number' && record.timestamp < fromTimestamp) return false;
    if (typeof toTimestamp === 'number' && record.timestamp > toTimestamp) return false;
    return true;
  });

  const ordered = filtered
    .slice()
    .sort((left, right) =>
      order === 'asc' ? left.timestamp - right.timestamp : right.timestamp - left.timestamp
    );
  const limit = options?.limit;
  const sliced = typeof limit === 'number' && limit > 0 ? ordered.slice(0, limit) : ordered;
  return sliced.map((record) => mapRecord(record));
};

export interface QueryPersonalMemoryByAppOptions<
  TRecord extends AppMemoryRecord = AppMemoryRecord,
> {
  roleId?: string;
  appIds?: string | string[];
  contactIds?: string | string[];
  sourceTypes?: string | string[];
  roles?: AppMemoryRole | AppMemoryRole[];
  fromTimestamp?: number;
  toTimestamp?: number;
  order?: 'asc' | 'desc';
  limitPerApp?: number;
  mapRecord?: (record: AppMemoryRecord) => TRecord;
}

export interface PersonalMemoryByAppGroup<
  TRecord extends AppMemoryRecord = AppMemoryRecord,
> {
  appId: string;
  records: TRecord[];
}

export const queryPersonalMemoryByApp = <
  TRecord extends AppMemoryRecord = AppMemoryRecord,
>(
  options?: QueryPersonalMemoryByAppOptions<TRecord>
): PersonalMemoryByAppGroup<TRecord>[] => {
  const roleId = normalizeAppMemoryRoleId(options?.roleId);
  const records = queryMemoryCenterRecords<TRecord>({
    appIds: options?.appIds,
    roleIds: roleId,
    spaces: 'personal',
    contactIds: options?.contactIds,
    sourceTypes: options?.sourceTypes,
    roles: options?.roles,
    fromTimestamp: options?.fromTimestamp,
    toTimestamp: options?.toTimestamp,
    order: options?.order ?? 'desc',
    mapRecord: options?.mapRecord,
  });

  const grouped = new Map<string, TRecord[]>();
  records.forEach((record) => {
    const current = grouped.get(record.appId);
    if (current) {
      current.push(record);
      return;
    }
    grouped.set(record.appId, [record]);
  });

  return [...grouped.entries()].map(([appId, groupedRecords]) => ({
    appId,
    records:
      typeof options?.limitPerApp === 'number' && options.limitPerApp > 0
        ? groupedRecords.slice(0, options.limitPerApp)
        : groupedRecords,
  }));
};

type UseRecordsHook<TRecord extends AppMemoryRecord> = () => TRecord[];

export interface AppMemoryApi<TAppId extends string, TRecord extends AppMemoryRecord = AppMemoryRecord> {
  appId: TAppId;
  useRecords: UseRecordsHook<TRecord>;
  getRecords: () => TRecord[];
  record: (
    payload: Omit<RecordAppInteractionPayload, 'appId'>,
    options?: {
      limit?: number;
      shouldRecord?: (content: string) => boolean;
    }
  ) => void;
  removeById: (memoryId: string) => void;
  clear: (contactId?: string) => void;
  removeBySessionSources: (sessionId: string, sourceIds: string[]) => void;
  selectByContact: (
    contactId: string,
    options?: {
      excludeSessionId?: string;
      limit?: number;
    }
  ) => TRecord[];
  buildReferenceLines: (
    options: Omit<BuildAppMemoryReferenceOptions, 'formatLine'> & {
      formatLine?: (record: TRecord) => string;
    }
  ) => string[];
}

export const createAppMemoryApi = <
  TAppId extends string,
  TRecord extends AppMemoryRecord = AppMemoryRecord
>(
  appId: TAppId,
  options?: {
    mapRecord?: (record: AppMemoryRecord) => TRecord;
    defaultSpace?: AppMemorySpace;
    resolveRoleId?: () => string;
  }
): AppMemoryApi<TAppId, TRecord> => {
  const castRecord = (record: AppMemoryRecord): TRecord =>
    options?.mapRecord ? options.mapRecord(record) : (record as TRecord);

  const resolveScope = (): AppMemoryScope =>
    normalizeAppMemoryScope({
      roleId: options?.resolveRoleId?.() || DEFAULT_APP_MEMORY_ROLE_ID,
      space: options?.defaultSpace ?? 'social',
    });

  const filterScopedAppRecords = (records: AppMemoryRecord[]): AppMemoryRecord[] => {
    const scope = resolveScope();
    return records.filter((item) => item.appId === appId && isSameScope(item, scope));
  };

  const getAppRecords = (): TRecord[] =>
    filterScopedAppRecords(useAppMemoryCenterStore.getState().appMemoryRecords).map(castRecord);

  return {
    appId,
    useRecords: () => {
      const allRecords = useAppMemoryCenterStore((state) => state.appMemoryRecords);
      return filterScopedAppRecords(allRecords).map(castRecord);
    },
    getRecords: getAppRecords,
    record: (payload, recordOptions) => {
      const scope = resolveScope();
      useAppMemoryCenterStore.getState().recordAppInteraction(
        {
          ...payload,
          appId,
          roleId: scope.roleId,
          space: scope.space,
        },
        recordOptions
      );
    },
    removeById: (memoryId) => {
      useAppMemoryCenterStore.getState().removeAppMemoryById(appId, memoryId);
    },
    clear: (contactId) => {
      useAppMemoryCenterStore.getState().clearAppMemories(appId, contactId, resolveScope());
    },
    removeBySessionSources: (sessionId, sourceIds) => {
      useAppMemoryCenterStore
        .getState()
        .removeAppMemoriesBySessionSources(appId, sessionId, sourceIds, resolveScope());
    },
    selectByContact: (contactId, selectOptions) =>
      selectAppMemoryRecordsByContact(getAppRecords(), contactId, selectOptions),
    buildReferenceLines: (referenceOptions) =>
      buildAppMemoryReferenceLines(getAppRecords(), {
        ...referenceOptions,
        formatLine: referenceOptions.formatLine as
          | ((record: AppMemoryRecord) => string)
          | undefined,
      }),
  };
};
