import type { GlobalSettings } from '@baobaobaiOS/sdk';
import { DEFAULT_ACTIVE_ROLE_ID } from '../../shared/business/roleIdentity';
import type { DailyScriptActionType } from '../../shared/business/dailyscript/actionBridge';
import { normalizeActionType, normalizePayloadByActionType } from './store/normalizers';
import { isObject, sanitizeText, sanitizeTime } from './store/helpers';
import type {
  DailyScriptActionPayload,
  DailyScriptDiaryActionPayload,
  DailyScriptDreamMusicCommentTrackPayload,
  DailyScriptLoveSpaceAddMomentPayload,
  DailyScriptLoveSpaceCompleteCheckInTaskPayload,
  DailyScriptWeChatActionPayload,
} from './types';
import { parseTagsInput } from './utils';
import { renderPaperMagicPrompt } from '../papermagic/promptCatalog';

const DEFAULT_CHAT_BASE_URL = 'https://api.openai.com/v1';

export interface DailyScriptAIDraftStep {
  name: string;
  time: string;
  actionType: DailyScriptActionType;
  payload: DailyScriptActionPayload;
  enabled: boolean;
}

export interface DailyScriptAIDraftPlan {
  name: string;
  enabled: boolean;
  steps: DailyScriptAIDraftStep[];
}

export interface RequestDailyScriptAiPlansInput {
  settings: GlobalSettings;
  dateKey: string;
  roleId: string;
  roleLabel: string;
  sourceText: string;
  allowedTargetRoleIds: string[];
  loveRelationOptions: DailyScriptAiLoveRelationOption[];
  loveCheckInTaskOptions: DailyScriptAiLoveCheckInTaskOption[];
  dreamMusicTrackOptions: DailyScriptAiDreamMusicTrackOption[];
}

export interface RequestDailyScriptAiPlansResult {
  plans: DailyScriptAIDraftPlan[];
  rawContent: string;
}

export interface DailyScriptAiLoveRelationOption {
  id: string;
  label: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

export interface DailyScriptAiLoveCheckInTaskOption {
  id: string;
  title: string;
  owner: 'mine' | 'partner';
  templateId: string;
  relationId: string;
  relationLabel: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

export interface DailyScriptAiDreamMusicTrackOption {
  id: string;
  title: string;
  artist: string;
}

export interface ParseDailyScriptAiPlansOptions {
  loveRelationOptions?: DailyScriptAiLoveRelationOption[];
  loveCheckInTaskOptions?: DailyScriptAiLoveCheckInTaskOption[];
  dreamMusicTrackOptions?: DailyScriptAiDreamMusicTrackOption[];
}

const stripTrailingSlash = (value: string): string => value.trim().replace(/\/+$/, '');

const extractContentFromChatCompletion = (rawContent: unknown): string => {
  if (typeof rawContent === 'string') return rawContent.trim();
  if (!Array.isArray(rawContent)) return '';

  return rawContent
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const text = (item as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
};

const parseModelJsonPayload = (rawText: string): unknown => {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeObject = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeObject);
    } catch {
      // continue
    }
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const maybeArray = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(maybeArray);
    } catch {
      // continue
    }
  }

  return null;
};

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeText(item, 20))
      .filter(Boolean)
      .slice(0, 16);
  }

  if (typeof value === 'string') {
    return parseTagsInput(value);
  }

  return [];
};

const pickPlanListFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];

  if (Array.isArray(payload.plans)) return payload.plans;
  if (Array.isArray(payload.items)) return payload.items;

  if (isObject(payload.result)) {
    if (Array.isArray(payload.result.plans)) return payload.result.plans;
    if (Array.isArray(payload.result.items)) return payload.result.items;
  }

  if (isObject(payload.data)) {
    if (Array.isArray(payload.data.plans)) return payload.data.plans;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
};

