import type { AppMemoryRecord, AppMemorySpace } from './appMemory';
import {
  createCoreStoreConfig,
  deleteIdbRawValue,
  readIdbRawValue,
  writeIdbRawValue,
} from './storage';

const MEMORY_CENTER_STORAGE_VERSION = 1;
const MEMORY_CENTER_META_KEY = 'memorycenter-meta-v1';
const MEMORY_CENTER_SHARD_KEY_PREFIX = 'memorycenter-shard-v1:';
const MEMORY_CENTER_RECORDS_STORE_CONFIG = createCoreStoreConfig('memory_center_records_v1');

interface AppMemoryCenterShardMeta {
  version: number;
  shardIds: string[];
  updatedAt: number;
}

const encodeShardPart = (value: string): string => encodeURIComponent(value.trim());

const normalizeShardIds = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const next = input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(next)];
};

const readShardMeta = async (): Promise<AppMemoryCenterShardMeta> => {
  const rawMeta = await readIdbRawValue<AppMemoryCenterShardMeta>(
    MEMORY_CENTER_RECORDS_STORE_CONFIG,
    MEMORY_CENTER_META_KEY
  );

  return {
    version: rawMeta?.version ?? MEMORY_CENTER_STORAGE_VERSION,
    shardIds: normalizeShardIds(rawMeta?.shardIds),
    updatedAt: typeof rawMeta?.updatedAt === 'number' ? rawMeta.updatedAt : 0,
  };
};

const writeShardMeta = async (shardIds: string[]): Promise<void> => {
  await writeIdbRawValue<AppMemoryCenterShardMeta>(
    MEMORY_CENTER_RECORDS_STORE_CONFIG,
    MEMORY_CENTER_META_KEY,
    {
      version: MEMORY_CENTER_STORAGE_VERSION,
      shardIds: [...new Set(shardIds)].sort(),
      updatedAt: Date.now(),
    }
  );
};

const buildShardStorageKey = (shardId: string): string => `${MEMORY_CENTER_SHARD_KEY_PREFIX}${shardId}`;

export const buildAppMemoryShardId = (params: {
  appId: string;
  roleId: string;
  space: AppMemorySpace;
}): string => `${encodeShardPart(params.appId)}|${encodeShardPart(params.roleId)}|${params.space}`;

export const groupAppMemoryRecordsByShard = (
  records: AppMemoryRecord[]
): Record<string, AppMemoryRecord[]> => {
  const next: Record<string, AppMemoryRecord[]> = {};

  records.forEach((record) => {
    const shardId = buildAppMemoryShardId({
      appId: record.appId,
      roleId: record.roleId,
      space: record.space,
    });
    if (!next[shardId]) {
      next[shardId] = [];
    }
    next[shardId].push(record);
  });

  return next;
};

export const loadAppMemoryCenterShardRecords = async (): Promise<AppMemoryRecord[]> => {
  const meta = await readShardMeta();
  if (meta.shardIds.length === 0) return [];

  const shardRecordLists = await Promise.all(
    meta.shardIds.map((shardId) =>
      readIdbRawValue<unknown[]>(MEMORY_CENTER_RECORDS_STORE_CONFIG, buildShardStorageKey(shardId))
    )
  );

  const merged: AppMemoryRecord[] = [];
  shardRecordLists.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      merged.push(item as AppMemoryRecord);
    });
  });

  return merged;
};

export const persistAppMemoryCenterShardDiff = async (params: {
  nextShardMap: Record<string, AppMemoryRecord[]>;
  changedShardIds: string[];
}): Promise<void> => {
  if (params.changedShardIds.length > 0) {
    await Promise.all(
      params.changedShardIds.map(async (shardId) => {
        const records = params.nextShardMap[shardId] ?? [];
        if (records.length === 0) {
          await deleteIdbRawValue(
            MEMORY_CENTER_RECORDS_STORE_CONFIG,
            buildShardStorageKey(shardId)
          );
          return;
        }
        await writeIdbRawValue<AppMemoryRecord[]>(
          MEMORY_CENTER_RECORDS_STORE_CONFIG,
          buildShardStorageKey(shardId),
          records
        );
      })
    );
  }

  const nextShardIds = Object.entries(params.nextShardMap)
    .filter(([, records]) => records.length > 0)
    .map(([shardId]) => shardId);
  await writeShardMeta(nextShardIds);
};
