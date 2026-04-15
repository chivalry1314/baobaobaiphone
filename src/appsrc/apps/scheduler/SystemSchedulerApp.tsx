import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlarmClock, ChevronDown, ChevronLeft, Clock3, Play, RefreshCw, Trash2 } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import {
  runSystemScheduledTaskNow,
  useSystemSchedulerStore,
  type SystemScheduledTask,
  type SystemScheduledTaskLog,
} from '../../../core/systemScheduler';

interface SystemSchedulerAppProps {
  onClose: () => void;
}

const formatTaskTime = (timestamp: number | null): string => {
  if (!timestamp) return '未执行';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatDuration = (durationMs: number | null): string => {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) return '--';
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
};

const buildTaskStateLabel = (task: SystemScheduledTask): string => {
  if (!task.enabled) return '已停用';
  if (task.isRunning) return '执行中';
  if (task.lastError) return '上次失败';
  return '运行正常';
};

const formatLogTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const renderTaskLogs = (logs: SystemScheduledTaskLog[]) => {
  if (logs.length === 0) {
    return <p className="mt-2 text-[12px] text-slate-400">暂无日志</p>;
  }

  return (
    <div className="mt-2 max-h-28 overflow-y-auto space-y-1.5 pr-1">
      {[...logs]
        .slice(-8)
        .reverse()
        .map((log) => (
          <div
            key={log.id}
            className={`rounded-lg border px-2.5 py-1.5 text-[12px] ${
              log.level === 'error'
                ? 'border-rose-200 bg-rose-50/80 text-rose-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <p className="font-medium">{`${formatLogTime(log.timestamp)} · ${log.message}`}</p>
            {log.details ? <p className="mt-0.5 break-words opacity-90">{log.details}</p> : null}
          </div>
        ))}
    </div>
  );
};

export const SystemSchedulerApp: React.FC<SystemSchedulerAppProps> = ({ onClose }) => {
  const taskMap = useSystemSchedulerStore((state) => state.tasks);
  const taskLogsByTask = useSystemSchedulerStore((state) => state.taskLogsByTask);
  const setTaskEnabled = useSystemSchedulerStore((state) => state.setTaskEnabled);
  const setTaskIntervalMinutes = useSystemSchedulerStore((state) => state.setTaskIntervalMinutes);
  const setTaskIntervalUnit = useSystemSchedulerStore((state) => state.setTaskIntervalUnit);
  const clearTaskLogs = useSystemSchedulerStore((state) => state.clearTaskLogs);

  const taskList = useMemo(() => Object.values(taskMap), [taskMap]);
  const tasks = useMemo(
    () => [...taskList].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
    [taskList]
  );

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 22, stiffness: 210 }}
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-[#f5f8ff] via-[#f7fbff] to-[#f8fafc] text-slate-800"
    >
      <header className="px-3 pt-11 pb-3 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-2 inline-flex items-center gap-1.5 text-slate-700 active:opacity-70"
            aria-label="返回桌面"
          >
            <ChevronLeft size={24} />
            <span className="text-[16px] font-medium">返回</span>
          </button>
          <div className="ml-1">
            <h1 className="text-[18px] font-semibold tracking-wide">系统定时任务</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              配置任务扫描频率，并查看自动任务执行日志
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {tasks.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-[0_20px_40px_-34px_rgba(15,23,42,0.3)]">
            <AlarmClock size={26} className="mx-auto text-slate-400" />
            <p className="mt-3 text-[16px] font-semibold text-slate-700">暂无可配置的任务</p>
            <p className="mt-1 text-[13px] text-slate-500">应用注册任务后会自动出现在这里</p>
          </section>
        ) : (
          <section className="space-y-3">
            {tasks.map((task) => {
              const taskLogs = taskLogsByTask[task.id] ?? [];
              const intervalInputValue =
                task.intervalUnit === 'hour'
                  ? Math.max(1, Math.round(task.intervalMinutes / 60))
                  : task.intervalMinutes;
              const intervalInputMax = task.intervalUnit === 'hour' ? 24 : 1440;
              const intervalInputLabel = task.intervalUnit === 'hour' ? '小时' : '分钟';
              const intervalUnitSelectTone =
                task.intervalUnit === 'hour'
                  ? 'border-amber-200/90 from-amber-50/80 to-white text-amber-700 focus:border-amber-400 focus:ring-amber-100'
                  : 'border-sky-200/90 from-sky-50/80 to-white text-sky-700 focus:border-sky-400 focus:ring-sky-100';
              const intervalUnitIconTone = task.intervalUnit === 'hour' ? 'text-amber-500' : 'text-sky-500';
              return (
                <article
                  key={task.id}
                  className="rounded-3xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.32)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-600 grid place-items-center">
                      <AlarmClock size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[16px] font-semibold text-slate-800 truncate">{task.name}</h2>
                        <button
                          type="button"
                          onClick={() => setTaskEnabled(task.id, !task.enabled)}
                          className={`h-7 min-w-[54px] rounded-full px-2 text-[12px] font-medium transition-colors ${
                            task.enabled
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-500/90 text-white'
                          }`}
                        >
                          {task.enabled ? '停用' : '启用'}
                        </button>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500 leading-5">{task.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
                    <p>状态：{buildTaskStateLabel(task)}</p>
                    <p>累计执行：{task.runCount} 次</p>
                    <p>上次执行：{formatTaskTime(task.lastRunAt)}</p>
                    <p>下次执行：{formatTaskTime(task.nextRunAt)}</p>
                    <p>耗时：{formatDuration(task.lastDurationMs)}</p>
                    <p className={task.lastError ? 'text-rose-500' : ''}>
                      错误：{task.lastError?.trim() || '--'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-end gap-3">
                    <label className="flex-1">
                      <span className="text-[12px] text-slate-500">{`扫描间隔（${intervalInputLabel}）`}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={intervalInputMax}
                          step={1}
                          value={intervalInputValue}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            if (!Number.isFinite(nextValue)) return;
                            const nextMinutes =
                              task.intervalUnit === 'hour' ? nextValue * 60 : nextValue;
                            setTaskIntervalMinutes(task.id, nextMinutes);
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[14px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        />
                        <div className="relative shrink-0">
                          <Clock3
                            size={13}
                            className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${intervalUnitIconTone}`}
                          />
                          <select
                            value={task.intervalUnit}
                            onChange={(event) =>
                              setTaskIntervalUnit(task.id, event.target.value as 'minute' | 'hour')
                            }
                            className={`peer h-10 min-w-[94px] appearance-none rounded-xl border bg-gradient-to-b pl-7 pr-7 text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition ${intervalUnitSelectTone}`}
                          >
                            <option value="minute">分钟</option>
                            <option value="hour">小时</option>
                          </select>
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-slate-600"
                          />
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        void runSystemScheduledTaskNow(task.id);
                      }}
                      disabled={task.isRunning || !task.enabled}
                      className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {task.isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                      立即执行
                    </button>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-medium text-slate-700">执行日志</p>
                      <button
                        type="button"
                        onClick={() => clearTaskLogs(task.id)}
                        className="h-6 rounded-full border border-slate-200 px-2 text-[11px] text-slate-500 inline-flex items-center gap-1 active:opacity-70"
                      >
                        <Trash2 size={11} />
                        清空
                      </button>
                    </div>
                    {renderTaskLogs(taskLogs)}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </motion.div>
  );
};

export type { SystemSchedulerAppProps };