const pickStepListFromPlan = (plan: Record<string, unknown>): unknown[] => {
  if (Array.isArray(plan.steps)) return plan.steps;
  if (Array.isArray(plan.actions)) return plan.actions;
  if (Array.isArray(plan.tasks)) return plan.tasks;
  return [];
};

const buildDiaryPayloadFromStep = (
  step: Record<string, unknown>
): DailyScriptDiaryActionPayload => {
  const payload = isObject(step.payload) ? step.payload : {};
  return normalizePayloadByActionType('dailywords.writeDiary', {
    title: sanitizeText(payload.title ?? step.diaryTitle, 80),
    content: sanitizeText(payload.content ?? step.content ?? step.text, 5000),
    mood: sanitizeText(payload.mood ?? step.diaryMood ?? step.mood, 30),
    tags: normalizeTags(payload.tags ?? step.tags ?? step.diaryTags),
    syncToMemory: payload.syncToMemory !== false && step.syncToMemory !== false,
  }) as DailyScriptDiaryActionPayload;
};

const buildWeChatPayloadFromStep = (
  step: Record<string, unknown>,
  allowedTargetRoleIdSet: Set<string>
): DailyScriptWeChatActionPayload => {
  const payload = isObject(step.payload) ? step.payload : {};
  const targetUserRoleIdCandidate = sanitizeText(
    payload.targetUserRoleId ?? step.targetUserRoleId,
    120
  );

  return normalizePayloadByActionType('wechat.sendMessageToUser', {
    content: sanitizeText(payload.content ?? step.content ?? step.message ?? step.text, 2000),
    targetUserRoleId: allowedTargetRoleIdSet.has(targetUserRoleIdCandidate)
      ? targetUserRoleIdCandidate
      : DEFAULT_ACTIVE_ROLE_ID,
  }) as DailyScriptWeChatActionPayload;
};

interface NormalizeDraftContext {
  allowedTargetRoleIdSet: Set<string>;
  relationById: Map<string, DailyScriptAiLoveRelationOption>;
  relationByOwnerBondKey: Map<string, DailyScriptAiLoveRelationOption>;
  partnerTasksByRelationId: Map<string, DailyScriptAiLoveCheckInTaskOption[]>;
  dreamMusicTrackById: Map<string, DailyScriptAiDreamMusicTrackOption>;
}

const createOwnerBondKey = (ownerRoleId: string, bondId: string): string =>
  `${ownerRoleId.trim()}::${bondId.trim()}`;

const normalizeLoveRelationOptions = (
  options: DailyScriptAiLoveRelationOption[]
): DailyScriptAiLoveRelationOption[] =>
  options
    .map((item) => ({
      id: sanitizeText(item.id, 160),
      label: sanitizeText(item.label, 160),
      ownerRoleId: sanitizeText(item.ownerRoleId, 120),
      bondId: sanitizeText(item.bondId, 120),
      contactRoleId: sanitizeText(item.contactRoleId, 120),
    }))
    .filter((item) => Boolean(item.id && item.ownerRoleId && item.bondId));

const normalizeLoveCheckInTaskOptions = (
  options: DailyScriptAiLoveCheckInTaskOption[]
): DailyScriptAiLoveCheckInTaskOption[] =>
  options
    .map<DailyScriptAiLoveCheckInTaskOption>((item) => ({
      id: sanitizeText(item.id, 120),
      title: sanitizeText(item.title, 60),
      owner: item.owner === 'partner' ? 'partner' : 'mine',
      templateId: sanitizeText(item.templateId, 120),
      relationId: sanitizeText(item.relationId, 160),
      relationLabel: sanitizeText(item.relationLabel, 160),
      ownerRoleId: sanitizeText(item.ownerRoleId, 120),
      bondId: sanitizeText(item.bondId, 120),
      contactRoleId: sanitizeText(item.contactRoleId, 120),
    }))
    .filter((item) => Boolean(item.id && item.relationId));

