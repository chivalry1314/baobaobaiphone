import type { PaperMagicPrompt } from './types';
import { PAPER_MAGIC_APP_GROUPS } from './modules';
import { PAPER_MAGIC_PROMPTS } from './prompts';

const PAPER_MAGIC_PROMPT_ORDER_STORAGE_KEY = 'baobaobai.paperMagic.promptOrder.v1';

type PromptOrderMap = Record<string, string[]>;

const normalizePromptOrder = (basePromptIds: string[], orderedPromptIds?: string[]): string[] => {
  if (!orderedPromptIds?.length) return basePromptIds;
  const baseIdSet = new Set(basePromptIds);
  const result = orderedPromptIds.filter((id) => baseIdSet.has(id));
  basePromptIds.forEach((id) => {
    if (!result.includes(id)) result.push(id);
  });
  return result;
};

const readPromptOrderMap = (): PromptOrderMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PAPER_MAGIC_PROMPT_ORDER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as PromptOrderMap : {};
  } catch {
    return {};
  }
};

export const getOrderedPaperMagicPromptIds = (appGroupId: string, fallbackPromptIds?: string[]): string[] => {
  const appGroup = PAPER_MAGIC_APP_GROUPS.find((item) => item.id === appGroupId);
  const basePromptIds = fallbackPromptIds || appGroup?.promptIds || [];
  const orderMap = readPromptOrderMap();
  return normalizePromptOrder(basePromptIds, orderMap[appGroupId]);
};

export const savePaperMagicPromptOrder = (appGroupId: string, promptIds: string[]): void => {
  if (typeof window === 'undefined') return;
  const appGroup = PAPER_MAGIC_APP_GROUPS.find((item) => item.id === appGroupId);
  const basePromptIds = appGroup?.promptIds || promptIds;
  const normalized = normalizePromptOrder(basePromptIds, promptIds);
  const orderMap = readPromptOrderMap();
  orderMap[appGroupId] = normalized;
  window.localStorage.setItem(PAPER_MAGIC_PROMPT_ORDER_STORAGE_KEY, JSON.stringify(orderMap));
  window.dispatchEvent(new CustomEvent('paper-magic-prompt-order-changed', {
    detail: { appGroupId, promptIds: normalized },
  }));
};

export const getPaperMagicPrompt = (id: string): PaperMagicPrompt => {
  const found = PAPER_MAGIC_PROMPTS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown Paper Magic prompt: ${id}`);
  return found;
};

export const renderPaperMagicTemplate = (
  template: string,
  values: Record<string, string | number | boolean | null | undefined>
): string =>
  template.replace(/\$\{([A-Za-z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === null || typeof value === 'undefined' ? '' : String(value);
  });

export const renderPaperMagicPrompt = (
  id: string,
  values: Record<string, string | number | boolean | null | undefined> = {}
): PaperMagicPrompt => {
  const source = getPaperMagicPrompt(id);
  return {
    ...source,
    system: source.system ? renderPaperMagicTemplate(source.system, values) : undefined,
    user: source.user ? renderPaperMagicTemplate(source.user, values) : undefined,
    content: source.content ? renderPaperMagicTemplate(source.content, values) : undefined,
  };
};

export const renderPaperMagicText = (
  id: string,
  values: Record<string, string | number | boolean | null | undefined> = {},
  part: 'system' | 'user' | 'content' = 'content'
): string => {
  const rendered = renderPaperMagicPrompt(id, values);
  return rendered[part] || '';
};
