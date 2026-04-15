import React from 'react';
import { Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { LogItem, RoleName, StepItem } from '../components';
import type { DailyScriptExecutionLog, DailyScriptPlan, DailyScriptStep } from '../types';

interface DaySettingsViewProps {
  selectedRoleId: string | null;
  selectedDateKey: string | null;
  selectedDayPlans: DailyScriptPlan[];
  selectedDayLogs: DailyScriptExecutionLog[];
  planNameDrafts: Record<string, string>;
  isRunningNow: boolean;
  canRunNow: boolean;
  runSummary: string;
  formatDateKeyLabel: (dateKey: string) => string;
  onAddPlan: () => void;
  onOpenAiCreate: () => void;
  onRunNow: () => void;
  onSetPlanNameDraft: (planId: string, value: string) => void;
  onCommitPlanName: (planId: string, fallbackName: string) => void;
  onSetPlanEnabled: (planId: string, enabled: boolean) => void;
  onRemovePlan: (planId: string, planName: string) => void;
  onOpenCreateStep: (planId: string) => void;
  onOpenEditStep: (planId: string, step: DailyScriptStep) => void;
  onRemoveStep: (planId: string, stepId: string) => void;
  onToggleStepEnabled: (planId: string, stepId: string, enabled: boolean) => void;
  onClearLogs: () => void;
}

export const DaySettingsView: React.FC<DaySettingsViewProps> = ({
  selectedRoleId,
  selectedDateKey,
  selectedDayPlans,
  selectedDayLogs,
  planNameDrafts,
  isRunningNow,
  canRunNow,
  runSummary,
  formatDateKeyLabel,
  onAddPlan,
  onOpenAiCreate,
  onRunNow,
  onSetPlanNameDraft,
  onCommitPlanName,
  onSetPlanEnabled,
  onRemovePlan,
  onOpenCreateStep,
  onOpenEditStep,
  onRemoveStep,
  onToggleStepEnabled,
  onClearLogs,
}) => {
  return (
    <>
      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
        <p className="text-[13px] text-slate-600">
          执行角色：{selectedRoleId ? <RoleName roleId={selectedRoleId} /> : '未选择'}
        </p>
        <p className="text-[13px] text-slate-600 mt-1">
          目标日期：{selectedDateKey ? formatDateKeyLabel(selectedDateKey) : '未选择'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddPlan}
            className="h-9 rounded-xl bg-indigo-500 text-white px-3 text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            新建剧本
          </button>
          <button
            type="button"
            onClick={onOpenAiCreate}
            className="h-9 rounded-xl bg-violet-500 text-white px-3 text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            <Sparkles size={15} />
            AI 自动生成
          </button>
          <button
            type="button"
            onClick={onRunNow}
            disabled={isRunningNow || !canRunNow}
            className={`h-9 rounded-xl px-3 text-[13px] font-medium inline-flex items-center gap-1.5 ${
              isRunningNow || !canRunNow
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white'
            }`}
          >
            <Play size={15} />
            {isRunningNow ? '执行中...' : '执行今天到点步骤'}
          </button>
        </div>
        {!canRunNow ? (
          <p className="mt-2 text-[12px] text-amber-700">
            只能立即执行“今天”的剧本。当前日期仅用于配置，不会触发执行。
          </p>
        ) : null}
        {runSummary ? <p className="mt-2 text-[12px] text-slate-600">{runSummary}</p> : null}
      </section>

      {selectedDayPlans.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/75 px-4 py-10 text-center">
          <p className="text-[15px] font-medium text-slate-700">当天还没有剧本</p>
          <p className="mt-1 text-[12px] text-slate-500">
            点击“新建剧本”，为该角色在这一天添加流程安排。
          </p>
        </section>
      ) : (
        selectedDayPlans.map((plan) => (
          <section
            key={plan.id}
            className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={planNameDrafts[plan.id] ?? plan.name}
                  onChange={(event) => onSetPlanNameDraft(plan.id, event.target.value)}
                  onBlur={() => onCommitPlanName(plan.id, plan.name)}
                  placeholder="剧本名称"
                  className="w-full rounded-xl border border-indigo-100 bg-indigo-50/35 px-3 py-2 text-[14px] font-medium outline-none focus:border-indigo-300"
                />
                <p className="mt-1 text-[12px] text-slate-500">步骤数：{plan.steps.length}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={plan.enabled}
                    onChange={(event) => onSetPlanEnabled(plan.id, event.target.checked)}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  启用
                </label>
                <button
                  type="button"
                  onClick={() => onRemovePlan(plan.id, plan.name)}
                  className="h-8 rounded-lg bg-rose-100 px-2 text-rose-700 inline-flex items-center justify-center"
                  aria-label="删除剧本"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {plan.steps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-5 text-center text-[12px] text-slate-500">
                暂无步骤，点击下方按钮添加。
              </div>
            ) : (
              <div className="space-y-2">
                {plan.steps.map((step) => (
                  <StepItem
                    key={step.id}
                    planId={plan.id}
                    step={step}
                    onEdit={onOpenEditStep}
                    onRemove={onRemoveStep}
                    onToggleEnabled={onToggleStepEnabled}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenCreateStep(plan.id)}
              className="w-full h-9 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[13px] font-medium inline-flex items-center justify-center gap-1"
            >
              <Plus size={15} />
              添加步骤
            </button>
          </section>
        ))
      )}

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900">当天执行日志</h2>
          <button
            type="button"
            onClick={onClearLogs}
            className="h-8 rounded-xl bg-slate-100 px-3 text-[12px] text-slate-700"
          >
            清空全部日志
          </button>
        </div>
        {selectedDayLogs.length === 0 ? (
          <p className="mt-3 text-[12px] text-slate-500">这一天还没有执行记录。</p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedDayLogs.slice(0, 60).map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};
