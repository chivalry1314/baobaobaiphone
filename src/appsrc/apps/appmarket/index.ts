import type { AppManifest } from '@baobaobaiOS/sdk';
import { AppMarketApp } from './AppMarketApp';
import {
  registerInstalledAppIdsResolver,
  registerInstalledAppIdsSubscriber,
} from '../../shared/business/appmarket/installSnapshotBridge';
import { useAppMarketStore } from './store';

registerInstalledAppIdsResolver(() => useAppMarketStore.getState().installedAppIds);
registerInstalledAppIdsSubscriber((listener) =>
  useAppMarketStore.subscribe((state, previousState) => {
    if (state.installedAppIds === previousState.installedAppIds) return;
    listener();
  })
);

const appMarketManifest: AppManifest = {
  id: 'appmarket',
  name: '应用市场',
  icon: 'Store',
  color: '#3B82F6',
  component: AppMarketApp,
  isSystem: true,
  description: '线上/离线应用安装与开发者上传平台',
};

export default appMarketManifest;

