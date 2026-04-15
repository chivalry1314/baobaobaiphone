import React from 'react';
import { Cloud, Navigation } from 'lucide-react';

/**
 * 桌面天气小组件 - 仅供桌面展示使用
 * 完整天气应用请打开天气App
 */
export const WeatherWidget: React.FC = () => {
  const hours = [
    { time: '16时', temp: '22°', icon: 'cloud' },
    { time: '17时', temp: '21°', icon: 'cloud' },
    { time: '18时', temp: '21°', icon: 'cloud' },
    { time: '18:15', temp: '20°', icon: 'sun-cloud' },
    { time: '19时', temp: '20°', icon: 'cloud' },
    { time: '20时', temp: '20°', icon: 'cloud' },
  ];

  return (
    <div className="flex flex-col h-full text-black">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-medium">萧县</span>
            <Navigation size={10} className="fill-black" />
          </div>
          <span className="text-[48px] font-light leading-none mt-1">22°</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <Cloud size={20} className="text-black/80" />
          <span className="text-[13px] font-medium mt-1">多云</span>
          <span className="text-[11px] text-black/60">最高 23° 最低 17°</span>
        </div>
      </div>

      <div className="flex justify-between mt-auto pt-2 border-t border-black/10">
        {hours.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-black/60">{h.time}</span>
            <Cloud size={14} className="text-black/80" />
            <span className="text-[11px] font-medium">{h.temp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
