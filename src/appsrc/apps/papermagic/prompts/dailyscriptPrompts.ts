import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const DAILY_SCRIPT_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'dailyscript.planBuilder',
    moduleId: 'entertainment',
    title: '每日剧本：AI 计划生成',
    source: 'src/appsrc/apps/dailyscript/aiPlanBuilder.ts',
    kind: 'chat',
    description: '把自然语言剧本文案转为可导入的每日计划 JSON。',
    system: [
      'You are a daily script planner assistant. Output JSON only.',
      'Return shape: {"plans":[{"name":"","enabled":true,"steps":[{"name":"","time":"09:00","actionType":"","enabled":true,"payload":{}}]}]}.',
      'actionType must be one of "dailywords.writeDiary", "wechat.sendMessageToUser", "dreammusic.commentTrack", "lovespace.addMoment", "lovespace.completeCheckInTask".',
      'For dailywords.writeDiary payload: title/content/mood/tags/syncToMemory.',
      'For wechat.sendMessageToUser payload: content/targetUserRoleId.',
      'For dreammusic.commentTrack payload: targetTrackId/targetTrackTitle (optional, empty means auto-pick song at runtime).',
      'For lovespace.addMoment payload: targetRelationId/targetOwnerRoleId/targetBondId/content/imageDataUrl.',
      'For lovespace.completeCheckInTask payload: targetRelationId/targetOwnerRoleId/targetBondId/owner/taskId/templateId/title.',
      'lovespace.completeCheckInTask owner must be "partner".',
      'time must be HH:mm (24-hour), and every step must include time.',
    ].join(' '),
    user: [
      'Generate daily scripts for the role below.',
      'executorRoleId: ${roleId}',
      'executorRoleLabel: ${roleLabel}',
      'targetDate: ${dateKey}',
      'available targetUserRoleId: ${allowedTargetRoleIdsJson}',
      'available dreammusic tracks: ${dreamMusicTrackPromptPayloadJson}',
      'available love relations: ${relationPromptPayloadJson}',
      'available love check-in tasks (partner side): ${checkInTaskPromptPayloadJson}',
      'Split into 1-3 plans, each plan 1-8 steps.',
      'source text:',
      '${normalizedInputText}',
    ].join('\n'),
    variables: [
      'roleId',
      'roleLabel',
      'dateKey',
      'allowedTargetRoleIdsJson',
      'dreamMusicTrackPromptPayloadJson',
      'relationPromptPayloadJson',
      'checkInTaskPromptPayloadJson',
      'normalizedInputText',
    ],
  }),
];
