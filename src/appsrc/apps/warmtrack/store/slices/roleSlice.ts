import { getActiveRoleId } from '../../../contacts/activeRole';
import type { WarmTrackStore } from '../../types';
import type { WarmTrackRoleSliceOptions } from './types';

export const createWarmTrackRoleSlice = ({
  set,
  normalizeRoleId,
  createDefaultWarmTrackState,
  persistWarmTrackRoleState,
}: WarmTrackRoleSliceOptions): Pick<WarmTrackStore, 'syncWarmTrackRoleContext'> => ({
  syncWarmTrackRoleContext: () => {
    let shouldPersist = false;
    let nextRoleId: string | null = null;
    let nextRoleState = null as ReturnType<typeof createDefaultWarmTrackState> | null;

    set((state) => {
      const roleId = normalizeRoleId(getActiveRoleId());
      const existingRoleState = state.warmTrackStateByRoleId[roleId];
      if (existingRoleState && state.activeRoleId === roleId) return state;

      const roleState = existingRoleState ?? createDefaultWarmTrackState();
      const nextRoleMap = existingRoleState
        ? state.warmTrackStateByRoleId
        : {
            ...state.warmTrackStateByRoleId,
            [roleId]: roleState,
          };

      if (!existingRoleState) {
        shouldPersist = true;
        nextRoleId = roleId;
        nextRoleState = roleState;
      }

      return {
        ...state,
        activeRoleId: roleId,
        warmTrackStateByRoleId: nextRoleMap,
        ...roleState,
      };
    });

    if (shouldPersist && nextRoleId && nextRoleState) {
      persistWarmTrackRoleState(nextRoleId, nextRoleState);
    }
  },
});
