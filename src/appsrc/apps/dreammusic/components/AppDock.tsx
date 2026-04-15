import React from 'react';
import { BOTTOM_NAV_ITEMS, type BottomTabId } from '../constants';

interface AppDockProps {
  activeView: BottomTabId;
  onChange: (view: BottomTabId) => void;
}

export const AppDock: React.FC<AppDockProps> = ({ activeView, onChange }) => (
  <footer className="absolute bottom-0 left-0 right-0 h-[76px] border-t border-white/10 bg-[#5A422D]/75 backdrop-blur-xl px-2">
    <div className="h-full grid grid-cols-4">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`inline-flex flex-col items-center justify-center gap-1 text-[12px] ${active ? 'text-[#FFF5E8]' : 'text-[#D7CAB6]/70'}`}
          >
            <item.Icon size={20} />
            {item.label}
          </button>
        );
      })}
    </div>
  </footer>
);
