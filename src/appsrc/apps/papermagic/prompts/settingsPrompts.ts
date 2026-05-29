import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const SETTINGS_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'settings.vision.probe',
    moduleId: 'memory-persona',
    title: '设置：视觉能力检测',
    source: 'src/appsrc/apps/settings/components/ApiSettingsView.tsx',
    kind: 'vision',
    description: '检测当前对话模型是否支持图片输入。',
    content: '请识别图片并回复“支持图片”。',
    variables: [],
  }),
];
