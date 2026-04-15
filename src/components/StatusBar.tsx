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
      className={`flex justify-between items-center px-8 pb-2 w-full z-50 font-medium text-[15px] transition-colors duration-300 ${
        dark ? 'text-black' : 'text-white'
      }`}
      style={{ paddingTop: topPadding }}
    >
      <div className="flex items-center gap-2.5">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
          className={`h-6 px-0.5 flex items-center leading-none transition-all duration-200 active:scale-95 ${
            dark ? 'text-black/70 hover:text-black/95' : 'text-white/80 hover:text-white'
          } ${isFullscreen ? 'gap-0' : 'gap-1'}`}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {!isFullscreen && <span className="text-[11px] font-medium tracking-[0.01em]">全屏</span>}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <SignalHigh size={16} />
        <span className="text-[12px] font-bold">5G</span>
        <div className={`flex items-center rounded-full px-1.5 py-0.5 gap-1 border ${
          dark ? 'bg-black/5 border-black/10' : 'bg-white/20 border-white/20'
        }`}>
          <span className="text-[10px] font-bold">81</span>
          <div className={`w-5 h-2.5 border rounded-[3px] relative flex items-center p-[1px] ${
            dark ? 'border-black/40' : 'border-white/60'
          }`}>
            <div className={`h-full rounded-[1px] ${dark ? 'bg-black' : 'bg-white'}`} style={{ width: '81%' }} />
            <div className={`absolute -right-[3px] w-[2px] h-1.5 rounded-r-full ${
              dark ? 'bg-black/40' : 'bg-white/60'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};
