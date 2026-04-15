import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAppPersistOptions } from '../../../core/persistOptions';
import {
  executeDailyScriptAction,
  type DailyScriptExecutionResult,
} from '../../shared/business/dailyscript/actionBridge';
import type {
  DailyScriptExecutionLog,
  DailyScriptPlan,
  DailyScriptStep,
  DailyScriptStore,
} from './types';
import { DEFAULT_PLAN_NAME, MAX_LOGS } from './store/constants';
import { appendLog, collectDueSteps } from './store/execution';
import {
  generateId,
  parseTimeMinutes,
  sanitizeDateKey,
  sanitizeText,
  sanitizeTime,
  sortPlans,
} from './store/helpers';
import {
  normalizeActionType,
  normalizePayloadByActionType,
  sanitizeLog,
  sanitizePlan,
} from './store/normalizers';

let runningPromise:
  | Promise<{
      executed: number;
      failed: number;
      skipped: number;
    }>
  | null = null;

export const useDailyScriptStore = create<DailyScriptStore>()(
  persist(
    (set) => ({
      plans: [],
      logs: [],

      addPlan: (name, executorRoleId, dateKey) => {
        const now = Date.now();
        const planId = `dailyscript-plan-${generateId()}`;
        const nextPlan: DailyScriptPlan = {
          id: planId,
          name: sanitizeText(name, 60) || DEFAULT_PLAN_NAME,
          executorRoleId: sanitizeText(executorRoleId, 120),
          dateKey: sanitizeDateKey(dateKey, now),
          enabled: true,
          steps: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          plans: sortPlans([...state.plans, nextPlan]),
        }));
        return planId;
      },

      renamePlan: (planId, name) => {
        const normalizedPlanId = planId.trim();
        const nextName = sanitizeText(name, 60);
        if (!normalizedPlanId || !nextName) return;

        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === normalizedPlanId
              ? {
                  ...plan,
                  name: nextName,
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      removePlan: (planId) => {
        const normalizedPlanId = planId.trim();
        if (!normalizedPlanId) return;

        set((state) => ({
          plans: state.plans.filter((plan) => plan.id !== normalizedPlanId),
        }));
      },

      setPlanEnabled: (planId, enabled) => {
        const normalizedPlanId = planId.trim();
        if (!normalizedPlanId) return;

        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === normalizedPlanId
              ? {
                  ...plan,
                  enabled,
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      setPlanExecutorRole: (planId, executorRoleId) => {
        const normalizedPlanId = planId.trim();
        if (!normalizedPlanId) return;
        const nextExecutorRoleId = sanitizeText(executorRoleId, 120);

        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === normalizedPlanId
              ? {
                  ...plan,
                  executorRoleId: nextExecutorRoleId,
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      upsertStep: (planId, input) => {
        const normalizedPlanId = planId.trim();
        if (!normalizedPlanId) return;

        const now = Date.now();
        const normalizedStepId = input.stepId?.trim();
        const actionType = normalizeActionType(input.actionType);
        const nextStep: DailyScriptStep = {
          id: normalizedStepId || `dailyscript-step-${generateId()}`,
          name: sanitizeText(input.name, 60),
          time: sanitizeTime(input.time),
          actionType,
          payload: normalizePayloadByActionType(actionType, input.payload),
          enabled: input.enabled !== false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== normalizedPlanId) return plan;

            const targetIndex = normalizedStepId
              ? plan.steps.findIndex((step) => step.id === normalizedStepId)
              : -1;
            const nextSteps = [...plan.steps];

            if (targetIndex >= 0) {
              const previousStep = nextSteps[targetIndex];
              nextSteps[targetIndex] = {
                ...nextStep,
                id: previousStep.id,
                createdAt: previousStep.createdAt,
              };
            } else {
              nextSteps.push(nextStep);
            }

            nextSteps.sort((left, right) => parseTimeMinutes(left.time) - parseTimeMinutes(right.time));

            return {
              ...plan,
              steps: nextSteps,
              updatedAt: now,
            };
          }),
        }));
      },

      removeStep: (planId, stepId) => {
        const normalizedPlanId = planId.trim();
        const normalizedStepId = stepId.trim();
        if (!normalizedPlanId || !normalizedStepId) return;

        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === normalizedPlanId
              ? {
                  ...plan,
                  steps: plan.steps.filter((step) => step.id !== normalizedStepId),
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      setStepEnabled: (planId, stepId, enabled) => {
        const normalizedPlanId = planId.trim();
        const normalizedStepId = stepId.trim();
        if (!normalizedPlanId || !normalizedStepId) return;

        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === normalizedPlanId
              ? {
                  ...plan,
                  steps: plan.steps.map((step) =>
                    step.id === normalizedStepId
                      ? {
                          ...step,
                          enabled,
                          updatedAt: Date.now(),
                        }
                      : step
                  ),
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      clearLogs: () => {
        set(() => ({ logs: [] }));
      },

      runDueStepsNow: async (now = Date.now()) => {
        if (runningPromise) return runningPromise;

        runningPromise = (async () => {
          let executed = 0;
          let failed = 0;
          let skipped = 0;
          const dueSteps = collectDueSteps(
            useDailyScriptStore.getState().plans,
            useDailyScriptStore.getState().logs,
            now
          );

          for (const item of dueSteps) {
            const stepName = item.step.name || item.step.actionType;
            const executorRoleId = item.plan.executorRoleId.trim();

            if (!executorRoleId) {
              skipped += 1;
              set((state) => ({
                logs: appendLog(state.logs, {
                  planId: item.plan.id,
                  planName: item.plan.name,
                  stepId: item.step.id,
                  stepName,
                  roleId: '',
                  actionType: item.step.actionType,
                  dayKey: item.dayKey,
                  scheduledTime: item.step.time,
                  status: 'skipped',
                  message: '未配置执行角色',
                }),
              }));
              continue;
            }

            try {
              const result: DailyScriptExecutionResult = await executeDailyScriptAction({
                roleId: executorRoleId,
                actionType: item.step.actionType,
                payload: item.step.payload,
                now,
              });

              if (result.ok === false) {
                skipped += 1;
                set((state) => ({
                  logs: appendLog(state.logs, {
                    planId: item.plan.id,
                    planName: item.plan.name,
                    stepId: item.step.id,
                    stepName,
                    roleId: executorRoleId,
                    actionType: item.step.actionType,
                    dayKey: item.dayKey,
                    scheduledTime: item.step.time,
                    status: 'skipped',
                    message: result.message || '执行器返回跳过',
                  }),
                }));
                continue;
              }

              executed += 1;
              set((state) => ({
                logs: appendLog(state.logs, {
                  planId: item.plan.id,
                  planName: item.plan.name,
                  stepId: item.step.id,
                  stepName,
                  roleId: executorRoleId,
                  actionType: item.step.actionType,
                  dayKey: item.dayKey,
                  scheduledTime: item.step.time,
                  status: 'success',
                  message: result.message || '执行成功',
                }),
              }));
            } catch (error) {
              failed += 1;
              const message = error instanceof Error ? error.message : '执行失败';
              set((state) => ({
                logs: appendLog(state.logs, {
                  planId: item.plan.id,
                  planName: item.plan.name,
                  stepId: item.step.id,
                  stepName,
                  roleId: executorRoleId,
                  actionType: item.step.actionType,
                  dayKey: item.dayKey,
                  scheduledTime: item.step.time,
                  status: 'failed',
                  message,
                }),
              }));
            }
          }

          return { executed, failed, skipped };
        })().finally(() => {
          runningPromise = null;
        });

        return runningPromise;
      },
    }),
    createAppPersistOptions({
      appId: 'dailyscript',
      partialize: (state): Pick<DailyScriptStore, 'plans' | 'logs'> => ({
        plans: state.plans,
        logs: state.logs,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<DailyScriptStore> | undefined;

        const rawPlans = Array.isArray(persistedState?.plans) ? persistedState.plans : [];
        const rawLogs = Array.isArray(persistedState?.logs) ? persistedState.logs : [];
        const planIdSet = new Set<string>();

        const plans = rawPlans
          .map((item) => sanitizePlan(item))
          .filter((item): item is DailyScriptPlan => Boolean(item))
          .filter((item) => {
            if (planIdSet.has(item.id)) return false;
            planIdSet.add(item.id);
            return true;
          });
        const logs = rawLogs
          .map((item) => sanitizeLog(item))
          .filter((item): item is DailyScriptExecutionLog => Boolean(item))
          .slice(0, MAX_LOGS);

        return {
          ...current,
          plans: sortPlans(plans),
          logs,
        };
      },
    })
  )
);
