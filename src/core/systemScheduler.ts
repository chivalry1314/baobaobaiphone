import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSystemSchedulerPersistOptions } from './systemSchedulerPersistRepo';
const MIN_TASK_INTERVAL_MINUTES = 1;
const MAX_TASK_INTERVAL_MINUTES = 24 * 60;
const DEFAULT_TASK_INTERVAL_MINUTES = 5;
const MINUTES_PER_HOUR = 60;
const SCHEDULER_TICK_MS = 15 * 1000;
const MAX_TASK_LOGS_PER_TASK = 120;

export type SystemScheduledTaskLogLevel = 'info' | 'error';
export type SystemScheduledTaskIntervalUnit = 'minute' | 'hour';

export interface SystemScheduledTaskDefinition {
  id: string;
  name: string;
  description: string;
  defaultEnabled?: boolean;
  defaultIntervalMinutes?: number;
  defaultIntervalUnit?: SystemScheduledTaskIntervalUnit;
  run: () => void | Promise<void>;
}

export interface SystemScheduledTask {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  intervalMinutes: number;
  intervalUnit: SystemScheduledTaskIntervalUnit;
  isRunning: boolean;
  runCount: number;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastDurationMs: number | null;
  lastError: string | null;
  updatedAt: number;
}

export interface SystemScheduledTaskLog {
  id: string;
  taskId: string;
  level: SystemScheduledTaskLogLevel;
  message: string;
  details?: string;
  timestamp: number;
}

type SystemTaskDefinitionMeta = Omit<SystemScheduledTaskDefinition, 'run'>;

interface SystemSchedulerState {
  tasks: Record<string, SystemScheduledTask>;
  taskLogsByTask: Record<string, SystemScheduledTaskLog[]>;
  upsertTaskDefinition: (definition: SystemTaskDefinitionMeta) => void;
  setTaskEnabled: (taskId: string, enabled: boolean) => void;
  setTaskIntervalMinutes: (taskId: string, intervalMinutes: number) => void;
  setTaskIntervalUnit: (taskId: string, intervalUnit: SystemScheduledTaskIntervalUnit) => void;
  appendTaskLog: (
    taskId: string,
    payload: {
      level: SystemScheduledTaskLogLevel;
      message: string;
      details?: string;
      timestamp?: number;
    }
  ) => void;
  clearTaskLogs: (taskId: string) => void;
  resetRuntimeTaskStates: () => void;
}

const normalizeTaskIntervalMinutes = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_TASK_INTERVAL_MINUTES;
  return Math.max(MIN_TASK_INTERVAL_MINUTES, Math.min(MAX_TASK_INTERVAL_MINUTES, Math.round(value)));
};

const normalizeTaskIntervalUnit = (value: unknown): SystemScheduledTaskIntervalUnit => {
  if (value === 'hour') return 'hour';
  return 'minute';
};

const normalizeTaskEnabled = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return fallback;
};

const formatTaskIntervalLogText = (
  intervalMinutes: number,
  intervalUnit: SystemScheduledTaskIntervalUnit
): string => {
  if (intervalUnit === 'hour') {
    const hourValue = Math.max(1, Math.round(intervalMinutes / MINUTES_PER_HOUR));
    return `扫描间隔已更新为 ${hourValue} 小时`;
  }
  return `扫描间隔已更新为 ${intervalMinutes} 分钟`;
};

const registeredTaskRunners = new Map<string, SystemScheduledTaskDefinition['run']>();
const registeredTaskDefinitions = new Map<string, SystemTaskDefinitionMeta>();

const now = (): number => Date.now();

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
};

const createTaskState = (definition: SystemTaskDefinitionMeta): SystemScheduledTask => {
  const normalizedInterval = normalizeTaskIntervalMinutes(definition.defaultIntervalMinutes);
  const intervalUnit = normalizeTaskIntervalUnit(definition.defaultIntervalUnit);
  const enabled = normalizeTaskEnabled(definition.defaultEnabled, true);
  const timestamp = now();
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    enabled,
    intervalMinutes: normalizedInterval,
    intervalUnit,
    isRunning: false,
    runCount: 0,
    lastRunAt: null,
    nextRunAt: enabled ? timestamp : null,
    lastDurationMs: null,
    lastError: null,
    updatedAt: timestamp,
  };
};

