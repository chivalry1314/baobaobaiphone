import React from 'react';
import { MessageCircle, Users, Compass, User } from 'lucide-react';
import { WeChatTabBarProps } from '../types';
import { useIncomingRequestContacts } from '../contactAdapter';

export const WeChatTabBar: React.FC<WeChatTabBarProps> = ({ activeTab, onTabChange }) => {
  const incomingRequests = useIncomingRequestContacts();
  const newFriendsCount = incomingRequests.length;

  const tabs = [
    { key: 'chat', icon: MessageCircle, label: '微信' },
    { key: 'contacts', icon: Users, label: '通讯录' },
    { key: 'discover', icon: Compass, label: '发现' },
    { key: 'profile', icon: User, label: '我' },
  ] as const;

  return (
    // fixed positioning ensures the tab bar stays visible at the bottom
    // regardless of other content flow – it won't be pushed up by page elements
    <div className="fixed bottom-0 left-0 right-0 bg-[#F7F7F7] border-t border-gray-200 px-4 py-2 flex justify-around items-center safe-area-bottom z-50">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
            activeTab === key ? 'text-[#07C160]' : 'text-gray-500'
          }`}
        >
          <span className="relative">
            <Icon size={22} />
            {key === 'contacts' && newFriendsCount > 0 ? (
              <span className="absolute -right-3 -top-2 min-w-[16px] h-4 rounded-full bg-[#FA5151] px-1 text-[10px] leading-4 text-white text-center">
                {newFriendsCount > 99 ? '99+' : newFriendsCount}
              </span>
            ) : null}
          </span>
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  );
};
