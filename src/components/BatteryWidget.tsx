import React from 'react';
import { Smartphone, Headphones, Watch } from 'lucide-react';

export const BatteryWidget: React.FC = () => {
  const devices = [
    { icon: <Smartphone size={16} />, level: 81, active: true },
    { icon: <Headphones size={16} />, level: 100, active: true },
    { icon: <Watch size={16} />, level: 45, active: true },
    { icon: null, level: 0, active: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full p-1">
      {devices.map((d, i) => (
        <div key={i} className="relative flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="transparent"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="4"
            />
            {d.active && (
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="transparent"
                stroke="black"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - d.level / 100)}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-black/80">
            {d.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
