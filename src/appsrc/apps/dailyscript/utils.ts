import { DEFAULT_ACTIVE_ROLE_ID } from '../../shared/business/roleIdentity';
import { ACTION_LABELS } from './constants';
import type { StepEditorState } from './editorTypes';
import type {
  DailyScriptDiaryActionPayload,
  DailyScriptDreamMusicCommentTrackPayload,
  DailyScriptExecutionLog,
  DailyScriptLoveSpaceAddMomentPayload,
  DailyScriptLoveSpaceCompleteCheckInTaskPayload,
  DailyScriptStep,
  DailyScriptWeChatActionPayload,
} from './types';

export interface CalendarDayCell {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
}

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string): Date => {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const year = Number.parseInt(yearText || '', 10);
  const month = Number.parseInt(monthText || '', 10);
  const day = Number.parseInt(dayText || '', 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
};

export const formatDateKeyLabel = (dateKey: string): string => {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
};

export const buildCalendarDays = (monthCursor: Date): CalendarDayCell[] => {
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);

  const start = new Date(monthStart);
  start.setDate(monthStart.getDate() - monthStart.getDay());

  const end = new Date(monthEnd);
  end.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const cells: CalendarDayCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    cells.push({
      date: new Date(cursor),
      dateKey: toDateKey(cursor),
      inCurrentMonth: cursor.getMonth() === monthCursor.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
};

export const formatMonthLabel = (monthCursor: Date): string => {
  return monthCursor.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });
};

export const parseTagsInput = (value: string): string[] => {
  const tagSet = new Set<string>();
  value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      if (tagSet.size >= 16) return;
      tagSet.add(tag.slice(0, 20));
    });
  return [...tagSet];
};

