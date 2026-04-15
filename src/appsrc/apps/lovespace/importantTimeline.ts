import type { AppMemoryRecord, AppMemoryRole } from '../../../core/appMemory';
import { queryMemoryCenterRecords } from '../../../core/appMemoryCenter';
import { getGlobalSettingsSnapshot } from '@mimisOS/sdk';
import { parseDateInput } from './utils';
const MODEL_BATCH_SIZE = 24;
const MIN_IMPORTANCE_SCORE = 60;
const MAX_TIMELINE_ITEMS = 80;
const MAX_PROCESSED_RECORD_IDS = 3000;

interface MemoryModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ModelEventItem {
  recordId: string;
  title: string;
  summary: string;
  importanceScore: number;
  happenedAt?: unknown;
}

export interface LoveImportantTimelineEvent {
  id: string;
  sourceRecordId: string;
  appId: string;
  contactId: string;
  role: AppMemoryRole;
  sourceType?: string;
  timestamp: number;
  title: string;
  content: string;
  importanceScore: number;
  extractedAt: number;
}

interface SyncBondImportantTimelineInput {
  roleId: string;
  contactId: string;
  sinceDate: string;
  existingEvents: LoveImportantTimelineEvent[];
  processedRecordIds: string[];
}

interface SyncBondImportantTimelineResult {
  events: LoveImportantTimelineEvent[];
  processedRecordIds: string[];
}

const splitIntoChunks = <TItem>(items: TItem[], size: number): TItem[][] => {
  if (items.length === 0) return [];
  const chunkSize = Math.max(1, size);
  const chunks: TItem[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
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

const parseModelJsonPayload = (rawText: string): unknown => {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const parseDirect = (): unknown => {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const direct = parseDirect();
  if (direct) return direct;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeObject = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeObject);
    } catch {
      // continue
    }
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const maybeArray = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(maybeArray);
    } catch {
      // continue
    }
  }

  return null;
};

const resolveMemoryModelConfig = (): MemoryModelConfig => {
  const settings = getGlobalSettingsSnapshot();
  const apiKey = (settings.memoryApiKey || '').trim();
  const baseUrl = (settings.memoryBaseUrl || '').trim().replace(/\/+$/, '');
  const model = (settings.memoryModel || '').trim();

  if (!apiKey || !baseUrl || !model) {
    throw new Error('记忆模型 API 尚未完整配置，请先在设置中填写 Base URL、API Key 和模型名称。');
  }

  return { apiKey, baseUrl, model };
};

const normalizeTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0 && value < 1e11) {
      return Math.round(value * 1000);
    }
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      if (asNumber > 0 && asNumber < 1e11) {
        return Math.round(asNumber * 1000);
      }
      return Math.round(asNumber);
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
};

const normalizeModelEventItems = (payload: unknown): ModelEventItem[] => {
  const eventList = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { events?: unknown } | null)?.events)
    ? ((payload as { events: unknown[] }).events ?? [])
    : [];

  if (!Array.isArray(eventList)) return [];

  return eventList
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const recordId = String((item as { recordId?: unknown }).recordId ?? '').trim();
      const title = String((item as { title?: unknown }).title ?? '').trim();
      const summary = String((item as { summary?: unknown }).summary ?? '').trim();
      const scoreRaw = (item as { importanceScore?: unknown }).importanceScore;
      const importanceScore =
        typeof scoreRaw === 'number'
          ? Math.round(scoreRaw)
          : typeof scoreRaw === 'string'
          ? Math.round(Number(scoreRaw))
          : 0;

      if (!recordId) return null;
      if (!Number.isFinite(importanceScore)) return null;
      if (importanceScore < MIN_IMPORTANCE_SCORE) return null;
      if (!title && !summary) return null;

      return {
        recordId,
        title,
        summary,
        importanceScore,
        happenedAt: (item as { happenedAt?: unknown }).happenedAt,
      } as ModelEventItem;
    })
    .filter((item): item is ModelEventItem => Boolean(item));
};

