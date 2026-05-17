import type { AppManifest } from '@baobaobaiOS/sdk';
import { WorldBookApp } from './WorldBookApp';
import { useWorldBookCoreStore } from './data/coreStore';
import { registerGlobalWorldBookStoreHook } from '../../../core/sdk/storeHooks';
import { registerPersonaWorldBookImporter } from '../../shared/business/personagenerator/importBridge';

registerGlobalWorldBookStoreHook((selector) => useWorldBookCoreStore(selector));
registerPersonaWorldBookImporter((entry) => {
  useWorldBookCoreStore.getState().addWorldEntry(entry);
});

const worldBookManifest: AppManifest = {
  id: 'worldbook',
  name: '备忘录',
  icon: 'StickyNote',
  color: '#FF9500',
  component: WorldBookApp,
  isSystem: true,
};

export default worldBookManifest;
