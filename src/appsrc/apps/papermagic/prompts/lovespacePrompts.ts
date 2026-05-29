import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const LOVESPACE_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'lovespace.importantTimeline.extract',
    moduleId: 'social-bonds',
    title: '恋爱空间：重要事件提取',
    source: 'src/appsrc/apps/lovespace/importantTimeline.ts',
    kind: 'chat',
    description: '从记忆记录中提取可进入关系时间线的重要事件。',
    system: '你是关系重要事件提取器。只输出 JSON。格式：{"events":[{"recordId":"","title":"","summary":"","importanceScore":0,"happenedAt":0}]}。recordId 必须来自输入记录。仅保留对时间线足够重要的事件。',
    user: '请从以下记录中提取重要事件。\n联系人 ID：${contactId}\n记录 JSON：\n${inputRecordsJson}',
    variables: ['contactId', 'inputRecordsJson'],
  }),
];
