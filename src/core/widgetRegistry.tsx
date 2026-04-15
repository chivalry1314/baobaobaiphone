import React, { type ComponentType } from 'react';
import type { WidgetConfig } from './stores/types';

/**
 * Widget 注册中心。
 * 用于集中管理所有 Widget 的静态配置。
 */
const widgetRegistry: Map<string, WidgetConfig> = new Map();

/** 注册单个 Widget */
export function registerWidget(config: WidgetConfig): void {
  if (widgetRegistry.has(config.id)) {
    console.warn(`[WidgetRegistry] Widget "${config.id}" 已注册，将覆盖旧配置。`);
  }
  widgetRegistry.set(config.id, config);
}

/** 批量注册 Widget */
export function registerWidgets(configs: WidgetConfig[]): void {
  configs.forEach((config) => registerWidget(config));
}

/** 获取全部已注册 Widget */
export function getAllWidgets(): WidgetConfig[] {
  return Array.from(widgetRegistry.values());
}

/** 按 ID 获取 Widget */
export function getWidgetById(id: string): WidgetConfig | undefined {
  return widgetRegistry.get(id);
}

/** 判断 Widget 是否已注册 */
export function isWidgetRegistered(id: string): boolean {
  return widgetRegistry.has(id);
}

/** 注销 Widget */
export function unregisterWidget(id: string): boolean {
  return widgetRegistry.delete(id);
}

/** 清空注册表 */
export function clearWidgetRegistry(): void {
  widgetRegistry.clear();
}

/**
 * 创建懒加载 Widget 配置。
 * 适合在注册阶段配置异步加载的 Widget。
 */
export function createLazyWidget<P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  config: Omit<WidgetConfig, 'component'>
): WidgetConfig {
  const wrappedImportFn = importFn as unknown as () => Promise<{ default: ComponentType<object> }>;

  const LazyWidgetComponent: React.FC = () => (
    <React.Suspense fallback={<div className="w-full h-full animate-pulse bg-slate-200 rounded-lg" />}>
      <LazyWidgetWrapper importFn={wrappedImportFn} />
    </React.Suspense>
  );

  return {
    ...config,
    component: LazyWidgetComponent,
  };
}

interface LazyWidgetWrapperProps {
  importFn: () => Promise<{ default: ComponentType<object> }>;
}

const LazyWidgetWrapper: React.FC<LazyWidgetWrapperProps> = ({ importFn }) => {
  const [LazyComponent, setLazyComponent] = React.useState<ComponentType<object> | null>(null);

  React.useEffect(() => {
    importFn().then((module) => {
      setLazyComponent(() => module.default);
    });
  }, [importFn]);

  if (!LazyComponent) {
    return <div className="w-full h-full animate-pulse bg-slate-200 rounded-lg" />;
  }

  return <LazyComponent />;
};

// 导出注册表实例（用于调试）
export { widgetRegistry };

