import React from 'react';
import { Phone, Star, UserRound } from 'lucide-react';
import { TEXT } from '../constants';
import type { ContactsBottomTab } from '../uiTypes';

interface ContactsBottomTabsProps {
  activeTab: ContactsBottomTab;
  onChange: (tab: ContactsBottomTab) => void;
}

export const ContactsBottomTabs: React.FC<ContactsBottomTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="shrink-0 min-h-[84px] bg-white border-t border-slate-200 flex items-start justify-around pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {[
          { key: 'phone' as const, label: TEXT.phone, icon: Phone },
          { key: 'contacts' as const, label: TEXT.contacts, icon: UserRound },
          { key: 'favorites' as const, label: TEXT.favorites, icon: Star },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-20 py-0.5 flex flex-col items-center gap-1 ${active ? 'text-[#1E64D8]' : 'text-slate-400'}`}
            >
              <Icon size={22} fill={item.key === 'favorites' && active ? 'currentColor' : 'none'} />
              <span className="text-[13px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
  );
};
