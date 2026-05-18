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
  templateId?: string;
  subtitle?: string;
  titleText?: string;
  titleColor?: string;
  titleFontSize?: number;
  musicPlaying?: boolean;
  musicTitle?: string;
  musicArtist?: string;
  onUpdateData?: (data: Record<string, unknown>) => void;
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
  templateId,
  subtitle,
  titleText,
  titleColor,
  titleFontSize,
  musicPlaying,
  musicTitle,
  musicArtist,
  onUpdateData,
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

  if (hasBackground && !templateId) {
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

  if (status === 'normal' && templateId) {
    if (templateId === 'glass-frame') {
      return (
        <div
          className="w-full h-full overflow-hidden relative border border-white/35 bg-white/16 text-white"
          style={{
            gridColumn: `span ${width}`,
            gridRow: `span ${height}`,
            borderRadius: resolvedRadius,
            boxShadow: shadowStyle,
            backdropFilter: 'blur(12px) saturate(170%)',
            WebkitBackdropFilter: 'blur(12px) saturate(170%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/24 via-white/6 to-white/14" />
        </div>
      );
    }

    const stopDesktopPointer = (event: React.SyntheticEvent) => event.stopPropagation();
    const readPhotoFile = (file: File | undefined) => {
      if (!file || !onUpdateData) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateData({ backgroundImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div
        className="w-full h-full overflow-hidden relative border border-white/35 bg-white/16 text-white"
        style={{
          gridColumn: `span ${width}`,
          gridRow: `span ${height}`,
          borderRadius: resolvedRadius,
          boxShadow: shadowStyle,
          backdropFilter: 'blur(12px) saturate(170%)',
          WebkitBackdropFilter: 'blur(12px) saturate(170%)',
        }}
      >
        {backgroundImage ? (
          <img src={backgroundImage} alt={name} className="absolute inset-0 h-full w-full object-cover opacity-80" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-white/24 via-white/6 to-white/14" />
        <div className="relative z-10 flex h-full flex-col justify-between p-3">
          {templateId === 'headline' ? (
            <div className="flex h-full flex-col justify-center gap-2" onPointerDown={stopDesktopPointer}>
              <input
                value={titleText || name}
                onChange={(event) => onUpdateData?.({ titleText: event.target.value })}
                className="w-full bg-transparent text-center font-semibold outline-none placeholder:text-white/50"
                style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 24}px` }}
              />
              <div className="flex items-center justify-center gap-2">
                <input
                  type="color"
                  value={titleColor || '#ffffff'}
                  onChange={(event) => onUpdateData?.({ titleColor: event.target.value })}
                  className="h-5 w-7 rounded border border-white/30 bg-transparent"
                />
                <input
                  type="range"
                  min={14}
                  max={42}
                  value={titleFontSize || 24}
                  onChange={(event) => onUpdateData?.({ titleFontSize: Number(event.target.value) })}
                  className="w-20"
                />
              </div>
            </div>
          ) : templateId === 'ins-photo' ? (
            <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 text-center" onPointerDown={stopDesktopPointer}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => readPhotoFile(event.target.files?.[0])}
              />
              <div className="rounded-full border border-white/30 bg-white/18 px-3 py-1 text-[11px] font-semibold">
                {backgroundImage ? '更换照片' : '选择照片'}
              </div>
              <div className="text-[10px] text-white/70">{subtitle}</div>
            </label>
          ) : templateId === 'retro-music' ? (
            <div className="flex h-full flex-col justify-between" onPointerDown={stopDesktopPointer}>
              <div>
                <div className="text-[13px] font-semibold">{musicTitle || name}</div>
                <div className="mt-1 text-[10px] text-white/70">{musicArtist || subtitle}</div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button type="button" className="rounded-full bg-white/18 px-2 py-1 text-[11px]">上一首</button>
                <button
                  type="button"
                  className="rounded-full bg-white/28 px-3 py-1 text-[11px] font-semibold"
                  onClick={() => onUpdateData?.({ musicPlaying: !musicPlaying })}
                >
                  {musicPlaying ? '暂停' : '播放'}
                </button>
                <button type="button" className="rounded-full bg-white/18 px-2 py-1 text-[11px]">下一首</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[13px] font-semibold leading-tight drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]">
                  {name}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-[10px] leading-tight text-white/72 drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <div className="flex items-end justify-between">
                <div className="text-[10px] font-semibold text-white/64">
                  {width}x{height}
                </div>
                <div
                  className="rounded-[10px] border border-white/18 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                  style={{
                    width: `${Math.min(72, Math.max(18, width * 18))}px`,
                    height: `${Math.min(56, Math.max(18, height * 14))}px`,
                  }}
                />
              </div>
            </>
          )}
        </div>
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
