import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { TEXT } from '../constants';

interface AppMarketHeaderProps {
  onClose: () => void;
}

export const AppMarketHeader: React.FC<AppMarketHeaderProps> = ({ onClose }) => {
  return (
    <header className="px-2 pt-12 pb-4 bg-white/70 backdrop-blur-md border-b border-white/70 shadow-sm">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 flex items-center gap-1 p-2 active:scale-95 transition-transform"
        >
          <ChevronLeft size={28} />
          <span className="text-[16px]">返回</span>
        </button>
        <div className="flex-1 text-center pr-10">
          <h1 className="text-[17px] font-semibold text-slate-800">{TEXT.title}</h1>
        </div>
      </div>
    </header>
  );
};