const requestImportantEventsFromModel = async (
  contactId: string,
  records: AppMemoryRecord[]
): Promise<ModelEventItem[]> => {
  if (records.length === 0) return [];

  const { apiKey, baseUrl, model } = resolveMemoryModelConfig();

  const inputRecords = records.map((item) => ({
    recordId: item.id,
    appId: item.appId,
    contactId: item.contactId,
    role: item.role,
    sourceType: item.sourceType || '',
    timestamp: item.timestamp,
    content: item.content,
  }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content:
            '你是关系重要事件提取器。只输出 JSON。格式：{"events":[{"recordId":"","title":"","summary":"","importanceScore":0,"happenedAt":0}]}。recordId 必须来自输入记录。仅保留对时间线足够重要的事件。',
        },
        {
          role: 'user',
          content: `请从以下记录中提取重要事件。\n联系人 ID：${contactId}\n记录 JSON：\n${JSON.stringify(
            inputRecords,
            null,
            2
          )}`,
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

  if (!response.ok) {
    const message =
      (data as { error?: { message?: string }; message?: string } | null)?.error?.message ||
      (data as { message?: string } | null)?.message ||
      `HTTP 状态码 ${response.status}`;
    throw new Error(`记忆模型请求失败：${message}`);
  }

  const content = extractContentFromChatCompletion(
    (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message
      ?.content
  );

  const jsonPayload = parseModelJsonPayload(content);
  if (!jsonPayload) {
    throw new Error('记忆模型返回了无效 JSON。');
  }

  return normalizeModelEventItems(jsonPayload);
};

const buildTimelineEventFromModel = (
  modelEvent: ModelEventItem,
  sourceRecord: AppMemoryRecord
): LoveImportantTimelineEvent => {
  const safeTitle = modelEvent.title.trim() || '重要事件';
  const safeSummary = modelEvent.summary.trim() || sourceRecord.content;
  return {
    id: `important-${sourceRecord.id}`,
    sourceRecordId: sourceRecord.id,
    appId: sourceRecord.appId,
    contactId: sourceRecord.contactId,
    role: sourceRecord.role,
    sourceType: sourceRecord.sourceType,
    timestamp: normalizeTimestamp(modelEvent.happenedAt, sourceRecord.timestamp),
    title: safeTitle,
    content: safeSummary,
    importanceScore: modelEvent.importanceScore,
    extractedAt: Date.now(),
  };
};

export const syncBondImportantTimelineWithModel = async (
  input: SyncBondImportantTimelineInput
): Promise<SyncBondImportantTimelineResult> => {
  const sinceTimestamp = parseDateInput(input.sinceDate).getTime();
  const allRecords = queryMemoryCenterRecords({
    roleIds: input.roleId,
    spaces: 'social',
    contactIds: input.contactId,
    fromTimestamp: sinceTimestamp,
    order: 'asc',
  });

  const existingRecordIdSet = new Set(allRecords.map((item) => item.id));
  const existingRecordMap = new Map(allRecords.map((item) => [item.id, item]));

  const normalizedExistingEvents = input.existingEvents
    .filter((item) => item && typeof item === 'object')
    .filter((item) => existingRecordIdSet.has(item.sourceRecordId));

  const processedRecordIdSet = new Set(
    (input.processedRecordIds || []).filter((recordId) => existingRecordIdSet.has(recordId))
  );
  const newRecords = allRecords.filter((item) => !processedRecordIdSet.has(item.id));

  const extractedEvents: LoveImportantTimelineEvent[] = [];
  for (const recordBatch of splitIntoChunks(newRecords, MODEL_BATCH_SIZE)) {
    const modelEvents = await requestImportantEventsFromModel(input.contactId, recordBatch);
    const batchRecordMap = new Map(recordBatch.map((item) => [item.id, item]));

    modelEvents.forEach((item) => {
      const sourceRecord = batchRecordMap.get(item.recordId);
      if (!sourceRecord) return;
      extractedEvents.push(buildTimelineEventFromModel(item, sourceRecord));
    });
  }

  newRecords.forEach((item) => processedRecordIdSet.add(item.id));

  const mergedBySourceRecordId = new Map<string, LoveImportantTimelineEvent>();
  normalizedExistingEvents.forEach((item) => {
    mergedBySourceRecordId.set(item.sourceRecordId, {
      ...item,
      timestamp: normalizeTimestamp(item.timestamp, item.timestamp),
    });
  });
  extractedEvents.forEach((item) => {
    mergedBySourceRecordId.set(item.sourceRecordId, item);
  });

  const mergedEvents = [...mergedBySourceRecordId.values()]
    .filter((item) => existingRecordIdSet.has(item.sourceRecordId))
    .sort((left, right) => left.timestamp - right.timestamp);
  const nextEvents =
    mergedEvents.length <= MAX_TIMELINE_ITEMS
      ? mergedEvents
      : mergedEvents.slice(mergedEvents.length - MAX_TIMELINE_ITEMS);

  const nextProcessedRecordIds = allRecords
    .map((item) => item.id)
    .filter((recordId) => processedRecordIdSet.has(recordId))
    .slice(-MAX_PROCESSED_RECORD_IDS);

  // 对于已不在内存中心的数据，额外做一次校验
  const calibratedEvents = nextEvents.filter((item) => existingRecordMap.has(item.sourceRecordId));

  return {
    events: calibratedEvents,
    processedRecordIds: nextProcessedRecordIds,
  };
};

export const areImportantTimelineEventsEqual = (
  left: LoveImportantTimelineEvent[],
  right: LoveImportantTimelineEvent[]
): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftEvent = left[index];
    const rightEvent = right[index];
    if (!leftEvent || !rightEvent) return false;
    if (
      leftEvent.id !== rightEvent.id ||
      leftEvent.sourceRecordId !== rightEvent.sourceRecordId ||
      leftEvent.appId !== rightEvent.appId ||
      leftEvent.contactId !== rightEvent.contactId ||
      leftEvent.role !== rightEvent.role ||
      leftEvent.sourceType !== rightEvent.sourceType ||
      leftEvent.timestamp !== rightEvent.timestamp ||
      leftEvent.title !== rightEvent.title ||
      leftEvent.content !== rightEvent.content ||
      leftEvent.importanceScore !== rightEvent.importanceScore
    ) {
      return false;
    }
  }

  return true;
};

export const areStringArraysEqual = (left: string[], right: string[]): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

