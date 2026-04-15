/**
 * baobaobaiphone OS SDK
 * 虚拟手机系统的核心开发套件。
 * 使用方式：
 * import { SystemAPI, useSystemStore } from '@mimisOS/sdk';
 */

// 系统能力 API
export { SystemAPI, systemApi } from './system';

// 全局状态钩子
export {
  useGlobalSettingsStore,
  useGlobalDesktopStore,
  useGlobalWorldBookStore,
  getGlobalSettingsSnapshot,
  useGlobalSettings,
  useWorldBook,
} from './storeHooks';

// 类型导出
export type {
  AppMarketMeta,
  AppManifest,
  AppContext,
  GlobalSettings,
  WorldInfoEntry,
  SystemPermission,
  BatteryInfo,
  NotificationOptions,
  DesktopItemType,
  DesktopItemData,
  DesktopItem,
  DesktopLayoutConfig,
} from './types';
