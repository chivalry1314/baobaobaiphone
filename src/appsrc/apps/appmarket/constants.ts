import type { AppManifest } from '@baobaobaiOS/sdk';
import type { MarketChannel, MarketTab } from './uiTypes';
import type { OnlineMarketApp } from './types';

export const FONT_STACK = '"PingFang SC", "SF Pro Display", "Microsoft YaHei", sans-serif';

export const TEXT = {
  title: '应用市场',
  subtitle: '浏览应用资源与主题资源',
  apps: '应用',
  themes: '主题',
  online: '线上市场',
  offline: '离线市场',
  developer: '开发者平台',
  searchPlaceholder: '搜索应用名、作者或标签',
  onlineEmpty: '没有找到匹配的线上应用',
  offlineEmpty: '你还没有上传应用，去开发者平台发布一个吧',
  install: '安装',
  uninstall: '卸载',
  uninstallConfirmTitle: '确认卸载该应用',
  uninstallConfirmHint: '卸载后会从已安装列表移除，如桌面存在图标也会同步移除。',
  confirmUninstall: '确认卸载',
  deletePermanent: '彻底删除',
  deleteConfirmTitle: '确认彻底删除该离线应用',
  deleteConfirmHint: '删除后无法恢复，同时会从桌面和已安装列表移除。',
  cancel: '取消',
  confirmDelete: '确认删除',
  installing: '安装中...',
  uploadedAt: '上传时间',
  appHtmlLabel: '应用 HTML',
  appHtmlPlaceholder: '<!doctype html>\n<html>\n  <body>\n    <h1>Hello App Market</h1>\n  </body>\n</html>',
  uploadHtml: '上传 HTML 文件',
  appName: '应用名称',
  appNamePlaceholder: '例如：我的效率面板',
  appIcon: '应用图标',
  appIconPlaceholder: '例如：📱',
  appVersion: '版本号',
  appVersionPlaceholder: '例如：1.0.0',
  appDescription: '应用简介',
  appDescriptionPlaceholder: '一句话介绍这个应用做什么',
  submit: '发布到离线市场',
  createSuccess: '应用已发布到离线市场',
  createErrorName: '请填写应用名称',
  createErrorHtml: '请填写或上传 HTML 内容',
  readFileError: '读取 HTML 文件失败，请重试',
  simulationNote: '线上市场已切换为真实可安装 App，点击安装会自动添加到桌面。',
  sourceOnline: '线上来源',
  sourceOffline: '离线来源',
} as const;

export const CHANNEL_LABELS: Record<MarketChannel, string> = {
  apps: TEXT.apps,
  themes: TEXT.themes,
};

export const TAB_LABELS: Record<MarketTab, string> = {
  online: TEXT.online,
  offline: TEXT.offline,
  developer: TEXT.developer,
};

const DEFAULT_AUTHOR = 'baobaobaiphone';
const DEFAULT_VERSION = '1.0.0';
const DEFAULT_SIZE = '内置应用';
const DEFAULT_ICON = '📱';

const resolveSortOrder = (manifest: AppManifest): number => {
  const sortOrder = manifest.market?.sortOrder;
  if (typeof sortOrder !== 'number' || Number.isNaN(sortOrder)) return Number.MAX_SAFE_INTEGER;
  return sortOrder;
};

const resolveTags = (manifest: AppManifest): string[] => {
  const tags = manifest.market?.tags;
  if (!Array.isArray(tags)) return [manifest.name];
  const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : [manifest.name];
};

const toOnlineMarketApp = (manifest: AppManifest): OnlineMarketApp => {
  const market = manifest.market;

  return {
    id: manifest.id,
    name: manifest.name,
    icon: market?.icon ?? DEFAULT_ICON,
    author: market?.author ?? DEFAULT_AUTHOR,
    version: manifest.version ?? DEFAULT_VERSION,
    size: market?.size ?? DEFAULT_SIZE,
    description: manifest.description ?? `${manifest.name} 应用`,
    tags: resolveTags(manifest),
    html: market?.html,
  };
};

export const resolveOnlineMarketApps = (manifests: AppManifest[]): OnlineMarketApp[] => {
  return manifests
    .filter((app) => !app.isSystem)
    .map((manifest) => ({
      manifest,
      marketApp: toOnlineMarketApp(manifest),
    }))
    .sort((a, b) => {
      const orderDiff = resolveSortOrder(a.manifest) - resolveSortOrder(b.manifest);
      if (orderDiff !== 0) return orderDiff;
      return a.marketApp.name.localeCompare(b.marketApp.name, 'zh-CN');
    })
    .map((item) => item.marketApp);
};