const normalizeDreamMusicTrackOptions = (
  options: DailyScriptAiDreamMusicTrackOption[]
): DailyScriptAiDreamMusicTrackOption[] =>
  options
    .map((item) => ({
      id: sanitizeText(item.id, 160),
      title: sanitizeText(item.title, 120),
      artist: sanitizeText(item.artist, 120),
    }))
    .filter((item) => Boolean(item.id && item.title));

const buildNormalizeDraftContext = (
  allowedTargetRoleIds: string[],
  options?: ParseDailyScriptAiPlansOptions
): NormalizeDraftContext => {
  const allowedTargetRoleIdSet = new Set(allowedTargetRoleIds.filter(Boolean));
  if (!allowedTargetRoleIdSet.has(DEFAULT_ACTIVE_ROLE_ID)) {
    allowedTargetRoleIdSet.add(DEFAULT_ACTIVE_ROLE_ID);
  }

  const relationById = new Map<string, DailyScriptAiLoveRelationOption>();
  const relationByOwnerBondKey = new Map<string, DailyScriptAiLoveRelationOption>();
  normalizeLoveRelationOptions(options?.loveRelationOptions || []).forEach((item) => {
    relationById.set(item.id, item);
    relationByOwnerBondKey.set(createOwnerBondKey(item.ownerRoleId, item.bondId), item);
  });

  const partnerTasksByRelationId = new Map<string, DailyScriptAiLoveCheckInTaskOption[]>();
  normalizeLoveCheckInTaskOptions(options?.loveCheckInTaskOptions || []).forEach((item) => {
    if (item.owner !== 'partner') return;
    if (!relationById.has(item.relationId)) return;
    const relationTasks = partnerTasksByRelationId.get(item.relationId);
    if (relationTasks) {
      relationTasks.push(item);
    } else {
      partnerTasksByRelationId.set(item.relationId, [item]);
    }
  });

  const dreamMusicTrackById = new Map<string, DailyScriptAiDreamMusicTrackOption>();
  normalizeDreamMusicTrackOptions(options?.dreamMusicTrackOptions || []).forEach((item) => {
    dreamMusicTrackById.set(item.id, item);
  });

  return {
    allowedTargetRoleIdSet,
    relationById,
    relationByOwnerBondKey,
    partnerTasksByRelationId,
    dreamMusicTrackById,
  };
};

const resolveLoveRelationFromStep = (
  step: Record<string, unknown>,
  context: NormalizeDraftContext
): DailyScriptAiLoveRelationOption | null => {
  const payload = isObject(step.payload) ? step.payload : {};
  const relationId = sanitizeText(
    payload.targetRelationId ?? payload.relationId ?? step.targetRelationId ?? step.relationId,
    160
  );
  if (relationId) {
    return context.relationById.get(relationId) || null;
  }

  const ownerRoleId = sanitizeText(
    payload.targetOwnerRoleId ?? payload.ownerRoleId ?? step.targetOwnerRoleId ?? step.ownerRoleId,
    120
  );
  const bondId = sanitizeText(payload.targetBondId ?? payload.bondId ?? step.targetBondId ?? step.bondId, 120);
  if (!ownerRoleId || !bondId) return null;
  return context.relationByOwnerBondKey.get(createOwnerBondKey(ownerRoleId, bondId)) || null;
};

const buildLoveMomentPayloadFromStep = (
  step: Record<string, unknown>,
  context: NormalizeDraftContext
): DailyScriptLoveSpaceAddMomentPayload | null => {
  const relation = resolveLoveRelationFromStep(step, context);
  if (!relation) return null;

  const payload = isObject(step.payload) ? step.payload : {};
  const content = sanitizeText(payload.content ?? step.content ?? step.text, 2000);
  const imageDataUrl = sanitizeText(payload.imageDataUrl ?? step.imageDataUrl, 12000);
  if (!content && !imageDataUrl) return null;

  return normalizePayloadByActionType('lovespace.addMoment', {
    targetRelationId: relation.id,
    targetRelationLabel: relation.label,
    targetOwnerRoleId: relation.ownerRoleId,
    targetBondId: relation.bondId,
    content,
    imageDataUrl: imageDataUrl || undefined,
  }) as DailyScriptLoveSpaceAddMomentPayload;
};

