import type { AppManifest } from '@baobaobaiOS/sdk';
import { TemplateApp } from './TemplateApp';

const templateManifest: AppManifest = {
  id: 'template',
  name: '模板',
  icon: 'AppWindow',
  color: '#007AFF',
  component: TemplateApp,
  market: {
    icon: '🧩',
    tags: ['模板', '示例'],
    sortOrder: 60,
  },
  description: '组件样式和交互模板示例。',
};

export default templateManifest;
