import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Widget 占位组件
 * 当 Widget 未开发或加载中时展示
 */
export interface WidgetPlaceholderProps {
  /** Widget 名称 */
  name: string;
  /** 默认图标 URL */
  defaultIcon?: string;
  /** 背景图（自定义组件） */
  backgroundImage?: string;
  /** 是否为加载中状态 */
  isLoading?: boolean;
  /** 状态文案：默认建设中 */
  status?: 'normal' | 'building';
  /** 圆角大小 */
  cornerRadius?: number;
  /** 磨砂程度 */
  frosted?: number;
  /** 阴影大小 */
  shadow?: number;
  /** 占据的网格宽度 */
  width?: number;
  /** 占据的网格高度 */
  height?: number;
}

export const WidgetPlaceholder: React.FC<WidgetPlaceholderProps> = ({
  name,
  defaultIcon,
  backgroundImage,
  isLoading = false,
  status = 'building',
  cornerRadius,
  frosted,
  shadow,
  width = 2,
  height = 2,
}) => {
  // 根据宽高计算样式类
  const sizeClass = `col-span-${width} row-span-${height}`;

  const hasBackground = Boolean(backgroundImage);
  const resolvedRadius = cornerRadius ?? 24;
  const resolvedFrosted = frosted ?? 0;
  const resolvedShadow = shadow ?? 0;
  const shadowStyle = resolvedShadow > 0
    ? `0 ${Math.max(2, Math.round(resolvedShadow / 2))}px ${resolvedShadow}px -${Math.max(2, Math.round(resolvedShadow / 3))}px rgba(15, 23, 42, 0.35)`
    : 'none';
  const frostedOpacity = Math.min(0.6, resolvedFrosted / 40);

  if (hasBackground) {
    return (
      <div
        className="w-full h-full overflow-hidden relative"
        style={{
          gridColumn: `span ${width}`,
          gridRow: `span ${height}`,
          borderRadius: resolvedRadius,
          boxShadow: shadowStyle,
        }}
      >
        <img src={backgroundImage} alt={name} className="w-full h-full object-cover" />
        {resolvedFrosted > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${resolvedFrosted}px)`,
              WebkitBackdropFilter: `blur(${resolvedFrosted}px)`,
              backgroundColor: `rgba(255, 255, 255, ${frostedOpacity})`,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        w-full h-full
        bg-gradient-to-br from-slate-100 to-slate-200
        rounded-2xl
        flex flex-col items-center justify-center
        relative overflow-hidden
        ${sizeClass}
      `}
      style={{
        gridColumn: `span ${width}`,
        gridRow: `span ${height}`,
      }}
    >
      {/* 背景装饰 - 网格纹理 */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* 主图标区域 */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {defaultIcon ? (
          <img
            src={defaultIcon}
            alt={name}
            className="w-12 h-12 object-contain opacity-40 grayscale"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-300/50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
        )}

        {/* 状态文案 */}
        <div className="text-center">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">加载中...</span>
            </div>
          ) : status === 'normal' ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-500 font-medium">正常</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500 font-medium">建设中</span>
            </div>
          )}
        </div>

        {/* Widget 名称 */}
        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate max-w-[80%]">
          {name}
        </span>
      </div>

      {/* 加载动画效果 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default WidgetPlaceholder;