const buildLoveCompleteCheckInTaskPayloadFromStep = (
  step: Record<string, unknown>,
  context: NormalizeDraftContext
): DailyScriptLoveSpaceCompleteCheckInTaskPayload | null => {
  const relation = resolveLoveRelationFromStep(step, context);
  if (!relation) return null;

  let candidates = context.partnerTasksByRelationId.get(relation.id) || [];
  if (candidates.length === 0) return null;

  const payload = isObject(step.payload) ? step.payload : {};
  const taskId = sanitizeText(payload.taskId ?? step.taskId, 120);
  const templateId = sanitizeText(payload.templateId ?? step.templateId, 120);
  const title = sanitizeText(payload.title ?? payload.taskTitle ?? step.taskTitle, 60);

  if (taskId) {
    const matchedByTaskId = candidates.filter((item) => item.id === taskId);
    if (matchedByTaskId.length > 0) {
      candidates = matchedByTaskId;
    }
  }
  if (templateId) {
    const matchedByTemplateId = candidates.filter((item) => item.templateId === templateId);
    if (matchedByTemplateId.length > 0) {
      candidates = matchedByTemplateId;
    }
  }
  if (title) {
    const matchedByTitle = candidates.filter((item) => item.title === title);
    if (matchedByTitle.length > 0) {
      candidates = matchedByTitle;
    }
  }
  if (candidates.length === 0) return null;

  const targetTask = candidates[0];
  return normalizePayloadByActionType('lovespace.completeCheckInTask', {
    targetRelationId: relation.id,
    targetRelationLabel: relation.label,
    targetOwnerRoleId: relation.ownerRoleId,
    targetBondId: relation.bondId,
    owner: 'partner',
    taskId: targetTask.id,
    templateId: targetTask.templateId,
    title: targetTask.title,
  }) as DailyScriptLoveSpaceCompleteCheckInTaskPayload;
};

const buildDreamMusicCommentTrackPayloadFromStep = (
  step: Record<string, unknown>,
  context: NormalizeDraftContext
): DailyScriptDreamMusicCommentTrackPayload => {
  const payload = isObject(step.payload) ? step.payload : {};
  const trackId = sanitizeText(payload.targetTrackId ?? step.targetTrackId, 160);
  const trackTitle = sanitizeText(payload.targetTrackTitle ?? step.targetTrackTitle ?? step.title, 120);

  const selectedById = trackId ? context.dreamMusicTrackById.get(trackId) || null : null;
  const selectedTrack =
    selectedById ||
    [...context.dreamMusicTrackById.values()].find((item) => item.title === trackTitle) ||
    null;

  if (!selectedTrack) {
    return normalizePayloadByActionType('dreammusic.commentTrack', {
      targetTrackId: '',
      targetTrackTitle: '',
    }) as DailyScriptDreamMusicCommentTrackPayload;
  }

  return normalizePayloadByActionType('dreammusic.commentTrack', {
    targetTrackId: selectedTrack.id,
    targetTrackTitle: selectedTrack.title,
  }) as DailyScriptDreamMusicCommentTrackPayload;
};

