import { DEFAULT_ACTIVE_ROLE_ID, getActiveRoleId } from '../../contacts/activeRole';
import type { LoveImportantTimelineEvent } from '../importantTimeline';
import type { LoveSpaceRoleScopedState, LoveSpaceState, LoveSpaceStore } from '../types';

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_ACTIVE_ROLE_ID;
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
};

const getTodayDateInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeDateInput = (value: string): string => {
  if (!DATE_INPUT_PATTERN.test(value)) return getTodayDateInput();
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return getTodayDateInput();
  return value;
};

export const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDefaultLoveSpaceState = (): LoveSpaceState => ({
  bonds: [],
  anniversaries: [],
  moments: [],
  checkInTasks: [],
  checkInRecords: [],
  bondBackgrounds: {},
  importantTimelineByBond: {},
  timelineProcessedRecordIdsByBond: {},
});

export const normalizeLoveSpaceState = (
  input: Partial<LoveSpaceState> | undefined
): LoveSpaceState => {
  const fallback = createDefaultLoveSpaceState();
  if (!input) return fallback;

  return {
    bonds: Array.isArray(input.bonds) ? input.bonds : fallback.bonds,
    anniversaries: Array.isArray(input.anniversaries) ? input.anniversaries : fallback.anniversaries,
    moments: Array.isArray(input.moments) ? input.moments : fallback.moments,
    checkInTasks: Array.isArray(input.checkInTasks) ? input.checkInTasks : fallback.checkInTasks,
    checkInRecords: Array.isArray(input.checkInRecords) ? input.checkInRecords : fallback.checkInRecords,
    bondBackgrounds:
      input.bondBackgrounds && typeof input.bondBackgrounds === 'object'
        ? (input.bondBackgrounds as Record<string, string>)
        : fallback.bondBackgrounds,
    importantTimelineByBond:
      input.importantTimelineByBond && typeof input.importantTimelineByBond === 'object'
        ? (input.importantTimelineByBond as Record<string, LoveImportantTimelineEvent[]>)
        : fallback.importantTimelineByBond,
    timelineProcessedRecordIdsByBond:
      input.timelineProcessedRecordIdsByBond &&
      typeof input.timelineProcessedRecordIdsByBond === 'object'
        ? (input.timelineProcessedRecordIdsByBond as Record<string, string[]>)
        : fallback.timelineProcessedRecordIdsByBond,
  };
};

export const ensureRoleContextState = (
  state: LoveSpaceStore,
  preferredRoleId?: string
): { state: LoveSpaceStore; roleId: string; roleState: LoveSpaceState } => {
  const roleId = normalizeRoleId(preferredRoleId ?? getActiveRoleId());
  const existingRoleState = state.loveSpaceStateByRoleId[roleId];

  if (existingRoleState && state.activeRoleId === roleId) {
    return {
      state,
      roleId,
      roleState: existingRoleState,
    };
  }

  const roleState = existingRoleState ?? createDefaultLoveSpaceState();
  const nextRoleMap = existingRoleState
    ? state.loveSpaceStateByRoleId
    : {
        ...state.loveSpaceStateByRoleId,
        [roleId]: roleState,
      };

  return {
    state: {
      ...state,
      activeRoleId: roleId,
      loveSpaceStateByRoleId: nextRoleMap,
      ...roleState,
    },
    roleId,
    roleState,
  };
};

export const applyRoleState = (
  state: LoveSpaceStore,
  roleId: string,
  roleState: LoveSpaceState
): LoveSpaceStore => {
  const nextRoleMap = {
    ...state.loveSpaceStateByRoleId,
    [roleId]: roleState,
  };

  if (state.activeRoleId === roleId) {
    return {
      ...state,
      loveSpaceStateByRoleId: nextRoleMap,
      ...roleState,
    };
  }

  return {
    ...state,
    loveSpaceStateByRoleId: nextRoleMap,
  };
};

export const normalizePersistedRoleMap = (
  input: unknown
): Record<string, LoveSpaceRoleScopedState> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const next: Record<string, LoveSpaceState> = {};
  Object.entries(input as Record<string, unknown>).forEach(([rawRoleId, value]) => {
    const roleId = normalizeRoleId(rawRoleId);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    next[roleId] = normalizeLoveSpaceState(value as Partial<LoveSpaceState>);
  });
  return next;
};
