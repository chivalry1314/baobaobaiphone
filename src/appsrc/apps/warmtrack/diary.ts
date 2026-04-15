export const DIARY_MAX_LENGTH = 300;

export const normalizeDiaryText = (input: string): string => {
  const normalized = input.replace(/\r/g, '').trim();
  if (!normalized) return '';
  return normalized.slice(0, DIARY_MAX_LENGTH);
};

export const buildDiarySummary = (text: string, maxLength = 12): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
};
