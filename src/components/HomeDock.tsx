import React from 'react';
import { motion } from 'motion/react';
import { AppIcon } from './AppIcon';

interface HomeDockProps {
  onOpenPhone?: () => void;
}

export const HomeDock: React.FC<HomeDockProps> = ({ onOpenPhone }) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] h-[84px] glass rounded-[2.5rem] flex items-center justify-around px-4 z-50">
      <AppIcon name="Phone" icon="Phone" onClick={onOpenPhone} />
      <AppIcon name="Safari" icon="Compass" />
      <AppIcon name="Messages" icon="MessageCircle" />
      <AppIcon name="Camera" icon="Camera" />
    </div>
  );
};
