import type { AppManifest } from '@baobaobaiOS/sdk';
import { PhoneInspectorApp } from './PhoneInspectorApp';

const phoneInspectorManifest: AppManifest = {
  id: 'phoneinspector',
  name: '查手机',
  icon: 'Search',
  color: '#0EA5E9',
  component: PhoneInspectorApp,
  isSystem: true,
  description: '选择通讯录角色后查看其手机视角。',
};

export default phoneInspectorManifest;
