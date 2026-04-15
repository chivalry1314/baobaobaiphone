import React from 'react';
import { Cloud, Sun, CloudRain } from 'lucide-react';

export const WeatherWidget: React.FC = () => {
  const hours = [
    { time: '16时', temp: '22°', icon: <Cloud size={20} className="text-slate-400" /> },
    { time: '17时', temp: '21°', icon: <Cloud size={20} className="text-slate-400" /> },
    { time: '18时', temp: '21°', icon: <Cloud size={20} className="text-slate-400" /> },
    { time: '18:15', temp: '20°', icon: <Sun size={20} className="text-amber-400" /> },
    { time: '19时', temp: '20°', icon: <CloudRain size={20} className="text-blue-400" /> },
    { time: '20时', temp: '20°', icon: <Cloud size={20} className="text-slate-400" /> },
  ];

  return (
    <div className="flex flex-col w-full text-slate-700">
      {/* 核心天气信息 */}
      <div className="flex flex-col items-center justify-center py-4">
        <h2 className="text-3xl font-medium tracking-wide text-slate-700">萧县</h2>
        <div className="text-[80px] font-extralight leading-none my-3 tracking-tighter text-slate-800">22°</div>
        <p className="text-lg font-medium text-slate-500">多云</p>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-400 mt-1">
          <span>最高 23°</span>
          <span>最低 17°</span>
        </div>
      </div>
      
      {/* 24小时预报卡片（柔和白玻璃） */}
      <div className="mt-4 bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-xs font-medium text-slate-400 mb-4 border-b border-slate-200/50 pb-2">
          未来 24 小时预报
        </div>
        <div className="flex justify-between items-center">
          {hours.map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <span className="text-[13px] text-slate-500">{h.time}</span>
              <div>{h.icon}</div>
              <span className="text-[15px] font-semibold text-slate-700">{h.temp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};