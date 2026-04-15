import type { LoveBond, LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

export const createLoveSpaceBondSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  normalizeDateInput,
  generateId,
}: LoveSpaceActionOptions): Pick<
  LoveSpaceStore,
  'addOrUpdateBonds' | 'setBondBackground' | 'removeBond'
> => ({
  addOrUpdateBonds: (contactIds, sinceDate) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedDate = normalizeDateInput(sinceDate);
      const uniqueContactIds = [...new Set(contactIds.filter(Boolean))];
      if (uniqueContactIds.length === 0) {
        return syncedState;
      }

      const nextBonds = [...roleState.bonds];
      const nextImportantTimelineByBond = { ...roleState.importantTimelineByBond };
      const nextProcessedRecordIdsByBond = { ...roleState.timelineProcessedRecordIdsByBond };
      const existingBondByContact = new Map(roleState.bonds.map((bond) => [bond.contactId, bond]));
      let hasChanges = false;

      uniqueContactIds.forEach((contactId) => {
        const existingBond = existingBondByContact.get(contactId);
        if (existingBond) {
          if (existingBond.sinceDate === normalizedDate) {
            return;
          }

          const index = nextBonds.findIndex((bond) => bond.id === existingBond.id);
          if (index >= 0) {
            nextBonds[index] = {
              ...existingBond,
              sinceDate: normalizedDate,
            };
            delete nextImportantTimelineByBond[existingBond.id];
            delete nextProcessedRecordIdsByBond[existingBond.id];
            hasChanges = true;
          }
          return;
        }

        const newBond: LoveBond = {
          id: `bond-${generateId()}`,
          contactId,
          sinceDate: normalizedDate,
          createdAt: Date.now(),
        };
        nextBonds.unshift(newBond);
        delete nextImportantTimelineByBond[newBond.id];
        delete nextProcessedRecordIdsByBond[newBond.id];
        hasChanges = true;
      });

      if (!hasChanges) return syncedState;

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        bonds: nextBonds,
        importantTimelineByBond: nextImportantTimelineByBond,
        timelineProcessedRecordIdsByBond: nextProcessedRecordIdsByBond,
      });
    }),

  setBondBackground: (bondId, imageDataUrl) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      if (!bondId || !imageDataUrl) return syncedState;
      if (roleState.bondBackgrounds[bondId] === imageDataUrl) return syncedState;
      return applyRoleState(syncedState, roleId, {
        ...roleState,
        bondBackgrounds: {
          ...roleState.bondBackgrounds,
          [bondId]: imageDataUrl,
        },
      });
    }),

  removeBond: (bondId) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const normalizedBondId = bondId.trim();
      if (!normalizedBondId) return syncedState;

      const hasTargetBond = roleState.bonds.some((bond) => bond.id === normalizedBondId);
      if (!hasTargetBond) return syncedState;

      const nextBondBackgrounds = { ...roleState.bondBackgrounds };
      const nextImportantTimelineByBond = { ...roleState.importantTimelineByBond };
      const nextProcessedRecordIdsByBond = { ...roleState.timelineProcessedRecordIdsByBond };
      delete nextBondBackgrounds[normalizedBondId];
      delete nextImportantTimelineByBond[normalizedBondId];
      delete nextProcessedRecordIdsByBond[normalizedBondId];

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        bonds: roleState.bonds.filter((bond) => bond.id !== normalizedBondId),
        anniversaries: roleState.anniversaries.filter((item) => item.bondId !== normalizedBondId),
        moments: roleState.moments.filter((item) => item.bondId !== normalizedBondId),
        checkInTasks: roleState.checkInTasks.filter((item) => item.bondId !== normalizedBondId),
        checkInRecords: roleState.checkInRecords.filter((item) => item.bondId !== normalizedBondId),
        bondBackgrounds: nextBondBackgrounds,
        importantTimelineByBond: nextImportantTimelineByBond,
        timelineProcessedRecordIdsByBond: nextProcessedRecordIdsByBond,
      });
    }),
});