const appendTaskLogToMap = (
  taskLogsByTask: Record<string, SystemScheduledTaskLog[]>,
  taskId: string,
  log: SystemScheduledTaskLog
): Record<string, SystemScheduledTaskLog[]> => {
  const previousLogs = taskLogsByTask[taskId] ?? [];
  const nextLogs = [...previousLogs, log].slice(-MAX_TASK_LOGS_PER_TASK);
  return {
    ...taskLogsByTask,
    [taskId]: nextLogs,
  };
};

export const useSystemSchedulerStore = create<SystemSchedulerState>()(
  persist(
    (set) => ({
      tasks: {},
      taskLogsByTask: {},
      upsertTaskDefinition: (definition) =>
        set((state) => {
          const existingTask = state.tasks[definition.id];
          if (!existingTask) {
            return {
              tasks: {
                ...state.tasks,
                [definition.id]: createTaskState(definition),
              },
            };
          }

          const timestamp = now();
          const normalizedInterval = normalizeTaskIntervalMinutes(existingTask.intervalMinutes);
          const intervalUnit = normalizeTaskIntervalUnit(
            existingTask.intervalUnit ?? definition.defaultIntervalUnit
          );
          const enabled = normalizeTaskEnabled(existingTask.enabled, definition.defaultEnabled ?? true);
          const nextRunAt = enabled ? existingTask.nextRunAt ?? timestamp : null;
          const hasChanged =
            existingTask.name !== definition.name ||
            existingTask.description !== definition.description ||
            existingTask.intervalMinutes !== normalizedInterval ||
            existingTask.intervalUnit !== intervalUnit ||
            existingTask.enabled !== enabled ||
            existingTask.isRunning ||
            existingTask.nextRunAt !== nextRunAt;

          if (!hasChanged) return state;

          return {
            tasks: {
              ...state.tasks,
              [definition.id]: {
                ...existingTask,
                name: definition.name,
                description: definition.description,
                intervalMinutes: normalizedInterval,
                intervalUnit,
                enabled,
                isRunning: false,
                nextRunAt,
                updatedAt: timestamp,
              },
            },
          };
        }),
      setTaskEnabled: (taskId, enabled) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;
          const nextEnabled = Boolean(enabled);
          const timestamp = now();
          const nextState: SystemSchedulerState | Partial<SystemSchedulerState> = {
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                enabled: nextEnabled,
                isRunning: false,
                nextRunAt: nextEnabled ? timestamp : null,
                updatedAt: timestamp,
              },
            },
            taskLogsByTask: appendTaskLogToMap(state.taskLogsByTask, taskId, {
              id: `task-log-${generateId()}`,
              taskId,
              level: 'info',
              message: nextEnabled ? '任务已启用' : '任务已停用',
              timestamp,
            }),
          };
          return nextState;
        }),
      setTaskIntervalMinutes: (taskId, intervalMinutes) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;

          const normalizedInterval = normalizeTaskIntervalMinutes(intervalMinutes);
          if (task.intervalMinutes === normalizedInterval) return state;

          const timestamp = now();
          const taskEnabled = normalizeTaskEnabled(task.enabled, true);
          return {
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                intervalMinutes: normalizedInterval,
                nextRunAt: taskEnabled ? timestamp + normalizedInterval * 60 * 1000 : null,
                updatedAt: timestamp,
              },
            },
            taskLogsByTask: appendTaskLogToMap(state.taskLogsByTask, taskId, {
              id: `task-log-${generateId()}`,
              taskId,
              level: 'info',
              message: formatTaskIntervalLogText(normalizedInterval, task.intervalUnit),
              timestamp,
            }),
          };
        }),
      setTaskIntervalUnit: (taskId, intervalUnit) =>
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;

          const normalizedUnit = normalizeTaskIntervalUnit(intervalUnit);
          if (task.intervalUnit === normalizedUnit) return state;

          const timestamp = now();
          const taskEnabled = normalizeTaskEnabled(task.enabled, true);
          const nextIntervalMinutes =
            normalizedUnit === 'hour'
              ? normalizeTaskIntervalMinutes(
                  Math.max(
                    MINUTES_PER_HOUR,
                    Math.round(task.intervalMinutes / MINUTES_PER_HOUR) * MINUTES_PER_HOUR
                  )
                )
              : normalizeTaskIntervalMinutes(task.intervalMinutes);

          return {
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                intervalUnit: normalizedUnit,
                intervalMinutes: nextIntervalMinutes,
                nextRunAt: taskEnabled ? timestamp + nextIntervalMinutes * 60 * 1000 : null,
                updatedAt: timestamp,
              },
            },
            taskLogsByTask: appendTaskLogToMap(state.taskLogsByTask, taskId, {
              id: `task-log-${generateId()}`,
              taskId,
              level: 'info',
              message: formatTaskIntervalLogText(nextIntervalMinutes, normalizedUnit),
              timestamp,
            }),
          };
        }),
      appendTaskLog: (taskId, payload) =>
        set((state) => {
          if (!taskId) return state;
          const message = payload.message?.trim();
          if (!message) return state;

          const timestamp = payload.timestamp ?? now();
          return {
            taskLogsByTask: appendTaskLogToMap(state.taskLogsByTask, taskId, {
              id: `task-log-${generateId()}`,
              taskId,
              level: payload.level,
              message,
              details: payload.details?.trim() || undefined,
              timestamp,
            }),
          };
        }),
      clearTaskLogs: (taskId) =>
        set((state) => {
          if (!taskId || !state.taskLogsByTask[taskId]) return state;
          const nextLogs = { ...state.taskLogsByTask };
          delete nextLogs[taskId];
          return { taskLogsByTask: nextLogs };
        }),
      resetRuntimeTaskStates: () =>
        set((state) => {
          const taskEntries = Object.entries(state.tasks);
          if (taskEntries.length === 0) return state;
          let changed = false;
          const timestamp = now();
          const nextTasks = taskEntries.reduce<Record<string, SystemScheduledTask>>((acc, [taskId, task]) => {
            const enabled = normalizeTaskEnabled(task.enabled, true);
            const nextTask: SystemScheduledTask = {
              ...task,
              enabled,
              isRunning: false,
              intervalMinutes: normalizeTaskIntervalMinutes(task.intervalMinutes),
              intervalUnit: normalizeTaskIntervalUnit(task.intervalUnit),
              nextRunAt: enabled ? task.nextRunAt ?? timestamp : null,
              updatedAt: timestamp,
            };
            if (
              nextTask.enabled !== task.enabled ||
              nextTask.isRunning !== task.isRunning ||
              nextTask.intervalMinutes !== task.intervalMinutes ||
              nextTask.intervalUnit !== task.intervalUnit ||
              nextTask.nextRunAt !== task.nextRunAt
            ) {
              changed = true;
            }
            acc[taskId] = nextTask;
            return acc;
          }, {});

          if (!changed) return state;
          return { tasks: nextTasks };
        }),
    }),
    createSystemSchedulerPersistOptions<SystemSchedulerState>()
  )
);

