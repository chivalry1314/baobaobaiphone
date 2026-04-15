import {
  deleteRecord,
  getRecord,
  listRecords,
  setRecord,
} from '../../../../../core/idb';
import { installedAppsStore } from '../db';
import type { InstalledAppEntity } from '../stores';

const isInstalledAppEntity = (value: unknown): value is InstalledAppEntity => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<InstalledAppEntity>;
  return typeof item.appId === 'string' && typeof item.installedAt === 'number';
};

export const listInstalledApps = async (): Promise<InstalledAppEntity[]> => {
  const records = await listRecords<unknown>(installedAppsStore);
  return records
    .filter(isInstalledAppEntity)
    .sort((left, right) => left.installedAt - right.installedAt);
};

export const ensureInstalledApp = async (appId: string): Promise<void> => {
  const normalizedId = appId.trim();
  if (!normalizedId) return;

  const existing = await getRecord<InstalledAppEntity>(installedAppsStore, normalizedId);
  await setRecord(installedAppsStore, normalizedId, {
    appId: normalizedId,
    installedAt: existing?.installedAt ?? Date.now(),
  });
};

export const removeInstalledApp = async (appId: string): Promise<void> => {
  const normalizedId = appId.trim();
  if (!normalizedId) return;
  await deleteRecord(installedAppsStore, normalizedId);
};
