import {
  appendSystemScheduledTaskLog,
  registerSystemScheduledTask,
  runSystemScheduledTaskNow,
} from '../../../core/systemScheduler';
import { useLoveSpaceStore } from './store';

export const LOVE_SPACE_TIMELINE_TASK_ID = 'lovespace-timeline-scan';
const DEFAULT_TIMELINE_SCAN_INTERVAL_HOURS = 12;

let runningSyncPromise: Promise<void> | null = null;

const runTimelineSyncWithSingleFlight = async (): Promise<void> => {
  if (runningSyncPromise) {
    await runningSyncPromise;
    return;
  }

  runningSyncPromise = useLoveSpaceStore
    .getState()
    .syncImportantTimelinesByModel()
    .finally(() => {
      runningSyncPromise = null;
    });

  await runningSyncPromise;
};

registerSystemScheduledTask({
  id: LOVE_SPACE_TIMELINE_TASK_ID,
  name: '情侣空间小时刻扫描',
  description: '按定时任务扫描记忆中心记录，并由记忆模型提取重要事件。',
  defaultEnabled: false,
  defaultIntervalMinutes: DEFAULT_TIMELINE_SCAN_INTERVAL_HOURS * 60,
  defaultIntervalUnit: 'hour',
  run: async () => {
    appendSystemScheduledTaskLog(LOVE_SPACE_TIMELINE_TASK_ID, {
      level: 'info',
      message: '开始扫描小时刻增量记录',
    });
    await runTimelineSyncWithSingleFlight();
    appendSystemScheduledTaskLog(LOVE_SPACE_TIMELINE_TASK_ID, {
      level: 'info',
      message: '小时刻增量扫描完成',
    });
  },
});

if (useLoveSpaceStore.persist.hasHydrated()) {
  void runSystemScheduledTaskNow(LOVE_SPACE_TIMELINE_TASK_ID);
} else {
  useLoveSpaceStore.persist.onFinishHydration(() => {
    void runSystemScheduledTaskNow(LOVE_SPACE_TIMELINE_TASK_ID);
  });
}
