import type { AppManifest } from '@baobaobaiOS/sdk';
import { WorldBookApp } from './WorldBookApp';
import { useWorldBookCoreStore } from './data/coreStore';
import { registerGlobalWorldBookStoreHook } from '../../../core/sdk/storeHooks';

registerGlobalWorldBookStoreHook((selector) => useWorldBookCoreStore(selector));

const worldBookManifest: AppManifest = {
  id: 'worldbook',
  name: '备忘录',
  icon: 'StickyNote',
  color: '#FF9500',
  component: WorldBookApp,
  isSystem: true,
};

export default worldBookManifest;
