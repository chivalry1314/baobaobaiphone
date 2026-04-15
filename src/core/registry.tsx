import type { AppManifest, AppProps } from './sdk/types';
import type { ComponentType } from 'react';

/**
 * 自动注册机 (Auto-Registry)
 * 使用 Vite 的 import.meta.glob 特性自动扫描并加载 apps 目录下的所有应用
 *
 * 支持两种应用来源：
 * 1. 本地应用：通过 import.meta.glob 自动扫描
 * 2. 远端应用：通过模块联邦 (预留接口)
 */

// ==================== 本地应用扫描 ====================

// 使用 import.meta.glob 批量扫描 apps 目录下的所有子文件夹中的 index.ts
// eager: true 表示立即加载所有模块
const appModules = import.meta.glob('../appsrc/apps/*/index.ts', { eager: true });

// 从模块中提取 manifest 并注册
const localApps: AppManifest[] = Object.values(appModules).map(
  (mod: unknown) => (mod as { default: AppManifest }).default
);

// ==================== 远端应用预留 ====================

/**
 * 远端应用配置接口
 * 用于模块联邦场景，从远端加载应用
 */
export interface RemoteAppConfig {
  /** 应用唯一标识 */
  id: string;
  /** 远程模块入口地址 */
  remoteEntry: string;
  /** 远程模块名称 */
  moduleName: string;
  /** 导出名称 */
  exportName: string;
}

/**
 * 远端应用列表
 * 在此配置从模块联邦加载的远端应用
 *
 * 使用示例：
 * const remoteApps: RemoteAppConfig[] = [
 *   {
 *     id: 'remote-game',
 *     remoteEntry: 'http://localhost:3001/assets/remoteEntry.js',
 *     moduleName: 'gameApp',
 *     exportName: 'default',
 *   },
 * ];
 */
const remoteApps: RemoteAppConfig[] = [];

/**
 * 从远端加载应用模块
 * 注意：这是异步操作，需要在运行时动态加载
 */
export async function loadRemoteApp(config: RemoteAppConfig): Promise<AppManifest | null> {
  try {
    // 动态导入远程模块
    // 在实际模块联邦场景中，这里会使用 webpack 的 remotes 或类似机制
    const module = await import(/* @vite-ignore */ config.remoteEntry);
    const appModule = module[config.moduleName];
    if (appModule && appModule[config.exportName]) {
      return {
        ...appModule[config.exportName],
        id: config.id,
        remoteEntry: config.remoteEntry,
      } as AppManifest;
    }
  } catch (error) {
    console.error(`Failed to load remote app ${config.id}:`, error);
  }
  return null;
}

/**
 * 获取所有已注册的应用（包括本地和远端）
 * 注意：远端应用需要通过 initializeRemoteApps 初始化
 */
let allApps: AppManifest[] = [...localApps];

/**
 * 初始化远端应用
 * 在系统启动时调用
 */
export async function initializeRemoteApps(): Promise<void> {
  const loadedRemotes: AppManifest[] = [];

  for (const config of remoteApps) {
    const app = await loadRemoteApp(config);
    if (app) {
      loadedRemotes.push(app);
    }
  }

  // 合并远端应用
  allApps = [...localApps, ...loadedRemotes];
}

/**
 * 重新加载应用列表
 * 用于动态添加/移除应用
 */
export function reloadApps(): void {
  // 重新扫描本地应用
  const newAppModules = import.meta.glob('../appsrc/apps/*/index.ts', { eager: true });
  const newLocalApps: AppManifest[] = Object.values(newAppModules).map(
    (mod: unknown) => (mod as { default: AppManifest }).default
  );
  allApps = [...newLocalApps];
}

/**
 * 获取所有已注册应用
 */
export function getRegisteredApps(): AppManifest[] {
  return allApps;
}

// 过滤出桌面应用（排除系统应用）
export const desktopApps = allApps.filter((app) => !app.isSystem);

// 辅助函数：根据 ID 查找应用
export const getAppById = (id: string): AppManifest | undefined => {
  return allApps.find((app) => app.id === id);
};

// 辅助函数：根据 ID 获取应用组件
export const getAppComponent = (id: string): ComponentType<AppProps> | undefined => {
  const app = getAppById(id);
  return app?.component;
};

// 辅助函数：检查是否为远端应用
export const isRemoteApp = (id: string): boolean => {
  const app = getAppById(id);
  return !!app?.remoteEntry;
};

// ==================== 导出本地应用列表（用于静态分析） ====================
export { localApps };
