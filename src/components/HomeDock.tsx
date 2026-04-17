import React from 'react';
import { motion } from 'motion/react';
import { AppIcon } from './AppIcon';

interface HomeDockProps {
  onOpenPhone?: () => void;
}

export const HomeDock: React.FC<HomeDockProps> = ({ onOpenPhone }) => {
  return (
    <div 
      // 1. 注意这里：我帮你把原来的 bottom-6 删掉了
      className="absolute left-1/2 -translate-x-1/2 w-[92%] h-[84px] glass rounded-[2.5rem] flex items-center justify-around px-4 z-50"
      
      // 2. 新增动态高度：基础安全区高度 + 额外留白，让 Dock 栏呼吸感更好
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 16px), 16px) + 8px)' }}
    >
      <AppIcon name="Phone" icon="Phone" onClick={onOpenPhone} />
      <AppIcon name="Safari" icon="Compass" />
      <AppIcon name="Messages" icon="MessageCircle" />
      <AppIcon name="Camera" icon="Camera" />
    </div>
  );
};