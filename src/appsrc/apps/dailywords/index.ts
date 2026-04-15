import type { AppManifest } from '@mimisOS/sdk';
import { DailyWordsApp } from './DailyWordsApp';
import { emitCommerceRoleChanged } from '../../shared/business/commerce/roleContext';
import { registerDailyScriptActionExecutor } from '../../shared/business/dailyscript/actionBridge';
import {
  clearRuntimeActiveRoleId,
  getRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { useDailyWordsStore } from './store';

interface DailyWordsScriptPayload {
  title?: string;
  content?: string;
  mood?: string;
  tags?: string[] | string;
  syncToMemory?: boolean;
}

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeTagsInput = (value: DailyWordsScriptPayload['tags']): string => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('，');
  }
  if (typeof value === 'string') return value;
  return '';
};

const runWithRuntimeRole = async <T>(roleId: string, runner: () => Promise<T> | T): Promise<T> => {
  const previousRoleId = getRuntimeActiveRoleId();
  setRuntimeActiveRoleId(roleId);
  emitCommerceRoleChanged();
  try {
    return await runner();
  } finally {
    if (previousRoleId) {
      setRuntimeActiveRoleId(previousRoleId);
    } else {
      clearRuntimeActiveRoleId();
    }
    emitCommerceRoleChanged();
  }
};

let dailyWordsScriptExecutorRegistered = false;

if (!dailyWordsScriptExecutorRegistered) {
  dailyWordsScriptExecutorRegistered = true;
  registerDailyScriptActionExecutor('dailywords.writeDiary', async ({ roleId, payload }) => {
    const input = (payload && typeof payload === 'object' ? payload : {}) as DailyWordsScriptPayload;
    const title = toStringValue(input.title).trim();
    const content = toStringValue(input.content).trim();
    const mood = toStringValue(input.mood).trim();
    const tagsInput = normalizeTagsInput(input.tags);
    const syncToMemory = input.syncToMemory !== false;

    if (!title && !content) {
      throw new Error('日记内容为空，无法写入');
    }

    return runWithRuntimeRole(roleId, async () => {
      const store = useDailyWordsStore.getState();
      store.syncDailyWordsRoleContext();
      const beforeIds = new Set(useDailyWordsStore.getState().entries.map((item) => item.id));
      store.setDraft({ title, content, mood, tagsInput });
      store.createEntryFromDraft();

      const createdEntry = useDailyWordsStore
        .getState()
        .entries.find((item) => !beforeIds.has(item.id));
      if (!createdEntry) {
        throw new Error('日记写入失败');
      }

      if (syncToMemory && !createdEntry.isSyncedToMemory) {
        useDailyWordsStore.getState().syncEntryMemory(createdEntry.id);
      }

      return {
        ok: true,
        message: `已写入日记：${title || content.slice(0, 14)}`,
      };
    });
  });
}

const dailyWordsManifest: AppManifest = {
  id: 'dailywords',
  name: '日记心语',
  icon: 'BookText',
  color: '#FB7185',
  component: DailyWordsApp,
  market: {
    icon: '📝',
    tags: ['日记', '私人', '记录'],
    sortOrder: 24,
  },
  description: '记录每天的心情和想法，支持按身份隔离与手动同步记忆中心。',
};

export default dailyWordsManifest;