const normalizeDraftStep = (
  value: unknown,
  context: NormalizeDraftContext
): DailyScriptAIDraftStep | null => {
  if (!isObject(value)) return null;
  const step = value as Record<string, unknown>;

  const actionTypeCandidate = normalizeActionType(step.actionType ?? step.type ?? step.action);
  if (
    actionTypeCandidate !== 'dailywords.writeDiary' &&
    actionTypeCandidate !== 'wechat.sendMessageToUser' &&
    actionTypeCandidate !== 'lovespace.addMoment' &&
    actionTypeCandidate !== 'lovespace.completeCheckInTask' &&
    actionTypeCandidate !== 'dreammusic.commentTrack'
  ) {
    return null;
  }
  const actionType = actionTypeCandidate;
  const normalizedName = sanitizeText(step.name ?? step.title, 60);
  const time = sanitizeTime(step.time ?? step.at ?? step.executeAt);

  let payload: DailyScriptActionPayload;
  if (actionType === 'dailywords.writeDiary') {
    const diaryPayload = buildDiaryPayloadFromStep(step);
    if (!diaryPayload.title.trim() && !diaryPayload.content.trim()) return null;
    payload = diaryPayload;
  } else if (actionType === 'wechat.sendMessageToUser') {
    const wechatPayload = buildWeChatPayloadFromStep(step, context.allowedTargetRoleIdSet);
    if (!wechatPayload.content.trim()) return null;
    payload = wechatPayload;
  } else if (actionType === 'lovespace.addMoment') {
    const loveMomentPayload = buildLoveMomentPayloadFromStep(step, context);
    if (!loveMomentPayload) return null;
    payload = loveMomentPayload;
  } else if (actionType === 'dreammusic.commentTrack') {
    const dreamMusicPayload = buildDreamMusicCommentTrackPayloadFromStep(step, context);
    payload = dreamMusicPayload;
  } else {
    const loveCompletePayload = buildLoveCompleteCheckInTaskPayloadFromStep(step, context);
    if (!loveCompletePayload) return null;
    payload = loveCompletePayload;
  }

  return {
    name: normalizedName,
    time,
    actionType,
    payload,
    enabled: step.enabled !== false,
  };
};

const normalizeDraftPlan = (
  value: unknown,
  index: number,
  context: NormalizeDraftContext
): DailyScriptAIDraftPlan | null => {
  if (!isObject(value)) return null;
  const plan = value as Record<string, unknown>;

  const rawSteps = pickStepListFromPlan(plan);
  const steps = rawSteps
    .map((item) => normalizeDraftStep(item, context))
    .filter((item): item is DailyScriptAIDraftStep => Boolean(item));

  if (steps.length === 0) return null;

  return {
    name: sanitizeText(plan.name ?? plan.title, 60) || `AI 剧本 ${index + 1}`,
    enabled: plan.enabled !== false,
    steps,
  };
};

const normalizeDraftPlansPayload = (
  payload: unknown,
  allowedTargetRoleIds: string[],
  options?: ParseDailyScriptAiPlansOptions
): DailyScriptAIDraftPlan[] => {
  const context = buildNormalizeDraftContext(allowedTargetRoleIds, options);

  const rawPlans = pickPlanListFromPayload(payload);
  return rawPlans
    .map((item, index) => normalizeDraftPlan(item, index, context))
    .filter((item): item is DailyScriptAIDraftPlan => Boolean(item));
};

export const parseDailyScriptAiPlansText = (
  rawText: string,
  allowedTargetRoleIds: string[],
  options?: ParseDailyScriptAiPlansOptions
): DailyScriptAIDraftPlan[] => {
  const payload = parseModelJsonPayload(rawText);
  if (!payload) {
    throw new Error('ai-invalid-json');
  }

  const plans = normalizeDraftPlansPayload(payload, allowedTargetRoleIds, options);
  if (plans.length === 0) {
    throw new Error('ai-empty-plans');
  }

  return plans;
};

export const serializeDailyScriptAiPlans = (plans: DailyScriptAIDraftPlan[]): string =>
  JSON.stringify({ plans }, null, 2);

