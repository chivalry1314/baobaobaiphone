import React from 'react';
import { AppIcon } from './AppIcon';

interface HomeDockProps {
  onOpenPhone?: () => void;
}

export const HomeDock: React.FC<HomeDockProps> = ({ onOpenPhone }) => {
  return (
    <div className="absolute inset-x-0 bottom-0 z-50">
      <div
        className="absolute inset-x-0 bottom-0 bg-white/12 backdrop-blur-[26px]"
        style={{ height: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 22px)' }}
      />

      <div className="relative flex justify-center px-4 pb-2">
        <div className="glass flex h-[84px] w-[92%] items-center justify-around rounded-[2.5rem] px-4">
          <AppIcon name="Phone" icon="Phone" onClick={onOpenPhone} />
          <AppIcon name="Safari" icon="Compass" />
          <AppIcon name="Messages" icon="MessageCircle" />
          <AppIcon name="Camera" icon="Camera" />
        </div>
      </div>
    </div>
  );
};
