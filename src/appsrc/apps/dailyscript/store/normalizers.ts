import type {
  DailyScriptActionPayload,
  DailyScriptDiaryActionPayload,
  DailyScriptDreamMusicCommentTrackPayload,
  DailyScriptExecutionLog,
  DailyScriptLoveSpaceAddMomentPayload,
  DailyScriptLoveSpaceCompleteCheckInTaskPayload,
  DailyScriptLoveSpaceRelationPayload,
  DailyScriptPlan,
  DailyScriptStep,
  DailyScriptWeChatActionPayload,
} from '../types';
import { DEFAULT_PLAN_NAME } from './constants';
import {
  isObject,
  parseTimeMinutes,
  sanitizeDateKey,
  sanitizeText,
  sanitizeTime,
} from './helpers';

export const createDefaultDiaryPayload = (): DailyScriptDiaryActionPayload => ({
  title: '',
  content: '',
  mood: '',
  tags: [],
  syncToMemory: true,
});

export const createDefaultWeChatPayload = (): DailyScriptWeChatActionPayload => ({
  content: '',
  targetUserRoleId: 'default-self',
});

export const createDefaultLoveSpaceRelationPayload = (): DailyScriptLoveSpaceRelationPayload => ({
  targetRelationId: '',
  targetRelationLabel: '',
  targetOwnerRoleId: '',
  targetBondId: '',
});

export const createDefaultLoveSpaceAddMomentPayload = (): DailyScriptLoveSpaceAddMomentPayload => ({
  ...createDefaultLoveSpaceRelationPayload(),
  content: '',
});

export const createDefaultLoveSpaceCompleteCheckInTaskPayload =
  (): DailyScriptLoveSpaceCompleteCheckInTaskPayload => ({
    ...createDefaultLoveSpaceRelationPayload(),
    owner: 'mine',
    taskId: '',
    templateId: '',
    title: '',
  });

export const createDefaultDreamMusicCommentTrackPayload =
  (): DailyScriptDreamMusicCommentTrackPayload => ({
    targetTrackId: '',
    targetTrackTitle: '',
  });

export const normalizeDiaryPayload = (value: unknown): DailyScriptDiaryActionPayload => {
  if (!isObject(value)) return createDefaultDiaryPayload();

  const tags = Array.isArray(value.tags)
    ? value.tags
        .map((item) => sanitizeText(item, 20))
        .filter(Boolean)
        .slice(0, 16)
    : [];

  return {
    title: sanitizeText(value.title, 80),
    content: sanitizeText(value.content, 5000),
    mood: sanitizeText(value.mood, 30),
    tags,
    syncToMemory: value.syncToMemory !== false,
  };
};

export const normalizeWeChatPayload = (value: unknown): DailyScriptWeChatActionPayload => {
  if (!isObject(value)) return createDefaultWeChatPayload();

  return {
    content: sanitizeText(value.content, 2000),
    targetUserRoleId: sanitizeText(value.targetUserRoleId, 120) || 'default-self',
  };
};

export const normalizeLoveSpaceRelationPayload = (
  value: unknown
): DailyScriptLoveSpaceRelationPayload => {
  if (!isObject(value)) return createDefaultLoveSpaceRelationPayload();

  return {
    targetRelationId: sanitizeText(value.targetRelationId, 160),
    targetRelationLabel: sanitizeText(value.targetRelationLabel, 160),
    targetOwnerRoleId: sanitizeText(value.targetOwnerRoleId, 120),
    targetBondId: sanitizeText(value.targetBondId, 120),
  };
};

export const normalizeLoveSpaceAddMomentPayload = (
  value: unknown
): DailyScriptLoveSpaceAddMomentPayload => {
  if (!isObject(value)) return createDefaultLoveSpaceAddMomentPayload();
  const relation = normalizeLoveSpaceRelationPayload(value);
  const imageDataUrl = sanitizeText(value.imageDataUrl, 12000);

  return {
    ...relation,
    content: sanitizeText(value.content, 2000),
    imageDataUrl: imageDataUrl || undefined,
  };
};

export const normalizeLoveSpaceCompleteCheckInTaskPayload = (
  value: unknown
): DailyScriptLoveSpaceCompleteCheckInTaskPayload => {
  if (!isObject(value)) return createDefaultLoveSpaceCompleteCheckInTaskPayload();
  const relation = normalizeLoveSpaceRelationPayload(value);

  return {
    ...relation,
    owner: value.owner === 'partner' ? 'partner' : 'mine',
    taskId: sanitizeText(value.taskId, 120),
    templateId: sanitizeText(value.templateId, 120),
    title: sanitizeText(value.title, 60),
  };
};

