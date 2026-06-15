import type { WorldInfoEntry } from './types';
import { useWorldBookCoreStore } from './data/coreStore';

export interface WorldBookPackage {
  version?: number;
  worldBook: WorldInfoEntry[];
  name?: string;
  author?: string;
  tags?: string[];
}

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

const normalizeEntry = (raw: unknown): WorldInfoEntry | null => {
  if (raw === null || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const content = typeof item.content === 'string' ? item.content : '';
  if (!name && !content) return null;

  const keywords: string[] = Array.isArray(item.keywords)
    ? item.keywords
        .map((kw) => (typeof kw === 'string' ? kw.trim() : ''))
        .filter(Boolean)
    : [];

  let scope: WorldInfoEntry['scope'] =
    typeof item.scope === 'string' && ['global', 'character'].includes(item.scope)
      ? (item.scope as WorldInfoEntry['scope'])
      : 'global';

  let triggerMode: WorldInfoEntry['triggerMode'] =
    typeof item.triggerMode === 'string' &&
    ['keyword', 'constant', 'disabled'].includes(item.triggerMode)
      ? (item.triggerMode as WorldInfoEntry['triggerMode'])
      : 'keyword';

  // Character scoped entries must always trigger in the current app logic.
  if (scope === 'character') {
    triggerMode = 'constant';
  }

  const insertionOrder =
    typeof item.insertionOrder === 'number' && Number.isFinite(item.insertionOrder)
      ? item.insertionOrder
      : 1;

  return {
    id: generateId(),
    name,
    keywords,
    content,
    triggerMode,
    insertionOrder,
    scope,
  };
};

export const parseWorldBookPackage = async (file: File): Promise<WorldBookPackage> => {
  const text = await file.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('世界书文件不是有效的 JSON');
  }

  if (payload === null || typeof payload !== 'object') {
    throw new Error('世界书文件格式错误');
  }

  const packagePayload = payload as Record<string, unknown>;
  if (!Array.isArray(packagePayload.worldBook)) {
    throw new Error('世界书文件缺少 worldBook 数组');
  }

  return {
    version: typeof packagePayload.version === 'number' ? packagePayload.version : 1,
    worldBook: packagePayload.worldBook
      .map(normalizeEntry)
      .filter((entry): entry is WorldInfoEntry => entry !== null),
    name: typeof packagePayload.name === 'string' ? packagePayload.name : undefined,
    author: typeof packagePayload.author === 'string' ? packagePayload.author : undefined,
    tags: Array.isArray(packagePayload.tags)
      ? packagePayload.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
  };
};

export interface InstallWorldBookResult {
  installedCount: number;
}

export const installRemoteWorldBookPackage = async (
  file: File,
  sourceCardId?: string
): Promise<InstallWorldBookResult> => {
  const packagePayload = await parseWorldBookPackage(file);

  if (packagePayload.worldBook.length === 0) {
    throw new Error('世界书文件中没有有效条目');
  }

  const { worldBook: existingWorldBook, addWorldEntry } = useWorldBookCoreStore.getState();
  const existingIds = new Set(existingWorldBook.map((entry) => entry.id));
  const maxInsertionOrder = existingWorldBook.reduce(
    (max, entry) => Math.max(max, Number(entry.insertionOrder) || 0),
    0
  );

  let installedCount = 0;

  packagePayload.worldBook.forEach((entry, index) => {
    if (existingIds.has(entry.id)) {
      entry.id = generateId();
    }
    entry.insertionOrder = maxInsertionOrder + index + 1;

    const entryWithSource: WorldInfoEntry & { sourceCardId?: string } = { ...entry };
    if (sourceCardId) {
      entryWithSource.sourceCardId = sourceCardId;
    }
    addWorldEntry(entryWithSource as WorldInfoEntry);
    installedCount += 1;
  });

  return { installedCount };
};

export const isRemoteWorldBookInstalled = (sourceCardId: string): boolean => {
  const { worldBook } = useWorldBookCoreStore.getState();
  return worldBook.some(
    (entry) => (entry as WorldInfoEntry & { sourceCardId?: string }).sourceCardId === sourceCardId
  );
};
