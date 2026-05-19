import React from 'react';
import { Clock } from 'lucide-react';
import { useDreamMusicStore } from '../../dreammusic/store';

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
  isEditing?: boolean;
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
  isEditing = false,
  onUpdateData,
}) => {
  const [now, setNow] = React.useState(() => new Date());
  const dreamTracks = useDreamMusicStore((state) => state.tracks);
  const dreamCurrentTrackId = useDreamMusicStore((state) => state.currentTrackId);
  const dreamIsPlaying = useDreamMusicStore((state) => state.isPlaying);
  const dreamCurrentTrack = React.useMemo(
    () => dreamTracks.find((track) => track.id === dreamCurrentTrackId) ?? null,
    [dreamCurrentTrackId, dreamTracks]
  );

  React.useEffect(() => {
    if (!['calendar-card', 'clock-card', 'text-card'].includes(templateId || '')) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), templateId === 'clock-card' ? 1000 : 60 * 1000);
    return () => window.clearInterval(timer);
  }, [templateId]);

  const calendarDays = React.useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      firstDay,
      days: Array.from({ length: daysInMonth }, (_, index) => index + 1),
      today: now.getDate(),
    };
  }, [now]);

  const countdownDays = React.useMemo(() => {
    const source = `${titleText || ''}\n${subtitle || ''}`;
    const match = source.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (!match) return null;
    const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(Math.abs(today.getTime() - target.getTime()) / 86_400_000);
  }, [now, subtitle, titleText]);

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
          {templateId === 'calendar-card' ? (
            <div className="relative h-full p-3 font-serif italic text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]">
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(139,106,76,0.28),rgba(255,255,255,0.10)_45%,rgba(92,70,50,0.24)),repeating-linear-gradient(90deg,rgba(255,255,255,0.16)_0_8px,rgba(15,23,42,0.08)_8px_13px)]" />
              <div className="relative flex h-full flex-col">
                <div className="text-right text-[clamp(16px,6vw,30px)] font-semibold leading-none">{calendarDays.monthName}</div>
                <div className="mt-3 grid flex-1 grid-cols-7 gap-1 text-center text-[clamp(9px,3vw,16px)] font-semibold">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`} className="opacity-95">{day}</span>
                  ))}
                  {Array.from({ length: calendarDays.firstDay }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {calendarDays.days.map((day) => (
                    <span
                      key={day}
                      className={day === calendarDays.today ? 'rounded bg-white/78 px-1 text-stone-500 shadow-sm' : 'opacity-90'}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : templateId === 'vinyl-record' ? (
            <div className="relative flex h-full items-center justify-center overflow-hidden" onPointerDown={stopDesktopPointer}>
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.16)_0_9px,rgba(15,23,42,0.10)_9px_14px)]" />
              <div
                className={`relative aspect-square h-[82%] max-h-[210px] rounded-full bg-[radial-gradient(circle_at_center,rgba(180,150,104,0.72)_0_18%,rgba(20,20,20,0.96)_19%_33%,rgba(7,7,8,0.98)_34%_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.30),inset_0_0_0_12px_rgba(255,255,255,0.035)] ${dreamIsPlaying ? 'animate-[spin_3.8s_linear_infinite]' : ''}`}
              >
                <div className="absolute inset-[32%] overflow-hidden rounded-full border border-white/12 bg-stone-500/70">
                  {dreamCurrentTrack?.coverUrl || backgroundImage ? (
                    <img src={dreamCurrentTrack?.coverUrl || backgroundImage} alt={dreamCurrentTrack?.title || name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </div>
              <div className={`absolute left-[58%] top-[8%] h-[58%] w-1 origin-top rounded-full bg-white/75 shadow-[0_2px_8px_rgba(15,23,42,0.24)] transition-transform ${dreamIsPlaying ? 'rotate-[22deg]' : 'rotate-[8deg]'}`} />
              <div className="absolute left-[70%] top-[4%] h-9 w-9 rounded-full border border-white/40 bg-black/70" />
              {dreamCurrentTrack || musicTitle || musicArtist ? (
                <div className="absolute inset-x-2 bottom-2 rounded-full bg-black/24 px-2 py-1 text-center text-[10px] leading-tight text-white/90 backdrop-blur">
                  <div className="truncate">{dreamCurrentTrack?.title || musicTitle}</div>
                  <div className="truncate text-white/65">{dreamCurrentTrack?.artist || musicArtist}</div>
                </div>
              ) : null}
            </div>
          ) : templateId === 'clock-card' ? (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-zinc-400/80 to-zinc-300/55 text-white">
              <div className="text-[clamp(12px,5vw,22px)] font-semibold leading-none">
                {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="mt-1 text-[clamp(38px,20vw,96px)] font-black leading-none tracking-normal drop-shadow-[0_2px_2px_rgba(15,23,42,0.14)]">
                {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          ) : templateId === 'custom-code' ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
              <div
                className="w-full whitespace-pre-wrap font-semibold leading-tight"
                style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
              >
                {titleText || name || 'Custom'}
              </div>
              <div className="whitespace-pre-wrap text-[12px] leading-5 text-white/75">
                {subtitle || '编辑组件代码'}
              </div>
            </div>
          ) : templateId === 'text-card' ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center" onPointerDown={stopDesktopPointer}>
              {isEditing ? (
                <>
                  <input
                    value={titleText || '184 天'}
                    onChange={(event) => onUpdateData?.({ titleText: event.target.value })}
                    className="w-full bg-transparent text-center font-serif italic outline-none placeholder:text-white/50"
                    style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
                  />
                  <textarea
                    value={subtitle || '我们的纪念日\n2024.07.30'}
                    onChange={(event) => onUpdateData?.({ subtitle: event.target.value })}
                    className="min-h-10 w-full resize-none bg-transparent text-center text-[12px] leading-5 text-white/85 outline-none"
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
                      value={titleFontSize || 22}
                      onChange={(event) => onUpdateData?.({ titleFontSize: Number(event.target.value) })}
                      className="w-20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-full whitespace-pre-wrap font-serif italic leading-tight"
                    style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
                  >
                    {countdownDays === null ? titleText || '184 天' : `${countdownDays} 天`}
                  </div>
                  <div className="whitespace-pre-wrap text-[12px] leading-5 text-white/85">
                    {subtitle || '我们的纪念日\n2024.07.30'}
                  </div>
                </>
              )}
            </div>
          ) : templateId === 'headline' ? (
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
            <label
              className={`relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden text-center ${onUpdateData ? 'cursor-pointer' : 'cursor-default'}`}
              onPointerDown={stopDesktopPointer}
              onClick={(event) => {
                if (!onUpdateData) event.preventDefault();
              }}
            >
              {onUpdateData ? (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => readPhotoFile(event.target.files?.[0])}
                />
              ) : null}
              {backgroundImage ? (
                <img src={backgroundImage} alt={name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-white/18" />
              )}
              <div className="absolute inset-2 rounded-[inherit] border border-white/35" />
              <div className="relative rounded-full border border-white/35 bg-white/22 px-3 py-1 text-[11px] font-semibold shadow-[0_6px_16px_rgba(15,23,42,0.14)] backdrop-blur">
                {backgroundImage ? '更换照片' : '上传照片'}
              </div>
            </label>
          ) : templateId === 'retro-music' || templateId === 'vinyl-record' ? (
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
