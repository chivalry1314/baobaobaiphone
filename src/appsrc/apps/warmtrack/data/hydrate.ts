import { DEFAULT_ACTIVE_ROLE_ID, getActiveRoleId } from '../../contacts/activeRole';
import { createDefaultWarmTrackState, sanitizePersistedWarmTrackState } from '../storePersist';
import type { WarmTrackState } from '../types';
import { listWarmTrackRoleStates } from './repositories/roleStateRepo';

const normalizeRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_ACTIVE_ROLE_ID;
};

export interface WarmTrackHydratedState {
  activeRoleId: string;
  warmTrackStateByRoleId: Record<string, WarmTrackState>;
}

export const loadWarmTrackPersistedState = async (): Promise<WarmTrackHydratedState> => {
  const roleRecords = await listWarmTrackRoleStates();
  const roleStateById: Record<string, WarmTrackState> = {};

  roleRecords.forEach((record) => {
    const roleId = normalizeRoleId(record.roleId);
    roleStateById[roleId] = sanitizePersistedWarmTrackState(record.state);
  });

  const activeRoleId = normalizeRoleId(getActiveRoleId());
  if (!roleStateById[activeRoleId]) {
    roleStateById[activeRoleId] = createDefaultWarmTrackState();
  }

  return {
    activeRoleId,
    warmTrackStateByRoleId: roleStateById,
  };
};
