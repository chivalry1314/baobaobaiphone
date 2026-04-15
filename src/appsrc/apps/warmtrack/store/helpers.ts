import { DEFAULT_ACTIVE_ROLE_ID, getActiveRoleId } from '../../contacts/activeRole';
import { upsertWarmTrackRoleState } from '../data/repositories/roleStateRepo';
import { warmTrackMemoryController, type WarmTrackMemorySourceType } from '../memory';
import { createDefaultWarmTrackState, toPersistedWarmTrackState } from '../storePersist';
import type { PeriodRange, WarmTrackState, WarmTrackStore } from '../types';

export const normalizeRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_ACTIVE_ROLE_ID;
};

const cloneWarmTrackState = (state: WarmTrackState): WarmTrackState => ({
  periodRanges: state.periodRanges.map((range) => ({ ...range })),
  symptomRecords: Object.fromEntries(
    Object.entries(state.symptomRecords).map(([dateKey, symptomIds]) => [dateKey, [...symptomIds]])
  ),
  moodRecords: { ...state.moodRecords },
  dischargeRecords: { ...state.dischargeRecords },
  stoolRecords: Object.fromEntries(
    Object.entries(state.stoolRecords).map(([dateKey, record]) => [dateKey, { ...record }])
  ),
  temperatureRecords: { ...state.temperatureRecords },
  weightRecords: { ...state.weightRecords },
  diaryRecords: { ...state.diaryRecords },
  customSymptoms: [...state.customSymptoms],
  customSymptomIcons: { ...state.customSymptomIcons },
  selectedDateKey: state.selectedDateKey,
  monthCursorKey: state.monthCursorKey,
});

const rolePersistQueue = new Map<string, Promise<void>>();

export const persistWarmTrackRoleState = (roleId: string, roleState: WarmTrackState): void => {
  const normalizedRoleId = normalizeRoleId(roleId);
  const snapshot = toPersistedWarmTrackState(cloneWarmTrackState(roleState));
  const previousTask = rolePersistQueue.get(normalizedRoleId) ?? Promise.resolve();

  let nextTask: Promise<void>;
  nextTask = previousTask
    .catch(() => undefined)
    .then(() => upsertWarmTrackRoleState(normalizedRoleId, snapshot))
    .catch((error) => {
      console.error('[WarmTrackStore] persist role state failed:', error);
    })
    .finally(() => {
      if (rolePersistQueue.get(normalizedRoleId) === nextTask) {
        rolePersistQueue.delete(normalizedRoleId);
      }
    });

  rolePersistQueue.set(normalizedRoleId, nextTask);
};

export const arePeriodRangesEqual = (
  left: WarmTrackState['periodRanges'],
  right: WarmTrackState['periodRanges']
): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].start !== right[index].start || left[index].end !== right[index].end) {
      return false;
    }
  }
  return true;
};

export const areStoolRecordsEqual = (
  left: WarmTrackState['stoolRecords'][string] | undefined,
  right: WarmTrackState['stoolRecords'][string]
): boolean => {
  if (!left) return false;
  return (
    left.feelingId === right.feelingId &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.shapeId === right.shapeId &&
    left.amountId === right.amountId &&
    left.durationId === right.durationId
  );
};

const buildDateSessionId = (dateKey: string): string => `warmtrack-date-${dateKey}`;
const buildDateSourceId = (sourceType: WarmTrackMemorySourceType, dateKey: string): string =>
  `${sourceType}:${dateKey}`;
const PERIOD_RANGE_SESSION_ID = 'warmtrack-period-range';
const buildPeriodRangeSourceId = (rangeStartDateKey: string): string => `period-range:${rangeStartDateKey}`;

const buildPeriodRangeContent = (range: PeriodRange): string => {
  if (range.end) {
    return `经期时间段：${range.start} 至 ${range.end}。`;
  }
  return `经期开始于 ${range.start}，结束日期暂未记录。`;
};

export const recordWarmTrackMemory = (params: {
  roleId: string;
  sourceType: WarmTrackMemorySourceType;
  content: string | null;
  dateKey?: string;
  sessionId?: string;
  sourceId?: string;
}): void => {
  const normalizedContent = params.content?.trim() ?? '';
  const resolvedSessionId = params.sessionId ?? (params.dateKey ? buildDateSessionId(params.dateKey) : undefined);
  const resolvedSourceId =
    params.sourceId ?? (params.dateKey ? buildDateSourceId(params.sourceType, params.dateKey) : undefined);

  if (resolvedSessionId && resolvedSourceId) {
    warmTrackMemoryController.removeBySessionSources(resolvedSessionId, [resolvedSourceId]);
  }

  if (!normalizedContent) return;

  warmTrackMemoryController.record({
    contactId: params.roleId,
    role: 'user',
    sourceType: params.sourceType,
    sessionId: resolvedSessionId,
    sourceId: resolvedSourceId,
    content: normalizedContent,
  });
};

export const syncWarmTrackPeriodRangeMemories = (params: {
  roleId: string;
  previousRanges: PeriodRange[];
  nextRanges: PeriodRange[];
}): void => {
  const sourceIdsToRemove = [
    ...new Set(
      [...params.previousRanges, ...params.nextRanges].map((range) =>
        buildPeriodRangeSourceId(range.start)
      )
    ),
  ];

  if (sourceIdsToRemove.length > 0) {
    warmTrackMemoryController.removeBySessionSources(PERIOD_RANGE_SESSION_ID, sourceIdsToRemove);
  }

  params.nextRanges.forEach((range) => {
    warmTrackMemoryController.record({
      contactId: params.roleId,
      role: 'user',
      sourceType: 'period-range',
      sessionId: PERIOD_RANGE_SESSION_ID,
      sourceId: buildPeriodRangeSourceId(range.start),
      content: buildPeriodRangeContent(range),
    });
  });
};

export const ensureRoleContextState = (
  state: WarmTrackStore,
  preferredRoleId?: string
): { state: WarmTrackStore; roleId: string; roleState: WarmTrackState } => {
  const roleId = normalizeRoleId(preferredRoleId ?? getActiveRoleId());
  const existingRoleState = state.warmTrackStateByRoleId[roleId];

  if (existingRoleState && state.activeRoleId === roleId) {
    return {
      state,
      roleId,
      roleState: existingRoleState,
    };
  }

  const roleState = existingRoleState ?? createDefaultWarmTrackState();
  const nextRoleMap = existingRoleState
    ? state.warmTrackStateByRoleId
    : {
        ...state.warmTrackStateByRoleId,
        [roleId]: roleState,
      };

  return {
    state: {
      ...state,
      activeRoleId: roleId,
      warmTrackStateByRoleId: nextRoleMap,
      ...roleState,
    },
    roleId,
    roleState,
  };
};

export const applyRoleState = (
  state: WarmTrackStore,
  roleId: string,
  roleState: WarmTrackState
): WarmTrackStore => {
  const nextRoleMap = {
    ...state.warmTrackStateByRoleId,
    [roleId]: roleState,
  };

  if (state.activeRoleId === roleId) {
    return {
      ...state,
      warmTrackStateByRoleId: nextRoleMap,
      ...roleState,
    };
  }

  return {
    ...state,
    warmTrackStateByRoleId: nextRoleMap,
  };
};
