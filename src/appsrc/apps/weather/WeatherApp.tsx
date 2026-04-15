import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Wind, Droplets, Sun } from 'lucide-react';
import { WeatherWidget } from './components/WeatherWidget';
import { APP_OPEN_MOTION, APP_CLOSE_MOTION } from '../../../core/appOpenMotion';

interface WeatherAppProps {
  onClose: () => void;
}

export const WeatherApp: React.FC<WeatherAppProps> = ({ onClose }) => {
  const [selectedCity, setSelectedCity] = useState('萧县');

  const cities = [
    { name: '萧县', temp: 22, condition: '多云' },
    { name: '北京', temp: 15, condition: '晴朗' },
    { name: '上海', temp: 18, condition: '阴天' },
    { name: '广州', temp: 25, condition: '阵雨' },
  ];

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      // 清新柔和的极低饱和度浅空蓝与微薄荷渐变
      className="absolute inset-0 z-50 bg-gradient-to-br from-sky-50 via-blue-50/50 to-teal-50 flex flex-col font-sans"
    >
      {/* 顶部导航 */}
      <div className="px-2 pt-12 pb-2 flex items-center z-10 bg-white/90 border-b border-slate-200/60">
        <button onClick={onClose} className="text-slate-500 flex items-center gap-1 active:scale-95 transition-transform p-2">
          <ChevronLeft size={28} />
          <span className="text-[17px] font-medium">天气</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide pt-4">
        {/* 核心组件 */}
        <div className="px-5">
          <WeatherWidget />
        </div>

        {/* 附加信息卡片（柔和白玻璃） */}
        <div className="px-5 mt-4">
          <div className="bg-white/95 border border-slate-200/70 rounded-3xl p-5 flex justify-between shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-sky-100/80 p-2 rounded-full"><Wind size={20} className="text-sky-500" /></div>
              <span className="text-slate-400 text-[12px] font-medium">风速</span>
              <span className="text-slate-700 text-[15px] font-semibold">3级</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-blue-100/80 p-2 rounded-full"><Droplets size={20} className="text-blue-500" /></div>
              <span className="text-slate-400 text-[12px] font-medium">湿度</span>
              <span className="text-slate-700 text-[15px] font-semibold">65%</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="bg-amber-100/80 p-2 rounded-full"><Sun size={20} className="text-amber-500" /></div>
              <span className="text-slate-400 text-[12px] font-medium">紫外线</span>
              <span className="text-slate-700 text-[15px] font-semibold">中等</span>
            </div>
          </div>
        </div>

        {/* 城市列表 */}
        <div className="px-5 mt-6 mb-6">
          <h2 className="text-slate-400 text-[14px] font-medium mb-3 pl-1">我的城市</h2>
          <div className="flex flex-col gap-3">
            {cities.map((city) => (
              <div
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98] cursor-pointer border ${
                  city.name === selectedCity 
                    ? 'bg-white border-slate-200/70 shadow-[0_8px_20px_rgba(0,0,0,0.12)]' 
                    : 'bg-white/90 border-slate-200/50 hover:bg-white'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-slate-700 text-[18px] font-medium tracking-wide">{city.name}</span>
                  <span className="text-slate-500 text-[13px] mt-0.5">{city.condition}</span>
                </div>
                <div className="text-slate-700 text-[28px] font-light">{city.temp}°</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export type { WeatherAppProps };
