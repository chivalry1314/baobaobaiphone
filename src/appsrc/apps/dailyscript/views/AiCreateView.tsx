import React from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import type { DailyScriptAIDraftPlan } from '../aiPlanBuilder';
import { ACTION_LABELS } from '../constants';
import type {
  DailyScriptDiaryActionPayload,
  DailyScriptDreamMusicCommentTrackPayload,
  DailyScriptLoveSpaceAddMomentPayload,
  DailyScriptLoveSpaceCompleteCheckInTaskPayload,
  DailyScriptWeChatActionPayload,
} from '../types';

interface AiCreateViewProps {
  selectedRoleId: string | null;
  selectedRoleLabel: string;
  selectedDateKey: string | null;
  sourceText: string;
  rawDraftText: string;
  generatedPlans: DailyScriptAIDraftPlan[];
  isGenerating: boolean;
  isImporting: boolean;
  errorMessage: string;
  summaryMessage: string;
  formatDateKeyLabel: (dateKey: string) => string;
  onSourceTextChange: (value: string) => void;
  onRawDraftTextChange: (value: string) => void;
  onGenerate: () => void;
  onRefreshPreview: () => void;
  onImport: () => void;
}

const getStepPreview = (plan: DailyScriptAIDraftPlan): string => {
  const count = plan.steps.length;
  const first = plan.steps[0];
  if (!first) return `${count} 个步骤`;
  const actionLabel = ACTION_LABELS[first.actionType];
  return `${count} 个步骤 · 首步 ${first.time} ${actionLabel}`;
};

const getRelationLabel = (payload: {
  targetRelationLabel: string;
  targetOwnerRoleId: string;
  targetBondId: string;
}): string => {
  const label = payload.targetRelationLabel.trim();
  if (label) return label;
  const ownerRoleId = payload.targetOwnerRoleId.trim();
  const bondId = payload.targetBondId.trim();
  if (!ownerRoleId && !bondId) return '未选择关系';
  return `${ownerRoleId || '-'} / ${bondId || '-'}`;
};

export const AiCreateView: React.FC<AiCreateViewProps> = ({
  selectedRoleId,
  selectedRoleLabel,
  selectedDateKey,
  sourceText,
  rawDraftText,
  generatedPlans,
  isGenerating,
  isImporting,
  errorMessage,
  summaryMessage,
  formatDateKeyLabel,
  onSourceTextChange,
  onRawDraftTextChange,
  onGenerate,
  onRefreshPreview,
  onImport,
}) => {
  const planCount = generatedPlans.length;
  const stepCount = generatedPlans.reduce((sum, plan) => sum + plan.steps.length, 0);

  return (
    <>
      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-indigo-600">
          <Sparkles size={16} />
          <p className="text-[13px] font-medium">AI 自动生成剧本</p>
        </div>
        <p className="mt-2 text-[12px] text-slate-600 leading-5">
          输入你的剧本文案，AI 会先生成可编辑 JSON 草稿；你可先检查再导入。
        </p>
        <p className="mt-2 text-[12px] text-slate-500">
          已支持 AI 生成“每日语 / 微信 / 梦音乐评论 / 情侣空间（新增瞬间、完成打卡）”步骤。
        </p>
        <p className="mt-2 text-[12px] text-slate-500">
          执行角色：{selectedRoleLabel || selectedRoleId || '未选择'} · 目标日期：
          {selectedDateKey ? formatDateKeyLabel(selectedDateKey) : '未选择'}
        </p>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm space-y-3">
        <textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          placeholder="输入剧本文案，可包含时间线、消息对象、要写的内容等。"
          className="w-full min-h-[180px] rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-300 resize-none"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className={`h-10 rounded-xl px-4 text-[13px] font-medium inline-flex items-center gap-1.5 ${
              isGenerating
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-500 text-white'
            }`}
          >
            <Sparkles size={15} />
            {isGenerating ? 'AI 生成中...' : '开始分析并生成'}
          </button>
          {rawDraftText ? (
            <button
              type="button"
              onClick={onRefreshPreview}
              className="h-10 rounded-xl px-3 text-[13px] font-medium inline-flex items-center gap-1.5 bg-slate-100 text-slate-700"
            >
              <RefreshCw size={15} />
              刷新预览
            </button>
          ) : null}
        </div>
      </section>

      {errorMessage ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
          {errorMessage}
        </section>
      ) : null}

      {summaryMessage ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          {summaryMessage}
        </section>
      ) : null}

      {rawDraftText ? (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-slate-900">AI 草稿 JSON</h2>
            <p className="text-[12px] text-slate-500">
              剧本 {planCount} 个 · 步骤 {stepCount} 个
            </p>
          </div>
          <textarea
            value={rawDraftText}
            onChange={(event) => onRawDraftTextChange(event.target.value)}
            className="w-full min-h-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-relaxed font-mono outline-none focus:border-slate-300 resize-y"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onImport}
              disabled={isImporting || planCount === 0}
              className={`h-10 rounded-xl px-4 text-[13px] font-medium inline-flex items-center gap-1.5 ${
                isImporting || planCount === 0
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              <Download size={15} />
              {isImporting ? '导入中...' : '导入到当前日期'}
            </button>
            <p className="text-[12px] text-slate-500">导入前可直接修改上方 JSON 草稿。</p>
          </div>
        </section>
      ) : null}

      {generatedPlans.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-2">
          <h2 className="text-[14px] font-semibold text-slate-900">导入后预览</h2>
          {generatedPlans.map((plan, planIndex) => (
            <div
              key={`${plan.name}-${planIndex}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-slate-800">{plan.name}</p>
                <span className="text-[11px] text-slate-500">{getStepPreview(plan)}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {plan.steps.map((step, stepIndex) => (
                  <div
                    key={`${planIndex}-${stepIndex}-${step.time}`}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2"
                  >
                    <p className="text-[12px] font-medium text-slate-700">
                      {step.time} · {ACTION_LABELS[step.actionType]}
                      {step.name ? ` · ${step.name}` : ''}
                    </p>
                    {step.actionType === 'dailywords.writeDiary' ? (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                        {(() => {
                          const payload = step.payload as DailyScriptDiaryActionPayload;
                          return payload.title || payload.content || '未填写';
                        })()}
                      </p>
                    ) : step.actionType === 'wechat.sendMessageToUser' ? (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                        {(() => {
                          const payload = step.payload as DailyScriptWeChatActionPayload;
                          return payload.content || '未填写';
                        })()}
                      </p>
                    ) : step.actionType === 'dreammusic.commentTrack' ? (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                        {(() => {
                          const payload =
                            step.payload as DailyScriptDreamMusicCommentTrackPayload;
                          return (
                            payload.targetTrackTitle ||
                            payload.targetTrackId ||
                            '自动选择歌曲'
                          );
                        })()}
                      </p>
                    ) : step.actionType === 'lovespace.addMoment' ? (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                        {(() => {
                          const payload = step.payload as DailyScriptLoveSpaceAddMomentPayload;
                          const relationLabel = getRelationLabel(payload);
                          if (payload.content) return `${relationLabel} · ${payload.content}`;
                          if (payload.imageDataUrl) return `${relationLabel} · 图片瞬间`;
                          return `${relationLabel} · 未填写`;
                        })()}
                      </p>
                    ) : (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                        {(() => {
                          const payload =
                            step.payload as DailyScriptLoveSpaceCompleteCheckInTaskPayload;
                          const relationLabel = getRelationLabel(payload);
                          return `${relationLabel} · ${payload.title || '已选择打卡任务'}`;
                        })()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
};
