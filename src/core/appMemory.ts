export type AppMemoryRole = 'user' | 'assistant';
export type AppMemorySpace = 'personal' | 'social';

export const DEFAULT_APP_MEMORY_ROLE_ID = 'default-self';
export const DEFAULT_APP_MEMORY_SPACE: AppMemorySpace = 'social';

export const normalizeAppMemoryRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_APP_MEMORY_ROLE_ID;
};

export const normalizeAppMemorySpace = (
  value: AppMemorySpace | string | undefined
): AppMemorySpace => {
  if (value === 'personal' || value === 'social') return value;
  return DEFAULT_APP_MEMORY_SPACE;
};

/**
 * Core utilities used by app memory center.
 * Preferred integration:
 * 1) Create a scoped API by `createAppMemoryApi('your-app')`.
 * 2) Call `record/removeById/clear/removeBySessionSources` directly from app logic.
 * 3) Build prompt lines via `buildReferenceLines`.
 */
export interface AppMemoryRecord {
  id: string;
  appId: string;
  roleId: string;
  space: AppMemorySpace;
  contactId: string;
  sessionId?: string;
  sourceId?: string;
  sourceType?: string;
  role: AppMemoryRole;
  content: string;
  timestamp: number;
}

export interface CreateAppMemoryRecordPayload {
  appId: string;
  roleId?: string;
  space?: AppMemorySpace;
  contactId: string;
  sessionId?: string;
  sourceId?: string;
  sourceType?: string;
  role: AppMemoryRole;
  content: string;
  timestamp?: number;
}

export interface RecordAppInteractionPayload {
  appId: string;
  roleId?: string;
  space?: AppMemorySpace;
  contactId: string;
  sessionId?: string;
  sourceId?: string;
  sourceType?: string;
  role: AppMemoryRole;
  content: string;
  timestamp?: number;
}

