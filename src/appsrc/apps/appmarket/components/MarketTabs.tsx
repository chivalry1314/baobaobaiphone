import React from 'react';
import { TAB_LABELS } from '../constants';
import type { MarketTab } from '../uiTypes';

interface MarketTabsProps {
  activeTab: MarketTab;
  onChange: (tab: MarketTab) => void;
}

const TABS: MarketTab[] = ['online', 'offline', 'developer'];

export const MarketTabs: React.FC<MarketTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/80 p-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`h-9 rounded-xl text-[13px] font-medium transition ${
              isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
};
