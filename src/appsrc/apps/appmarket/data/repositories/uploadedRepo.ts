import {
  deleteRecord,
  listRecords,
  setRecord,
} from '../../../../../core/idb';
import type { UploadedMarketApp } from '../../types';
import { uploadedAppsStore } from '../db';

const isUploadedApp = (value: unknown): value is UploadedMarketApp => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<UploadedMarketApp>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.icon === 'string' &&
    typeof item.version === 'string' &&
    typeof item.description === 'string' &&
    typeof item.html === 'string' &&
    typeof item.createdAt === 'number'
  );
};

export const listUploadedApps = async (): Promise<UploadedMarketApp[]> => {
  const records = await listRecords<unknown>(uploadedAppsStore);
  return records
    .filter(isUploadedApp)
    .sort((left, right) => right.createdAt - left.createdAt);
};

export const upsertUploadedApp = async (app: UploadedMarketApp): Promise<void> => {
  await setRecord(uploadedAppsStore, app.id, app);
};

export const removeUploadedApp = async (appId: string): Promise<void> => {
  const normalizedId = appId.trim();
  if (!normalizedId) return;
  await deleteRecord(uploadedAppsStore, normalizedId);
};