export interface BuildAppMemoryReferenceOptions {
  contactId: string;
  excludeSessionId?: string;
  limit?: number;
  formatLine?: (record: AppMemoryRecord) => string;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const createAppMemoryRecord = (
  payload: CreateAppMemoryRecordPayload
): AppMemoryRecord => ({
  id: `memory-${generateId()}`,
  appId: payload.appId,
  roleId: normalizeAppMemoryRoleId(payload.roleId),
  space: normalizeAppMemorySpace(payload.space),
  contactId: payload.contactId,
  sessionId: payload.sessionId,
  sourceId: payload.sourceId,
  sourceType: payload.sourceType,
  role: payload.role,
  content: payload.content.trim(),
  timestamp: payload.timestamp ?? Date.now(),
});

export const appendAppMemoryRecord = <T extends AppMemoryRecord>(
  records: T[],
  record: T,
  limit = 500
): T[] => {
  const nextRecords = [record, ...records];
  if (nextRecords.length <= limit) return nextRecords;
  return nextRecords.slice(0, limit);
};

export const recordAppInteraction = <T extends AppMemoryRecord = AppMemoryRecord>(
  records: T[],
  payload: RecordAppInteractionPayload,
  options?: {
    limit?: number;
    shouldRecord?: (content: string) => boolean;
    mapRecord?: (record: AppMemoryRecord) => T;
  }
): T[] => {
  const normalizedContent = payload.content.trim();
  if (!normalizedContent) return records;

  if (options?.shouldRecord && !options.shouldRecord(normalizedContent)) {
    return records;
  }

  const baseRecord = createAppMemoryRecord({
    ...payload,
    content: normalizedContent,
  });

  const record = options?.mapRecord ? options.mapRecord(baseRecord) : (baseRecord as T);
  return appendAppMemoryRecord(records, record, options?.limit);
};

export const removeAppMemoryRecordById = <T extends AppMemoryRecord>(
  records: T[],
  memoryId: string
): T[] => records.filter((item) => item.id !== memoryId);

export const clearAppMemoryRecords = <T extends AppMemoryRecord>(
  records: T[],
  contactId?: string
): T[] => {
  if (!contactId) return [];
  return records.filter((item) => item.contactId !== contactId);
};

export const removeAppMemoryRecordsBySessionSources = <T extends AppMemoryRecord>(
  records: T[],
  sessionId: string,
  sourceIds: string[]
): T[] => {
  const sourceIdSet = new Set(sourceIds.filter(Boolean));
  if (sourceIdSet.size === 0) return records;

  return records.filter(
    (item) => !(item.sessionId === sessionId && item.sourceId && sourceIdSet.has(item.sourceId))
  );
};

export const selectAppMemoryRecordsByContact = <T extends AppMemoryRecord>(
  records: T[],
  contactId: string,
  options?: {
    excludeSessionId?: string;
    limit?: number;
  }
): T[] => {
  const filtered = records
    .filter(
      (item) =>
        item.contactId === contactId &&
        (options?.excludeSessionId ? item.sessionId !== options.excludeSessionId : true)
    )
    .sort((left, right) => right.timestamp - left.timestamp);

  const limit = options?.limit;
  if (!limit || limit <= 0 || filtered.length <= limit) return filtered;
  return filtered.slice(0, limit);
};

export const buildAppMemoryReferenceLines = <T extends AppMemoryRecord>(
  records: T[],
  options: BuildAppMemoryReferenceOptions
): string[] => {
  const selected = selectAppMemoryRecordsByContact(records, options.contactId, {
    excludeSessionId: options.excludeSessionId,
    limit: options.limit,
  })
    .slice()
    .reverse();

  const formatLine =
    options.formatLine ??
    ((record: AppMemoryRecord) => `- ${record.role === 'user' ? '我' : '对方'}：${record.content}`);

  return selected.map((item) => formatLine(item));
};

export interface AppMemoryController<
  TAppId extends string,
  TRecord extends AppMemoryRecord = AppMemoryRecord
> {
  appId: TAppId;
  record: (
    records: TRecord[],
    payload: Omit<RecordAppInteractionPayload, 'appId'>,
    options?: {
      limit?: number;
      shouldRecord?: (content: string) => boolean;
    }
  ) => TRecord[];
  removeById: (records: TRecord[], memoryId: string) => TRecord[];
  clear: (records: TRecord[], contactId?: string) => TRecord[];
  removeBySessionSources: (records: TRecord[], sessionId: string, sourceIds: string[]) => TRecord[];
  selectByContact: (
    records: TRecord[],
    contactId: string,
    options?: {
      excludeSessionId?: string;
      limit?: number;
    }
  ) => TRecord[];
  buildReferenceLines: (
    records: TRecord[],
    options: Omit<BuildAppMemoryReferenceOptions, 'formatLine'> & {
      formatLine?: (record: TRecord) => string;
    }
  ) => string[];
}

export const createAppMemoryController = <
  TAppId extends string,
  TRecord extends AppMemoryRecord = AppMemoryRecord
>(
  appId: TAppId,
  options?: {
    defaultLimit?: number;
    mapRecord?: (record: AppMemoryRecord) => TRecord;
  }
): AppMemoryController<TAppId, TRecord> => ({
  appId,
  record: (records, payload, recordOptions) =>
    recordAppInteraction<TRecord>(
      records,
      {
        ...payload,
        appId,
      },
      {
        limit: recordOptions?.limit ?? options?.defaultLimit,
        shouldRecord: recordOptions?.shouldRecord,
        mapRecord: options?.mapRecord,
      }
    ),
  removeById: (records, memoryId) => removeAppMemoryRecordById(records, memoryId),
  clear: (records, contactId) => clearAppMemoryRecords(records, contactId),
  removeBySessionSources: (records, sessionId, sourceIds) =>
    removeAppMemoryRecordsBySessionSources(records, sessionId, sourceIds),
  selectByContact: (records, contactId, selectOptions) =>
    selectAppMemoryRecordsByContact(records, contactId, selectOptions),
  buildReferenceLines: (records, referenceOptions) =>
    buildAppMemoryReferenceLines(records, {
      ...referenceOptions,
      formatLine: referenceOptions.formatLine as
        | ((record: AppMemoryRecord) => string)
        | undefined,
    }),
});
