import type { StateCreator } from 'zustand';
import type { LoveSpaceState, LoveSpaceStore } from '../../types';

export type LoveSpaceSet = Parameters<StateCreator<LoveSpaceStore>>[0];
export type LoveSpaceGet = Parameters<StateCreator<LoveSpaceStore>>[1];

export interface LoveSpaceActionOptions {
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
