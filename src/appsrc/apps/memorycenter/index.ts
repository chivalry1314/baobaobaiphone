import type { AppManifest } from '@mimisOS/sdk';
import { MemoryCenterApp } from './MemoryCenterApp';

const memoryCenterManifest: AppManifest = {
  id: 'memorycenter',
  name: '记忆中心',
  icon: 'Brain',
  color: '#4E83C5',
  component: MemoryCenterApp,
  isSystem: true,
  description: '统一管理各个应用的 AI 交互记忆记录。',
};

export default memoryCenterManifest;