export const normalizeDreamMusicCommentTrackPayload = (
  value: unknown
): DailyScriptDreamMusicCommentTrackPayload => {
  if (!isObject(value)) return createDefaultDreamMusicCommentTrackPayload();

  return {
    targetTrackId: sanitizeText(value.targetTrackId, 160),
    targetTrackTitle: sanitizeText(value.targetTrackTitle, 120),
  };
};

export const normalizeActionType = (value: unknown): DailyScriptStep['actionType'] =>
  value === 'dailywords.writeDiary' ||
  value === 'wechat.sendMessageToUser' ||
  value === 'lovespace.addMoment' ||
  value === 'lovespace.completeCheckInTask' ||
  value === 'dreammusic.commentTrack'
    ? value
    : 'dailywords.writeDiary';

export const normalizePayloadByActionType = (
  actionType: DailyScriptStep['actionType'],
  payload: unknown
): DailyScriptActionPayload => {
  if (actionType === 'dailywords.writeDiary') {
    return normalizeDiaryPayload(payload);
  }
  if (actionType === 'wechat.sendMessageToUser') {
    return normalizeWeChatPayload(payload);
  }
  if (actionType === 'lovespace.addMoment') {
    return normalizeLoveSpaceAddMomentPayload(payload);
  }
  if (actionType === 'dreammusic.commentTrack') {
    return normalizeDreamMusicCommentTrackPayload(payload);
  }
  return normalizeLoveSpaceCompleteCheckInTaskPayload(payload);
};

export const sanitizeStep = (value: unknown): DailyScriptStep | null => {
  if (!isObject(value)) return null;
  const id = sanitizeText(value.id, 120);
  if (!id) return null;

  const actionType = normalizeActionType(value.actionType);
  const now = Date.now();
  const createdAt =
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : now;
  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : createdAt;

  return {
    id,
    name: sanitizeText(value.name, 60),
    time: sanitizeTime(value.time),
    actionType,
    payload: normalizePayloadByActionType(actionType, value.payload),
    enabled: value.enabled !== false,
    createdAt,
    updatedAt,
  };
};

export const sanitizePlan = (value: unknown): DailyScriptPlan | null => {
  if (!isObject(value)) return null;
  const id = sanitizeText(value.id, 120);
  if (!id) return null;

  const now = Date.now();
  const createdAt =
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : now;
  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : createdAt;

  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  const stepIdSet = new Set<string>();
  const steps = rawSteps
    .map((item) => sanitizeStep(item))
    .filter((item): item is DailyScriptStep => Boolean(item))
    .filter((item) => {
      if (stepIdSet.has(item.id)) return false;
      stepIdSet.add(item.id);
      return true;
    })
    .sort((left, right) => parseTimeMinutes(left.time) - parseTimeMinutes(right.time));

  const executorRoleId = sanitizeText(value.executorRoleId, 120);
  const legacyExecutorRoleId =
    executorRoleId ||
    rawSteps
      .map((item) => (isObject(item) ? sanitizeText(item.roleId, 120) : ''))
      .find((item) => Boolean(item)) ||
    '';

  return {
    id,
    name: sanitizeText(value.name, 60) || DEFAULT_PLAN_NAME,
    executorRoleId: executorRoleId || legacyExecutorRoleId,
    dateKey: sanitizeDateKey(value.dateKey, createdAt),
    enabled: value.enabled !== false,
    steps,
    createdAt,
    updatedAt,
  };
};

export const sanitizeLog = (value: unknown): DailyScriptExecutionLog | null => {
  if (!isObject(value)) return null;
  const id = sanitizeText(value.id, 120);
  if (!id) return null;

  const status =
    value.status === 'success' || value.status === 'failed' || value.status === 'skipped'
      ? value.status
      : 'failed';

  return {
    id,
    planId: sanitizeText(value.planId, 120),
    planName: sanitizeText(value.planName, 80),
    stepId: sanitizeText(value.stepId, 120),
    stepName: sanitizeText(value.stepName, 80),
    roleId: sanitizeText(value.roleId, 120),
    actionType: normalizeActionType(value.actionType),
    dayKey: sanitizeDateKey(value.dayKey),
    scheduledTime: sanitizeTime(value.scheduledTime),
    status,
    message: sanitizeText(value.message, 300),
    executedAt:
      typeof value.executedAt === 'number' && Number.isFinite(value.executedAt)
        ? value.executedAt
        : Date.now(),
  };
};
