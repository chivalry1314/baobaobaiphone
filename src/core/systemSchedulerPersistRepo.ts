import { createAppStorageKey } from './storage';
import { createCorePersistOptions } from './persistOptions';

const SYSTEM_SCHEDULER_STORAGE_KEY = createAppStorageKey('systemscheduler');

interface SystemSchedulerPersistState {
  tasks: Record<string, unknown>;
  taskLogsByTask: Record<string, unknown[]>;
}

export const createSystemSchedulerPersistOptions = <
  TState extends SystemSchedulerPersistState,
>() =>
  createCorePersistOptions<TState, SystemSchedulerPersistState>({
    storageKey: SYSTEM_SCHEDULER_STORAGE_KEY,
    storeName: 'system_scheduler_state',
    partialize: (state): SystemSchedulerPersistState => ({
      tasks: state.tasks,
      taskLogsByTask: state.taskLogsByTask,
    }),
  });
