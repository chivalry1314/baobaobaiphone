import React from 'react';

export const CalendarWidget: React.FC = () => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full text-black p-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] font-bold">9月 | 七月廿七</span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map(d => (
          <span key={d} className="text-[9px] text-black/40">{d}</span>
        ))}
        {dates.map(d => (
          <div key={d} className="flex items-center justify-center h-4">
            <span className={`text-[10px] ${d === 18 ? 'bg-black text-white rounded-full w-4 h-4 flex items-center justify-center font-bold' : ''}`}>
              {d}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
