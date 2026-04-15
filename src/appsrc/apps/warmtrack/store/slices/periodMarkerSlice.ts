import { applyMarkPeriodEnd, applyMarkPeriodStart } from '../../utils';
import type { WarmTrackStore } from '../../types';
import type { WarmTrackMutationSliceOptions } from './types';

export const createWarmTrackPeriodMarkerSlice = ({
  updateRoleState,
  syncWarmTrackPeriodRangeMemories,
  arePeriodRangesEqual,
}: WarmTrackMutationSliceOptions): Pick<WarmTrackStore, 'markPeriodStart' | 'markPeriodEnd'> => ({
  markPeriodStart: (enabled) => {
    const mutation = updateRoleState((roleState) => {
      const nextRanges = applyMarkPeriodStart(
        roleState.periodRanges,
        roleState.selectedDateKey,
        enabled
      );
      if (arePeriodRangesEqual(nextRanges, roleState.periodRanges)) return roleState;
      return {
        ...roleState,
        periodRanges: nextRanges,
      };
    });

    if (!mutation) return;
    syncWarmTrackPeriodRangeMemories({
      roleId: mutation.roleId,
      previousRanges: mutation.previousRoleState.periodRanges,
      nextRanges: mutation.nextRoleState.periodRanges,
    });
  },

  markPeriodEnd: (enabled) => {
    const mutation = updateRoleState((roleState) => {
      const nextRanges = applyMarkPeriodEnd(
        roleState.periodRanges,
        roleState.selectedDateKey,
        enabled
      );
      if (arePeriodRangesEqual(nextRanges, roleState.periodRanges)) return roleState;
      return {
        ...roleState,
        periodRanges: nextRanges,
      };
    });

    if (!mutation) return;
    syncWarmTrackPeriodRangeMemories({
      roleId: mutation.roleId,
      previousRanges: mutation.previousRoleState.periodRanges,
      nextRanges: mutation.nextRoleState.periodRanges,
    });
  },
});
