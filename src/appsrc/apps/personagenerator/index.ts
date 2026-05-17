import type { AppManifest } from '@baobaobaiOS/sdk';
import { PersonaGeneratorApp } from './PersonaGeneratorApp';

const personaGeneratorManifest: AppManifest = {
  id: 'personagenerator',
  name: '人设生成器',
  icon: 'Sparkles',
  color: '#14B8A6',
  component: PersonaGeneratorApp,
  market: {
    icon: '🧬',
    tags: ['人设', '导入', 'AI'],
    sortOrder: 28,
  },
  description: '从聊天记录或文件生成通讯录、备忘录和记忆中心。',
};

export default personaGeneratorManifest;
