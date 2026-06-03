import React from 'react';
import { SignalHigh, Maximize2, Minimize2 } from 'lucide-react';

interface StatusBarProps {
  dark?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ dark, isFullscreen = false, onToggleFullscreen }) => {
  const [time, setTime] = React.useState(new Date());
  const topPadding = isFullscreen
    ? '0px'
    : 'calc(env(safe-area-inset-top, 0px) + 1rem)';

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex w-full items-center justify-between px-8 pb-2 text-[15px] font-medium transition-colors duration-300 z-50"
      style={{
        paddingTop: topPadding,
        color: dark ? 'var(--sys-surface-text)' : 'var(--sys-status-fg)',
      }}
    >
      <div className="flex items-center gap-2.5">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          className={`flex h-6 items-center px-0.5 leading-none transition-all duration-200 active:scale-95 ${isFullscreen ? 'gap-0' : 'gap-1'}`}
          style={{
            color: dark ? 'var(--sys-muted-text)' : 'var(--sys-status-muted)',
          }}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {!isFullscreen && <span className="text-[11px] font-medium tracking-[0.01em]">全屏</span>}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <SignalHigh size={16} />
        <span className="text-[12px] font-bold">5G</span>
        <div
          className="flex items-center gap-1 rounded-full border px-1.5 py-0.5"
          style={{
            backgroundColor: dark ? 'var(--sys-surface)' : 'var(--sys-status-chip-bg)',
            borderColor: dark ? 'var(--sys-border)' : 'var(--sys-status-chip-border)',
            borderWidth: 'var(--sys-status-chip-border-width)',
          }}
        >
          <span className="text-[10px] font-bold">81</span>
          <div
            className="relative flex h-2.5 w-5 items-center rounded-[3px] border p-[1px]"
            style={{
              borderColor: dark ? 'var(--sys-muted-text)' : 'var(--sys-status-chip-border)',
              borderWidth: 'var(--sys-status-battery-border-width)',
            }}
          >
            <div
              className="h-full rounded-[1px]"
              style={{
                width: '81%',
                backgroundColor: dark ? 'var(--sys-surface-text)' : 'var(--sys-status-battery-bg)',
              }}
            />
            <div
              className="absolute -right-[3px] h-1.5 w-[2px] rounded-r-full"
              style={{
                backgroundColor: dark ? 'var(--sys-muted-text)' : 'var(--sys-status-battery-cap)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
