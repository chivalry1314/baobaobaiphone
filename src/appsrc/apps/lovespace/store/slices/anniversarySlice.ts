import type { LoveAnniversary, LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

export const createLoveSpaceAnniversarySlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  normalizeDateInput,
  generateId,
}: LoveSpaceActionOptions): Pick<LoveSpaceStore, 'saveAnniversary'> => ({
  saveAnniversary: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedDate = normalizeDateInput(payload.date);
      const normalizedTitle = payload.title.trim();
      if (!normalizedTitle) return syncedState;

      const nextAnniversary: LoveAnniversary = {
        id: `anniversary-${generateId()}`,
        bondId: payload.bondId,
        title: normalizedTitle,
        date: normalizedDate,
        includeStartDay: payload.includeStartDay,
        calendarType: payload.calendarType,
        reminderText: payload.reminderText,
        repeatType: payload.repeatType,
        backgroundKey: payload.backgroundKey,
        presetKey: payload.presetKey,
        createdAt: Date.now(),
      };

      const nextAnniversaries = [...roleState.anniversaries];
      if (payload.presetKey) {
        const presetIndex = nextAnniversaries.findIndex(
          (item) => item.bondId === payload.bondId && item.presetKey === payload.presetKey
        );
        if (presetIndex >= 0) {
          nextAnniversaries[presetIndex] = {
            ...nextAnniversaries[presetIndex],
            ...nextAnniversary,
            id: nextAnniversaries[presetIndex].id,
            createdAt: nextAnniversaries[presetIndex].createdAt,
          };

          return applyRoleState(syncedState, roleId, {
            ...roleState,
            anniversaries: nextAnniversaries,
          });
        }
      }

      nextAnniversaries.unshift(nextAnniversary);
      return applyRoleState(syncedState, roleId, {
        ...roleState,
        anniversaries: nextAnniversaries,
      });
    }),
});
