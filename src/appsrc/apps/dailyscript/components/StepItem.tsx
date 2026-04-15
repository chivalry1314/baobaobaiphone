import React from 'react';
import {
  BookText,
  CheckCircle2,
  Heart,
  MessageCircle,
  Music2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ACTION_LABELS } from '../constants';
import { getStepDisplayName, getStepPayloadPreview } from '../utils';
import type { DailyScriptStep } from '../types';

interface StepItemProps {
  planId: string;
  step: DailyScriptStep;
  onEdit: (planId: string, step: DailyScriptStep) => void;
  onRemove: (planId: string, stepId: string) => void;
  onToggleEnabled: (planId: string, stepId: string, enabled: boolean) => void;
}

const ACTION_ICON_MAP: Record<DailyScriptStep['actionType'], React.ComponentType<{ size?: number; className?: string }>> = {
  'dailywords.writeDiary': BookText,
  'wechat.sendMessageToUser': MessageCircle,
  'lovespace.addMoment': Heart,
  'lovespace.completeCheckInTask': CheckCircle2,
  'dreammusic.commentTrack': Music2,
};

export const StepItem: React.FC<StepItemProps> = ({
  planId,
  step,
  onEdit,
  onRemove,
  onToggleEnabled,
}) => {
  const ActionIcon = ACTION_ICON_MAP[step.actionType];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            <ActionIcon size={14} className="text-slate-500" />
            <span>{step.time}</span>
            <span className="text-slate-300">|</span>
            <span>{getStepDisplayName(step)}</span>
          </div>
          <p className="mt-1 text-[12px] text-slate-600 break-words">
            {ACTION_LABELS[step.actionType]}：{getStepPayloadPreview(step)}
          </p>
        </div>
        <label className="inline-flex items-center gap-1 text-[12px] text-slate-500">
          <input
            type="checkbox"
            checked={step.enabled}
            onChange={(event) => onToggleEnabled(planId, step.id, event.target.checked)}
            className="h-4 w-4 accent-indigo-500"
          />
          启用
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onEdit(planId, step)}
          className="h-8 rounded-xl bg-slate-100 text-slate-700 text-[12px] font-medium inline-flex items-center justify-center gap-1"
        >
          <Pencil size={13} />
          编辑
        </button>
        <button
          type="button"
          onClick={() => onRemove(planId, step.id)}
          className="h-8 rounded-xl bg-rose-100 text-rose-700 text-[12px] font-medium inline-flex items-center justify-center gap-1"
        >
          <Trash2 size={13} />
          删除
        </button>
      </div>
    </article>
  );
};
