import type { DailyScriptExecutionLog, DailyScriptPlan, DailyScriptStep } from '../types';
import { MAX_LOGS } from './constants';
import { generateId, parseTimeMinutes, toDayKey, toDedupeKey } from './helpers';

export const appendLog = (
  logs: DailyScriptExecutionLog[],
  payload: Omit<DailyScriptExecutionLog, 'id' | 'executedAt'>
): DailyScriptExecutionLog[] => {
  const nextLog: DailyScriptExecutionLog = {
    id: `dailyscript-log-${generateId()}`,
    executedAt: Date.now(),
    ...payload,
  };
  return [nextLog, ...logs].slice(0, MAX_LOGS);
};

export interface DueStepCandidate {
  plan: DailyScriptPlan;
  step: DailyScriptStep;
  dayKey: string;
}

export const collectDueSteps = (
  plans: DailyScriptPlan[],
  logs: DailyScriptExecutionLog[],
  now: number
): DueStepCandidate[] => {
  const dayKey = toDayKey(now);
  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const executedKeySet = new Set<string>();

  logs
    .filter((item) => item.dayKey === dayKey)
    .forEach((item) => {
      executedKeySet.add(toDedupeKey(item.planId, item.stepId, item.dayKey, item.scheduledTime));
    });

  const due: DueStepCandidate[] = [];

  plans
    .filter((plan) => plan.enabled && plan.dateKey === dayKey && Boolean(plan.executorRoleId.trim()))
    .forEach((plan) => {
      plan.steps
        .filter((step) => step.enabled)
        .forEach((step) => {
          const stepMinutes = parseTimeMinutes(step.time);
          if (stepMinutes > nowMinutes) return;

          const dedupeKey = toDedupeKey(plan.id, step.id, dayKey, step.time);
          if (executedKeySet.has(dedupeKey)) return;

          due.push({
            plan,
            step,
            dayKey,
          });
        });
    });

  return due.sort((left, right) => parseTimeMinutes(left.step.time) - parseTimeMinutes(right.step.time));
};
