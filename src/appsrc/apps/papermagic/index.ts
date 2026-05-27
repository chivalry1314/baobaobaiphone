import type { AppManifest } from '@baobaobaiOS/sdk';
import { PaperMagicApp } from './PaperMagicApp';

const paperMagicManifest: AppManifest = {
  id: 'papermagic',
  name: '纸间魔法',
  icon: 'BookOpenText',
  color: '#F39C12',
  component: PaperMagicApp,
  market: {
    icon: '📖',
    tags: ['AI', '提示词', '管理'],
    sortOrder: 12,
  },
  description: '定制化提示词管理。',
};

export default paperMagicManifest;
