import {
  areImportantTimelineEventsEqual,
  areStringArraysEqual,
  syncBondImportantTimelineWithModel,
  type LoveImportantTimelineEvent,
} from '../../importantTimeline';
import type { LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

export const createLoveSpaceTimelineSlice = ({
  set,
  get,
  applyRoleState,
  createDefaultLoveSpaceState,
}: LoveSpaceActionOptions): Pick<LoveSpaceStore, 'syncImportantTimelinesByModel'> => ({
  syncImportantTimelinesByModel: async () => {
    get().syncLoveSpaceRoleContext();
    const snapshot = get();
    const sourceRoleId = snapshot.activeRoleId;
    const sourceState =
      snapshot.loveSpaceStateByRoleId[sourceRoleId] ?? createDefaultLoveSpaceState();

    const bondResults: Record<
      string,
      {
        events: LoveImportantTimelineEvent[];
        processedRecordIds: string[];
      }
    > = {};

    for (const bond of sourceState.bonds) {
      try {
        const result = await syncBondImportantTimelineWithModel({
          roleId: sourceRoleId,
          contactId: bond.contactId,
          sinceDate: bond.sinceDate,
          existingEvents: sourceState.importantTimelineByBond[bond.id] ?? [],
          processedRecordIds: sourceState.timelineProcessedRecordIdsByBond[bond.id] ?? [],
        });
        bondResults[bond.id] = result;
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        throw new Error(
          `联系人的小时刻提取失败（contactId=${bond.contactId}）：${message}`
        );
      }
    }

    set((state) => {
      const sourceRoleState =
        state.loveSpaceStateByRoleId[sourceRoleId] ?? createDefaultLoveSpaceState();
      const activeBondIdSet = new Set(sourceRoleState.bonds.map((bond) => bond.id));
      const nextImportantTimelineByBond = { ...sourceRoleState.importantTimelineByBond };
      const nextProcessedRecordIdsByBond = { ...sourceRoleState.timelineProcessedRecordIdsByBond };
      let hasChanged = false;

      Object.keys(nextImportantTimelineByBond).forEach((bondId) => {
        if (!activeBondIdSet.has(bondId)) {
          delete nextImportantTimelineByBond[bondId];
          hasChanged = true;
        }
      });

      Object.keys(nextProcessedRecordIdsByBond).forEach((bondId) => {
        if (!activeBondIdSet.has(bondId)) {
          delete nextProcessedRecordIdsByBond[bondId];
          hasChanged = true;
        }
      });

      Object.entries(bondResults).forEach(([bondId, result]) => {
        if (!activeBondIdSet.has(bondId)) return;

        const prevEvents = nextImportantTimelineByBond[bondId] ?? [];
        if (!areImportantTimelineEventsEqual(prevEvents, result.events)) {
          nextImportantTimelineByBond[bondId] = result.events;
          hasChanged = true;
        }

        const prevProcessedRecordIds = nextProcessedRecordIdsByBond[bondId] ?? [];
        if (!areStringArraysEqual(prevProcessedRecordIds, result.processedRecordIds)) {
          nextProcessedRecordIdsByBond[bondId] = result.processedRecordIds;
          hasChanged = true;
        }
      });

      if (!hasChanged) return state;

      return applyRoleState(state, sourceRoleId, {
        ...sourceRoleState,
        importantTimelineByBond: nextImportantTimelineByBond,
        timelineProcessedRecordIdsByBond: nextProcessedRecordIdsByBond,
      });
    });
  },
});
