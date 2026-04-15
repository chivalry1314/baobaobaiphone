import {
  appendSystemScheduledTaskLog,
  registerSystemScheduledTask,
  runSystemScheduledTaskNow,
  useSystemSchedulerStore,
} from '../../../core/systemScheduler';
import { useDailyScriptStore } from './store';

export const DAILY_SCRIPT_TIMELINE_TASK_ID = 'dailyscript-timeline-runner';
const DEFAULT_TIMELINE_SCAN_INTERVAL_MINUTES = 60;
const LEGACY_TIMELINE_SCAN_INTERVAL_MINUTES = 1;

let runningPromise: Promise<void> | null = null;

const runDailyScriptWithSingleFlight = async (): Promise<void> => {
  if (runningPromise) {
    await runningPromise;
    return;
  }

  runningPromise = (async () => {
    const result = await useDailyScriptStore.getState().runDueStepsNow();
    appendSystemScheduledTaskLog(DAILY_SCRIPT_TIMELINE_TASK_ID, {
      level: result.failed > 0 ? 'error' : 'info',
      message: `调度完成：成功 ${result.executed}，失败 ${result.failed}，跳过 ${result.skipped}`,
    });
  })().finally(() => {
    runningPromise = null;
  });

  await runningPromise;
};

const migrateLegacyTimelineIntervalDefault = (): void => {
  const schedulerStore = useSystemSchedulerStore.getState();
  const task = schedulerStore.tasks[DAILY_SCRIPT_TIMELINE_TASK_ID];
  if (!task) return;

  const isLegacyMinuteDefault =
    task.intervalUnit === 'minute' &&
    task.intervalMinutes === LEGACY_TIMELINE_SCAN_INTERVAL_MINUTES;

  if (!isLegacyMinuteDefault) return;

  schedulerStore.setTaskIntervalUnit(DAILY_SCRIPT_TIMELINE_TASK_ID, 'hour');
  schedulerStore.setTaskIntervalMinutes(
    DAILY_SCRIPT_TIMELINE_TASK_ID,
    DEFAULT_TIMELINE_SCAN_INTERVAL_MINUTES
  );
  appendSystemScheduledTaskLog(DAILY_SCRIPT_TIMELINE_TASK_ID, {
    level: 'info',
    message: '已自动将每日剧本默认扫描间隔升级为 1 小时',
  });
};

registerSystemScheduledTask({
  id: DAILY_SCRIPT_TIMELINE_TASK_ID,
  name: '每日剧本调度',
  description: '按小时扫描并执行今天已到点的剧本步骤。',
  defaultEnabled: false,
  defaultIntervalMinutes: DEFAULT_TIMELINE_SCAN_INTERVAL_MINUTES,
  defaultIntervalUnit: 'hour',
  run: async () => {
    appendSystemScheduledTaskLog(DAILY_SCRIPT_TIMELINE_TASK_ID, {
      level: 'info',
      message: '开始扫描每日剧本到点步骤',
    });
    await runDailyScriptWithSingleFlight();
  },
});

if (useDailyScriptStore.persist.hasHydrated()) {
  migrateLegacyTimelineIntervalDefault();
  void runSystemScheduledTaskNow(DAILY_SCRIPT_TIMELINE_TASK_ID);
} else {
  useDailyScriptStore.persist.onFinishHydration(() => {
    migrateLegacyTimelineIntervalDefault();
    void runSystemScheduledTaskNow(DAILY_SCRIPT_TIMELINE_TASK_ID);
  });
}
