import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const MEMORY_CENTER_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'memory.summary.compress',
    moduleId: 'memory-persona',
    title: '全局记忆压缩',
    source: 'src/core/appMemoryCenter.ts',
    kind: 'chat',
    description: '把某 app 与某联系人的历史时间线压缩为长期记忆摘要。',
    system: '你是记忆压缩助手。请将对话记录压缩成高信息密度摘要，保留人物关系、关键事件、偏好、承诺、待办和情绪变化。输出中文纯文本，不要分点编号，不要出现“总结如下”。',
    user: '请总结以下 ${appId} 应用中与联系人 ${contactId} 的历史记录，并保持可供后续 AI 继续对话使用：\n${timeline}',
    variables: ['appId', 'contactId', 'timeline'],
  }),
];