const syncRegisteredTaskDefinitions = (): void => {
  if (!useSystemSchedulerStore.persist.hasHydrated()) return;
  const { upsertTaskDefinition } = useSystemSchedulerStore.getState();
  registeredTaskDefinitions.forEach((definition) => {
    upsertTaskDefinition(definition);
  });
};

export const appendSystemScheduledTaskLog = (
  taskId: string,
  payload: {
    level: SystemScheduledTaskLogLevel;
    message: string;
    details?: string;
  }
): void => {
  useSystemSchedulerStore.getState().appendTaskLog(taskId, payload);
};

export const clearSystemScheduledTaskLogs = (taskId: string): void => {
  useSystemSchedulerStore.getState().clearTaskLogs(taskId);
};

export const registerSystemScheduledTask = (definition: SystemScheduledTaskDefinition): void => {
  if (!definition?.id) return;
  const taskMeta: SystemTaskDefinitionMeta = {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    defaultEnabled: definition.defaultEnabled ?? true,
    defaultIntervalMinutes: normalizeTaskIntervalMinutes(definition.defaultIntervalMinutes),
    defaultIntervalUnit: normalizeTaskIntervalUnit(definition.defaultIntervalUnit),
  };

  registeredTaskRunners.set(definition.id, definition.run);
  registeredTaskDefinitions.set(definition.id, taskMeta);

  if (useSystemSchedulerStore.persist.hasHydrated()) {
    useSystemSchedulerStore.getState().upsertTaskDefinition(taskMeta);
  }
};

