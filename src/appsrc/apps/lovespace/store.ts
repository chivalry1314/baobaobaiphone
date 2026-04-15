import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getActiveRoleId } from '../contacts/activeRole';
import { createLoveSpacePersistOptions } from './data/repositories/storePersistRepo';
import { createLoveSpaceActions } from './store/actions';
import {
  applyRoleState,
  createDefaultLoveSpaceState,
  ensureRoleContextState,
  generateId,
  getTodayDateKey,
  normalizeDateInput,
  normalizePersistedRoleMap,
  normalizeRoleId,
} from './store/helpers';
import type { LoveSpaceStore } from './types';

const initialRoleId = normalizeRoleId(getActiveRoleId());
const initialRoleState = createDefaultLoveSpaceState();

export const useLoveSpaceStore = create<LoveSpaceStore>()(
  persist(
    (set, get) => ({
      activeRoleId: initialRoleId,
      loveSpaceStateByRoleId: {
        [initialRoleId]: initialRoleState,
      },
      ...initialRoleState,
      ...createLoveSpaceActions({
        set,
        get,
        ensureRoleContextState,
        applyRoleState,
        normalizeDateInput,
        getTodayDateKey,
        generateId,
        createDefaultLoveSpaceState,
      }),
    }),
    createLoveSpacePersistOptions({
      normalizeRoleId,
      normalizePersistedRoleMap,
      createDefaultLoveSpaceState,
    })
  )
);
