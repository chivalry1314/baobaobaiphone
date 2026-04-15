import { create } from 'zustand';
import { getActiveRoleId } from '../contacts/activeRole';
import { loadWarmTrackPersistedState } from './data/hydrate';
import type { WarmTrackState, WarmTrackStore } from './types';
import { createDefaultWarmTrackState } from './storePersist';
import { createWarmTrackActions } from './store/actions';
import {
  applyRoleState,
  arePeriodRangesEqual,
  areStoolRecordsEqual,
  ensureRoleContextState,
  normalizeRoleId,
  persistWarmTrackRoleState,
  recordWarmTrackMemory,
  syncWarmTrackPeriodRangeMemories,
} from './store/helpers';

const hydrationListeners = new Set<() => void>();
let hydrationPromise: Promise<void> | null = null;

const emitHydrated = () => {
  hydrationListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[WarmTrackStore] hydrate listener failed:', error);
    }
  });
};

const initialRoleId = normalizeRoleId(getActiveRoleId());
const initialRoleState = createDefaultWarmTrackState();

export interface WarmTrackRoleMutationResult {
  roleId: string;
  previousRoleState: WarmTrackState;
  nextRoleState: WarmTrackState;
}

export const useWarmTrackStore = create<WarmTrackStore>()((set) => {
  const updateRoleState = (
    mutate: (roleState: WarmTrackState) => WarmTrackState
  ): WarmTrackRoleMutationResult | null => {
    const mutationRef: { current: WarmTrackRoleMutationResult | null } = { current: null };

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const updatedRoleState = mutate(roleState);
      if (updatedRoleState === roleState) {
        return syncedState;
      }

      mutationRef.current = {
        roleId,
        previousRoleState: roleState,
        nextRoleState: updatedRoleState,
      };
      return applyRoleState(syncedState, roleId, updatedRoleState);
    });

    const mutation = mutationRef.current;
    if (mutation) {
      persistWarmTrackRoleState(mutation.roleId, mutation.nextRoleState);
    }

    return mutation;
  };

  return {
    activeRoleId: initialRoleId,
    warmTrackStateByRoleId: {
      [initialRoleId]: initialRoleState,
    },
    isHydrated: false,
    ...initialRoleState,

    ...createWarmTrackActions({
      set,
      updateRoleState,
      normalizeRoleId,
      createDefaultWarmTrackState,
      persistWarmTrackRoleState,
      recordWarmTrackMemory,
      syncWarmTrackPeriodRangeMemories,
      arePeriodRangesEqual,
      areStoolRecordsEqual,
    }),
  };
});

export const hasWarmTrackHydrated = (): boolean => useWarmTrackStore.getState().isHydrated;

export const onWarmTrackHydrated = (listener: () => void): (() => void) => {
  if (hasWarmTrackHydrated()) {
    listener();
    return () => {};
  }

  hydrationListeners.add(listener);
  return () => {
    hydrationListeners.delete(listener);
  };
};

export const hydrateWarmTrackStore = async (): Promise<void> => {
  if (hasWarmTrackHydrated()) return;
  if (hydrationPromise) {
    await hydrationPromise;
    return;
  }

  hydrationPromise = (async () => {
    try {
      const persistedState = await loadWarmTrackPersistedState();
      const activeRoleState =
        persistedState.warmTrackStateByRoleId[persistedState.activeRoleId] ?? createDefaultWarmTrackState();

      useWarmTrackStore.setState((state) => ({
        ...state,
        activeRoleId: persistedState.activeRoleId,
        warmTrackStateByRoleId: persistedState.warmTrackStateByRoleId,
        ...activeRoleState,
        isHydrated: true,
      }));
    } catch (error) {
      console.error('[WarmTrackStore] hydrate failed:', error);
      useWarmTrackStore.setState({ isHydrated: true });
    } finally {
      emitHydrated();
    }
  })();

  try {
    await hydrationPromise;
  } finally {
    hydrationPromise = null;
  }
};

void hydrateWarmTrackStore();