export const requestDailyScriptAiPlans = async ({
  settings,
  dateKey,
  roleId,
  roleLabel,
  sourceText,
  allowedTargetRoleIds,
  loveRelationOptions,
  loveCheckInTaskOptions,
  dreamMusicTrackOptions,
}: RequestDailyScriptAiPlansInput): Promise<RequestDailyScriptAiPlansResult> => {
  const apiKey = (settings.apiKey || '').trim();
  if (!apiKey) {
    throw new Error('missing-chat-api-key');
  }

  const baseUrl = stripTrailingSlash(settings.baseUrl || DEFAULT_CHAT_BASE_URL);
  if (!baseUrl) {
    throw new Error('missing-chat-base-url');
  }

  const model = (settings.model || '').trim();
  if (!model) {
    throw new Error('missing-chat-model');
  }

  const normalizedInputText = sourceText.trim();
  if (!normalizedInputText) {
    throw new Error('ai-empty-input');
  }

  const relationPromptPayload = normalizeLoveRelationOptions(loveRelationOptions).map((item) => ({
    id: item.id,
    label: item.label,
    ownerRoleId: item.ownerRoleId,
    bondId: item.bondId,
  }));
  const checkInTaskPromptPayload = normalizeLoveCheckInTaskOptions(loveCheckInTaskOptions)
    .filter((item) => item.owner === 'partner')
    .map((item) => ({
      id: item.id,
      title: item.title,
      templateId: item.templateId,
      relationId: item.relationId,
      relationLabel: item.relationLabel,
      owner: item.owner,
    }));
  const dreamMusicTrackPromptPayload = normalizeDreamMusicTrackOptions(dreamMusicTrackOptions)
    .slice(0, 120)
    .map((item) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
    }));

  const planPrompt = renderPaperMagicPrompt('dailyscript.planBuilder', {
    roleId,
    roleLabel: roleLabel || roleId,
    dateKey,
    allowedTargetRoleIdsJson: JSON.stringify([...new Set(allowedTargetRoleIds.filter(Boolean))]),
    dreamMusicTrackPromptPayloadJson: JSON.stringify(dreamMusicTrackPromptPayload),
    relationPromptPayloadJson: JSON.stringify(relationPromptPayload),
    checkInTaskPromptPayloadJson: JSON.stringify(checkInTaskPromptPayload),
    normalizedInputText,
  });
  const systemPrompt = planPrompt.system || '';
  const userPrompt = planPrompt.user || '';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Math.min(0.7, Math.max(0, settings.temperature ?? 0.2)),
      max_tokens: Math.min(2600, Math.max(900, settings.maxTokens || 1800)),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data as { error?: { message?: string }; message?: string } | null)?.error?.message ||
      (data as { message?: string } | null)?.message ||
      `HTTP ${response.status}`;
    throw new Error(`ai-chat-api-failed-${response.status}:${message}`);
  }

  const rawContent = extractContentFromChatCompletion(
    (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message
      ?.content
  );

  if (!rawContent) {
    throw new Error('ai-empty-response');
  }

  const plans = parseDailyScriptAiPlansText(rawContent, allowedTargetRoleIds, {
    loveRelationOptions,
    loveCheckInTaskOptions,
    dreamMusicTrackOptions,
  });
  return { plans, rawContent };
};
export const toDailyScriptAiErrorMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'missing-chat-api-key') {
    return '请先在设置中配置对话 API Key。';
  }
  if (code === 'missing-chat-base-url') {
    return '请先在设置中配置对话 Base URL。';
  }
  if (code === 'missing-chat-model') {
    return '请先在设置中配置对话模型。';
  }
  if (code === 'ai-empty-input') {
    return '请先输入要分析的剧本文案。';
  }
  if (code === 'ai-empty-response') {
    return 'AI 未返回可用内容，请稍后重试。';
  }
  if (code === 'ai-invalid-json') {
    return 'AI 返回格式不是有效 JSON，请点击“重新生成”或手动编辑后再试。';
  }
  if (code === 'ai-empty-plans') {
    return 'AI 未生成可用剧本步骤，请补充更具体的文案后重试。';
  }
  if (code.startsWith('ai-chat-api-failed-')) {
    return 'AI 接口调用失败，请检查 API 配置或网络后重试。';
  }
  return 'AI 生成失败，请稍后重试。';
};
