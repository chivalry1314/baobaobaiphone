import React, { Suspense, useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { WidgetPlaceholder } from './WidgetPlaceholder';

/**
 * Widget 容器属性
 */
export interface WidgetContainerProps {
  /** Widget 配置 */
  config: {
    id: string;
    name: string;
    defaultWidth: number;
    defaultHeight: number;
    defaultIcon?: string;
    component?: ComponentType<any>;
  };
  /** Widget 实例数据 */
  data?: Record<string, any>;
  /** 是否为编辑模式 */
  isEditMode?: boolean;
  /** 加载时的占位组件 */
  loadingFallback?: React.ReactNode;
}

/**
 * Widget 智能容器组件
 * 负责拦截和调度 Widget 的渲染状态：
 * - 状态 A（未开发）：component 为空时展示占位图
 * - 状态 B（加载中）：使用 Suspense 包裹组件，提供骨架屏
 * - 状态 C（正常渲染）：渲染真实 Widget 组件
 */
export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  config,
  data,
  isEditMode = false,
  loadingFallback,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 重置状态当配置变化时
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [config.id]);

  // 处理组件加载完成
  const handleLoad = () => {
    setIsLoading(false);
  };

  // 处理组件加载错误
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // 状态 A：未开发（component 为空）
  if (!config.component) {
    return (
      <WidgetPlaceholder
        name={config.name}
        defaultIcon={config.defaultIcon}
        isLoading={false}
        width={config.defaultWidth}
        height={config.defaultHeight}
      />
    );
  }

  // 状态 B 或 C：渲染组件
  const WidgetComponent = config.component;

  return (
    <div
      className="w-full h-full overflow-hidden rounded-2xl"
      style={{
        gridColumn: `span ${config.defaultWidth}`,
        gridRow: `span ${config.defaultHeight}`,
      }}
      // 阻止事件冒泡，防止与桌面编辑模式冲突
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Suspense
        fallback={
          loadingFallback || (
            <WidgetPlaceholder
              name={config.name}
              defaultIcon={config.defaultIcon}
              isLoading={true}
              width={config.defaultWidth}
              height={config.defaultHeight}
            />
          )
        }
      >
        <WidgetWrapper
          component={WidgetComponent}
          data={data}
          isEditMode={isEditMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      </Suspense>
    </div>
  );
};

// 内部包装器组件，处理生命周期
interface WidgetWrapperProps {
  component: ComponentType<any>;
  data?: Record<string, any>;
  isEditMode?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  component: Component,
  data,
  isEditMode,
  onLoad,
  onError,
}) => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 组件挂载时触发 onLoad
    onLoad?.();

    return () => {
      // 清理函数
    };
  }, [onLoad]);

  if (error) {
    onError?.();
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-2xl">
        <span className="text-xs text-red-500">加载失败</span>
      </div>
    );
  }

  return <Component {...data} isEditMode={isEditMode} />;
};

export default WidgetContainer;
