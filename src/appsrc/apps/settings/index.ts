import type { AppManifest } from '@mimisOS/sdk';
import { SettingsApp } from './SettingsApp';

const settingsManifest: AppManifest = {
  id: 'settings',
  name: '设置',
  icon: 'Settings',
  color: '#8E8E93',
  component: SettingsApp,
  isSystem: true,
};

export default settingsManifest;
