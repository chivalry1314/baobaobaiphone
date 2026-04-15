import type { StateCreator } from 'zustand';
import type { WarmTrackRoleMutationResult } from '../../store';
import type { WarmTrackState, WarmTrackStore } from '../../types';

export type WarmTrackSet = Parameters<StateCreator<WarmTrackStore>>[0];

export interface WarmTrackRoleSliceOptions {
  set: WarmTrackSet;
  normalizeRoleId: (value: string | undefined) => string;
  createDefaultWarmTrackState: () => WarmTrackState;
  persistWarmTrackRoleState: (roleId: string, roleState: WarmTrackState) => void;
}

export interface WarmTrackMutationSliceOptions {
  updateRoleState: (
    mutate: (roleState: WarmTrackState) => WarmTrackState
  ) => WarmTrackRoleMutationResult | null;
  recordWarmTrackMemory: (params: {
    roleId: string;
    sourceType:
      | 'period-range'
      | 'period-start'
      | 'period-end'
      | 'symptoms'
      | 'mood'
      | 'discharge'
      | 'stool'
      | 'temperature'
      | 'weight'
      | 'diary'
      | 'custom-symptoms';
    content: string | null;
    dateKey?: string;
    sessionId?: string;
    sourceId?: string;
  }) => void;
  syncWarmTrackPeriodRangeMemories: (params: {
    roleId: string;
    previousRanges: WarmTrackState['periodRanges'];
    nextRanges: WarmTrackState['periodRanges'];
  }) => void;
  arePeriodRangesEqual: (
    left: WarmTrackState['periodRanges'],
    right: WarmTrackState['periodRanges']
  ) => boolean;
  areStoolRecordsEqual: (
    left: WarmTrackState['stoolRecords'][string] | undefined,
    right: WarmTrackState['stoolRecords'][string]
  ) => boolean;
}

export interface WarmTrackActionOptions
  extends WarmTrackRoleSliceOptions,
    WarmTrackMutationSliceOptions {}