const runTaskInternal = async (taskId: string): Promise<void> => {
  const taskRunner = registeredTaskRunners.get(taskId);
  if (!taskRunner) return;

  let canRun = false;
  useSystemSchedulerStore.setState((state) => {
    const task = state.tasks[taskId];
    const taskEnabled = normalizeTaskEnabled(task?.enabled, true);
    if (!task || !taskEnabled || task.isRunning) return state;
    canRun = true;
    return {
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...task,
          isRunning: true,
          lastError: null,
          updatedAt: now(),
        },
      },
    };
  });

  if (!canRun) return;

  appendSystemScheduledTaskLog(taskId, {
    level: 'info',
    message: '任务开始执行',
  });

  const startedAt = now();
  let errorMessage: string | null = null;

  try {
    await Promise.resolve(taskRunner());
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Task execution failed';
    console.error(`[SystemScheduler] Task "${taskId}" failed:`, error);
  }

  const finishedAt = now();
  useSystemSchedulerStore.setState((state) => {
    const task = state.tasks[taskId];
    if (!task) return state;
    const taskEnabled = normalizeTaskEnabled(task.enabled, true);
    const nextRunAt = taskEnabled ? finishedAt + task.intervalMinutes * 60 * 1000 : null;
    return {
      tasks: {
        ...state.tasks,
        [taskId]: {
          ...task,
          isRunning: false,
          runCount: task.runCount + 1,
          lastRunAt: finishedAt,
          nextRunAt,
          lastDurationMs: Math.max(0, finishedAt - startedAt),
          lastError: errorMessage,
          updatedAt: finishedAt,
        },
      },
    };
  });

  if (errorMessage) {
    appendSystemScheduledTaskLog(taskId, {
      level: 'error',
      message: '任务执行失败',
      details: errorMessage,
    });
  } else {
    appendSystemScheduledTaskLog(taskId, {
      level: 'info',
      message: `任务执行完成（耗时 ${Math.max(0, finishedAt - startedAt)}ms）`,
    });
  }
};

export const runSystemScheduledTaskNow = async (taskId: string): Promise<void> => {
  if (!taskId) return;
  if (!useSystemSchedulerStore.persist.hasHydrated()) {
    await useSystemSchedulerStore.persist.rehydrate();
  }
  const task = useSystemSchedulerStore.getState().tasks[taskId];
  const taskEnabled = normalizeTaskEnabled(task?.enabled, true);
  if (!task || !taskEnabled) return;
  await runTaskInternal(taskId);
};

const runDueSystemTasks = (): void => {
  if (!useSystemSchedulerStore.persist.hasHydrated()) return;
  const timestamp = now();
  const dueTaskIds = Object.values(useSystemSchedulerStore.getState().tasks)
    .filter(
      (task) =>
        normalizeTaskEnabled(task.enabled, true) &&
        !task.isRunning &&
        (task.nextRunAt === null || task.nextRunAt <= timestamp)
    )
    .map((task) => task.id);

  dueTaskIds.forEach((taskId) => {
    void runTaskInternal(taskId);
  });
};

let schedulerTicker: number | null = null;
let schedulerHydrationWatcherBound = false;

export const initializeSystemScheduler = (): void => {
  if (typeof window === 'undefined') return;

  const bootstrapSchedulerAfterHydration = () => {
    syncRegisteredTaskDefinitions();
    useSystemSchedulerStore.getState().resetRuntimeTaskStates();
    runDueSystemTasks();
  };

  if (useSystemSchedulerStore.persist.hasHydrated()) {
    bootstrapSchedulerAfterHydration();
  } else {
    void useSystemSchedulerStore.persist.rehydrate();
  }

  if (!schedulerTicker) {
    schedulerTicker = window.setInterval(runDueSystemTasks, SCHEDULER_TICK_MS);
  }

  if (!schedulerHydrationWatcherBound) {
    schedulerHydrationWatcherBound = true;
    useSystemSchedulerStore.persist.onFinishHydration(() => {
      bootstrapSchedulerAfterHydration();
    });
  }
};
