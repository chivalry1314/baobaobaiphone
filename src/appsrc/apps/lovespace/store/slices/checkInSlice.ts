import type { LoveCheckInRecord, LoveCheckInTask, LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

const reverseCheckInOwner = (owner: 'mine' | 'partner'): 'mine' | 'partner' =>
  owner === 'mine' ? 'partner' : 'mine';

const buildCheckInTask = (
  input: {
    bondId: string;
    owner: 'mine' | 'partner';
    templateId: string;
    categoryId: string;
    iconKey: string;
    title: string;
    score: number;
    allowPartnerReminder?: boolean;
  },
  now: number,
  generateId: () => string
): LoveCheckInTask => ({
  id: `checkin-task-${generateId()}`,
  bondId: input.bondId,
  owner: input.owner,
  templateId: input.templateId,
  categoryId: input.categoryId || 'custom',
  iconKey: input.iconKey || 'heart',
  title: input.title,
  score: Number.isFinite(input.score) ? Math.max(0, Math.round(input.score)) : 100,
  allowPartnerReminder: Boolean(input.allowPartnerReminder),
  completedDateKeys: [],
  createdAt: now,
});

const buildCheckInAddRecord = (
  task: LoveCheckInTask,
  now: number,
  dateKey: string,
  generateId: () => string
): LoveCheckInRecord => ({
  id: `checkin-record-${generateId()}`,
  bondId: task.bondId,
  taskId: task.id,
  taskTitle: task.title,
  taskIconKey: task.iconKey,
  owner: task.owner,
  action: 'add',
  dateKey,
  createdAt: now,
});

export const createLoveSpaceCheckInSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  getTodayDateKey,
  generateId,
}: LoveSpaceActionOptions): Pick<
  LoveSpaceStore,
  'addCheckInTasks' | 'completeCheckInTask' | 'removeCheckInTask'
> => ({
  addCheckInTasks: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedBondId = payload.bondId.trim();
      if (!normalizedBondId || payload.tasks.length === 0) return syncedState;

      const nextTasks = [...roleState.checkInTasks];
      const nextRecords = [...roleState.checkInRecords];
      const existingTemplateIdSet = new Set(
        roleState.checkInTasks
          .filter((item) => item.bondId === normalizedBondId && item.owner === payload.owner)
          .map((item) => item.templateId)
      );
      const mirroredOwner = reverseCheckInOwner(payload.owner);
      const mirroredTemplateIdSet = new Set(
        roleState.checkInTasks
          .filter((item) => item.bondId === normalizedBondId && item.owner === mirroredOwner)
          .map((item) => item.templateId)
      );

      let hasChanges = false;
      const todayKey = getTodayDateKey();

      payload.tasks.forEach((item) => {
        const templateId = item.templateId.trim();
        const categoryId = item.categoryId.trim();
        const iconKey = item.iconKey.trim();
        const title = item.title.trim();
        if (!templateId || !title) return;

        const hasPrimaryTask = existingTemplateIdSet.has(templateId);
        const hasMirroredTask = mirroredTemplateIdSet.has(templateId);
        if (hasPrimaryTask && hasMirroredTask) return;

        const now = Date.now();
        if (!hasPrimaryTask) {
          const nextTask = buildCheckInTask(
            {
              bondId: normalizedBondId,
              owner: payload.owner,
              templateId,
              categoryId,
              iconKey,
              title,
              score: item.score,
              allowPartnerReminder: item.allowPartnerReminder,
            },
            now,
            generateId
          );
          nextTasks.unshift(nextTask);
          nextRecords.unshift(buildCheckInAddRecord(nextTask, now, todayKey, generateId));
          existingTemplateIdSet.add(templateId);
          hasChanges = true;
        }

        if (!hasMirroredTask) {
          const mirroredTask = buildCheckInTask(
            {
              bondId: normalizedBondId,
              owner: mirroredOwner,
              templateId,
              categoryId,
              iconKey,
              title,
              score: item.score,
              allowPartnerReminder: item.allowPartnerReminder,
            },
            now,
            generateId
          );
          nextTasks.unshift(mirroredTask);
          nextRecords.unshift(buildCheckInAddRecord(mirroredTask, now, todayKey, generateId));
          mirroredTemplateIdSet.add(templateId);
          hasChanges = true;
        }
      });

      if (!hasChanges) return syncedState;

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        checkInTasks: nextTasks,
        checkInRecords: nextRecords,
      });
    }),

  completeCheckInTask: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const taskIndex = roleState.checkInTasks.findIndex((item) => item.id === payload.taskId);
      if (taskIndex < 0) return syncedState;

      const targetTask = roleState.checkInTasks[taskIndex];
      const todayDateKey = getTodayDateKey();
      const completedDateKeys = targetTask.completedDateKeys ?? [];
      if (completedDateKeys.includes(todayDateKey)) {
        return syncedState;
      }

      const now = Date.now();
      const nextTasks = [...roleState.checkInTasks];
      nextTasks[taskIndex] = {
        ...targetTask,
        completedDateKeys: [...completedDateKeys, todayDateKey],
      };

      const nextRecord: LoveCheckInRecord = {
        id: `checkin-record-${generateId()}`,
        bondId: targetTask.bondId,
        taskId: targetTask.id,
        taskTitle: targetTask.title,
        taskIconKey: targetTask.iconKey,
        owner: targetTask.owner,
        action: 'complete',
        dateKey: todayDateKey,
        createdAt: now,
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        checkInTasks: nextTasks,
        checkInRecords: [nextRecord, ...roleState.checkInRecords],
      });
    }),

  removeCheckInTask: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const taskId = payload.taskId.trim();
      if (!taskId) return syncedState;

      const targetTask = roleState.checkInTasks.find((item) => item.id === taskId);
      if (!targetTask) return syncedState;

      const relatedTaskIdSet = new Set<string>([taskId]);
      roleState.checkInTasks.forEach((item) => {
        if (
          item.bondId === targetTask.bondId &&
          item.templateId === targetTask.templateId &&
          item.owner !== targetTask.owner
        ) {
          relatedTaskIdSet.add(item.id);
        }
      });

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        checkInTasks: roleState.checkInTasks.filter((item) => !relatedTaskIdSet.has(item.id)),
        checkInRecords: roleState.checkInRecords.filter((item) => !relatedTaskIdSet.has(item.taskId)),
      });
    }),
});
