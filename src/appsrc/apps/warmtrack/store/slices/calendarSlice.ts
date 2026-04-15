import { isValidDateKey, switchMonthKey } from '../../utils';
import type { WarmTrackStore } from '../../types';
import type { WarmTrackMutationSliceOptions } from './types';

export const createWarmTrackCalendarSlice = ({
  updateRoleState,
}: WarmTrackMutationSliceOptions): Pick<
  WarmTrackStore,
  'setSelectedDateKey' | 'switchMonth'
> => ({
  setSelectedDateKey: (dateKey) =>
    updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey) || roleState.selectedDateKey === dateKey) return roleState;
      return {
        ...roleState,
        selectedDateKey: dateKey,
      };
    }),

  switchMonth: (offset) =>
    updateRoleState((roleState) => {
      const nextMonthCursorKey = switchMonthKey(roleState.monthCursorKey, offset);
      if (nextMonthCursorKey === roleState.monthCursorKey) return roleState;
      return {
        ...roleState,
        monthCursorKey: nextMonthCursorKey,
      };
    }),
});
