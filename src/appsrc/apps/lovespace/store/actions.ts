import type { LoveSpaceState, LoveSpaceStore } from '../types';
import { createLoveSpaceAnniversarySlice } from './slices/anniversarySlice';
import { createLoveSpaceBondSlice } from './slices/bondSlice';
import { createLoveSpaceCheckInSlice } from './slices/checkInSlice';
import { createLoveSpaceMomentSlice } from './slices/momentSlice';
import { createLoveSpaceRoleSlice } from './slices/roleSlice';
import { createLoveSpaceTimelineSlice } from './slices/timelineSlice';
import type { LoveSpaceGet, LoveSpaceSet } from './slices/types';

type LoveSpaceActions = Pick<
  LoveSpaceStore,
  | 'syncLoveSpaceRoleContext'
  | 'addOrUpdateBonds'
  | 'saveAnniversary'
  | 'addMomentRecord'
  | 'updateMomentRecord'
  | 'removeMomentRecord'
  | 'addMomentComment'
  | 'removeMomentComment'
  | 'addCheckInTasks'
  | 'completeCheckInTask'
  | 'removeCheckInTask'
  | 'setBondBackground'
  | 'removeBond'
  | 'syncImportantTimelinesByModel'
>;

interface CreateLoveSpaceActionsOptions {
  set: LoveSpaceSet;
  get: LoveSpaceGet;
  ensureRoleContextState: (
    state: LoveSpaceStore,
    preferredRoleId?: string
  ) => { state: LoveSpaceStore; roleId: string; roleState: LoveSpaceState };
  applyRoleState: (
    state: LoveSpaceStore,
    roleId: string,
    roleState: LoveSpaceState
  ) => LoveSpaceStore;
  normalizeDateInput: (value: string) => string;
  getTodayDateKey: () => string;
  generateId: () => string;
  createDefaultLoveSpaceState: () => LoveSpaceState;
}

export const createLoveSpaceActions = (
  options: CreateLoveSpaceActionsOptions
): LoveSpaceActions => ({
  ...createLoveSpaceRoleSlice(options),
  ...createLoveSpaceBondSlice(options),
  ...createLoveSpaceAnniversarySlice(options),
  ...createLoveSpaceMomentSlice(options),
  ...createLoveSpaceCheckInSlice(options),
  ...createLoveSpaceTimelineSlice(options),
});
