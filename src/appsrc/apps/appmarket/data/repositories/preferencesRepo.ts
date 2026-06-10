import {
  getRecord,
  setRecord,
} from '../../../../../core/idb';
import { appMarketPreferencesStore } from '../db';
import type { AppMarketPreferenceEntity } from '../stores';

const DEFAULT_KEY = 'default';

const isPreferenceEntity = (value: unknown): value is AppMarketPreferenceEntity => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<AppMarketPreferenceEntity>;
  return (
    item.id === DEFAULT_KEY &&
    typeof item.shareThemeSourceBaseUrl === 'string' &&
    typeof item.updatedAt === 'number'
  );
};

export const getShareThemeSourcePreference = async (): Promise<string> => {
  const record = await getRecord<unknown>(appMarketPreferencesStore, DEFAULT_KEY);
  if (!isPreferenceEntity(record)) return '';
  return record.shareThemeSourceBaseUrl.trim();
};

export const setShareThemeSourcePreference = async (shareThemeSourceBaseUrl: string): Promise<void> => {
  await setRecord(appMarketPreferencesStore, DEFAULT_KEY, {
    id: DEFAULT_KEY,
    shareThemeSourceBaseUrl: shareThemeSourceBaseUrl.trim(),
    updatedAt: Date.now(),
  } satisfies AppMarketPreferenceEntity);
};
