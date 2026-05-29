import type { PaperMagicPrompt } from './types';
import { PAPER_MAGIC_PROMPTS } from './prompts';

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