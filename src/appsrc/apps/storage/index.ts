import type { AppManifest } from '@mimisOS/sdk';
import { StorageApp } from './StorageApp';

const storageManifest: AppManifest = {
  id: 'storage',
  name: '文件管理',
  icon: 'Folder',
  color: '#6366F1',
  component: StorageApp,
  isSystem: true,
};

export default storageManifest;
