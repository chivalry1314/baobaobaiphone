import { listRecordEntries, setRecord } from '../../../../../core/idb';
import type { WarmTrackPersistedState } from '../../storePersist';
import { warmTrackRoleStateStore } from '../db';

export interface WarmTrackRoleStateRecord {
  roleId: string;
  state: unknown;
}

const normalizeRoleIdKey = (value: IDBValidKey): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const listWarmTrackRoleStates = async (): Promise<WarmTrackRoleStateRecord[]> => {
  const entries = await listRecordEntries<unknown>(warmTrackRoleStateStore);
  return entries
    .map(([roleId, state]) => ({
      roleId: normalizeRoleIdKey(roleId),
      state,
    }))
    .filter((item) => Boolean(item.roleId));
};

export const upsertWarmTrackRoleState = async (
  roleId: string,
  state: WarmTrackPersistedState
): Promise<void> => {
  const normalizedRoleId = roleId.trim();
  if (!normalizedRoleId) return;
  await setRecord(warmTrackRoleStateStore, normalizedRoleId, state);
};