export const formatLogTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const getStatusBadgeClassName = (status: DailyScriptExecutionLog['status']): string => {
  if (status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (status === 'skipped') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

export const getStatusLabel = (status: DailyScriptExecutionLog['status']): string => {
  if (status === 'success') return '成功';
  if (status === 'skipped') return '跳过';
  return '失败';
};

export const getStepDisplayName = (step: DailyScriptStep): string => {
  const normalizedName = step.name.trim();
  if (normalizedName) return normalizedName;
  return ACTION_LABELS[step.actionType];
};

const getRelationLabel = (
  payload: Pick<
    DailyScriptLoveSpaceAddMomentPayload | DailyScriptLoveSpaceCompleteCheckInTaskPayload,
    'targetRelationLabel' | 'targetOwnerRoleId' | 'targetBondId'
  >
): string => {
  if (payload.targetRelationLabel.trim()) return payload.targetRelationLabel.trim();
  const ownerRoleId = payload.targetOwnerRoleId.trim();
  const bondId = payload.targetBondId.trim();
  if (!ownerRoleId && !bondId) return '未选择关系';
  return `${ownerRoleId || '-'} / ${bondId || '-'}`;
};

export const getStepPayloadPreview = (step: DailyScriptStep): string => {
  if (step.actionType === 'dailywords.writeDiary') {
    const payload = step.payload as DailyScriptDiaryActionPayload;
    const title = payload.title.trim();
    const content = payload.content.trim();
    if (title && content) return `${title}：${content.slice(0, 24)}`;
    if (title) return title;
    if (content) return content.slice(0, 36);
    return '未填写每日语内容';
  }

  if (step.actionType === 'wechat.sendMessageToUser') {
    const payload = step.payload as DailyScriptWeChatActionPayload;
    return payload.content.trim().slice(0, 36) || '未填写微信消息';
  }

  if (step.actionType === 'dreammusic.commentTrack') {
    const payload = step.payload as DailyScriptDreamMusicCommentTrackPayload;
    return payload.targetTrackTitle.trim() || payload.targetTrackId.trim() || '自动选择歌曲';
  }

  if (step.actionType === 'lovespace.addMoment') {
    const payload = step.payload as DailyScriptLoveSpaceAddMomentPayload;
    const relationLabel = getRelationLabel(payload);
    const content = payload.content.trim();
    if (content) return `${relationLabel} · ${content.slice(0, 28)}`;
    if (payload.imageDataUrl?.trim()) return `${relationLabel} · 图片瞬间`;
    return `${relationLabel} · 未填写瞬间内容`;
  }

  const payload = step.payload as DailyScriptLoveSpaceCompleteCheckInTaskPayload;
  const relationLabel = getRelationLabel(payload);
  const byTitle = payload.title.trim();
  const condition = byTitle || '已选择打卡任务';
  return `${relationLabel} · ${condition}`;
};

export const buildEditorState = (planId: string, step?: DailyScriptStep): StepEditorState => {
  if (!step) {
    return {
      planId,
      name: '',
      time: '09:00',
      actionType: 'dailywords.writeDiary',
      enabled: true,
      diaryTitle: '',
      diaryContent: '',
      diaryMood: '',
      diaryTagsInput: '',
      diarySyncToMemory: true,
      wechatContent: '',
      wechatTargetUserRoleId: DEFAULT_ACTIVE_ROLE_ID,
      loveRelationId: '',
      loveRelationLabel: '',
      loveOwnerRoleId: DEFAULT_ACTIVE_ROLE_ID,
      loveBondId: '',
      loveMomentContent: '',
      loveMomentImageDataUrl: '',
      loveCheckInOwner: 'mine',
      loveCompleteTaskId: '',
      loveCompleteTemplateId: '',
      loveCompleteTitle: '',
      dreamMusicTargetTrackId: '',
      dreamMusicTargetTrackTitle: '',
    };
  }

  const diaryPayload =
    step.actionType === 'dailywords.writeDiary'
      ? (step.payload as DailyScriptDiaryActionPayload)
      : undefined;
  const wechatPayload =
    step.actionType === 'wechat.sendMessageToUser'
      ? (step.payload as DailyScriptWeChatActionPayload)
      : undefined;
  const loveMomentPayload =
    step.actionType === 'lovespace.addMoment'
      ? (step.payload as DailyScriptLoveSpaceAddMomentPayload)
      : undefined;
  const loveCompletePayload =
    step.actionType === 'lovespace.completeCheckInTask'
      ? (step.payload as DailyScriptLoveSpaceCompleteCheckInTaskPayload)
      : undefined;
  const dreamMusicPayload =
    step.actionType === 'dreammusic.commentTrack'
      ? (step.payload as DailyScriptDreamMusicCommentTrackPayload)
      : undefined;

  const relationPayload = loveMomentPayload || loveCompletePayload || undefined;

  return {
    planId,
    stepId: step.id,
    name: step.name,
    time: step.time,
    actionType: step.actionType,
    enabled: step.enabled,
    diaryTitle: diaryPayload?.title || '',
    diaryContent: diaryPayload?.content || '',
    diaryMood: diaryPayload?.mood || '',
    diaryTagsInput: (diaryPayload?.tags || []).join(','),
    diarySyncToMemory: diaryPayload?.syncToMemory !== false,
    wechatContent: wechatPayload?.content || '',
    wechatTargetUserRoleId: wechatPayload?.targetUserRoleId || DEFAULT_ACTIVE_ROLE_ID,
    loveRelationId: relationPayload?.targetRelationId || '',
    loveRelationLabel: relationPayload?.targetRelationLabel || '',
    loveOwnerRoleId: relationPayload?.targetOwnerRoleId || DEFAULT_ACTIVE_ROLE_ID,
    loveBondId: relationPayload?.targetBondId || '',
    loveMomentContent: loveMomentPayload?.content || '',
    loveMomentImageDataUrl: loveMomentPayload?.imageDataUrl || '',
    loveCheckInOwner: loveCompletePayload?.owner || 'mine',
    loveCompleteTaskId: loveCompletePayload?.taskId || '',
    loveCompleteTemplateId: loveCompletePayload?.templateId || '',
    loveCompleteTitle: loveCompletePayload?.title || '',
    dreamMusicTargetTrackId: dreamMusicPayload?.targetTrackId || '',
    dreamMusicTargetTrackTitle: dreamMusicPayload?.targetTrackTitle || '',
  };
};
